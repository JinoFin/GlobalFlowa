import { NextResponse } from "next/server";
import { isVerifiedCustomer } from "@/lib/auth/customer";
import { createSupabaseServerClient } from "@/lib/supabase/auth-server";
import { getSupabaseServiceClient } from "@/lib/supabase/server";
import { hasValidDeliverableStorage, sanitizeDisplayFilename } from "@/lib/final-deliverables";
import { privateNoStoreHeaders } from "@/lib/http/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type FileDownloadRouteProps = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, { params }: FileDownloadRouteProps) {
  const { id } = await params;
  let supabase;

  try {
    supabase = await createSupabaseServerClient();
  } catch (error) {
    console.error("Customer file auth setup failed", {
      reason: error instanceof Error ? error.message : "unknown error",
    });
    return NextResponse.json(
      { error: "Customer file access is not configured." },
      { status: 503 },
    );
  }

  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user || !(await isVerifiedCustomer(supabase, user))) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  let serviceClient;
  try {
    serviceClient = getSupabaseServiceClient();
  } catch (error) {
    console.error("Customer file storage setup failed", {
      fileId: id,
      reason: error instanceof Error ? error.message : "unknown error",
    });
    return NextResponse.json(
      { error: "Secure file access is temporarily unavailable." },
      { status: 503 },
    );
  }

  const { data: file } = await serviceClient
    .from("request_files")
    .select("id, request_id, file_name, storage_bucket, storage_path, is_final_deliverable, customer_visible, published_at, deleted_at")
    .eq("id", id)
    .maybeSingle();
  if (!file || !file.is_final_deliverable || !file.customer_visible || !file.published_at || file.deleted_at || !hasValidDeliverableStorage(file.request_id, file.storage_bucket, file.storage_path)) {
    return NextResponse.json({ error: "File not found or access denied." }, { status: 404 });
  }
  const { data: ownedRequest } = await serviceClient.from("service_requests").select("id").eq("id", file.request_id).eq("customer_user_id", user.id).eq("customer_access_enabled", true).maybeSingle();
  if (!ownedRequest) return NextResponse.json({ error: "File not found or access denied." }, { status: 404 });

  const { data, error } = await serviceClient.storage
    .from(file.storage_bucket)
    .createSignedUrl(file.storage_path, 60, { download: sanitizeDisplayFilename(file.file_name) });

  if (error || !data?.signedUrl) {
    console.error("Customer signed file URL creation failed", {
      fileId: id,
      bucket: file.storage_bucket,
      reason: error?.message ?? "missing signed URL",
    });
    return NextResponse.json({ error: "Could not create a secure file download link." }, { status: 500 });
  }

  return NextResponse.redirect(data.signedUrl, { headers: privateNoStoreHeaders() });
}
