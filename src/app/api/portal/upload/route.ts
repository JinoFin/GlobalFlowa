import { NextResponse } from "next/server";
import { sendCustomerUploadEmail } from "@/lib/email/send";
import { createSupabaseServerClient } from "@/lib/supabase/auth-server";
import { getSupabaseServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RequestRow = {
  id: string;
  company_name: string;
  email: string;
  customer_email: string | null;
  customer_user_id: string | null;
  customer_access_enabled: boolean;
};

type ChecklistRow = {
  id: string;
  request_id: string;
  title: string;
  customer_visible: boolean;
};

export async function POST(request: Request) {
  let authClient;

  try {
    authClient = await createSupabaseServerClient();
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Supabase auth is not configured." },
      { status: 503 },
    );
  }

  const { data: userData } = await authClient.auth.getUser();
  const user = userData.user;
  if (!user?.email) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  let serviceClient;
  try {
    serviceClient = getSupabaseServiceClient();
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Supabase service role is not configured." },
      { status: 503 },
    );
  }

  const formData = await request.formData();
  const requestId = String(formData.get("requestId") ?? "");
  const checklistItemId = String(formData.get("checklistItemId") ?? "");
  const customerNote = String(formData.get("customerNote") ?? "").trim();
  const file = formData.get("file");

  if (!requestId || !checklistItemId) {
    return NextResponse.json({ error: "Request and checklist item are required." }, { status: 400 });
  }
  if (!(file instanceof File) && !customerNote) {
    return NextResponse.json({ error: "Upload a file or add a note." }, { status: 400 });
  }

  const { data: requestRow, error: requestError } = await serviceClient
    .from("service_requests")
    .select("id, company_name, email, customer_email, customer_user_id, customer_access_enabled")
    .eq("id", requestId)
    .maybeSingle();

  if (requestError || !requestRow || !customerOwnsRequest(requestRow as RequestRow, user.id, user.email)) {
    console.warn("Customer upload ownership check failed", {
      requestId,
      userId: user.id,
      reason: requestError?.message ?? "not authorized",
    });
    return NextResponse.json({ error: "Request not found or access denied." }, { status: 404 });
  }

  const { data: checklistRow, error: checklistError } = await serviceClient
    .from("request_document_checklist")
    .select("id, request_id, title, customer_visible")
    .eq("id", checklistItemId)
    .eq("request_id", requestId)
    .maybeSingle();

  if (checklistError || !checklistRow || !(checklistRow as ChecklistRow).customer_visible) {
    return NextResponse.json({ error: "Checklist item not found or unavailable." }, { status: 404 });
  }

  let fileId: string | null = null;
  let fileName: string | null = null;

  if (file instanceof File) {
    if (file.size > 20 * 1024 * 1024) {
      return NextResponse.json({ error: "File is too large. Please upload files under 20 MB." }, { status: 400 });
    }

    fileName = file.name || "customer-upload";
    const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "-").slice(0, 120);
    const storagePath = `${requestId}/customer/${crypto.randomUUID()}-${safeName}`;
    const bytes = await file.arrayBuffer();

    const { error: uploadError } = await serviceClient.storage
      .from("request-documents")
      .upload(storagePath, bytes, {
        contentType: file.type || "application/octet-stream",
        upsert: false,
      });

    if (uploadError) {
      console.error("Customer portal storage upload failed", {
        requestId,
        checklistItemId,
        reason: uploadError.message,
      });
      return NextResponse.json({ error: "Could not store the uploaded file." }, { status: 500 });
    }

    const { data: fileRow, error: fileInsertError } = await serviceClient
      .from("request_files")
      .insert({
        request_id: requestId,
        field_key: `customer_upload.${checklistItemId}`,
        file_name: fileName,
        file_size: file.size,
        file_type: file.type || "application/octet-stream",
        storage_bucket: "request-documents",
        storage_path: storagePath,
        uploaded_by_user_id: user.id,
        uploaded_by_role: "customer",
        linked_checklist_item_id: checklistItemId,
        customer_note: customerNote || null,
      })
      .select("id")
      .single();

    if (fileInsertError || !fileRow) {
      console.error("Customer portal file metadata insert failed", {
        requestId,
        checklistItemId,
        reason: fileInsertError?.message ?? "missing inserted file row",
      });
      return NextResponse.json({ error: "Could not save uploaded file metadata." }, { status: 500 });
    }

    fileId = fileRow.id as string;
  }

  const checklistUpdate: Record<string, string | null> = {
    customer_note: customerNote || null,
    updated_at: new Date().toISOString(),
  };

  if (fileId) {
    checklistUpdate.linked_file_id = fileId;
    checklistUpdate.status = "under_review";
  }

  const { error: checklistUpdateError } = await serviceClient
    .from("request_document_checklist")
    .update(checklistUpdate)
    .eq("id", checklistItemId)
    .eq("request_id", requestId);

  if (checklistUpdateError) {
    console.error("Customer portal checklist update failed", {
      requestId,
      checklistItemId,
      reason: checklistUpdateError.message,
    });
    return NextResponse.json({ error: "Could not update the checklist item." }, { status: 500 });
  }

  await serviceClient.from("request_activity_log").insert({
    request_id: requestId,
    actor_id: null,
    actor_type: "customer",
    action: fileId ? "customer_uploaded_file" : "customer_added_note",
    details: {
      customer_user_id: user.id,
      customer_email: user.email,
      checklist_item_id: checklistItemId,
      file_id: fileId,
      has_customer_note: Boolean(customerNote),
    },
  });

  if (fileId) {
    sendCustomerUploadEmail({
      companyName: (requestRow as RequestRow).company_name,
      customerEmail: user.email,
      requestId,
      checklistTitle: (checklistRow as ChecklistRow).title,
      fileName,
      customerNote: customerNote || null,
    }).catch((error) => {
      console.warn("Customer upload email failed after persistence", {
        requestId,
        checklistItemId,
        reason: error instanceof Error ? error.message : "unknown error",
      });
    });
  }

  return NextResponse.json({
    ok: true,
    message: fileId
      ? "Document uploaded successfully. Globalflowa will review it and update the status."
      : "Note saved successfully.",
    fileId,
  });
}

function customerOwnsRequest(request: RequestRow, userId: string, userEmail: string) {
  if (!request.customer_access_enabled) return false;
  if (request.customer_user_id && request.customer_user_id === userId) return true;

  const email = userEmail.trim().toLowerCase();
  return [request.customer_email, request.email]
    .filter(Boolean)
    .some((value) => value?.trim().toLowerCase() === email);
}
