"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { StaffProfileOption } from "@/components/admin/request-ownership-section";

export type InternalTaskItem = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  assigned_to: string | null;
  due_at: string | null;
  completed_at: string | null;
  created_at: string;
};

type Feedback = { tone: "success" | "error"; text: string } | null;

export function InternalTasksSection({
  requestId,
  initialTasks,
  staff,
}: {
  requestId: string;
  initialTasks: InternalTaskItem[];
  staff: StaffProfileOption[];
}) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("normal");
  const [assignedTo, setAssignedTo] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);

  const openTasks = initialTasks.filter((task) => !["completed", "cancelled"].includes(task.status));
  const closedTasks = initialTasks.filter((task) => ["completed", "cancelled"].includes(task.status));

  async function createTask(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsCreating(true);
    setFeedback(null);
    try {
      const data = await callTaskApi({
        action: "create",
        request_id: requestId,
        title,
        description: description.trim() || null,
        priority,
        assigned_to: assignedTo || null,
        due_at: dueAt ? new Date(dueAt).toISOString() : null,
      });
      setTitle("");
      setDescription("");
      setPriority("normal");
      setAssignedTo("");
      setDueAt("");
      setFeedback({ tone: "success", text: data.message ?? "Internal task created." });
      router.refresh();
    } catch (error) {
      setFeedback({ tone: "error", text: error instanceof Error ? error.message : "Could not create the task." });
    } finally {
      setIsCreating(false);
    }
  }

  function taskChanged(message: string) {
    setFeedback({ tone: "success", text: message });
    router.refresh();
  }

  return (
    <section id="internal-tasks" className="scroll-mt-6 rounded-md border border-navy-100 bg-white p-6 shadow-sm">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-700">Internal only</p>
        <h2 className="mt-1 text-xl font-semibold text-navy-950">Internal Tasks</h2>
        <p className="mt-2 text-sm text-navy-650">
          Track operational work for this request. Tasks and staff assignments never appear in the customer portal.
        </p>
      </div>

      {feedback ? (
        <p className={`mt-4 rounded-md border p-3 text-sm font-semibold ${feedback.tone === "error" ? "border-red-200 bg-red-50 text-red-700" : "border-teal-200 bg-teal-50 text-teal-800"}`} role="status" aria-live="polite">
          {feedback.text}
        </p>
      ) : null}

      <form onSubmit={createTask} className="mt-5 grid gap-4 rounded-md border border-navy-100 bg-navy-50 p-4 md:grid-cols-2">
        <label className="md:col-span-2">
          <span className="text-sm font-semibold text-navy-950">Task title</span>
          <input required maxLength={200} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Prepare authority submission" className="mt-2 w-full rounded-md border border-navy-200 bg-white px-3 py-2" />
        </label>
        <label className="md:col-span-2">
          <span className="text-sm font-semibold text-navy-950">Description</span>
          <textarea maxLength={4000} value={description} onChange={(event) => setDescription(event.target.value)} className="mt-2 min-h-20 w-full rounded-md border border-navy-200 bg-white px-3 py-2" />
        </label>
        <SelectField label="Assigned to" value={assignedTo} onChange={setAssignedTo} options={staff.map((profile) => ({ value: profile.id, label: profile.fullName || profile.email || profile.id }))} emptyLabel="Unassigned" />
        <SelectField label="Priority" value={priority} onChange={setPriority} options={priorityOptions()} />
        <label>
          <span className="text-sm font-semibold text-navy-950">Due date</span>
          <input type="datetime-local" value={dueAt} onChange={(event) => setDueAt(event.target.value)} className="mt-2 w-full rounded-md border border-navy-200 bg-white px-3 py-2" />
        </label>
        <div className="flex items-end">
          <button type="submit" disabled={isCreating} className="w-full rounded-md bg-navy-950 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
            {isCreating ? "Creating..." : "Add internal task"}
          </button>
        </div>
      </form>

      <TaskList title="Open tasks" empty="No open internal tasks for this request." tasks={openTasks} requestId={requestId} staff={staff} onChanged={taskChanged} onError={(text) => setFeedback({ tone: "error", text })} />
      <TaskList title="Completed and cancelled" empty="No completed or cancelled tasks yet." tasks={closedTasks} requestId={requestId} staff={staff} onChanged={taskChanged} onError={(text) => setFeedback({ tone: "error", text })} />
    </section>
  );
}

function TaskList({ title, empty, tasks, requestId, staff, onChanged, onError }: {
  title: string;
  empty: string;
  tasks: InternalTaskItem[];
  requestId: string;
  staff: StaffProfileOption[];
  onChanged: (message: string) => void;
  onError: (message: string) => void;
}) {
  return (
    <div className="mt-7">
      <h3 className="text-lg font-semibold text-navy-950">{title}</h3>
      {tasks.length ? (
        <div className="mt-3 space-y-3">
          {tasks.map((task) => <TaskCard key={task.id} task={task} requestId={requestId} staff={staff} onChanged={onChanged} onError={onError} />)}
        </div>
      ) : (
        <p className="mt-3 rounded-md border border-dashed border-navy-200 bg-navy-50 p-4 text-sm text-navy-650">{empty}</p>
      )}
    </div>
  );
}

