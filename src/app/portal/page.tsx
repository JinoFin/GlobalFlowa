import Link from "next/link";
import { redirect } from "next/navigation";
import { isVerifiedCustomer } from "@/lib/auth/customer";
import { claimRequestsForCurrentCustomer } from "@/lib/portal/claim-requests";
import { createSupabaseServerClient } from "@/lib/supabase/auth-server";
import { getCustomerNextAction, lifecycleInfo, lifecycleProgress, normalizeLifecycleStage, type LifecycleStage } from "@/lib/request-lifecycle";
import { LogoutButtonShell, PortalConfigNotice, formatDate } from "./requests/portal-ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "Customer Dashboard" };

type DashboardRequest = { id: string; created_at: string; company_name: string; main_service: string | null; lifecycle_stage: string; lifecycle_stage_updated_at: string | null; completed_at: string | null; customer_completion_note: string | null; archived_at: string | null };
type ChecklistItem = { request_id: string; status: string; required: boolean };
type MessageItem = { request_id: string; checklist_item_ids: string[] };

export default async function PortalPage({ searchParams }: { searchParams: Promise<{ linked?: string }> }) {
  let supabase;
  try { supabase = await createSupabaseServerClient(); }
  catch { return <PortalConfigNotice message="Customer dashboard is not configured." />; }
  const { data } = await supabase.auth.getUser();
  if (!data.user || !(await isVerifiedCustomer(supabase, data.user))) redirect("/portal/login");
  const providedCount = Number.parseInt((await searchParams).linked ?? "", 10);
  const claimedCount = Number.isSafeInteger(providedCount) && providedCount > 0 ? providedCount : await claimRequestsForCurrentCustomer(supabase).catch(() => 0);
  const { data: requests, error } = await supabase.from("service_requests").select("id, created_at, company_name, main_service, lifecycle_stage, lifecycle_stage_updated_at, completed_at, customer_completion_note, archived_at").eq("customer_access_enabled", true).eq("customer_user_id", data.user.id).order("created_at", { ascending: false });
  if (error) return <PortalConfigNotice message="Your dashboard could not be loaded." />;
  const rows = (requests ?? []) as DashboardRequest[];
  const ids = rows.map((row) => row.id);
  const [{ data: checklist }, { data: messages }, { data: deliverables }] = ids.length ? await Promise.all([
    supabase.from("request_document_checklist").select("request_id, status, required").in("request_id", ids),
    supabase.from("customer_messages").select("request_id, checklist_item_ids").in("request_id", ids).eq("customer_visible", true),
    supabase.from("request_files").select("request_id").in("request_id", ids).eq("is_final_deliverable", true).eq("customer_visible", true).not("published_at", "is", null).is("deleted_at", null),
  ]) : [{ data: [] }, { data: [] }, { data: [] }];
  const checklistByRequest = groupChecklist((checklist ?? []) as ChecklistItem[]);
  const actionMessages = new Set(((messages ?? []) as MessageItem[]).filter((message) => message.checklist_item_ids.length > 0).map((message) => message.request_id));
  const finalDocumentRequests = new Set((deliverables ?? []).map((file) => file.request_id as string));
  const cards = rows.map((request) => {
    const stage = normalizeLifecycleStage(request.lifecycle_stage);
    const nextAction = getCustomerNextAction({ stage, checklist: checklistByRequest.get(request.id) ?? [], hasActionMessage: actionMessages.has(request.id), hasPublishedDeliverables: finalDocumentRequests.has(request.id) });
    return { request, stage, nextAction, hasFinalDocuments: finalDocumentRequests.has(request.id) };
  });
  const needsAction = cards.filter((card) => card.nextAction.tone === "action" && !["completed", "archived"].includes(card.stage));
  const inProgress = cards.filter((card) => !["completed", "archived"].includes(card.stage));
  const completed = cards.filter((card) => card.stage === "completed").sort((a, b) => new Date(b.request.completed_at ?? b.request.lifecycle_stage_updated_at ?? b.request.created_at).getTime() - new Date(a.request.completed_at ?? a.request.lifecycle_stage_updated_at ?? a.request.created_at).getTime());
  const withFinalDocuments = cards.filter((card) => card.hasFinalDocuments);
  const archived = cards.filter((card) => card.stage === "archived");

  return <div className="bg-navy-50 px-4 py-10 sm:px-6 lg:px-8"><div className="mx-auto max-w-7xl"><div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-sm font-semibold uppercase tracking-[0.18em] text-teal-700">Customer Portal</p><h1 className="mt-2 text-3xl font-semibold text-navy-950">Your dashboard</h1><p className="mt-3 text-sm text-navy-650">See what needs attention, what is progressing, and which final documents are ready.</p></div><LogoutButtonShell /></div>
    {claimedCount > 0 ? <p role="status" className="mt-6 rounded-md border border-teal-200 bg-teal-50 p-4 text-sm font-semibold text-teal-800">We linked {claimedCount} existing request{claimedCount === 1 ? "" : "s"} to your account.</p> : null}
    <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-label="Dashboard summary"><Summary label="Action required" value={needsAction.length} /><Summary label="Active requests" value={inProgress.length} /><Summary label="Completed" value={completed.length} /><Summary label="Final documents" value={withFinalDocuments.length} /></section>
    {!rows.length ? <div className="mt-8 rounded-md border border-dashed border-navy-200 bg-white p-8 text-center"><h2 className="text-xl font-semibold text-navy-950">No linked requests yet</h2><p className="mt-2 text-sm text-navy-650">Submit a new request or contact Globalflowa if an existing request used another email address.</p><div className="mt-4 flex justify-center gap-4 text-sm font-semibold text-teal-700"><Link href="/request">Submit request</Link><Link href="/contact">Contact Globalflowa</Link></div></div> : <div className="mt-8 space-y-10"><DashboardSection title="Needs your action" empty="Nothing needs your action right now." cards={needsAction} /><DashboardSection title="In progress" empty="No requests are currently in progress." cards={inProgress} /><DashboardSection title="Recently completed" empty="No completed requests yet." cards={completed.slice(0, 5)} /><DashboardSection title="Final documents available" empty="No final documents have been published yet." cards={withFinalDocuments} /><DashboardSection title="Archived requests" empty="No archived requests." cards={archived} secondary /></div>}
    <Link href="/portal/requests" className="mt-10 inline-flex text-sm font-semibold text-teal-700">View all requests</Link>
  </div></div>;
}

