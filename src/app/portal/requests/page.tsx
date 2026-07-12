import Link from "next/link";
import { redirect } from "next/navigation";
import { PortalConfigNotice, StatusBadge, formatDate } from "./portal-ui";
import { AppPageHeader } from "@/components/app-page";
import { ClaimRequestsButton } from "@/components/portal/claim-requests-button";
import { isVerifiedCustomer } from "@/lib/auth/customer";
import { createSupabaseServerClient } from "@/lib/supabase/auth-server";
import { getSupabaseServiceClient } from "@/lib/supabase/server";
import { getCustomerNextAction, lifecycleInfo, lifecycleProgress, normalizeLifecycleStage } from "@/lib/request-lifecycle";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Customer Requests",
};

type RequestRow = {
  id: string;
  created_at: string;
  status: string;
  urgency: string | null;
  company_name: string;
  main_service: string | null;
  lifecycle_stage: string;
  lifecycle_stage_updated_at: string | null;
  completed_at: string | null;
  customer_completion_note: string | null;
  archived_at: string | null;
};

type ChecklistRow = {
  request_id: string;
  status: string;
  required: boolean;
};

export default async function PortalRequestsPage({ searchParams }: { searchParams: Promise<{ linked?: string }> }) {
  let supabase;

  try {
    supabase = await createSupabaseServerClient();
  } catch (error) {
    return <PortalConfigNotice message={error instanceof Error ? error.message : "Supabase auth is not configured."} />;
  }

  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user || !(await isVerifiedCustomer(supabase, user))) {
    redirect("/portal/login");
  }

  let dataClient;
  try { dataClient = getSupabaseServiceClient(); }
  catch { return <PortalConfigNotice message="Your requests are temporarily unavailable." />; }

  const { data: requests, error } = await dataClient
    .from("service_requests")
    .select("id, created_at, company_name, main_service, lifecycle_stage, lifecycle_stage_updated_at, completed_at, customer_completion_note, archived_at")
    .eq("customer_access_enabled", true)
    .eq("customer_user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return <PortalConfigNotice message="Your requests could not be loaded. Please contact Globalflowa if this continues." />;
  }

  const requestRows = (requests ?? []) as RequestRow[];
  const linkedCount = Number.parseInt((await searchParams).linked ?? "", 10);
  const requestIds = requestRows.map((request) => request.id);
  const [{ data: checklistRows }, { data: deliverableRows }] = requestIds.length
    ? await Promise.all([
        dataClient.from("request_document_checklist").select("request_id, status, required").in("request_id", requestIds).eq("customer_visible", true),
        dataClient.from("request_files").select("request_id").in("request_id", requestIds).eq("is_final_deliverable", true).eq("customer_visible", true).not("published_at", "is", null).is("deleted_at", null),
      ])
    : [{ data: [] }, { data: [] }];
  const summaries = summarizeChecklist((checklistRows ?? []) as ChecklistRow[]);
  const checklistByRequest = new Map<string, ChecklistRow[]>();
  for (const item of (checklistRows ?? []) as ChecklistRow[]) checklistByRequest.set(item.request_id, [...(checklistByRequest.get(item.request_id) ?? []), item]);
  const requestsWithDeliverables = new Set((deliverableRows ?? []).map((row) => row.request_id as string));

  return (
    <div className="bg-navy-50 px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <AppPageHeader eyebrow="Customer Portal" title="My Requests" description="Follow request progress, see document requirements, and upload missing or corrected files." breadcrumbs={[{ label: "Dashboard", href: "/portal" }, { label: "My Requests" }]} actions={<Link href="/request" className="rounded-md bg-teal-500 px-4 py-2 text-sm font-semibold text-navy-950">Start New Request</Link>} />

        {Number.isSafeInteger(linkedCount) && linkedCount > 0 ? (
          <p className="mt-6 rounded-md border border-teal-200 bg-teal-50 p-4 text-sm font-semibold text-teal-800" role="status">We linked {linkedCount} existing request{linkedCount === 1 ? "" : "s"} to your account.</p>
        ) : null}

        {requestRows.length === 0 ? (
          <div className="mt-8 rounded-md border border-dashed border-navy-200 bg-white p-8 text-center">
            <h2 className="text-xl font-semibold text-navy-950">No linked requests yet</h2>
            <p className="mt-3 text-sm leading-6 text-navy-650">
              No requests are currently linked to this account. Existing requests may have been created with another email address.
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-4 text-sm font-semibold"><Link href="/request" className="text-teal-700">Submit a new request</Link><Link href="/contact" className="text-teal-700">Contact Globalflowa</Link></div>
            <ClaimRequestsButton />
          </div>
        ) : (
          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {requestRows.map((request) => {
              const summary = summaries.get(request.id) ?? { total: 0, accepted: 0, action: 0, percent: 0 };
              const stage = normalizeLifecycleStage(request.lifecycle_stage);
              const hasPublishedDeliverables = requestsWithDeliverables.has(request.id);
              const nextAction = getCustomerNextAction({ stage, checklist: checklistByRequest.get(request.id) ?? [], hasPublishedDeliverables });
              return (
                <Link
                  key={request.id}
                  href={`/portal/requests/${request.id}`}
                  className="rounded-md border border-navy-100 bg-white p-5 shadow-sm transition hover:border-teal-300 hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-mono text-xs text-navy-500">{request.id.slice(0, 8)}</p>
                      <h2 className="mt-2 text-lg font-semibold text-navy-950">{request.company_name}</h2>
                    </div>
                    <StatusBadge status={lifecycleInfo[stage].label} />
                  </div>
                  <p className="mt-3 text-sm text-navy-650">{request.main_service ?? "Service request"}</p>
                  <p className="mt-1 text-xs text-navy-500">{formatDate(request.created_at)}</p>
                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-navy-100"><div className="h-full rounded-full bg-teal-600" style={{ width: `${lifecycleProgress(stage)}%` }} /></div>
                  <p className="mt-2 text-sm font-semibold text-navy-700">{nextAction.label}</p>
                  {nextAction.tone === "action" ? <p className="mt-2 inline-flex rounded-full bg-red-50 px-2 py-1 text-xs font-semibold text-red-700">Action required</p> : null}
                  {stage === "completed" ? <p className="mt-2 inline-flex rounded-full bg-teal-50 px-2 py-1 text-xs font-semibold text-teal-800">Completed{request.completed_at ? ` · ${formatDate(request.completed_at)}` : ""}</p> : null}
                  {stage === "archived" ? <p className="mt-2 inline-flex rounded-full bg-navy-100 px-2 py-1 text-xs font-semibold text-navy-700">Archived · Read only</p> : null}
                  {hasPublishedDeliverables ? <p className="mt-2 inline-flex rounded-full bg-teal-50 px-2 py-1 text-xs font-semibold text-teal-800">Final documents available</p> : null}
                  {stage === "completed" && request.customer_completion_note ? <p className="mt-2 line-clamp-2 text-xs text-navy-650">{request.customer_completion_note}</p> : null}
                  {request.lifecycle_stage_updated_at ? <p className="mt-1 text-xs text-navy-500">Progress updated {formatDate(request.lifecycle_stage_updated_at)}</p> : null}
                  <div className="mt-5">
                    <div className="h-2 overflow-hidden rounded-full bg-navy-100">
                      <div className="h-full rounded-full bg-teal-600" style={{ width: `${summary.percent}%` }} />
                    </div>
                    <p className="mt-2 text-xs text-navy-650">
                      {summary.accepted}/{summary.total} required accepted
                      {summary.action ? ` · ${summary.action} need action` : ""}
                    </p>
                  </div>
                  <span className="mt-5 inline-block text-sm font-semibold text-teal-700">View request</span>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function summarizeChecklist(rows: ChecklistRow[]) {
  const summaries = new Map<string, { total: number; accepted: number; action: number; percent: number }>();

  for (const row of rows) {
    const summary = summaries.get(row.request_id) ?? { total: 0, accepted: 0, action: 0, percent: 0 };
    if (row.required) {
      summary.total += 1;
      if (row.status === "accepted") summary.accepted += 1;
      if (["required", "missing", "incorrect", "expired"].includes(row.status)) summary.action += 1;
    }
    summary.percent = summary.total ? Math.round((summary.accepted / summary.total) * 100) : 0;
    summaries.set(row.request_id, summary);
  }

  return summaries;
}
