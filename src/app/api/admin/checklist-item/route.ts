import { NextResponse } from "next/server";
import { z } from "zod";
import { checklistStatuses } from "@/lib/document-checklist";
import { hasTrustedMutationOrigin } from "@/lib/http/security";
import { createSupabaseServerClient } from "@/lib/supabase/auth-server";
import { isAdminUser } from "@/lib/supabase/roles";
import { getSupabaseServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const checklistItemSchema = z.object({
  request_id: z.string().uuid(),
  checklist_item_id: z.string().uuid(),
  status: z.enum(checklistStatuses),
  admin_note: z.string().trim().max(2000).nullable(),
  admin_note_customer_visible: z.boolean(),
  linked_file_id: z.string().uuid().nullable(),
}).strict();

export async function POST(request: Request) {
  if (!hasTrustedMutationOrigin(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });

  let authClient;
  try { authClient = await createSupabaseServerClient(); }
  catch { return NextResponse.json({ error: "Document checklist updates are not configured." }, { status: 503 }); }

  const { data } = await authClient.auth.getUser();
  const user = data.user;
  if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  if (!(await isAdminUser(authClient, user))) return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  const parsed = checklistItemSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Check the checklist status, note, and linked file." }, { status: 400 });

  const payload = parsed.data;
  const dataClient = getSupabaseServiceClient();
  const { data: item } = await dataClient.from("request_document_checklist").select("id, document_key").eq("id", payload.checklist_item_id).eq("request_id", payload.request_id).maybeSingle();
  if (!item) return NextResponse.json({ error: "Checklist item not found." }, { status: 404 });

  if (payload.linked_file_id) {
    const { data: file } = await dataClient.from("request_files").select("id").eq("id", payload.linked_file_id).eq("request_id", payload.request_id).maybeSingle();
    if (!file) return NextResponse.json({ error: "Linked file not found on this request." }, { status: 400 });
  }

  const { error } = await dataClient.from("request_document_checklist").update({
    status: payload.status,
    admin_note: payload.admin_note,
    admin_note_customer_visible: payload.admin_note_customer_visible,
    linked_file_id: payload.linked_file_id,
    updated_at: new Date().toISOString(),
  }).eq("id", payload.checklist_item_id).eq("request_id", payload.request_id);
  if (error) return NextResponse.json({ error: "Could not save the checklist item." }, { status: 500 });

  await dataClient.from("request_activity_log").insert({
    request_id: payload.request_id,
    actor_id: user.id,
    actor_type: "admin",
    action: "checklist_updated",
    details: { document_key: item.document_key, status: payload.status, linked_file_id: payload.linked_file_id },
  });

  return NextResponse.json({ ok: true, message: "Checklist item saved." });
}
