import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/auth-server";
import { getSupabaseServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type FileDownloadRouteProps = {
  params: Promise<{ id: string }>;
};

type RequestFileRow = {
  storage_bucket: string;
  storage_path: string;
};

export async function GET(_request: Request, { params }: FileDownloadRouteProps) {
  const { id } = await params;
  let supabase;

  try {
    supabase = await createSupabaseServerClient();
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Supabase auth is not configured." },
      { status: 503 },
    );
  }

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { data: fileRow, error: fileError } = await supabase
    .from("request_files")
    .select("storage_bucket, storage_path")
    .eq("id", id)
    .single();

  if (fileError || !fileRow) {
    return NextResponse.json(
      { error: fileError?.message ?? "File not found." },
      { status: 404 },
    );
  }

  let serviceClient;
  try {
    serviceClient = getSupabaseServiceClient();
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Supabase storage is not configured." },
      { status: 503 },
    );
  }

  const file = fileRow as RequestFileRow;
  const { data, error } = await serviceClient.storage
    .from(file.storage_bucket)
    .createSignedUrl(file.storage_path, 60);

  if (error || !data?.signedUrl) {
    return NextResponse.json(
      { error: error?.message ?? "Could not create signed file URL." },
      { status: 500 },
    );
  }

  return NextResponse.redirect(data.signedUrl);
}
