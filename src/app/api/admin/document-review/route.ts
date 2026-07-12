import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/auth-server";
import { isAdminUser } from "@/lib/supabase/roles";
import { getSupabaseServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const documentReviewSchema = z
  .object({
    action: z.enum(["accept_document", "reject_document"]),
    request_id: z.string().uuid(),
    checklist_item_id: z.string().uuid(),
    file_id: z.string().uuid(),
    note: z.string().trim().max(2000).optional(),
  })
  .superRefine((value, context) => {
    if (value.action === "reject_document" && !value.note) {
      context.addIssue({
        code: "custom",
        path: ["note"],
        message: "A customer-facing correction note is required.",
      });
    }
  });

type RequestFileRow = {
  id: string;
  request_id: string;
  uploaded_by_role: string;
  linked_checklist_item_id: string | null;
};

type ChecklistRow = {
  id: string;
  request_id: string;
  title: string;
  linked_file_id: string | null;
};

export async function POST(request: Request) {
  let supabase;

  try {
    supabase = await createSupabaseServerClient();
  } catch (error) {
    console.error("Document review auth client setup failed", {
      reason: error instanceof Error ? error.message : "unknown error",
    });
    return NextResponse.json({ error: "Document review is not configured." }, { status: 503 });
  }

  const { data: userData, error: userError } = await supabase.auth.getUser();
  const user = userData.user;
  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (!(await isAdminUser(supabase, user))) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }
  const dataClient = getSupabaseServiceClient();

  let rawPayload: unknown;
  try {
    rawPayload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = documentReviewSchema.safeParse(rawPayload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Check the review action, request, file, checklist item, and correction note." },
      { status: 400 },
    );
  }

  const payload = parsed.data;
  const [{ data: fileData, error: fileError }, { data: checklistData, error: checklistError }] =
    await Promise.all([
      dataClient
        .from("request_files")
        .select("id, request_id, uploaded_by_role, linked_checklist_item_id")
        .eq("id", payload.file_id)
        .eq("request_id", payload.request_id)
        .maybeSingle(),
      dataClient
        .from("request_document_checklist")
        .select("id, request_id, title, linked_file_id")
        .eq("id", payload.checklist_item_id)
        .eq("request_id", payload.request_id)
        .maybeSingle(),
    ]);

  if (fileError || checklistError) {
    console.error("Document review target lookup failed", {
      requestId: payload.request_id,
      fileId: payload.file_id,
      checklistItemId: payload.checklist_item_id,
      reason: fileError?.message ?? checklistError?.message ?? "unknown error",
    });
    return NextResponse.json({ error: "Could not validate the document review target." }, { status: 500 });
  }

  if (!fileData || !checklistData) {
    return NextResponse.json({ error: "Document or checklist item not found." }, { status: 404 });
  }

  const fileRow = fileData as RequestFileRow;
  const checklistRow = checklistData as ChecklistRow;
  if (
    fileRow.uploaded_by_role !== "customer" ||
    checklistRow.linked_file_id !== fileRow.id ||
    (fileRow.linked_checklist_item_id !== null &&
      fileRow.linked_checklist_item_id !== checklistRow.id)
  ) {
    return NextResponse.json(
      { error: "This file is no longer the current customer upload for the checklist item." },
      { status: 409 },
    );
  }

  const isAccepted = payload.action === "accept_document";
  const now = new Date().toISOString();
  const checklistUpdate = isAccepted
    ? {
        status: "accepted",
        admin_note_customer_visible: false,
        updated_at: now,
      }
    : {
        status: "incorrect",
        admin_note: payload.note,
        admin_note_customer_visible: true,
        customer_visible: true,
        updated_at: now,
      };

  const { data: updatedChecklist, error: updateError } = await dataClient
    .from("request_document_checklist")
    .update(checklistUpdate)
    .eq("id", checklistRow.id)
    .eq("request_id", payload.request_id)
    .eq("linked_file_id", fileRow.id)
    .select("status")
    .maybeSingle();

  if (updateError) {
    console.error("Document review checklist update failed", {
      requestId: payload.request_id,
      fileId: payload.file_id,
      checklistItemId: payload.checklist_item_id,
      reason: updateError.message,
    });
    return NextResponse.json({ error: "Could not save the document review." }, { status: 500 });
  }

  if (!updatedChecklist) {
    return NextResponse.json(
      { error: "The linked file changed before this review was saved. Refresh and review the current file." },
      { status: 409 },
    );
  }

  const action = isAccepted ? "document_accepted" : "document_rejected";
  const { error: activityError } = await dataClient.from("request_activity_log").insert({
    request_id: payload.request_id,
    actor_id: user.id,
    actor_type: "admin",
    action,
    details: {
      checklist_item_id: checklistRow.id,
      checklist_item: checklistRow.title,
      file_id: fileRow.id,
      reviewer: user.id,
      ...(isAccepted ? {} : { note: payload.note }),
    },
  });

  if (activityError) {
    console.error("Document review activity log insert failed", {
      requestId: payload.request_id,
      fileId: payload.file_id,
      checklistItemId: payload.checklist_item_id,
      reason: activityError.message,
    });
    return NextResponse.json(
      {
        error: "The review was saved, but the activity entry could not be recorded. Do not submit it again.",
        reviewPersisted: true,
        status: updatedChecklist.status,
      },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    status: updatedChecklist.status,
    customerVisibleNote: isAccepted ? null : payload.note,
    message: isAccepted
      ? "Document accepted."
      : "Correction requested. The customer can see the note and upload a replacement.",
  });
}
