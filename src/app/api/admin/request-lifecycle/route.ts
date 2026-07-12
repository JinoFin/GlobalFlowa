import { NextResponse } from "next/server";
import { z } from "zod";
import { editableLifecycleStages } from "@/lib/request-lifecycle";
import { createSupabaseServerClient } from "@/lib/supabase/auth-server";
import { isAdminUser } from "@/lib/supabase/roles";
import { hasTrustedMutationOrigin } from "@/lib/http/security";

const schema = z.object({ request_id: z.string().uuid(), lifecycle_stage: z.enum(editableLifecycleStages) }).strict();

export async function POST(request: Request) {
  if (!hasTrustedMutationOrigin(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  try {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase.auth.getUser();
    if (!data.user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    if (!(await isAdminUser(supabase, data.user))) return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "Invalid request or lifecycle stage." }, { status: 400 });
    const { data: result, error } = await supabase.rpc("update_request_lifecycle_stage", {
      p_request_id: parsed.data.request_id,
      p_lifecycle_stage: parsed.data.lifecycle_stage,
    });
    if (error?.code === "P0002") return NextResponse.json({ error: "Request not found." }, { status: 404 });
    if (error?.code === "22023") return NextResponse.json({ error: "Use the completion and archive controls to change a terminal request." }, { status: 409 });
    if (error) throw error;
    return NextResponse.json(result);
  } catch (error) {
    console.error("Lifecycle update failed", { reason: error instanceof Error ? error.message : "unknown" });
    return NextResponse.json({ error: "Lifecycle stage could not be updated." }, { status: 500 });
  }
}
