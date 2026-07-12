import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/auth-server";
import { isAdminUser } from "@/lib/supabase/roles";
import { getSupabaseServiceClient } from "@/lib/supabase/server";
import { sanitizeDisplayFilename } from "@/lib/final-deliverables";
import { privateNoStoreHeaders } from "@/lib/http/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type FileDownloadRouteProps = {
  params: Promise<{ id: string }>;
};

type RequestFileRow = {
  file_name: string;
  storage_bucket: string;
  storage_path: string;
};

export async function GET(_request: Request, { params }: FileDownloadRouteProps) {
  const { id } = await params;
  let supabase;

  try {
    supabase = await createSupabaseServerClient();
  } catch (error) {
    console.error("Admin file auth setup failed", { reason: error instanceof Error ? error.message : "unknown error" });
    return NextResponse.json(
      { error: "Secure staff file access is temporarily unavailable." },
      { status: 503 },
    );
  }

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  if (!(await isAdminUser(supabase, userData.user))) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const { data: fileRow, error: fileError } = await supabase
    .from("request_files")
    .select("file_name, storage_bucket, storage_path")
    .eq("id", id)
    .single();

  if (fileError || !fileRow) {
    console.error("Admin file lookup failed", {
      fileId: id,
      reason: fileError?.message ?? "missing file row",
    });
    return NextResponse.json(
      { error: "File not found or unavailable." },
      { status: 404 },
    );
  }

  let serviceClient;
  try {
    serviceClient = getSupabaseServiceClient();
  } catch (error) {
    console.error("Admin file storage setup failed", { fileId: id, reason: error instanceof Error ? error.message : "unknown error" });
    return NextResponse.json(
      { error: "Secure staff file access is temporarily unavailable." },
      { status: 503 },
    );
  }

  const file = fileRow as RequestFileRow;
  if (file.storage_bucket !== "request-documents") {
    return NextResponse.json({ error: "File not found or unavailable." }, { status: 404 });
  }
  const { data, error } = await serviceClient.storage
    .from(file.storage_bucket)
    .createSignedUrl(file.storage_path, 60, { download: sanitizeDisplayFilename(file.file_name) });

  if (error || !data?.signedUrl) {
    console.error("Admin signed file URL creation failed", {
      fileId: id,
      bucket: file.storage_bucket,
      reason: error?.message ?? "missing signed URL",
    });
    return NextResponse.json(
      { error: "Could not create a secure file download link." },
      { status: 500 },
    );
  }

  return NextResponse.redirect(data.signedUrl, { headers: privateNoStoreHeaders() });
}