function TaskCard({ task, requestId, staff, onChanged, onError }: {
  task: InternalTaskItem;
  requestId: string;
  staff: StaffProfileOption[];
  onChanged: (message: string) => void;
  onError: (message: string) => void;
}) {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? "");
  const [status, setStatus] = useState(["completed", "cancelled"].includes(task.status) ? "open" : task.status);
  const [priority, setPriority] = useState(task.priority);
  const [assignedTo, setAssignedTo] = useState(task.assigned_to ?? "");
  const [dueAt, setDueAt] = useState(toDateTimeInput(task.due_at));
  const [isSaving, setIsSaving] = useState(false);

  async function run(action: "update" | "complete" | "reopen" | "cancel") {
    setIsSaving(true);
    try {
      const data = await callTaskApi(action === "update" ? {
        action,
        request_id: requestId,
        task_id: task.id,
        title,
        description: description.trim() || null,
        status,
        priority,
        assigned_to: assignedTo || null,
        due_at: dueAt ? new Date(dueAt).toISOString() : null,
      } : { action, request_id: requestId, task_id: task.id });
      onChanged(data.message ?? "Task updated.");
    } catch (error) {
      onError(error instanceof Error ? error.message : "Could not update the task.");
    } finally {
      setIsSaving(false);
    }
  }

  const isClosed = ["completed", "cancelled"].includes(task.status);
  return (
    <article className="rounded-md border border-navy-100 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-navy-100 px-2 py-1 text-xs font-semibold text-navy-700">{task.status.replaceAll("_", " ")}</span>
        <span className="rounded-full bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-800">{task.priority}</span>
        {task.due_at ? <span className="text-xs text-navy-500">Due {new Date(task.due_at).toLocaleString()}</span> : null}
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <label className="md:col-span-2"><span className="text-xs font-semibold text-navy-650">Title</span><input value={title} maxLength={200} disabled={isClosed} onChange={(event) => setTitle(event.target.value)} className="mt-1 w-full rounded-md border border-navy-200 px-3 py-2" /></label>
        <label className="md:col-span-2"><span className="text-xs font-semibold text-navy-650">Description</span><textarea value={description} maxLength={4000} disabled={isClosed} onChange={(event) => setDescription(event.target.value)} className="mt-1 min-h-16 w-full rounded-md border border-navy-200 px-3 py-2" /></label>
        <SelectField label="Status" value={status} onChange={setStatus} disabled={isClosed} options={[{ value: "open", label: "Open" }, { value: "in_progress", label: "In progress" }, { value: "blocked", label: "Blocked" }]} />
        <SelectField label="Priority" value={priority} onChange={setPriority} disabled={isClosed} options={priorityOptions()} />
        <SelectField label="Assigned to" value={assignedTo} onChange={setAssignedTo} disabled={isClosed} options={staff.map((profile) => ({ value: profile.id, label: profile.fullName || profile.email || profile.id }))} emptyLabel="Unassigned" />
        <label><span className="text-xs font-semibold text-navy-650">Due date</span><input type="datetime-local" value={dueAt} disabled={isClosed} onChange={(event) => setDueAt(event.target.value)} className="mt-1 w-full rounded-md border border-navy-200 px-3 py-2" /></label>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {isClosed ? (
          <button type="button" onClick={() => run("reopen")} disabled={isSaving} className="rounded-md bg-navy-950 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">Reopen task</button>
        ) : (
          <>
            <button type="button" onClick={() => run("update")} disabled={isSaving || !title.trim()} className="rounded-md border border-navy-200 px-3 py-2 text-sm font-semibold text-navy-950 disabled:opacity-50">Save task</button>
            <button type="button" onClick={() => run("complete")} disabled={isSaving} className="rounded-md bg-teal-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">Complete</button>
            <button type="button" onClick={() => run("cancel")} disabled={isSaving} className="rounded-md bg-red-700 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">Cancel</button>
          </>
        )}
      </div>
    </article>
  );
}

function SelectField({ label, value, onChange, options, emptyLabel, disabled = false }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  emptyLabel?: string;
  disabled?: boolean;
}) {
  return <label><span className="text-xs font-semibold text-navy-650">{label}</span><select value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)} className="mt-1 w-full rounded-md border border-navy-200 bg-white px-3 py-2">{emptyLabel ? <option value="">{emptyLabel}</option> : null}{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>;
}

function priorityOptions() {
  return ["low", "normal", "high", "urgent"].map((value) => ({ value, label: value.charAt(0).toUpperCase() + value.slice(1) }));
}

function toDateTimeInput(value: string | null) {
  return value ? new Date(value).toISOString().slice(0, 16) : "";
}

async function callTaskApi(payload: Record<string, unknown>) {
  const response = await fetch("/api/admin/internal-task", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = (await response.json().catch(() => null)) as { error?: string; message?: string } | null;
  if (!response.ok) throw new Error(data?.error ?? "Could not update the internal task.");
  return data ?? {};
}
