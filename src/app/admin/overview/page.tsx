import Link from "next/link";
import { redirect } from "next/navigation";
import { LogoutButton } from "@/components/admin/logout-button";
import { createSupabaseServerClient } from "@/lib/supabase/auth-server";
import { isAdminUser } from "@/lib/supabase/roles";

export const metadata = {
  title: "Admin Operations Overview",
};

export const dynamic = "force-dynamic";

type CustomerMessageRow = {
  id: string;
  request_id: string;
  subject: string;
  created_at: string;
  email_status: string;
};

type RequestFileRow = {
  id: string;
  request_id: string;
  file_name: string;
  created_at: string;
};

type ActivityRow = {
  id: string;
  request_id: string;
  action: string;
  actor_type: string;
  created_at: string;
};

type RequestNameRow = {
  id: string;
  company_name: string;
};

export default async function AdminOverviewPage() {
  let supabase;

  try {
    supabase = await createSupabaseServerClient();
  } catch (error) {
    console.error("Admin overview setup failed", {
      reason: error instanceof Error ? error.message : "unknown error",
    });
    return <OverviewShell showLogout={false} error="Admin overview is not configured." />;
  }

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    redirect("/admin/login");
  }
  if (!(await isAdminUser(supabase, userData.user))) {
    redirect("/portal/requests");
  }

  const [
    totalRequests,
    newRequests,
    inReviewRequests,
    waitingRequests,
    documentsNeedingReview,
    completedRequests,
    messageResult,
    uploadResult,
    activityResult,
  ] = await Promise.all([
    supabase.from("service_requests").select("id", { count: "exact", head: true }),
    supabase.from("service_requests").select("id", { count: "exact", head: true }).eq("status", "New"),
    supabase.from("service_requests").select("id", { count: "exact", head: true }).eq("status", "In Review"),
    supabase
      .from("service_requests")
      .select("id", { count: "exact", head: true })
      .eq("status", "Waiting for Customer"),
    supabase
      .from("request_document_checklist")
      .select("id", { count: "exact", head: true })
      .in("status", ["uploaded", "under_review"]),
    supabase.from("service_requests").select("id", { count: "exact", head: true }).eq("status", "Completed"),
    supabase
      .from("customer_messages")
      .select("id, request_id, subject, created_at, email_status")
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("request_files")
      .select("id, request_id, file_name, created_at")
      .eq("uploaded_by_role", "customer")
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("request_activity_log")
      .select("id, request_id, action, actor_type, created_at")
      .order("created_at", { ascending: false })
      .limit(8),
  ]);

  const results = [
    totalRequests,
    newRequests,
    inReviewRequests,
    waitingRequests,
    documentsNeedingReview,
    completedRequests,
    messageResult,
    uploadResult,
    activityResult,
  ];
  const loadError = results.find((result) => result.error)?.error ?? null;
  if (loadError) {
    console.error("Admin overview data load failed", { reason: loadError.message });
  }

  const messages = (messageResult.data ?? []) as CustomerMessageRow[];
  const uploads = (uploadResult.data ?? []) as RequestFileRow[];
  const activities = (activityResult.data ?? []) as ActivityRow[];
  const requestIds = [
    ...new Set([
      ...messages.map((item) => item.request_id),
      ...uploads.map((item) => item.request_id),
      ...activities.map((item) => item.request_id),
    ]),
  ];
  let requestNames = new Map<string, string>();

  if (requestIds.length > 0) {
    const { data: requestData, error: requestError } = await supabase
      .from("service_requests")
      .select("id, company_name")
      .in("id", requestIds);

    if (requestError) {
      console.error("Admin overview request context load failed", { reason: requestError.message });
    } else {
      requestNames = new Map(
        ((requestData ?? []) as RequestNameRow[]).map((request) => [request.id, request.company_name]),
      );
    }
  }

  const metrics = [
    { label: "Total requests", value: totalRequests.count ?? 0, href: "/admin/requests" },
    { label: "New requests", value: newRequests.count ?? 0, href: "/admin/requests?status=New" },
    { label: "In review", value: inReviewRequests.count ?? 0, href: "/admin/requests?status=In+Review" },
    {
      label: "Waiting for customer",
      value: waitingRequests.count ?? 0,
      href: "/admin/requests?status=Waiting+for+Customer",
    },
    {
      label: "Documents needing review",
      value: documentsNeedingReview.count ?? 0,
      href: "/admin/document-review",
    },
    { label: "Completed", value: completedRequests.count ?? 0, href: "/admin/requests?status=Completed" },
  ];

  return (
    <OverviewShell>
      {loadError ? (
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Some overview information could not be loaded. Refresh the page or try again shortly.
        </div>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-label="Request metrics">
        {metrics.map((metric) => (
          <Link
            key={metric.label}
            href={metric.href}
            className="rounded-md border border-navy-100 bg-white p-5 shadow-sm transition hover:border-teal-300"
          >
            <p className="text-sm font-semibold text-navy-650">{metric.label}</p>
            <p className="mt-3 text-4xl font-semibold text-navy-950">{metric.value}</p>
            <p className="mt-3 text-xs font-semibold uppercase tracking-[0.14em] text-teal-700">
              Open queue
            </p>
          </Link>
        ))}
      </section>

      <section className="mt-8 rounded-md border border-navy-100 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-navy-950">Quick links</h2>
        <div className="mt-4 flex flex-wrap gap-3">
          {[
            ["Requests", "/admin/requests"],
            ["Document Review", "/admin/document-review"],
            ["Services", "/admin/services"],
            ["Export", "/api/admin/export"],
            ["Customer portal", "/portal/requests"],
          ].map(([label, href]) => (
            <Link
              key={label}
              href={href}
              className="rounded-md border border-navy-200 bg-white px-4 py-2 text-sm font-semibold text-navy-950 hover:border-teal-400"
            >
              {label}
            </Link>
          ))}
        </div>
      </section>

      <div className="mt-8 grid gap-6 xl:grid-cols-3">
        <RecentPanel title="Recent customer messages" empty="No customer messages have been sent yet.">
          {messages.map((message) => (
            <RecentItem
              key={message.id}
              href={`/admin/requests/${message.request_id}`}
              title={message.subject}
              context={requestNames.get(message.request_id) ?? "Service request"}
              meta={`${formatDateTime(message.created_at)} · Email ${message.email_status}`}
            />
          ))}
        </RecentPanel>

        <RecentPanel title="Recent document uploads" empty="No customer documents have been uploaded yet.">
          {uploads.map((upload) => (
            <RecentItem
              key={upload.id}
              href={`/admin/requests/${upload.request_id}`}
              title={upload.file_name}
              context={requestNames.get(upload.request_id) ?? "Service request"}
              meta={formatDateTime(upload.created_at)}
            />
          ))}
        </RecentPanel>

        <RecentPanel title="Recent activity" empty="No request activity has been recorded yet.">
          {activities.map((activity) => (
            <RecentItem
              key={activity.id}
              href={`/admin/requests/${activity.request_id}`}
              title={formatAction(activity.action)}
              context={requestNames.get(activity.request_id) ?? "Service request"}
              meta={`${formatDateTime(activity.created_at)} · ${activity.actor_type}`}
            />
          ))}
        </RecentPanel>
      </div>
    </OverviewShell>
  );
}

function OverviewShell({
  children,
  error,
  showLogout = true,
}: {
  children?: React.ReactNode;
  error?: string;
  showLogout?: boolean;
}) {
  return (
    <div className="bg-navy-50 px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-teal-700">
              Admin dashboard
            </p>
            <h1 className="mt-2 text-3xl font-semibold text-navy-950">Operations overview</h1>
            <p className="mt-3 max-w-3xl text-navy-650">
              A daily view of request progress, customer communication, document uploads, and team activity.
            </p>
          </div>
          {showLogout ? <LogoutButton /> : null}
        </div>

        <div className="mt-8">
          {error ? (
            <div className="rounded-md border border-red-200 bg-red-50 p-5 text-sm text-red-700">
              {error}
            </div>
          ) : (
            children
          )}
        </div>
      </div>
    </div>
  );
}

function RecentPanel({
  title,
  empty,
  children,
}: {
  title: string;
  empty: string;
  children: React.ReactNode;
}) {
  const items = Array.isArray(children) ? children : [children];
  return (
    <section className="rounded-md border border-navy-100 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-navy-950">{title}</h2>
      <div className="mt-4 divide-y divide-navy-100">
        {items.length > 0 ? items : <p className="py-5 text-sm text-navy-650">{empty}</p>}
      </div>
    </section>
  );
}

function RecentItem({
  href,
  title,
  context,
  meta,
}: {
  href: string;
  title: string;
  context: string;
  meta: string;
}) {
  return (
    <Link href={href} className="block py-4 first:pt-0 last:pb-0 hover:text-teal-700">
      <p className="font-semibold text-navy-950">{title}</p>
      <p className="mt-1 text-sm text-navy-650">{context}</p>
      <p className="mt-1 text-xs text-navy-500">{meta}</p>
    </Link>
  );
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString();
}

function formatAction(value: string) {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}
