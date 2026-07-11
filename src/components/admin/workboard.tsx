"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { StaffProfileOption } from "@/components/admin/request-ownership-section";

export type WorkboardRow = {
  id: string;
  createdAt: string;
  companyName: string;
  customerEmail: string;
  service: string;
  status: string;
  assignedTo: string | null;
  assignedName: string | null;
  priority: string;
  dueAt: string | null;
  openTaskCount: number;
  myTaskCount: number;
  blockedTaskCount: number;
  documentsWaiting: number;
  customerActionCount: number;
};

type WorkView = "all" | "my_work" | "unassigned" | "overdue" | "due_soon" | "priority" | "waiting_customer" | "my_tasks" | "blocked";
type SortMode = "priority" | "due" | "newest" | "oldest";

const views: Array<{ value: WorkView; label: string }> = [
  { value: "all", label: "All work" },
  { value: "my_work", label: "My work" },
  { value: "unassigned", label: "Unassigned requests" },
  { value: "overdue", label: "Overdue requests" },
  { value: "due_soon", label: "Due soon" },
  { value: "priority", label: "Urgent / high priority" },
  { value: "waiting_customer", label: "Waiting for customer" },
  { value: "my_tasks", label: "Tasks assigned to me" },
  { value: "blocked", label: "Blocked tasks" },
];

export function Workboard({ initialRows, staff, currentUserId }: {
  initialRows: WorkboardRow[];
  staff: StaffProfileOption[];
  currentUserId: string;
}) {
  const [rows, setRows] = useState(initialRows);
  const [view, setView] = useState<WorkView>("all");
  const [search, setSearch] = useState("");
  const [assignee, setAssignee] = useState("");
  const [priority, setPriority] = useState("");
  const [status, setStatus] = useState("");
  const [deadline, setDeadline] = useState("");
  const [sort, setSort] = useState<SortMode>("priority");
  const [currentTime, setCurrentTime] = useState<number | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setCurrentTime(Date.now()), 0);
    return () => window.clearTimeout(timer);
  }, []);

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return rows
      .filter((row) => matchesView(row, view, currentUserId, currentTime))
      .filter((row) => !query || [row.companyName, row.customerEmail, row.service, row.assignedName ?? ""].some((value) => value.toLowerCase().includes(query)))
      .filter((row) => !assignee || row.assignedTo === assignee)
      .filter((row) => !priority || row.priority === priority)
      .filter((row) => !status || row.status === status)
      .filter((row) => matchesDeadlineFilter(row, deadline, currentTime))
      .sort((a, b) => compareRows(a, b, sort));
  }, [assignee, currentTime, deadline, priority, rows, search, sort, status, view, currentUserId]);

  const statuses = [...new Set(rows.map((row) => row.status))].sort();

  return (
    <div>
      <div className="flex flex-wrap gap-2" aria-label="Workboard views">
        {views.map((item) => (
          <button key={item.value} type="button" onClick={() => setView(item.value)} className={`rounded-full px-3 py-2 text-sm font-semibold ${view === item.value ? "bg-navy-950 text-white" : "border border-navy-200 bg-white text-navy-700"}`}>
            {item.label}
          </button>
        ))}
      </div>

      <div className="mt-6 grid gap-3 rounded-md border border-navy-100 bg-white p-4 shadow-sm md:grid-cols-2 xl:grid-cols-6">
        <label className="md:col-span-2"><FilterLabel>Search</FilterLabel><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Company, email, service, or team member" className="mt-2 w-full rounded-md border border-navy-200 px-3 py-2" /></label>
        <label><FilterLabel>Assignee</FilterLabel><select value={assignee} onChange={(event) => setAssignee(event.target.value)} className="mt-2 w-full rounded-md border border-navy-200 px-3 py-2"><option value="">All assignees</option>{staff.map((profile) => <option key={profile.id} value={profile.id}>{profile.fullName || profile.email || profile.id}</option>)}</select></label>
        <label><FilterLabel>Priority</FilterLabel><select value={priority} onChange={(event) => setPriority(event.target.value)} className="mt-2 w-full rounded-md border border-navy-200 px-3 py-2"><option value="">All priorities</option>{priorityValues().map((value) => <option key={value} value={value}>{capitalize(value)}</option>)}</select></label>
        <label><FilterLabel>Status</FilterLabel><select value={status} onChange={(event) => setStatus(event.target.value)} className="mt-2 w-full rounded-md border border-navy-200 px-3 py-2"><option value="">All statuses</option>{statuses.map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
        <label><FilterLabel>Deadline</FilterLabel><select value={deadline} onChange={(event) => setDeadline(event.target.value)} className="mt-2 w-full rounded-md border border-navy-200 px-3 py-2"><option value="">Any deadline</option><option value="overdue">Overdue</option><option value="due_week">Due this week</option><option value="unassigned">Unassigned</option></select></label>
        <label><FilterLabel>Sort</FilterLabel><select value={sort} onChange={(event) => setSort(event.target.value as SortMode)} className="mt-2 w-full rounded-md border border-navy-200 px-3 py-2"><option value="priority">Priority</option><option value="due">Due date</option><option value="newest">Newest</option><option value="oldest">Oldest</option></select></label>
        <button type="button" onClick={() => { setSearch(""); setAssignee(""); setPriority(""); setStatus(""); setDeadline(""); }} className="self-end rounded-md border border-navy-200 px-3 py-2 text-sm font-semibold text-navy-700">Clear filters</button>
      </div>

      <p className="mt-5 text-sm text-navy-650">{filteredRows.length} request{filteredRows.length === 1 ? "" : "s"} in this view</p>
      {filteredRows.length ? (
        <div className="mt-4 grid gap-4 xl:grid-cols-2">
          {filteredRows.map((row) => <WorkboardCard key={row.id} row={row} staff={staff} currentTime={currentTime} onUpdated={(updates) => setRows((current) => current.map((item) => item.id === row.id ? { ...item, ...updates } : item))} />)}
        </div>
      ) : (
        <div className="mt-6 rounded-md border border-dashed border-navy-200 bg-white p-8 text-center">
          <h2 className="text-xl font-semibold text-navy-950">No work matches this view</h2>
          <p className="mt-2 text-sm text-navy-650">Adjust the view or filters to see other requests.</p>
        </div>
      )}
    </div>
  );
}

