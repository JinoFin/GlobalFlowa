import { NextResponse } from "next/server";
import { z } from "zod";
import { hasTrustedMutationOrigin } from "@/lib/http/security";
import { createSupabaseServerClient } from "@/lib/supabase/auth-server";
import { isAdminUser } from "@/lib/supabase/roles";
import { getSupabaseServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const requestUpdateSchema = z.object({
  request_id: z.string().uuid(),
  status: z.enum(["New", "In Review", "Missing Documents", "Waiting for Customer", "Submitted to Authority", "In Progress", "Completed", "Cancelled"]),
  assigned_to: z.string().uuid().nullable(),
  note: z.string().trim().max(4000),
  missing_documents: z.array(z.string().trim().min(1).max(300)).max(100),
  customer_visible: z.boolean(),
}).strict();

export async function POST(request: Request) {
  if (!hasTrustedMutationOrigin(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });

  let authClient;
  try { authClient = await createSupabaseServerClient(); }
  catch { return NextResponse.json({ error: "Admin request updates are not configured." }, { status: 503 }); }

  const { data } = await authClient.auth.getUser();
  const user = data.user;
  if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  if (!(await isAdminUser(authClient, user))) return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  const parsed = requestUpdateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Check the status, assignee, note, and missing documents." }, { status: 400 });

  const payload = parsed.data;
  const dataClient = getSupabaseServiceClient();
  const { data: current } = await dataClient
    .from("service_requests")
    .select("id, status, assigned_to, lifecycle_stage")
    .eq("id", payload.request_id)
    .maybeSingle();
  if (!current) return NextResponse.json({ error: "Request not found." }, { status: 404 });
  if (payload.status === "Completed" && current.lifecycle_stage !== "completed") {
    return NextResponse.json({ error: "Use the completion workflow before setting a request to Completed." }, { status: 409 });
  }

  if (payload.assigned_to) {
    const { data: assignee } = await dataClient.from("profiles").select("id").eq("id", payload.assigned_to).in("role", ["admin", "team"]).maybeSingle();
    if (!assignee) return NextResponse.json({ error: "Select a valid admin or team member." }, { status: 400 });
  }

  const now = new Date().toISOString();
  const assignmentChanged = current.assigned_to !== payload.assigned_to;
  const { error: updateError } = await dataClient.from("service_requests").update({
    status: payload.status,
    assigned_to: payload.assigned_to,
    ...(assignmentChanged ? { assigned_at: payload.assigned_to ? now : null, assigned_by: payload.assigned_to ? user.id : null } : {}),
    updated_at: now,
  }).eq("id", payload.request_id);
  if (updateError) return NextResponse.json({ error: "Could not save the admin update." }, { status: 500 });

  if (payload.note || payload.missing_documents.length) {
    const { error: noteError } = await dataClient.from("admin_notes").insert({
      request_id: payload.request_id,
      author_id: user.id,
      note: payload.note || "Missing documents marked.",
      missing_documents: payload.missing_documents,
      customer_visible: payload.customer_visible,
    });
    if (noteError) return NextResponse.json({ error: "The request changed, but the note could not be saved." }, { status: 500 });
  }

  await dataClient.from("request_activity_log").insert({
    request_id: payload.request_id,
    actor_id: user.id,
    actor_type: "admin",
    action: "admin_update",
    details: { previous_status: current.status, status: payload.status, assigned_to: payload.assigned_to },
  });

  return NextResponse.json({ ok: true, message: "Saved." });
}
