import { NextResponse } from "next/server";
import { z } from "zod";
import { editableLifecycleStages } from "@/lib/request-lifecycle";
import { createSupabaseServerClient } from "@/lib/supabase/auth-server";
import { isAdminUser } from "@/lib/supabase/roles";

const schema = z.object({ request_id: z.string().uuid(), lifecycle_stage: z.enum(editableLifecycleStages) }).strict();

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase.auth.getUser();
    if (!data.user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    if (!(await isAdminUser(supabase, data.user))) return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "Invalid request or lifecycle stage." }, { status: 400 });
    const { data: existing, error: lookupError } = await supabase.from("service_requests").select("id, lifecycle_stage").eq("id", parsed.data.request_id).maybeSingle();
    if (lookupError) throw lookupError;
    if (!existing) return NextResponse.json({ error: "Request not found." }, { status: 404 });
    if (["completed", "archived"].includes(existing.lifecycle_stage)) return NextResponse.json({ error: "Use the completion and archive controls to reopen or restore this request." }, { status: 409 });
    if (existing.lifecycle_stage === parsed.data.lifecycle_stage) return NextResponse.json({ ok: true, unchanged: true });
    const now = new Date().toISOString();
    const { error } = await supabase.from("service_requests").update({ lifecycle_stage: parsed.data.lifecycle_stage, lifecycle_stage_updated_at: now, lifecycle_stage_updated_by: data.user.id }).eq("id", existing.id);
    if (error) throw error;
    await supabase.from("request_activity_log").insert({ request_id: existing.id, actor_id: data.user.id, actor_type: "admin", action: "lifecycle_stage_changed", details: { previous_stage: existing.lifecycle_stage, new_stage: parsed.data.lifecycle_stage, changed_at: now } });
    return NextResponse.json({ ok: true, updated_at: now });
  } catch (error) {
    console.error("Lifecycle update failed", { reason: error instanceof Error ? error.message : "unknown" });
    return NextResponse.json({ error: "Lifecycle stage could not be updated." }, { status: 500 });
  }
}