function WorkboardCard({ row, staff, currentTime, onUpdated }: {
  row: WorkboardRow;
  staff: StaffProfileOption[];
  currentTime: number | null;
  onUpdated: (updates: Partial<WorkboardRow>) => void;
}) {
  const [assignedTo, setAssignedTo] = useState(row.assignedTo ?? "");
  const [priority, setPriority] = useState(row.priority);
  const [dueAt, setDueAt] = useState(toDateTimeInput(row.dueAt));
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const deadlineState = getDeadlineState(row.dueAt, currentTime);

  async function save() {
    setIsSaving(true);
    setFeedback(null);
    try {
      const response = await fetch("/api/admin/request-assignment", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ request_id: row.id, assigned_to: assignedTo || null, priority, due_at: dueAt ? new Date(dueAt).toISOString() : null }) });
      const data = (await response.json().catch(() => null)) as { error?: string; message?: string; warning?: string } | null;
      if (!response.ok) throw new Error(data?.error ?? "Could not update the request.");
      const profile = staff.find((item) => item.id === assignedTo);
      onUpdated({ assignedTo: assignedTo || null, assignedName: profile?.fullName || profile?.email || null, priority, dueAt: dueAt ? new Date(dueAt).toISOString() : null });
      setFeedback({ tone: "success", text: data?.warning ?? data?.message ?? "Request updated." });
    } catch (error) {
      setFeedback({ tone: "error", text: error instanceof Error ? error.message : "Could not update the request." });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <article className="rounded-md border border-navy-100 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-navy-950">{row.companyName}</h2>
          <p className="mt-1 text-sm text-navy-650">{row.customerEmail}</p>
          <p className="mt-1 text-sm font-semibold text-teal-700">{row.service}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge tone="navy">{row.status}</Badge>
          <Badge tone={row.priority === "urgent" ? "red" : row.priority === "high" ? "amber" : "navy"}>{row.priority}</Badge>
          {deadlineState ? <Badge tone={deadlineState === "Overdue" ? "red" : "amber"}>{deadlineState}</Badge> : null}
        </div>
      </div>

      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Open tasks" value={row.openTaskCount} />
        <Metric label="Blocked tasks" value={row.blockedTaskCount} />
        <Metric label="Docs waiting" value={row.documentsWaiting} />
        <Metric label="Customer action" value={row.customerActionCount} />
      </dl>

      <div className="mt-4 rounded-md bg-navy-50 p-3 text-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-teal-700">Next recommended action</p>
        <p className="mt-1 font-semibold text-navy-950">{getNextAction(row)}</p>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <label><FilterLabel>Assignee</FilterLabel><select value={assignedTo} onChange={(event) => setAssignedTo(event.target.value)} className="mt-1 w-full rounded-md border border-navy-200 px-3 py-2"><option value="">Unassigned</option>{staff.map((profile) => <option key={profile.id} value={profile.id}>{profile.fullName || profile.email || profile.id}</option>)}</select></label>
        <label><FilterLabel>Priority</FilterLabel><select value={priority} onChange={(event) => setPriority(event.target.value)} className="mt-1 w-full rounded-md border border-navy-200 px-3 py-2">{priorityValues().map((value) => <option key={value} value={value}>{capitalize(value)}</option>)}</select></label>
        <label><FilterLabel>Due date</FilterLabel><input type="datetime-local" value={dueAt} onChange={(event) => setDueAt(event.target.value)} className="mt-1 w-full rounded-md border border-navy-200 px-3 py-2" /></label>
      </div>
      {feedback ? <p className={`mt-3 text-sm font-semibold ${feedback.tone === "error" ? "text-red-700" : "text-teal-800"}`} role={feedback.tone === "error" ? "alert" : "status"}>{feedback.text}</p> : null}
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" onClick={save} disabled={isSaving} className="rounded-md bg-navy-950 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">{isSaving ? "Saving..." : "Save operations"}</button>
        <Link href={`/admin/requests/${row.id}`} className="rounded-md border border-navy-200 px-3 py-2 text-sm font-semibold text-navy-950">Open request</Link>
        <Link href={`/admin/requests/${row.id}#internal-tasks`} className="rounded-md border border-navy-200 px-3 py-2 text-sm font-semibold text-navy-950">Add internal task</Link>
        <Link href="/admin/document-review" className="rounded-md border border-navy-200 px-3 py-2 text-sm font-semibold text-navy-950">Document review</Link>
      </div>
    </article>
  );
}

