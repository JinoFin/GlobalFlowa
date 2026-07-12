import { NextResponse } from "next/server";
import { z } from "zod";
import { activeLifecycleStages, lifecycleStages } from "@/lib/request-lifecycle";
import { createSupabaseServerClient } from "@/lib/supabase/auth-server";
import { isAdminUser } from "@/lib/supabase/roles";
import { hasTrustedMutationOrigin } from "@/lib/http/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  request_id: z.string().uuid(),
  action: z.enum(["complete", "reopen", "archive", "restore"]),
  customer_completion_note: z.string().trim().max(2000).nullable().optional(),
  completion_summary: z.string().trim().max(4000).nullable().optional(),
  target_stage: z.enum(lifecycleStages).nullable().optional(),
  confirm_warnings: z.boolean().default(false),
}).strict().superRefine((value, context) => {
  if (value.action === "complete" && !value.customer_completion_note?.trim()) context.addIssue({ code: "custom", path: ["customer_completion_note"], message: "A customer completion note is required." });
  if (value.action === "reopen" && value.target_stage && !activeLifecycleStages.includes(value.target_stage as (typeof activeLifecycleStages)[number])) context.addIssue({ code: "custom", path: ["target_stage"], message: "Choose a valid active lifecycle stage." });
  if (value.target_stage === "archived") context.addIssue({ code: "custom", path: ["target_stage"], message: "Archived is not a valid target stage." });
});

export async function POST(request: Request) {
  if (!hasTrustedMutationOrigin(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  let supabase;
  try { supabase = await createSupabaseServerClient(); }
  catch { return NextResponse.json({ error: "Request lifecycle actions are not configured." }, { status: 503 }); }
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user || !(await isAdminUser(supabase, userData.user))) return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Check the submitted lifecycle action.", fieldErrors: parsed.error.flatten().fieldErrors }, { status: 400 });
  const { data, error } = await supabase.rpc("perform_request_lifecycle_action", {
    p_request_id: parsed.data.request_id,
    p_action: parsed.data.action,
    p_customer_completion_note: parsed.data.customer_completion_note ?? null,
    p_completion_summary: parsed.data.completion_summary ?? null,
    p_target_stage: parsed.data.target_stage ?? null,
    p_confirm_warnings: parsed.data.confirm_warnings,
  });
  if (error) {
    console.error("Request lifecycle action failed", { requestId: parsed.data.request_id, action: parsed.data.action, reason: error.message });
    return NextResponse.json({ error: "The request lifecycle could not be updated." }, { status: 400 });
  }
  const result = data as { ok?: boolean; unchanged?: boolean; requires_confirmation?: boolean; warnings?: string[]; stage?: string } | null;
  if (result?.requires_confirmation) return NextResponse.json({ error: "Review and confirm the completion warnings.", warnings: result.warnings ?? [], requires_confirmation: true }, { status: 409 });
  return NextResponse.json({ ok: true, unchanged: Boolean(result?.unchanged), stage: result?.stage ?? null, warnings: result?.warnings ?? [] });
}
