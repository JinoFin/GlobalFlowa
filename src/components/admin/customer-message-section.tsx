"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const defaultSubject = "Missing documents for your Globalflowa request";
const defaultMessage =
  "Hello, we reviewed your request and need the following documents or corrections. Please upload them through your customer portal.";

export type CustomerMessageChecklistItem = {
  id: string;
  title: string;
  category: string;
  status: string;
};

type ApiResponse = {
  error?: string;
  message?: string;
  emailStatus?: "sent" | "failed";
  messagePersisted?: boolean;
};

export function CustomerMessageSection({
  requestId,
  actionItems,
}: {
  requestId: string;
  actionItems: CustomerMessageChecklistItem[];
}) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [subject, setSubject] = useState(defaultSubject);
  const [message, setMessage] = useState(defaultMessage);
  const [feedback, setFeedback] = useState<{ tone: "success" | "warning" | "error"; text: string } | null>(null);
  const [isSending, setIsSending] = useState(false);

  const selectedIdSet = new Set(selectedIds);
  const selectedItems = actionItems.filter((item) => selectedIdSet.has(item.id));

  function toggleItem(id: string) {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((itemId) => itemId !== id) : [...current, id],
    );
  }

  async function sendMessage(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback(null);

    if (!selectedIds.length) {
      setFeedback({ tone: "error", text: "Select at least one checklist item." });
      return;
    }

    setIsSending(true);
    try {
      const response = await fetch("/api/admin/customer-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          request_id: requestId,
          subject,
          message,
          checklist_item_ids: selectedIds,
        }),
      });
      const data = (await response.json().catch(() => null)) as ApiResponse | null;

      if (!response.ok) {
        if (data?.messagePersisted) {
          setFeedback({
            tone: "warning",
            text: data.error ?? "The message was saved, but a follow-up update failed. Do not send it again.",
          });
          router.refresh();
          return;
        }
        throw new Error(data?.error ?? "Could not send the customer request.");
      }

      setFeedback({
        tone: data?.emailStatus === "failed" ? "warning" : "success",
        text: data?.message ?? "Request sent to the customer.",
      });
      setSelectedIds([]);
      router.refresh();
    } catch (error) {
      setFeedback({
        tone: "error",
        text: error instanceof Error ? error.message : "Could not send the customer request.",
      });
    } finally {
      setIsSending(false);
    }
  }

  const feedbackClass =
    feedback?.tone === "error"
      ? "text-red-700"
      : feedback?.tone === "warning"
        ? "text-amber-800"
        : "text-teal-700";

  return (
    <section className="rounded-md border border-navy-100 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-navy-950">
        Customer Message / Missing Documents Request
      </h2>
      <p className="mt-2 text-sm leading-6 text-navy-650">
        Select the documents the customer needs to provide or correct. The message will be saved in the portal and emailed to the request email.
      </p>

      {feedback ? (
        <p className={`mt-4 text-sm font-semibold ${feedbackClass}`} role="status" aria-live="polite">
          {feedback.text}
        </p>
      ) : null}

      {actionItems.length ? (
        <form onSubmit={sendMessage} className="mt-5 space-y-5">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-navy-650">
                Checklist items requiring customer action
              </h3>
              <button
                type="button"
                onClick={() => setSelectedIds(actionItems.map((item) => item.id))}
                className="rounded-md border border-navy-200 bg-white px-3 py-2 text-sm font-semibold text-navy-950 hover:border-teal-400"
              >
                Select all action items
              </button>
            </div>
            <div className="mt-3 space-y-2">
              {actionItems.map((item) => (
                <label
                  key={item.id}
                  className="flex cursor-pointer items-start gap-3 rounded-md border border-navy-100 bg-navy-50 p-3"
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(item.id)}
                    onChange={() => toggleItem(item.id)}
                    className="mt-1 h-4 w-4 rounded border-navy-300 text-teal-700"
                  />
                  <span>
                    <span className="block text-sm font-semibold text-navy-950">{item.title}</span>
                    <span className="mt-1 block text-xs text-navy-650">
                      {item.category} · {formatStatus(item.status)}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </div>

          <label className="block">
            <span className="text-sm font-semibold text-navy-950">Subject</span>
            <input
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              required
              maxLength={200}
              className="mt-2 w-full rounded-md border border-navy-200 bg-white px-3 py-2 text-sm"
            />
          </label>

          <label className="block">
            <span className="text-sm font-semibold text-navy-950">Customer-facing message</span>
            <textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              required
              maxLength={5000}
              className="mt-2 min-h-32 w-full rounded-md border border-navy-200 bg-white px-3 py-2 text-sm"
            />
          </label>

          <div className="rounded-md border border-navy-100 bg-navy-50 p-4">
            <h3 className="text-sm font-semibold text-navy-950">Selected checklist item preview</h3>
            {selectedItems.length ? (
              <ul className="mt-3 space-y-1 text-sm text-navy-650">
                {selectedItems.map((item) => (
                  <li key={item.id}>- {item.title} ({formatStatus(item.status)})</li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-navy-650">No checklist items selected yet.</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSending || !selectedIds.length}
            className="rounded-md bg-navy-950 px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSending ? "Sending request..." : "Send request to customer"}
          </button>
        </form>
      ) : (
        <div className="mt-5 rounded-md border border-dashed border-navy-200 bg-navy-50 p-5 text-sm text-navy-650">
          No customer-visible checklist items currently have required, missing, incorrect, or expired status.
        </div>
      )}
    </section>
  );
}

function formatStatus(status: string) {
  return status.replaceAll("_", " ");
}
