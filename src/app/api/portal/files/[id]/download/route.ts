import { NextResponse } from "next/server";
import { isVerifiedCustomer } from "@/lib/auth/customer";
import { createSupabaseServerClient } from "@/lib/supabase/auth-server";
import { getSupabaseServiceClient } from "@/lib/supabase/server";
import { hasValidDeliverableStorage } from "@/lib/final-deliverables";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Context) {
  let authClient;
  try { authClient = await createSupabaseServerClient(); }
  catch { return NextResponse.json({ error: "Secure file access is temporarily unavailable." }, { status: 503 }); }
  const { data } = await authClient.auth.getUser();
  const user = data.user;
  if (!user || !(await isVerifiedCustomer(authClient, user))) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const { id } = await params;
  let serviceClient;
  try { serviceClient = getSupabaseServiceClient(); }
  catch { return NextResponse.json({ error: "Secure file access is temporarily unavailable." }, { status: 503 }); }
  const { data: file } = await serviceClient.from("request_files").select("id, request_id, storage_bucket, storage_path, is_final_deliverable, customer_visible, published_at, deleted_at").eq("id", id).maybeSingle();
  if (!file || !file.is_final_deliverable || !file.customer_visible || !file.published_at || file.deleted_at || !hasValidDeliverableStorage(file.request_id, file.storage_bucket, file.storage_path)) return NextResponse.json({ error: "File not found or access denied." }, { status: 404 });
  const { data: ownedRequest } = await serviceClient.from("service_requests").select("id").eq("id", file.request_id).eq("customer_user_id", user.id).eq("customer_access_enabled", true).maybeSingle();
  if (!ownedRequest) return NextResponse.json({ error: "File not found or access denied." }, { status: 404 });
  const { data: signed, error } = await serviceClient.storage.from(file.storage_bucket).createSignedUrl(file.storage_path, 60);
  if (error || !signed?.signedUrl) {
    console.error("Customer deliverable signed URL creation failed", { fileId: id, requestId: file.request_id, reason: error?.message ?? "missing signed URL" });
    return NextResponse.json({ error: "Could not create a secure download link." }, { status: 500 });
  }
  return NextResponse.redirect(signed.signedUrl);
}
