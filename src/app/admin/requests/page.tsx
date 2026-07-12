import Link from "next/link";
import { redirect } from "next/navigation";
import { AppPageHeader } from "@/components/app-page";
import { createSupabaseServerClient } from "@/lib/supabase/auth-server";
import { isAdminUser } from "@/lib/supabase/roles";
import { getSupabaseServiceClient } from "@/lib/supabase/server";
import { lifecycleInfo, lifecycleStages } from "@/lib/request-lifecycle";

export const metadata = {
  title: "Admin Requests",
};

export const dynamic = "force-dynamic";

type AdminRequestsPageProps = {
  searchParams: Promise<Record<string, string | undefined>>;
};

type RequestRow = {
  id: string;
  created_at: string;
  updated_at: string;
  status: string;
  urgency: string | null;
  country: string;
  company_name: string;
  contact_person: string;
  email: string;
  main_service: string | null;
  lifecycle_stage: string;
  completed_at: string | null;
  archived_at: string | null;
  request_services?: Array<{ service_name: string; service_slug: string }>;
  request_document_checklist?: Array<{ status: string; required: boolean }>;
  request_files?: Array<{ is_final_deliverable: boolean; customer_visible: boolean; published_at: string | null; deleted_at: string | null }>;
};

export default async function AdminRequestsPage({ searchParams }: AdminRequestsPageProps) {
  const params = await searchParams;
  let supabase;

  try {
    supabase = await createSupabaseServerClient();
  } catch (error) {
    return <AdminConfigNotice message={error instanceof Error ? error.message : "Supabase is not configured."} />;
  }

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    redirect("/admin/login");
  }
  if (!(await isAdminUser(supabase, userData.user))) {
    redirect("/portal/requests");
  }
  const dataClient = getSupabaseServiceClient();

  let query = dataClient
    .from("service_requests")
    .select("id, created_at, updated_at, status, urgency, country, company_name, contact_person, email, main_service, lifecycle_stage, completed_at, archived_at, request_services(service_name, service_slug), request_document_checklist(status, required), request_files(is_final_deliverable, customer_visible, published_at, deleted_at)")
    .order("created_at", { ascending: false })
    .limit(100);

  const view = ["active", "completed", "archived", "all"].includes(params.view ?? "") ? params.view! : "active";
  if (view === "active") query = query.not("lifecycle_stage", "in", "(completed,archived)");
  if (view === "completed") query = query.eq("lifecycle_stage", "completed");
  if (view === "archived") query = query.eq("lifecycle_stage", "archived");
  if (params.status) query = query.eq("status", params.status);
  if (params.stage) query = query.eq("lifecycle_stage", params.stage);
  if (params.urgency) query = query.eq("urgency", params.urgency);
  if (params.country) query = query.ilike("country", `%${params.country}%`);
  if (params.date) query = query.gte("created_at", `${params.date}T00:00:00`);

  const { data, error } = await query;
  const rows = (data ?? []) as RequestRow[];
  const serviceFilter = params.service?.toLowerCase();
  const filteredRows = serviceFilter
    ? rows.filter((row) =>
        [row.main_service, ...(row.request_services?.map((item) => item.service_name) ?? [])]
          .filter(Boolean)
          .some((item) => item?.toLowerCase().includes(serviceFilter)),
      )
    : rows;

  return (
    <div className="bg-navy-50 px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <AppPageHeader eyebrow="Admin dashboard" title="Service requests" description="Search, filter, and manage customer service requests." actions={<Link href="/api/admin/export" className="rounded-md border border-navy-200 bg-white px-4 py-2 text-sm font-semibold text-navy-950">Export CSV</Link>} />

        <form className="mt-8 grid gap-3 rounded-md border border-navy-100 bg-white p-4 shadow-sm md:grid-cols-6">
          <input type="hidden" name="view" value={view} />
          <select name="status" defaultValue={params.status ?? ""} className="rounded-md border border-navy-200 px-3 py-2">
            <option value="">All statuses</option>
            {["New", "In Review", "Missing Documents", "Waiting for Customer", "Submitted to Authority", "In Progress", "Completed", "Cancelled"].map((status) => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
          <select name="stage" defaultValue={params.stage ?? ""} className="rounded-md border border-navy-200 px-3 py-2"><option value="">All lifecycle stages</option>{lifecycleStages.map((stage) => <option key={stage} value={stage}>{lifecycleInfo[stage].label}</option>)}</select>
          <input name="service" defaultValue={params.service ?? ""} placeholder="Service" className="rounded-md border border-navy-200 px-3 py-2" />
          <input name="urgency" defaultValue={params.urgency ?? ""} placeholder="Urgency" className="rounded-md border border-navy-200 px-3 py-2" />
          <input name="country" defaultValue={params.country ?? ""} placeholder="Country" className="rounded-md border border-navy-200 px-3 py-2" />
          <input name="date" type="date" defaultValue={params.date ?? ""} className="rounded-md border border-navy-200 px-3 py-2" />
          <button className="rounded-md bg-navy-950 px-4 py-2 text-sm font-semibold text-white md:col-span-6">
            Apply filters
          </button>
        </form>

        <nav className="mt-5 flex flex-wrap gap-2" aria-label="Request lifecycle filters">{[["active", "Active"], ["completed", "Completed"], ["archived", "Archived"], ["all", "All"]].map(([value, label]) => <Link key={value} href={`/admin/requests?view=${value}`} className={`rounded-full px-4 py-2 text-sm font-semibold ${view === value ? "bg-navy-950 text-white" : "border border-navy-200 bg-white text-navy-700"}`}>{label}</Link>)}</nav>

        {error ? (
          <div className="mt-6 rounded-md border border-red-200 bg-red-50 p-4 text-red-700">
            {error.message}
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="mt-8 rounded-md border border-navy-100 bg-white p-8 text-center shadow-sm">
            <h2 className="text-xl font-semibold text-navy-950">No requests found</h2>
            <p className="mt-2 text-navy-650">Adjust filters or wait for new customer submissions.</p>
          </div>
        ) : (
          <div className="mt-8 overflow-hidden rounded-md border border-navy-100 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-navy-100 text-sm">
                <thead className="bg-navy-50 text-left text-xs font-semibold uppercase tracking-[0.14em] text-navy-650">
                  <tr>
                    <th className="px-4 py-3">Created</th>
                    <th className="px-4 py-3">Company</th>
                    <th className="px-4 py-3">Service</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Customer lifecycle</th>
                    <th className="px-4 py-3">Checklist</th>
                    <th className="px-4 py-3">Urgency</th>
                    <th className="px-4 py-3">Country</th>
                    <th className="px-4 py-3">Final documents</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-navy-100">
                  {filteredRows.map((row) => {
                    const checklistSummary = getChecklistSummary(row.request_document_checklist ?? []);
                    return (
                      <tr key={row.id} className="hover:bg-navy-50">
                        <td className="px-4 py-3 text-navy-650">{new Date(row.created_at).toLocaleDateString()}</td>
                        <td className="px-4 py-3">
                          <Link href={`/admin/requests/${row.id}`} className="font-semibold text-navy-950 hover:text-teal-700">
                            {row.company_name}
                          </Link>
                          <p className="text-xs text-navy-650">{row.contact_person} · {row.email}</p>
                        </td>
                        <td className="px-4 py-3 text-navy-650">{row.main_service}</td>
                        <td className="px-4 py-3"><span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-700">{row.status}</span></td>
                        <td className="px-4 py-3 text-navy-650"><span className="font-semibold text-navy-950">{row.lifecycle_stage.replaceAll("_", " ")}</span>{row.completed_at ? <span className="block text-xs">Completed {new Date(row.completed_at).toLocaleDateString()}</span> : null}{row.archived_at ? <span className="block text-xs">Archived {new Date(row.archived_at).toLocaleDateString()}</span> : null}<span className="block text-xs">Updated {new Date(row.updated_at).toLocaleDateString()}</span></td>
                        <td className="px-4 py-3 text-navy-650">
                          {checklistSummary.total ? (
                            <div>
                              <span className="font-semibold text-navy-950">{checklistSummary.percent}%</span>
                              <span className="ml-2 text-xs">{checklistSummary.accepted}/{checklistSummary.total}</span>
                              {checklistSummary.attention ? (
                                <span className="mt-1 block text-xs font-semibold text-red-700">
                                  {checklistSummary.attention} attention
                                </span>
                              ) : null}
                            </div>
                          ) : (
                            <span className="text-xs">No checklist</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-navy-650">{row.urgency}</td>
                        <td className="px-4 py-3 text-navy-650">{row.country}</td>
                        <td className="px-4 py-3 text-navy-650">{row.request_files?.some((file) => file.is_final_deliverable && file.customer_visible && file.published_at && !file.deleted_at) ? "Available" : "None published"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function getChecklistSummary(items: Array<{ status: string; required: boolean }>) {
  const requiredItems = items.filter((item) => item.required);
  const accepted = requiredItems.filter((item) => item.status === "accepted").length;
  const attention = requiredItems.filter((item) =>
    ["missing", "incorrect", "expired"].includes(item.status),
  ).length;
  const percent = requiredItems.length
    ? Math.round((accepted / requiredItems.length) * 100)
    : 0;

  return { total: requiredItems.length, accepted, attention, percent };
}

function AdminConfigNotice({ message }: { message: string }) {
  return (
    <div className="bg-navy-50 px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl rounded-md border border-navy-100 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-navy-950">Admin dashboard needs Supabase setup</h1>
        <p className="mt-3 text-navy-650">{message}</p>
      </div>
    </div>
  );
}
