import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/auth-server";
import { isAdminUser } from "@/lib/supabase/roles";
import { getSupabaseServiceClient } from "@/lib/supabase/server";
import { finalDeliverableMetadataSchema, isSameOrigin, safeStorageFilename, sanitizeDisplayFilename, validateFinalDeliverableFile } from "@/lib/final-deliverables";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });

  let authClient;
  try { authClient = await createSupabaseServerClient(); }
  catch { return NextResponse.json({ error: "Final deliverable management is not configured." }, { status: 503 }); }
  const { data: userData } = await authClient.auth.getUser();
  if (!userData.user || !(await isAdminUser(authClient, userData.user))) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Select a file to upload." }, { status: 400 });
  const parsed = finalDeliverableMetadataSchema.safeParse({
    request_id: formData.get("request_id"),
    title: formData.get("title"),
    description: formData.get("description") ?? "",
    file_category: formData.get("file_category"),
    publish_immediately: formData.get("publish_immediately") === "true",
  });
  if (!parsed.success) return NextResponse.json({ error: "Check the highlighted fields.", fieldErrors: parsed.error.flatten().fieldErrors }, { status: 400 });
  const fileError = validateFinalDeliverableFile(file);
  if (fileError) return NextResponse.json({ error: fileError, fieldErrors: { file: [fileError] } }, { status: 400 });

  let serviceClient;
  try { serviceClient = getSupabaseServiceClient(); }
  catch { return NextResponse.json({ error: "Final deliverable storage is not configured." }, { status: 503 }); }
  const { data: requestRow } = await serviceClient.from("service_requests").select("id").eq("id", parsed.data.request_id).maybeSingle();
  if (!requestRow) return NextResponse.json({ error: "Request not found." }, { status: 404 });

  const originalFilename = sanitizeDisplayFilename(file.name);
  const storagePath = `requests/${parsed.data.request_id}/deliverables/${crypto.randomUUID()}/${safeStorageFilename(originalFilename)}`;
  const { error: uploadError } = await serviceClient.storage.from("request-documents").upload(storagePath, await file.arrayBuffer(), { contentType: file.type, upsert: false });
  if (uploadError) {
    console.error("Final deliverable storage upload failed", { requestId: parsed.data.request_id, reason: uploadError.message });
    return NextResponse.json({ error: "Could not store the file." }, { status: 500 });
  }

  const now = new Date().toISOString();
  const { data: fileRow, error: insertError } = await serviceClient.from("request_files").insert({
    request_id: parsed.data.request_id,
    field_key: "final_deliverable",
    file_name: originalFilename,
    file_size: file.size,
    file_type: file.type,
    storage_bucket: "request-documents",
    storage_path: storagePath,
    uploaded_by_user_id: userData.user.id,
    uploaded_by_role: "admin",
    title: parsed.data.title,
    description: parsed.data.description,
    file_category: parsed.data.file_category,
    is_final_deliverable: true,
    customer_visible: parsed.data.publish_immediately,
    published_at: parsed.data.publish_immediately ? now : null,
    published_by: parsed.data.publish_immediately ? userData.user.id : null,
  }).select("id").single();

  if (insertError || !fileRow) {
    const { error: cleanupError } = await serviceClient.storage.from("request-documents").remove([storagePath]);
    console.error("Final deliverable metadata insert failed", { requestId: parsed.data.request_id, reason: insertError?.message ?? "missing row", cleanupFailed: Boolean(cleanupError) });
    return NextResponse.json({ error: "Could not save the file record." }, { status: 500 });
  }

  const activities: Array<{ request_id: string; actor_id: string; actor_type: string; action: string; details: Record<string, unknown> }> = [{ request_id: parsed.data.request_id, actor_id: userData.user.id, actor_type: "admin", action: "final_deliverable_uploaded", details: { file_id: fileRow.id, title: parsed.data.title, category: parsed.data.file_category } }];
  if (parsed.data.publish_immediately) activities.push({ request_id: parsed.data.request_id, actor_id: userData.user.id, actor_type: "admin", action: "final_deliverable_published", details: { file_id: fileRow.id, title: parsed.data.title, category: parsed.data.file_category, previous_state: "draft", new_state: "published" } });
  const { error: activityError } = await serviceClient.from("request_activity_log").insert(activities);
  if (activityError) console.warn("Final deliverable activity logging failed", { requestId: parsed.data.request_id, fileId: fileRow.id, reason: activityError.message });

  return NextResponse.json({ ok: true, id: fileRow.id });
}
