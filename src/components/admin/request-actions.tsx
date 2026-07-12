"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const statuses = [
  "New",
  "In Review",
  "Missing Documents",
  "Waiting for Customer",
  "Submitted to Authority",
  "In Progress",
  "Completed",
  "Cancelled",
];

export function RequestActions({
  requestId,
  currentStatus,
}: {
  requestId: string;
  currentStatus: string;
}) {
  const router = useRouter();
  const [status, setStatus] = useState(currentStatus);
  const [assignedTo, setAssignedTo] = useState("");
  const [note, setNote] = useState("");
  const [missingDocuments, setMissingDocuments] = useState("");
  const [customerVisible, setCustomerVisible] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function saveChanges() {
    setIsSaving(true);
    setMessage(null);

    try {
      const response = await fetch("/api/admin/request-update", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          request_id: requestId,
          status,
          assigned_to: assignedTo || null,
          note,
          missing_documents: missingDocuments.split("\n").map((item) => item.trim()).filter(Boolean),
          customer_visible: customerVisible,
        }),
      });
      const result = await response.json().catch(() => ({})) as { error?: string; message?: string };
      if (!response.ok) throw new Error(result.error ?? "Could not save changes.");

      setMessage(result.message ?? "Saved.");
      setNote("");
      setMissingDocuments("");
      setCustomerVisible(false);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save changes.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="rounded-md border border-navy-100 bg-white p-5 shadow-sm">
      <h2 className="text-xl font-semibold text-navy-950">Admin actions</h2>
      <p className="mt-2 text-sm text-navy-650">Internal operational status and notes. Use the separate completion and archive controls for terminal customer lifecycle changes.</p>
      {message ? <p className="mt-3 text-sm text-teal-700">{message}</p> : null}
      <div className="mt-5 space-y-4">
        <label className="block">
          <span className="text-sm font-semibold text-navy-950">Internal operational status</span>
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className="mt-2 w-full rounded-md border border-navy-200 px-3 py-2"
          >
            {statuses.map((item) => (
              <option key={item} value={item} disabled={item === "Completed" && currentStatus !== "Completed"}>{item}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-sm font-semibold text-navy-950">Assign to team member ID</span>
          <input
            value={assignedTo}
            onChange={(event) => setAssignedTo(event.target.value)}
            placeholder="Supabase profile UUID"
            className="mt-2 w-full rounded-md border border-navy-200 px-3 py-2"
          />
        </label>
        <label className="block">
          <span className="text-sm font-semibold text-navy-950">Internal note</span>
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            className="mt-2 min-h-28 w-full rounded-md border border-navy-200 px-3 py-2"
          />
        </label>
        <label className="block">
          <span className="text-sm font-semibold text-navy-950">Missing documents</span>
          <textarea
            value={missingDocuments}
            onChange={(event) => setMissingDocuments(event.target.value)}
            placeholder="One missing document per line"
            className="mt-2 min-h-24 w-full rounded-md border border-navy-200 px-3 py-2"
          />
        </label>
        <label className="flex items-start gap-2 text-sm text-navy-650">
          <input
            type="checkbox"
            checked={customerVisible}
            onChange={(event) => setCustomerVisible(event.target.checked)}
            className="mt-1 h-4 w-4 rounded border-navy-300 text-teal-700"
          />
          <span>Show this note in the customer portal</span>
        </label>
        <button
          type="button"
          onClick={saveChanges}
          disabled={isSaving}
          className="w-full rounded-md bg-navy-950 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
        >
          {isSaving ? "Saving..." : "Save admin update"}
        </button>
      </div>
    </div>
  );
}
