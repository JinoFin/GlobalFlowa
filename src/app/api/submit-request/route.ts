import { NextRequest, NextResponse } from "next/server";
import { getServiceBySlug } from "@/lib/catalog";
import {
  defaultDocumentTemplates,
  generateDocumentChecklist,
  type DocumentTemplate,
  type UploadedFileSummary,
} from "@/lib/document-checklist";
import { sendRequestEmails } from "@/lib/email/send";
import { getMissingEnvironmentVariables } from "@/lib/env";
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
  let supabase;
  try {
    supabase = getSupabaseServiceClient();
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Supabase is not configured for request submission.",
        missing: getMissingEnvironmentVariables("server").filter((key) =>
          ["SUPABASE_SERVICE_ROLE_KEY"].includes(key),
        ).concat(
          getMissingEnvironmentVariables("public").filter((key) =>
            ["NEXT_PUBLIC_SUPABASE_URL"].includes(key),
          ),
        ),
      },
      { status: 503 },
    );
  }

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
      customer_email: payload.customer.email,
      customer_access_enabled: true,
    })
    .select("id")
    .single();

  if (requestError || !requestRow) {
    console.error("Request persistence failed", {
      reason: requestError?.message ?? "missing request row",
    });
    return NextResponse.json(
      { error: "Could not create service request. Please try again or contact Globalflowa." },
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
      console.error("Request services persistence failed", {
        submissionId,
        reason: error.message,
      });
      return NextResponse.json(
        { error: "Could not save selected services. Please contact Globalflowa with your submission details." },
        { status: 500 },
      );
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
      console.error("Request answers persistence failed", {
        submissionId,
        reason: error.message,
      });
      return NextResponse.json(
        { error: "Could not save request answers. Please contact Globalflowa with your submission details." },
        { status: 500 },
      );
    }
  }

  const uploadedFiles: Array<{ field: string; name: string; path: string; size: number; type: string }> = [];
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
      console.error("Request file upload failed", {
        submissionId,
        field,
        reason: uploadError.message,
      });
      return NextResponse.json(
        { error: "Could not upload one of the documents. Please try again." },
        { status: 500 },
      );
    }

    uploadedFiles.push({
      field,
      name: value.name,
      path,
      size: value.size,
      type: value.type || "application/octet-stream",
    });
  }

  let savedFiles: UploadedFileSummary[] = [];
  if (uploadedFiles.length > 0) {
    const { data, error } = await supabase.from("request_files").insert(
      uploadedFiles.map((file) => ({
        request_id: submissionId,
        field_key: file.field,
        file_name: file.name,
        file_size: file.size,
        file_type: file.type,
        storage_bucket: "request-documents",
        storage_path: file.path,
        uploaded_by_role: "customer",
      })),
    ).select("id, field_key, file_name, storage_path");
    if (error) {
      console.error("Request file metadata persistence failed", {
        submissionId,
        reason: error.message,
      });
      return NextResponse.json(
        { error: "Documents were uploaded but file metadata could not be saved. Please contact Globalflowa." },
        { status: 500 },
      );
    }

    savedFiles = (data ?? []).map((file) => ({
      id: file.id,
      field: file.field_key,
      name: file.file_name,
      path: file.storage_path,
    }));
  }

  const templates = await loadDocumentTemplatesForRequest(supabase, payload.selectedServices);
  const checklistItems = generateDocumentChecklist({
    selectedServices: payload.selectedServices,
    payload,
    templates,
    uploadedFiles: savedFiles,
  });

  if (checklistItems.length > 0) {
    const { error } = await supabase.from("request_document_checklist").insert(
      checklistItems.map((item) => ({
        request_id: submissionId,
        document_template_id: item.document_template_id,
        document_key: item.document_key,
        title: item.title,
        description: item.description,
        category: item.category,
        status: item.status,
        admin_note: item.admin_note,
        customer_note: item.customer_note,
        linked_file_id: item.linked_file_id,
        required: item.required,
        sort_order: item.sort_order,
      })),
    );

    if (error) {
      console.error("Document checklist persistence failed", error);
    }
  }

  await supabase.from("request_activity_log").insert({
    request_id: submissionId,
    action: "submitted",
    actor_type: "customer",
    details: {
      selected_services: payload.selectedServices,
      checklist_items: checklistItems.length,
    },
  });

  try {
    await sendRequestEmails({ payload, submissionId, uploadedFiles, checklistItems });
  } catch (error) {
    console.error("Request email failed after persistence", {
      requestId: submissionId,
      reason: error instanceof Error ? error.message : "unknown error",
    });
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

async function loadDocumentTemplatesForRequest(
  supabase: ReturnType<typeof getSupabaseServiceClient>,
  selectedServices: string[],
) {
  const { data, error } = await supabase
    .from("document_templates")
    .select("*")
    .in("service_slug", selectedServices)
    .eq("is_active", true)
    .order("sort_order");

  if (error || !data?.length) {
    if (error) {
      console.error("Document template load failed; using local defaults", error);
    }
    return defaultDocumentTemplates.filter((template) =>
      selectedServices.includes(template.service_slug),
    );
  }

  return data as DocumentTemplate[];
}
