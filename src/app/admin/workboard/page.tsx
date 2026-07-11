import Link from "next/link";
import { redirect } from "next/navigation";
import { LogoutButton } from "@/components/admin/logout-button";
import { Workboard, type WorkboardRow } from "@/components/admin/workboard";
import type { StaffProfileOption } from "@/components/admin/request-ownership-section";
import { createSupabaseServerClient } from "@/lib/supabase/auth-server";
import { isAdminUser } from "@/lib/supabase/roles";

export const metadata = { title: "Admin Team Workboard" };
export const dynamic = "force-dynamic";

type RequestRow = {
  id: string;
  created_at: string;
  company_name: string;
  email: string;
  customer_email: string | null;
  main_service: string | null;
  status: string;
  assigned_to: string | null;
  priority: string;
  due_at: string | null;
};

type TaskRow = { request_id: string; status: string; assigned_to: string | null };
type ChecklistRow = { request_id: string; status: string; required: boolean };
type ProfileRow = { id: string; full_name: string | null; email: string | null; role: string };

export default async function AdminWorkboardPage() {
  let supabase;
  try {
    supabase = await createSupabaseServerClient();
  } catch (error) {
    console.error("Workboard setup failed", { reason: error instanceof Error ? error.message : "unknown error" });
    return <WorkboardShell error="Team workboard is not configured." showLogout={false} />;
  }

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/admin/login");
  if (!(await isAdminUser(supabase, userData.user))) redirect("/portal/requests");

  const [requestResult, taskResult, checklistResult, profileResult] = await Promise.all([
    supabase
      .from("service_requests")
      .select("id, created_at, company_name, email, customer_email, main_service, status, assigned_to, priority, due_at")
      .order("created_at", { ascending: false })
      .limit(250),
    supabase.from("internal_tasks").select("request_id, status, assigned_to"),
    supabase.from("request_document_checklist").select("request_id, status, required"),
    supabase.from("profiles").select("id, full_name, email, role").in("role", ["admin", "team"]).order("full_name"),
  ]);

  const loadError = requestResult.error ?? taskResult.error ?? checklistResult.error ?? profileResult.error;
  if (loadError) {
    console.error("Workboard data load failed", { reason: loadError.message });
    return <WorkboardShell error="Could not load the team workboard. Confirm the Phase 5 migration has been applied." />;
  }

  const requests = (requestResult.data ?? []) as RequestRow[];
  const tasks = (taskResult.data ?? []) as TaskRow[];
  const checklist = (checklistResult.data ?? []) as ChecklistRow[];
  const profiles = (profileResult.data ?? []) as ProfileRow[];
  const staff = profiles.map((profile) => ({ id: profile.id, fullName: profile.full_name, email: profile.email, role: profile.role })) satisfies StaffProfileOption[];
  const staffById = new Map(staff.map((profile) => [profile.id, profile]));

  const rows = requests.map((request): WorkboardRow => {
    const requestTasks = tasks.filter((task) => task.request_id === request.id);
    const requestChecklist = checklist.filter((item) => item.request_id === request.id);
    const assignee = request.assigned_to ? staffById.get(request.assigned_to) : null;
    return {
      id: request.id,
      createdAt: request.created_at,
      companyName: request.company_name,
      customerEmail: request.customer_email || request.email,
      service: request.main_service || "Service request",
      status: request.status,
      assignedTo: request.assigned_to,
      assignedName: assignee?.fullName || assignee?.email || null,
      priority: request.priority || "normal",
      dueAt: request.due_at,
      openTaskCount: requestTasks.filter((task) => !["completed", "cancelled"].includes(task.status)).length,
      myTaskCount: requestTasks.filter((task) => task.assigned_to === userData.user.id && !["completed", "cancelled"].includes(task.status)).length,
      blockedTaskCount: requestTasks.filter((task) => task.status === "blocked").length,
      documentsWaiting: requestChecklist.filter((item) => ["uploaded", "under_review"].includes(item.status)).length,
      customerActionCount: requestChecklist.filter((item) => item.required && ["required", "missing", "incorrect", "expired"].includes(item.status)).length,
    };
  });

  return (
    <WorkboardShell>
      <Workboard initialRows={rows} staff={staff} currentUserId={userData.user.id} />
    </WorkboardShell>
  );
}

function WorkboardShell({ children, error, showLogout = true }: { children?: React.ReactNode; error?: string; showLogout?: boolean }) {
  return (
    <div className="bg-navy-50 px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex flex-wrap gap-4 text-sm font-semibold text-teal-700">
              <Link href="/admin/overview">Overview</Link>
              <Link href="/admin/requests">Requests</Link>
              <Link href="/admin/document-review">Document Review</Link>
            </div>
            <p className="mt-5 text-sm font-semibold uppercase tracking-[0.18em] text-teal-700">Admin operations</p>
            <h1 className="mt-2 text-3xl font-semibold text-navy-950">Team Workboard</h1>
            <p className="mt-3 max-w-3xl text-navy-650">Assign requests, prioritize deadlines, find blocked work, and focus each team member’s daily queue.</p>
          </div>
          {showLogout ? <LogoutButton /> : null}
        </div>
        <div className="mt-8">{error ? <div className="rounded-md border border-red-200 bg-red-50 p-5 text-sm text-red-700">{error}</div> : children}</div>
      </div>
    </div>
  );
}
