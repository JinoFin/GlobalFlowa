import { NextResponse } from "next/server";
import { sendCustomerUploadEmail } from "@/lib/email/send";
import { isVerifiedCustomer } from "@/lib/auth/customer";
import { createSupabaseServerClient } from "@/lib/supabase/auth-server";
import { getSupabaseServiceClient } from "@/lib/supabase/server";
import { hasTrustedMutationOrigin } from "@/lib/http/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RequestRow = {
  id: string;
  company_name: string;
  email: string;
  customer_email: string | null;
  customer_user_id: string | null;
  customer_access_enabled: boolean;
  lifecycle_stage: string;
};

type ChecklistRow = {
  id: string;
  request_id: string;
  title: string;
  customer_visible: boolean;
  status: string;
  linked_file_id: string | null;
};

export async function POST(request: Request) {
  if (!hasTrustedMutationOrigin(request)) {
    return NextResponse.json({ error: "Request not allowed." }, { status: 403 });
  }
  let authClient;

  try {
    authClient = await createSupabaseServerClient();
  } catch (error) {
    console.error("Customer upload auth setup failed", {
      reason: error instanceof Error ? error.message : "unknown error",
    });
    return NextResponse.json(
      { error: "Customer uploads are not configured." },
      { status: 503 },
    );
  }

  const { data: userData } = await authClient.auth.getUser();
  const user = userData.user;
  if (!user?.email || !(await isVerifiedCustomer(authClient, user))) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  let serviceClient;
  try {
    serviceClient = getSupabaseServiceClient();
  } catch (error) {
    console.error("Customer upload service setup failed", {
      reason: error instanceof Error ? error.message : "unknown error",
    });
    return NextResponse.json(
      { error: "Customer uploads are temporarily unavailable." },
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
    .select("id, company_name, email, customer_email, customer_user_id, customer_access_enabled, lifecycle_stage")
    .eq("id", requestId)
    .maybeSingle();

  if (requestError || !requestRow || !customerOwnsRequest(requestRow as RequestRow, user.id)) {
    console.warn("Customer upload ownership check failed", {
      requestId,
      userId: user.id,
      reason: requestError?.message ?? "not authorized",
    });
    return NextResponse.json({ error: "Request not found or access denied." }, { status: 404 });
  }
  if (["completed", "archived"].includes((requestRow as RequestRow).lifecycle_stage)) {
    return NextResponse.json({ error: "This request is no longer accepting uploads." }, { status: 409 });
  }

  const { data: checklistRow, error: checklistError } = await serviceClient
    .from("request_document_checklist")
    .select("id, request_id, title, customer_visible, status, linked_file_id")
    .eq("id", checklistItemId)
    .eq("request_id", requestId)
    .maybeSingle();

  if (checklistError || !checklistRow || !(checklistRow as ChecklistRow).customer_visible) {
    return NextResponse.json({ error: "Checklist item not found or unavailable." }, { status: 404 });
  }

  let fileId: string | null = null;
  let fileName: string | null = null;
  const checklistBeforeUpload = checklistRow as ChecklistRow;
  const replacedRejectedFile =
    file instanceof File &&
    checklistBeforeUpload.status === "incorrect" &&
    Boolean(checklistBeforeUpload.linked_file_id);

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
        file_category: "customer_upload",
        linked_checklist_item_id: checklistItemId,
        customer_note: customerNote || null,
      })
      .select("id")
      .single();

    if (fileInsertError || !fileRow) {
      const { error: cleanupError } = await serviceClient.storage
        .from("request-documents")
        .remove([storagePath]);
      console.error("Customer portal file metadata insert failed", {
        requestId,
        checklistItemId,
        reason: fileInsertError?.message ?? "missing inserted file row",
        cleanupFailed: Boolean(cleanupError),
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

  let lifecycleAdvanced = false;
  if (fileId && ["required", "missing", "incorrect", "expired"].includes(checklistBeforeUpload.status)) {
    const { data: advancedRequest } = await serviceClient
      .from("service_requests")
      .update({ lifecycle_stage: "document_review", lifecycle_stage_updated_at: new Date().toISOString() })
      .eq("id", requestId)
      .not("lifecycle_stage", "in", "(completed,archived)")
      .select("id")
      .maybeSingle();
    lifecycleAdvanced = Boolean(advancedRequest);
  }

  const { error: activityError } = await serviceClient.from("request_activity_log").insert({
    request_id: requestId,
    actor_id: null,
    actor_type: "customer",
    action: fileId
      ? replacedRejectedFile
        ? "customer_replaced_file"
        : "customer_uploaded_file"
      : "customer_added_note",
    details: {
      customer_user_id: user.id,
      customer_email: user.email,
      checklist_item_id: checklistItemId,
      file_id: fileId,
      file_name: fileName,
      replaced_file_id: replacedRejectedFile ? checklistBeforeUpload.linked_file_id : null,
      previous_status: checklistBeforeUpload.status,
      has_customer_note: Boolean(customerNote),
    },
  });

  if (activityError) {
    console.warn("Customer upload activity log failed after persistence", {
      requestId,
      checklistItemId,
      reason: activityError.message,
    });
  }
  if (lifecycleAdvanced) await serviceClient.from("request_activity_log").insert({ request_id: requestId, actor_id: null, actor_type: "customer", action: "lifecycle_stage_changed", details: { previous_stage: (requestRow as RequestRow).lifecycle_stage, new_stage: "document_review", changed_at: new Date().toISOString() } });

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
      ? replacedRejectedFile
        ? "Replacement uploaded successfully. Globalflowa will review the new file and update its status."
        : "Document uploaded successfully. Globalflowa will review it and update the status."
      : "Note saved successfully.",
    fileId,
    replacement: replacedRejectedFile,
  });
}

function customerOwnsRequest(request: RequestRow, userId: string) {
  if (!request.customer_access_enabled) return false;
  return request.customer_user_id === userId;
}
