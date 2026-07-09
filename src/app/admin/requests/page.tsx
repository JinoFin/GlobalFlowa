import Link from "next/link";
import { redirect } from "next/navigation";
import { LogoutButton } from "@/components/admin/logout-button";
import { createSupabaseServerClient } from "@/lib/supabase/auth-server";
import { isAdminUser } from "@/lib/supabase/roles";

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
  status: string;
  urgency: string | null;
  country: string;
  company_name: string;
  contact_person: string;
  email: string;
  main_service: string | null;
  request_services?: Array<{ service_name: string; service_slug: string }>;
  request_document_checklist?: Array<{ status: string; required: boolean }>;
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

  let query = supabase
    .from("service_requests")
    .select("id, created_at, status, urgency, country, company_name, contact_person, email, main_service, request_services(service_name, service_slug), request_document_checklist(status, required)")
    .order("created_at", { ascending: false })
    .limit(100);

  if (params.status) query = query.eq("status", params.status);
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
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-teal-700">
              Admin dashboard
            </p>
            <h1 className="mt-2 text-3xl font-semibold text-navy-950">
              Service requests
            </h1>
          </div>
          <div className="flex gap-3">
            <Link href="/api/admin/export" className="rounded-md bg-teal-500 px-4 py-2 text-sm font-semibold text-navy-950">
              Export CSV
            </Link>
            <Link href="/admin/services" className="rounded-md border border-navy-200 bg-white px-4 py-2 text-sm font-semibold text-navy-950">
              Services
            </Link>
            <LogoutButton />
          </div>
        </div>

        <form className="mt-8 grid gap-3 rounded-md border border-navy-100 bg-white p-4 shadow-sm md:grid-cols-5">
          <select name="status" defaultValue={params.status ?? ""} className="rounded-md border border-navy-200 px-3 py-2">
            <option value="">All statuses</option>
            {["New", "In Review", "Missing Documents", "Waiting for Customer", "Submitted to Authority", "In Progress", "Completed", "Cancelled"].map((status) => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
          <input name="service" defaultValue={params.service ?? ""} placeholder="Service" className="rounded-md border border-navy-200 px-3 py-2" />
          <input name="urgency" defaultValue={params.urgency ?? ""} placeholder="Urgency" className="rounded-md border border-navy-200 px-3 py-2" />
          <input name="country" defaultValue={params.country ?? ""} placeholder="Country" className="rounded-md border border-navy-200 px-3 py-2" />
          <input name="date" type="date" defaultValue={params.date ?? ""} className="rounded-md border border-navy-200 px-3 py-2" />
          <button className="rounded-md bg-navy-950 px-4 py-2 text-sm font-semibold text-white md:col-span-5">
            Apply filters
          </button>
        </form>

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
                    <th className="px-4 py-3">Checklist</th>
                    <th className="px-4 py-3">Urgency</th>
                    <th className="px-4 py-3">Country</th>
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
