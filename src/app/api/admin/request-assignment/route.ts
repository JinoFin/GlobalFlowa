import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/auth-server";
import { isAdminUser } from "@/lib/supabase/roles";
import { getSupabaseServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const assignmentSchema = z.object({
  request_id: z.string().uuid(),
  assigned_to: z.string().uuid().nullable(),
  priority: z.enum(["low", "normal", "high", "urgent"]),
  due_at: z.string().datetime({ offset: true }).nullable(),
});

type RequestOperationsRow = {
  id: string;
  assigned_to: string | null;
  priority: string;
  due_at: string | null;
};

export async function POST(request: Request) {
  let supabase;

  try {
    supabase = await createSupabaseServerClient();
  } catch (error) {
    console.error("Request assignment auth setup failed", {
      reason: error instanceof Error ? error.message : "unknown error",
    });
    return NextResponse.json({ error: "Request assignment is not configured." }, { status: 503 });
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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = assignmentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Check the assignee, priority, and due date." }, { status: 400 });
  }
  const payload = parsed.data;

  const { data: existingData, error: requestError } = await dataClient
    .from("service_requests")
    .select("id, assigned_to, priority, due_at")
    .eq("id", payload.request_id)
    .maybeSingle();

  if (requestError) {
    console.error("Request assignment target lookup failed", {
      requestId: payload.request_id,
      reason: requestError.message,
    });
    return NextResponse.json({ error: "Could not load the request assignment." }, { status: 500 });
  }
  if (!existingData) {
    return NextResponse.json({ error: "Request not found." }, { status: 404 });
  }

  if (payload.assigned_to) {
    const { data: assignee, error: assigneeError } = await dataClient
      .from("profiles")
      .select("id, role")
      .eq("id", payload.assigned_to)
      .in("role", ["admin", "team"])
      .maybeSingle();

    if (assigneeError || !assignee) {
      return NextResponse.json({ error: "Select a valid admin or team member." }, { status: 400 });
    }
  }

  const existing = existingData as RequestOperationsRow;
  const assignmentChanged = existing.assigned_to !== payload.assigned_to;
  const priorityChanged = existing.priority !== payload.priority;
  const normalizedExistingDueAt = existing.due_at ? new Date(existing.due_at).toISOString() : null;
  const dueDateChanged = normalizedExistingDueAt !== payload.due_at;

  if (!assignmentChanged && !priorityChanged && !dueDateChanged) {
    return NextResponse.json({ ok: true, message: "No operational changes to save." });
  }

  const now = new Date().toISOString();
  const { error: updateError } = await dataClient
    .from("service_requests")
    .update({
      assigned_to: payload.assigned_to,
      priority: payload.priority,
      due_at: payload.due_at,
      ...(assignmentChanged
        ? {
            assigned_at: payload.assigned_to ? now : null,
            assigned_by: payload.assigned_to ? user.id : null,
          }
        : {}),
      updated_at: now,
    })
    .eq("id", payload.request_id);

  if (updateError) {
    console.error("Request assignment update failed", {
      requestId: payload.request_id,
      reason: updateError.message,
    });
    return NextResponse.json({ error: "Could not save request ownership and deadline." }, { status: 500 });
  }

  const activityRows: Array<Record<string, unknown>> = [];
  if (assignmentChanged) {
    activityRows.push({
      request_id: payload.request_id,
      actor_id: user.id,
      actor_type: "admin",
      action: existing.assigned_to ? "request_reassigned" : "request_assigned",
      details: { previous_assignee: existing.assigned_to, assigned_to: payload.assigned_to },
    });
  }
  if (priorityChanged) {
    activityRows.push({
      request_id: payload.request_id,
      actor_id: user.id,
      actor_type: "admin",
      action: "request_priority_changed",
      details: { previous_priority: existing.priority, priority: payload.priority },
    });
  }
  if (dueDateChanged) {
    activityRows.push({
      request_id: payload.request_id,
      actor_id: user.id,
      actor_type: "admin",
      action: "request_due_date_changed",
      details: { previous_due_at: existing.due_at, due_at: payload.due_at },
    });
  }

  const { error: activityError } = await dataClient.from("request_activity_log").insert(activityRows);
  if (activityError) {
    console.error("Request assignment activity logging failed after persistence", {
      requestId: payload.request_id,
      reason: activityError.message,
    });
    return NextResponse.json(
      { ok: true, warning: "Ownership was saved, but the activity timeline could not be updated." },
      { status: 200 },
    );
  }

  return NextResponse.json({ ok: true, message: "Ownership and deadline updated." });
}
