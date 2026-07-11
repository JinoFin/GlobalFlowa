"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export type StaffProfileOption = {
  id: string;
  fullName: string | null;
  email: string | null;
  role: string;
};

export function RequestOwnershipSection({
  requestId,
  initialAssignedTo,
  initialPriority,
  initialDueAt,
  assignedAt,
  assignedByName,
  staff,
}: {
  requestId: string;
  initialAssignedTo: string | null;
  initialPriority: string;
  initialDueAt: string | null;
  assignedAt: string | null;
  assignedByName: string | null;
  staff: StaffProfileOption[];
}) {
  const router = useRouter();
  const [assignedTo, setAssignedTo] = useState(initialAssignedTo ?? "");
  const [priority, setPriority] = useState(normalizePriority(initialPriority));
  const [dueAt, setDueAt] = useState(toDateTimeInput(initialDueAt));
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: "success" | "warning" | "error"; text: string } | null>(null);
  const [currentTime, setCurrentTime] = useState<number | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setCurrentTime(Date.now()), 0);
    return () => window.clearTimeout(timer);
  }, []);

  const dueDate = dueAt ? new Date(dueAt) : null;
  const isOverdue = Boolean(dueDate && currentTime !== null && dueDate.getTime() < currentTime);
  const assignedProfile = staff.find((profile) => profile.id === assignedTo);

  async function save() {
    setIsSaving(true);
    setFeedback(null);
    try {
      const response = await fetch("/api/admin/request-assignment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          request_id: requestId,
          assigned_to: assignedTo || null,
          priority,
          due_at: dueAt ? new Date(dueAt).toISOString() : null,
        }),
      });
      const data = (await response.json().catch(() => null)) as
        | { error?: string; message?: string; warning?: string }
        | null;
      if (!response.ok) {
        throw new Error(data?.error ?? "Could not save ownership and deadline.");
      }
      setFeedback({
        tone: data?.warning ? "warning" : "success",
        text: data?.warning ?? data?.message ?? "Ownership and deadline updated.",
      });
      router.refresh();
    } catch (error) {
      setFeedback({
        tone: "error",
        text: error instanceof Error ? error.message : "Could not save ownership and deadline.",
      });
    } finally {
      setIsSaving(false);
    }
  }

  const feedbackClass =
    feedback?.tone === "error"
      ? "border-red-200 bg-red-50 text-red-700"
      : feedback?.tone === "warning"
        ? "border-amber-200 bg-amber-50 text-amber-800"
        : "border-teal-200 bg-teal-50 text-teal-800";

  return (
    <section className="rounded-md border border-navy-100 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-navy-950">Ownership and Deadline</h2>
          <p className="mt-2 text-sm text-navy-650">
            Internal assignment, priority, and delivery target. Customers cannot see this section.
          </p>
        </div>
        {isOverdue ? (
          <span className="w-fit rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-800">Overdue</span>
        ) : null}
      </div>

      {feedback ? (
        <p className={`mt-4 rounded-md border p-3 text-sm font-semibold ${feedbackClass}`} role="status" aria-live="polite">
          {feedback.text}
        </p>
      ) : null}

      <div className="mt-5 grid gap-4 md:grid-cols-3">
        <label>
          <span className="text-sm font-semibold text-navy-950">Assigned team member</span>
          <select value={assignedTo} onChange={(event) => setAssignedTo(event.target.value)} className="mt-2 w-full rounded-md border border-navy-200 px-3 py-2">
            <option value="">Unassigned</option>
            {staff.map((profile) => (
              <option key={profile.id} value={profile.id}>
                {profile.fullName || profile.email || profile.id} ({profile.role})
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="text-sm font-semibold text-navy-950">Priority</span>
          <select value={priority} onChange={(event) => setPriority(event.target.value)} className="mt-2 w-full rounded-md border border-navy-200 px-3 py-2">
            {['low', 'normal', 'high', 'urgent'].map((value) => (
              <option key={value} value={value}>{capitalize(value)}</option>
            ))}
          </select>
        </label>
        <label>
          <span className="text-sm font-semibold text-navy-950">Due date</span>
          <input type="datetime-local" value={dueAt} onChange={(event) => setDueAt(event.target.value)} className="mt-2 w-full rounded-md border border-navy-200 px-3 py-2" />
        </label>
      </div>

      <dl className="mt-5 grid gap-3 rounded-md bg-navy-50 p-4 text-sm sm:grid-cols-3">
        <div>
          <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-teal-700">Current owner</dt>
          <dd className="mt-1 text-navy-650">{assignedProfile?.fullName || assignedProfile?.email || "Unassigned"}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-teal-700">Assigned</dt>
          <dd className="mt-1 text-navy-650">{assignedAt ? new Date(assignedAt).toLocaleString() : "Not assigned"}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-teal-700">Assigned by</dt>
          <dd className="mt-1 text-navy-650">{assignedByName || "Not recorded"}</dd>
        </div>
      </dl>

      <button type="button" onClick={save} disabled={isSaving} className="mt-5 rounded-md bg-navy-950 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
        {isSaving ? "Saving..." : "Save ownership and deadline"}
      </button>
    </section>
  );
}

function normalizePriority(value: string) {
  const normalized = value.trim().toLowerCase();
  return ["low", "normal", "high", "urgent"].includes(normalized) ? normalized : "normal";
}

function toDateTimeInput(value: string | null) {
  if (!value) return "";
  return new Date(value).toISOString().slice(0, 16);
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
