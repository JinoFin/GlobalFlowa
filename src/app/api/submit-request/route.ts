import { NextRequest, NextResponse } from "next/server";
import { getServiceBySlug } from "@/lib/catalog";
import { sendRequestEmails } from "@/lib/email/send";
import { getSupabaseServiceClient } from "@/lib/supabase/server";
import { requestPayloadSchema } from "@/lib/validation";

export const runtime = "nodejs";

const rateLimitWindowMs = 15 * 60 * 1000;
const rateLimitMax = 8;
const attempts = new Map<string, { count: number; resetAt: number }>();

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: "Too many submissions. Please try again later." },
      { status: 429 },
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form submission." }, { status: 400 });
  }

  const rawPayload = formData.get("payload");
  if (typeof rawPayload !== "string") {
    return NextResponse.json({ error: "Missing request payload." }, { status: 400 });
  }

  let decodedPayload: unknown;
  try {
    decodedPayload = JSON.parse(rawPayload);
  } catch {
    return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });
  }

  const parsed = requestPayloadSchema.safeParse(decodedPayload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed.", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const payload = parsed.data;
  const supabase = getSupabaseServiceClient();
  const mainService =
    getServiceBySlug(payload.selectedServices[0] ?? "")?.name ??
    payload.selectedServices[0] ??
    "Service Request";

  const { data: requestRow, error: requestError } = await supabase
    .from("service_requests")
    .insert({
      status: "New",
      priority: payload.customer.urgency ?? "Standard",
      company_name: payload.customer.company_name,
      contact_person: payload.customer.contact_person,
      email: payload.customer.email,
      phone: payload.customer.phone ?? null,
      whatsapp: payload.customer.whatsapp ?? null,
      wechat: payload.customer.wechat ?? null,
      country: payload.customer.country,
      preferred_language: payload.customer.preferred_language ?? "English",
      main_service: mainService,
      urgency: payload.customer.urgency ?? "Standard",
      deadline: payload.customer.deadline || null,
      message: payload.customer.message ?? null,
      source: "website",
    })
    .select("id")
    .single();

  if (requestError || !requestRow) {
    return NextResponse.json(
      { error: requestError?.message ?? "Could not create service request." },
      { status: 500 },
    );
  }

  const submissionId = String(requestRow.id);
  const serviceRows = payload.selectedServices.map((serviceSlug) => ({
    request_id: submissionId,
    service_slug: serviceSlug,
    service_name: getServiceBySlug(serviceSlug)?.name ?? serviceSlug,
  }));

  if (serviceRows.length > 0) {
    const { error } = await supabase.from("request_services").insert(serviceRows);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  const answerRows = [
    ...Object.entries(payload.product).map(([key, value]) => ({
      request_id: submissionId,
      scope: "product",
      service_slug: null,
      question_key: key,
      answer: value,
    })),
    ...Object.entries(payload.serviceAnswers).flatMap(([serviceSlug, answers]) =>
      Object.entries(answers).map(([key, value]) => ({
        request_id: submissionId,
        scope: "service",
        service_slug: serviceSlug,
        question_key: key,
        answer: value,
      })),
    ),
  ];

  if (answerRows.length > 0) {
    const { error } = await supabase.from("request_answers").insert(answerRows);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  const uploadedFiles: Array<{ field: string; name: string; path: string }> = [];
  for (const [key, value] of formData.entries()) {
    if (!key.startsWith("files.") || !(value instanceof File)) continue;

    const field = key.replace("files.", "");
    const safeName = value.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${submissionId}/${crypto.randomUUID()}-${safeName}`;
    const buffer = Buffer.from(await value.arrayBuffer());

    const { error: uploadError } = await supabase.storage
      .from("request-documents")
      .upload(path, buffer, {
        contentType: value.type || "application/octet-stream",
        upsert: false,
      });

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    uploadedFiles.push({ field, name: value.name, path });
  }

  if (uploadedFiles.length > 0) {
    const { error } = await supabase.from("request_files").insert(
      uploadedFiles.map((file) => ({
        request_id: submissionId,
        field_key: file.field,
        file_name: file.name,
        storage_bucket: "request-documents",
        storage_path: file.path,
      })),
    );
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  await supabase.from("request_activity_log").insert({
    request_id: submissionId,
    action: "submitted",
    actor_type: "customer",
    details: { selected_services: payload.selectedServices },
  });

  try {
    await sendRequestEmails({ payload, submissionId, uploadedFiles });
  } catch (error) {
    console.error("Request email failed", error);
  }

  return NextResponse.json({ ok: true, submissionId });
}

function getClientIp(request: NextRequest) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

function isRateLimited(ip: string) {
  const now = Date.now();
  const current = attempts.get(ip);

  if (!current || current.resetAt < now) {
    attempts.set(ip, { count: 1, resetAt: now + rateLimitWindowMs });
    return false;
  }

  current.count += 1;
  attempts.set(ip, current);
  return current.count > rateLimitMax;
}