function DashboardSection({ title, empty, cards, secondary = false }: { title: string; empty: string; cards: Array<{ request: DashboardRequest; stage: LifecycleStage; nextAction: { label: string; tone: string }; hasFinalDocuments: boolean }>; secondary?: boolean }) {
  return <section><h2 className={`text-xl font-semibold ${secondary ? "text-navy-700" : "text-navy-950"}`}>{title}</h2>{cards.length ? <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{cards.map((card) => <RequestCard key={card.request.id} {...card} />)}</div> : <p className="mt-3 rounded-md border border-dashed border-navy-200 bg-white p-4 text-sm text-navy-650">{empty}</p>}</section>;
}

function RequestCard({ request, stage, nextAction, hasFinalDocuments }: { request: DashboardRequest; stage: LifecycleStage; nextAction: { label: string; tone: string }; hasFinalDocuments: boolean }) {
  return <Link href={`/portal/requests/${request.id}`} className="rounded-md border border-navy-100 bg-white p-5 shadow-sm transition hover:border-teal-300"><div className="flex items-start justify-between gap-3"><h3 className="font-semibold text-navy-950">{request.company_name}</h3><span className="rounded-full bg-navy-100 px-2 py-1 text-xs font-semibold text-navy-700">{lifecycleInfo[stage].label}</span></div><p className="mt-2 text-sm text-navy-650">{request.main_service ?? "Service request"}</p><div className="mt-4 h-2 overflow-hidden rounded-full bg-navy-100"><div className="h-full rounded-full bg-teal-600" style={{ width: `${lifecycleProgress(stage)}%` }} /></div>{nextAction.tone === "action" ? <p className="mt-3 inline-flex rounded-full bg-red-50 px-2 py-1 text-xs font-semibold text-red-700">Action required</p> : null}<p className="mt-3 text-sm font-semibold text-navy-800">{nextAction.label}</p><p className="mt-2 text-xs text-navy-500">Progress updated {formatDate(request.lifecycle_stage_updated_at ?? request.created_at)}</p>{stage === "completed" && request.completed_at ? <p className="mt-2 text-xs text-navy-500">Completed {formatDate(request.completed_at)}</p> : null}{stage === "archived" ? <p className="mt-2 text-xs font-semibold text-navy-600">Read-only reference</p> : null}{hasFinalDocuments ? <p className="mt-2 text-xs font-semibold text-teal-700">Final documents available</p> : null}</Link>;
}

function Summary({ label, value }: { label: string; value: number }) { return <div className="rounded-md border border-navy-100 bg-white p-5 shadow-sm"><p className="text-sm font-semibold text-navy-650">{label}</p><p className="mt-2 text-3xl font-semibold text-navy-950">{value}</p></div>; }
function groupChecklist(rows: ChecklistItem[]) { const map = new Map<string, ChecklistItem[]>(); for (const row of rows) map.set(row.request_id, [...(map.get(row.request_id) ?? []), row]); return map; }