function matchesView(row: WorkboardRow, view: WorkView, userId: string, now: number | null) {
  if (view === "my_work") return row.assignedTo === userId;
  if (view === "unassigned") return !row.assignedTo;
  if (view === "overdue") return getDeadlineState(row.dueAt, now) === "Overdue";
  if (view === "due_soon") return getDeadlineState(row.dueAt, now) === "Due soon";
  if (view === "priority") return ["urgent", "high"].includes(row.priority);
  if (view === "waiting_customer") return row.status === "Waiting for Customer";
  if (view === "my_tasks") return row.myTaskCount > 0;
  if (view === "blocked") return row.blockedTaskCount > 0;
  return true;
}

function matchesDeadlineFilter(row: WorkboardRow, filter: string, now: number | null) {
  if (filter === "overdue") return getDeadlineState(row.dueAt, now) === "Overdue";
  if (filter === "due_week") return getDeadlineState(row.dueAt, now) === "Due soon";
  if (filter === "unassigned") return !row.assignedTo;
  return true;
}

function getDeadlineState(value: string | null, now: number | null) {
  if (!value || now === null) return null;
  const due = new Date(value).getTime();
  if (due < now) return "Overdue";
  if (due <= now + 7 * 24 * 60 * 60 * 1000) return "Due soon";
  return null;
}

function compareRows(a: WorkboardRow, b: WorkboardRow, sort: SortMode) {
  if (sort === "priority") return priorityValues().indexOf(b.priority) - priorityValues().indexOf(a.priority) || compareDue(a, b);
  if (sort === "due") return compareDue(a, b);
  const comparison = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  return sort === "newest" ? comparison : -comparison;
}

function compareDue(a: WorkboardRow, b: WorkboardRow) {
  if (!a.dueAt) return 1;
  if (!b.dueAt) return -1;
  return new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime();
}

function getNextAction(row: WorkboardRow) {
  if (row.documentsWaiting > 0) return "Review customer documents";
  if (row.blockedTaskCount > 0) return "Resolve blocked internal tasks";
  if (row.customerActionCount > 0 && row.status !== "Waiting for Customer") return "Send a customer document request";
  if (row.status === "Waiting for Customer") return "Follow up on the customer upload";
  if (row.openTaskCount > 0) return "Progress internal tasks";
  if (row.status === "Completed") return "No action required";
  return "Review request and define the next task";
}

function FilterLabel({ children }: { children: React.ReactNode }) { return <span className="text-xs font-semibold uppercase tracking-[0.12em] text-navy-650">{children}</span>; }
function Badge({ children, tone }: { children: React.ReactNode; tone: "navy" | "amber" | "red" }) { const style = tone === "red" ? "bg-red-100 text-red-800" : tone === "amber" ? "bg-amber-100 text-amber-800" : "bg-navy-100 text-navy-700"; return <span className={`rounded-full px-2 py-1 text-xs font-semibold ${style}`}>{children}</span>; }
function Metric({ label, value }: { label: string; value: number }) { return <div><dt className="text-xs font-semibold uppercase tracking-[0.1em] text-navy-500">{label}</dt><dd className="mt-1 font-semibold text-navy-950">{value}</dd></div>; }
function priorityValues() { return ["low", "normal", "high", "urgent"]; }
function capitalize(value: string) { return value.charAt(0).toUpperCase() + value.slice(1); }
function toDateTimeInput(value: string | null) { return value ? new Date(value).toISOString().slice(0, 16) : ""; }
