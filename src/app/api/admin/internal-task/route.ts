import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/auth-server";
import { isAdminUser } from "@/lib/supabase/roles";
import { getSupabaseServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const prioritySchema = z.enum(["low", "normal", "high", "urgent"]);
const dueAtSchema = z.string().datetime({ offset: true }).nullable();

const taskActionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("create"),
    request_id: z.string().uuid(),
    title: z.string().trim().min(1).max(200),
    description: z.string().trim().max(4000).nullable(),
    priority: prioritySchema,
    assigned_to: z.string().uuid().nullable(),
    due_at: dueAtSchema,
  }),
  z.object({
    action: z.literal("update"),
    request_id: z.string().uuid(),
    task_id: z.string().uuid(),
    title: z.string().trim().min(1).max(200),
    description: z.string().trim().max(4000).nullable(),
    status: z.enum(["open", "in_progress", "blocked"]),
    priority: prioritySchema,
    assigned_to: z.string().uuid().nullable(),
    due_at: dueAtSchema,
  }),
  z.object({ action: z.enum(["complete", "reopen", "cancel"]), request_id: z.string().uuid(), task_id: z.string().uuid() }),
]);

type TaskRow = {
  id: string;
  request_id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  assigned_to: string | null;
  due_at: string | null;
};

export async function POST(request: Request) {
  let supabase;
  try {
    supabase = await createSupabaseServerClient();
  } catch (error) {
    console.error("Internal task auth setup failed", {
      reason: error instanceof Error ? error.message : "unknown error",
    });
    return NextResponse.json({ error: "Internal tasks are not configured." }, { status: 503 });
  }

  const { data: userData, error: userError } = await supabase.auth.getUser();
  const user = userData.user;
  if (userError || !user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  if (!(await isAdminUser(supabase, user))) return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  const dataClient = getSupabaseServiceClient();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const parsed = taskActionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Check the task title, status, assignee, priority, and due date." }, { status: 400 });
  }
  const payload = parsed.data;

  if ("assigned_to" in payload && payload.assigned_to) {
    const { data: assignee } = await dataClient
      .from("profiles")
      .select("id")
      .eq("id", payload.assigned_to)
      .in("role", ["admin", "team"])
      .maybeSingle();
    if (!assignee) return NextResponse.json({ error: "Select a valid admin or team member." }, { status: 400 });
  }

  if (payload.action === "create") {
    const { data: serviceRequest } = await dataClient
      .from("service_requests")
      .select("id")
      .eq("id", payload.request_id)
      .maybeSingle();
    if (!serviceRequest) return NextResponse.json({ error: "Request not found." }, { status: 404 });

    const { data: task, error: insertError } = await dataClient
      .from("internal_tasks")
      .insert({
        request_id: payload.request_id,
        title: payload.title,
        description: payload.description || null,
        priority: payload.priority,
        assigned_to: payload.assigned_to,
        created_by: user.id,
        due_at: payload.due_at,
      })
      .select("id")
      .single();
    if (insertError || !task) {
      console.error("Internal task creation failed", { requestId: payload.request_id, reason: insertError?.message ?? "missing task" });
      return NextResponse.json({ error: "Could not create the internal task." }, { status: 500 });
    }

    const activityRows = [
      activityRow(payload.request_id, user.id, "internal_task_created", task.id, payload.title, {
        priority: payload.priority,
        assigned_to: payload.assigned_to,
        due_at: payload.due_at,
      }),
      ...(payload.assigned_to
        ? [activityRow(payload.request_id, user.id, "internal_task_assigned", task.id, payload.title, { assigned_to: payload.assigned_to })]
        : []),
    ];
    await logActivity(dataClient, activityRows, payload.request_id);
    return NextResponse.json({ ok: true, taskId: task.id, message: "Internal task created." });
  }

  const { data: existingData, error: taskError } = await dataClient
    .from("internal_tasks")
    .select("id, request_id, title, description, status, priority, assigned_to, due_at")
    .eq("id", payload.task_id)
    .eq("request_id", payload.request_id)
    .maybeSingle();
  if (taskError) {
    console.error("Internal task lookup failed", { requestId: payload.request_id, taskId: payload.task_id, reason: taskError.message });
    return NextResponse.json({ error: "Could not load the internal task." }, { status: 500 });
  }
  if (!existingData) return NextResponse.json({ error: "Internal task not found." }, { status: 404 });
  const existing = existingData as TaskRow;
  const now = new Date().toISOString();

  if (payload.action === "update") {
    const { error: updateError } = await dataClient
      .from("internal_tasks")
      .update({
        title: payload.title,
        description: payload.description || null,
        status: payload.status,
        priority: payload.priority,
        assigned_to: payload.assigned_to,
        due_at: payload.due_at,
        completed_at: null,
        updated_at: now,
      })
      .eq("id", existing.id)
      .eq("request_id", existing.request_id);
    if (updateError) return taskMutationError("update", updateError.message, existing);

    const assignmentChanged = existing.assigned_to !== payload.assigned_to;
    const rows = [
      activityRow(existing.request_id, user.id, "internal_task_updated", existing.id, payload.title, {
        status: payload.status,
        priority: payload.priority,
        due_at: payload.due_at,
      }),
      ...(assignmentChanged
        ? [activityRow(existing.request_id, user.id, "internal_task_assigned", existing.id, payload.title, {
            previous_assignee: existing.assigned_to,
            assigned_to: payload.assigned_to,
          })]
        : []),
    ];
    await logActivity(dataClient, rows, existing.request_id);
    return NextResponse.json({ ok: true, message: "Internal task updated." });
  }

  const transition = {
    complete: { status: "completed", completed_at: now, activity: "internal_task_completed", message: "Task completed." },
    reopen: { status: "open", completed_at: null, activity: "internal_task_reopened", message: "Task reopened." },
    cancel: { status: "cancelled", completed_at: null, activity: "internal_task_cancelled", message: "Task cancelled." },
  }[payload.action];

  const { error: transitionError } = await dataClient
    .from("internal_tasks")
    .update({ status: transition.status, completed_at: transition.completed_at, updated_at: now })
    .eq("id", existing.id)
    .eq("request_id", existing.request_id);
  if (transitionError) return taskMutationError(payload.action, transitionError.message, existing);

  await logActivity(
    dataClient,
    [activityRow(existing.request_id, user.id, transition.activity, existing.id, existing.title, {})],
    existing.request_id,
  );
  return NextResponse.json({ ok: true, message: transition.message });
}

function activityRow(
  requestId: string,
  actorId: string,
  action: string,
  taskId: string,
  title: string,
  details: Record<string, unknown>,
) {
  return {
    request_id: requestId,
    actor_id: actorId,
    actor_type: "admin",
    action,
    details: { task_id: taskId, task_title: title, ...details },
  };
}

async function logActivity(supabase: ReturnType<typeof getSupabaseServiceClient>, rows: Array<Record<string, unknown>>, requestId: string) {
  const { error } = await supabase.from("request_activity_log").insert(rows);
  if (error) console.error("Internal task activity logging failed after persistence", { requestId, reason: error.message });
}

function taskMutationError(action: string, reason: string, task: TaskRow) {
  console.error("Internal task mutation failed", { action, requestId: task.request_id, taskId: task.id, reason });
  return NextResponse.json({ error: "Could not update the internal task." }, { status: 500 });
}
