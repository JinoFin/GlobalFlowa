import { NextResponse } from "next/server";
import { z } from "zod";
import { sendCustomerMessageEmail } from "@/lib/email/send";
import { createSupabaseServerClient } from "@/lib/supabase/auth-server";
import { isAdminUser } from "@/lib/supabase/roles";
import { getSupabaseServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const customerMessageSchema = z.object({
  request_id: z.string().uuid(),
  subject: z.string().trim().min(1).max(200),
  message: z.string().trim().min(1).max(5000),
  checklist_item_ids: z.array(z.string().uuid()).min(1).max(100),
});

const customerActionStatuses = new Set(["required", "missing", "incorrect", "expired"]);
const waitingStatuses = new Set(["New", "In Review", "Missing Documents"]);

type RequestRow = {
  id: string;
  company_name: string;
  email: string;
  customer_email: string | null;
  status: string;
  lifecycle_stage: string;
};

type ChecklistRow = {
  id: string;
  title: string;
  status: string;
  customer_visible: boolean;
};

export async function POST(request: Request) {
  let supabase;

  try {
    supabase = await createSupabaseServerClient();
  } catch (error) {
    console.error("Customer message auth client setup failed", {
      reason: error instanceof Error ? error.message : "unknown error",
    });
    return NextResponse.json({ error: "Customer messaging is not configured." }, { status: 503 });
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

  const parsed = customerMessageSchema.safeParse(rawPayload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Check the request, subject, message, and selected checklist items." },
      { status: 400 },
    );
  }

  const payload = parsed.data;
  const checklistItemIds = [...new Set(payload.checklist_item_ids)];

  const { data: requestData, error: requestError } = await dataClient
    .from("service_requests")
    .select("id, company_name, email, customer_email, status, lifecycle_stage")
    .eq("id", payload.request_id)
    .maybeSingle();

  if (requestError) {
    console.error("Customer message request lookup failed", {
      requestId: payload.request_id,
      reason: requestError.message,
    });
    return NextResponse.json({ error: "Could not load the request." }, { status: 500 });
  }
  if (!requestData) {
    return NextResponse.json({ error: "Request not found." }, { status: 404 });
  }

  const requestRow = requestData as RequestRow;
  const customerEmail = (requestRow.customer_email || requestRow.email || "").trim();
  if (!z.string().email().safeParse(customerEmail).success) {
    return NextResponse.json({ error: "The request does not have a valid customer email." }, { status: 422 });
  }

  const { data: checklistData, error: checklistError } = await dataClient
    .from("request_document_checklist")
    .select("id, title, status, customer_visible")
    .eq("request_id", payload.request_id)
    .in("id", checklistItemIds);

  if (checklistError) {
    console.error("Customer message checklist lookup failed", {
      requestId: payload.request_id,
      reason: checklistError.message,
    });
    return NextResponse.json({ error: "Could not validate the selected checklist items." }, { status: 500 });
  }

  const checklistRows = (checklistData ?? []) as ChecklistRow[];
  const validSelection =
    checklistRows.length === checklistItemIds.length &&
    checklistRows.every(
      (item) => item.customer_visible && customerActionStatuses.has(item.status),
    );

  if (!validSelection) {
    return NextResponse.json(
      { error: "Select only customer-visible checklist items that require action." },
      { status: 400 },
    );
  }

  const checklistById = new Map(checklistRows.map((item) => [item.id, item]));
  const orderedChecklist = checklistItemIds
    .map((id) => checklistById.get(id))
    .filter((item): item is ChecklistRow => Boolean(item));

  const { data: customerMessage, error: insertError } = await dataClient
    .from("customer_messages")
    .insert({
      request_id: payload.request_id,
      author_id: user.id,
      subject: payload.subject,
      message: payload.message,
      checklist_item_ids: checklistItemIds,
      sent_to_email: customerEmail,
      email_status: "pending",
      customer_visible: true,
    })
    .select("id")
    .single();

  if (insertError || !customerMessage) {
    console.error("Customer message persistence failed", {
      requestId: payload.request_id,
      reason: insertError?.message ?? "missing inserted row",
    });
    return NextResponse.json({ error: "Could not save the customer message." }, { status: 500 });
  }

  let emailStatus: "sent" | "failed" = "sent";
  let sentAt: string | null = null;

  try {
    await sendCustomerMessageEmail({
      customerEmail,
      companyName: requestRow.company_name,
      requestId: requestRow.id,
      subject: payload.subject,
      message: payload.message,
      checklistItems: orderedChecklist.map((item) => ({
        title: item.title,
        status: item.status,
      })),
    });
    sentAt = new Date().toISOString();
  } catch (error) {
    emailStatus = "failed";
    sentAt = null;
    console.error("Customer message email failed after persistence", {
      requestId: payload.request_id,
      customerMessageId: customerMessage.id,
      reason: error instanceof Error ? error.message : "unknown error",
    });
  }

  const now = new Date().toISOString();
  const postSaveFailures: string[] = [];
  const { error: messageUpdateError } = await dataClient
    .from("customer_messages")
    .update({
      email_status: emailStatus,
      sent_at: sentAt,
      updated_at: now,
    })
    .eq("id", customerMessage.id);

  if (messageUpdateError) {
    postSaveFailures.push("delivery status");
    console.error("Customer message status update failed", {
      requestId: payload.request_id,
      customerMessageId: customerMessage.id,
      reason: messageUpdateError.message,
    });
  }

  const { error: activityError } = await dataClient.from("request_activity_log").insert({
    request_id: payload.request_id,
    actor_id: user.id,
    actor_type: "admin",
    action: "customer_message_sent",
    details: {
      subject: payload.subject,
      checklist_item_ids: checklistItemIds,
      sent_to_email: customerEmail,
      email_status: emailStatus,
    },
  });

  if (activityError) {
    postSaveFailures.push("activity log");
    console.error("Customer message activity log insert failed", {
      requestId: payload.request_id,
      customerMessageId: customerMessage.id,
      reason: activityError.message,
    });
  }

  let requestStatus = requestRow.status;
  if (waitingStatuses.has(requestRow.status)) {
    const { data: updatedRequest, error: statusError } = await dataClient
      .from("service_requests")
      .update({ status: "Waiting for Customer", updated_at: now, ...(!["completed", "archived"].includes(requestRow.lifecycle_stage) ? { lifecycle_stage: "waiting_for_documents", lifecycle_stage_updated_at: now, lifecycle_stage_updated_by: user.id } : {}) })
      .eq("id", payload.request_id)
      .eq("status", requestRow.status)
      .select("status")
      .maybeSingle();

    if (statusError) {
      postSaveFailures.push("request status");
      console.error("Customer message request status update failed", {
        requestId: payload.request_id,
        customerMessageId: customerMessage.id,
        reason: statusError.message,
      });
    } else if (updatedRequest) {
      requestStatus = updatedRequest.status as string;
      if (!["completed", "archived", "waiting_for_documents"].includes(requestRow.lifecycle_stage)) await dataClient.from("request_activity_log").insert({ request_id: payload.request_id, actor_id: user.id, actor_type: "admin", action: "lifecycle_stage_changed", details: { previous_stage: requestRow.lifecycle_stage, new_stage: "waiting_for_documents", changed_at: now } });
    } else {
      const { data: latestRequest } = await dataClient
        .from("service_requests")
        .select("status")
        .eq("id", payload.request_id)
        .maybeSingle();
      requestStatus = (latestRequest?.status as string | undefined) ?? requestRow.status;
    }
  }

  if (postSaveFailures.length) {
    return NextResponse.json(
      {
        error: `The message was saved, but these follow-up updates failed: ${postSaveFailures.join(", ")}. Do not send it again.`,
        messagePersisted: true,
      },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    customerMessageId: customerMessage.id,
    emailStatus,
    requestStatus,
    message:
      emailStatus === "sent"
        ? "Request sent to the customer."
        : "Message saved in the customer portal, but the email could not be sent.",
  });
}
