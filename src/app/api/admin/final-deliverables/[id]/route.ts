import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/auth-server";
import { isAdminUser } from "@/lib/supabase/roles";
import { getSupabaseServiceClient } from "@/lib/supabase/server";
import { finalDeliverableActionSchema, hasValidDeliverableStorage, isSameOrigin } from "@/lib/final-deliverables";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ id: string }> };

async function authorize() {
  let authClient;
  try { authClient = await createSupabaseServerClient(); }
  catch { return null; }
  const { data } = await authClient.auth.getUser();
  return data.user && await isAdminUser(authClient, data.user) ? data.user : null;
}

export async function PATCH(request: Request, { params }: Context) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  const user = await authorize();
  if (!user) return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  const parsed = finalDeliverableActionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid publication action." }, { status: 400 });
  const { id } = await params;
  let serviceClient;
  try { serviceClient = getSupabaseServiceClient(); }
  catch { return NextResponse.json({ error: "Final deliverable storage is not configured." }, { status: 503 }); }
  const { data: file } = await serviceClient.from("request_files").select("id, request_id, title, file_category, storage_bucket, storage_path, is_final_deliverable, customer_visible, published_at, deleted_at").eq("id", id).eq("is_final_deliverable", true).maybeSingle();
  if (!file || file.deleted_at || !hasValidDeliverableStorage(file.request_id, file.storage_bucket, file.storage_path)) return NextResponse.json({ error: "Deliverable not found." }, { status: 404 });

  const publishing = parsed.data.action === "publish";
  const unchanged = publishing ? file.customer_visible && Boolean(file.published_at) : !file.customer_visible && !file.published_at;
  if (unchanged) return NextResponse.json({ ok: true, unchanged: true });
  const now = new Date().toISOString();
  let updateQuery = serviceClient
    .from("request_files")
    .update({ customer_visible: publishing, published_at: publishing ? now : null, published_by: publishing ? user.id : null })
    .eq("id", id)
    .eq("request_id", file.request_id)
    .eq("is_final_deliverable", true)
    .is("deleted_at", null);
  updateQuery = publishing
    ? updateQuery.eq("customer_visible", false).is("published_at", null)
    : updateQuery.eq("customer_visible", true).not("published_at", "is", null);
  const { data: updated, error } = await updateQuery.select("id").maybeSingle();
  if (error) return NextResponse.json({ error: "Could not update publication state." }, { status: 500 });
  if (!updated) return NextResponse.json({ ok: true, unchanged: true });

  await serviceClient.from("request_activity_log").insert({ request_id: file.request_id, actor_id: user.id, actor_type: "admin", action: publishing ? "final_deliverable_published" : "final_deliverable_unpublished", details: { file_id: id, title: file.title, category: file.file_category, previous_state: publishing ? "draft" : "published", new_state: publishing ? "published" : "unpublished" } });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request, { params }: Context) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  const user = await authorize();
  if (!user) return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  const { id } = await params;
  let serviceClient;
  try { serviceClient = getSupabaseServiceClient(); }
  catch { return NextResponse.json({ error: "Final deliverable storage is not configured." }, { status: 503 }); }
  const { data: file } = await serviceClient.from("request_files").select("id, request_id, title, file_category, storage_bucket, storage_path, is_final_deliverable, deleted_at").eq("id", id).eq("is_final_deliverable", true).maybeSingle();
  if (!file || file.deleted_at || !hasValidDeliverableStorage(file.request_id, file.storage_bucket, file.storage_path)) return NextResponse.json({ error: "Deliverable not found." }, { status: 404 });
  const { error: storageError } = await serviceClient.storage.from(file.storage_bucket).remove([file.storage_path]);
  if (storageError) {
    console.error("Final deliverable exact-object deletion failed", { fileId: id, requestId: file.request_id, reason: storageError.message });
    return NextResponse.json({ error: "Could not delete the stored file." }, { status: 500 });
  }
  const now = new Date().toISOString();
  const { data: deleted, error } = await serviceClient
    .from("request_files")
    .update({ customer_visible: false, published_at: null, published_by: null, deleted_at: now, deleted_by: user.id })
    .eq("id", id)
    .eq("request_id", file.request_id)
    .eq("is_final_deliverable", true)
    .is("deleted_at", null)
    .select("id")
    .maybeSingle();
  if (error) {
    console.error("Final deliverable metadata deletion failed after object removal", { fileId: id, requestId: file.request_id, reason: error.message });
    return NextResponse.json({ error: "The file was removed, but its record could not be finalized." }, { status: 500 });
  }
  if (!deleted) return NextResponse.json({ ok: true, unchanged: true });
  await serviceClient.from("request_activity_log").insert({ request_id: file.request_id, actor_id: user.id, actor_type: "admin", action: "final_deliverable_deleted", details: { file_id: id, title: file.title, category: file.file_category } });
  return NextResponse.json({ ok: true });
}
