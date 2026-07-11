import Link from "next/link";
import { redirect } from "next/navigation";
import { LogoutButtonShell, PortalConfigNotice, StatusBadge, formatDate } from "./portal-ui";
import { ClaimRequestsButton } from "@/components/portal/claim-requests-button";
import { isVerifiedCustomer } from "@/lib/auth/customer";
import { createSupabaseServerClient } from "@/lib/supabase/auth-server";

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

  const { data: requests, error } = await supabase
    .from("service_requests")
    .select("id, created_at, status, urgency, company_name, main_service")
    .eq("customer_access_enabled", true)
    .eq("customer_user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return <PortalConfigNotice message="Your requests could not be loaded. Please contact Globalflowa if this continues." />;
  }

  const requestRows = (requests ?? []) as RequestRow[];
  const linkedCount = Number.parseInt((await searchParams).linked ?? "", 10);
  const requestIds = requestRows.map((request) => request.id);
  const { data: checklistRows } = requestIds.length
    ? await supabase
        .from("request_document_checklist")
        .select("request_id, status, required")
        .in("request_id", requestIds)
    : { data: [] };
  const summaries = summarizeChecklist((checklistRows ?? []) as ChecklistRow[]);

  return (
    <div className="bg-navy-50 px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-teal-700">
              Customer Portal
            </p>
            <h1 className="mt-2 text-3xl font-semibold text-navy-950">Your requests</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-navy-650">
              Follow request progress, see document requirements, and upload missing or corrected files.
            </p>
          </div>
          <LogoutButtonShell />
        </div>

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
                    <StatusBadge status={request.status} />
                  </div>
                  <p className="mt-3 text-sm text-navy-650">{request.main_service ?? "Service request"}</p>
                  <p className="mt-1 text-xs text-navy-500">{formatDate(request.created_at)}</p>
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
