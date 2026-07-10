"use client";

import Link from "next/link";
import { useState } from "react";

export type DocumentReviewQueueRow = {
  fileId: string;
  requestId: string;
  checklistItemId: string;
  companyName: string;
  customerEmail: string;
  requestType: string;
  checklistItemName: string;
  fileName: string;
  uploadedAt: string;
  checklistStatus: string;
  priority: string | null;
  requestStatus: string;
  customerVisibleNote: string | null;
};

type QueueFilter = "all" | "waiting" | "accepted" | "rejected" | "missing";
type SortOrder = "newest" | "oldest";

type ApiResponse = {
  error?: string;
  message?: string;
  reviewPersisted?: boolean;
  status?: string;
  customerVisibleNote?: string | null;
};

export function DocumentReviewQueue({
  initialRows,
  initialError,
}: {
  initialRows: DocumentReviewQueueRow[];
  initialError?: string | null;
}) {
  const [rows, setRows] = useState(initialRows);
  const [filter, setFilter] = useState<QueueFilter>("waiting");
  const [search, setSearch] = useState("");
  const [sortOrder, setSortOrder] = useState<SortOrder>("newest");
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    tone: "success" | "warning" | "error";
    text: string;
  } | null>(null);

  const normalizedSearch = search.trim().toLowerCase();
  const visibleRows = rows
    .filter((row) => matchesFilter(row.checklistStatus, filter))
    .filter((row) => {
      if (!normalizedSearch) return true;
      return [row.companyName, row.customerEmail, row.fileName, row.checklistItemName]
        .some((value) => value.toLowerCase().includes(normalizedSearch));
    })
    .sort((a, b) => {
      const comparison = new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime();
      return sortOrder === "newest" ? comparison : -comparison;
    });

  async function reviewDocument(
    row: DocumentReviewQueueRow,
    action: "accept_document" | "reject_document",
  ) {
    const note = rejectNote.trim();
    if (action === "reject_document" && !note) {
      setFeedback({ tone: "error", text: "Add a customer-facing correction note before rejecting." });
      return;
    }

    setSavingId(row.fileId);
    setFeedback(null);
    try {
      const response = await fetch("/api/admin/document-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          request_id: row.requestId,
          checklist_item_id: row.checklistItemId,
          file_id: row.fileId,
          ...(action === "reject_document" ? { note } : {}),
        }),
      });
      const data = (await response.json().catch(() => null)) as ApiResponse | null;

      if (!response.ok && !data?.reviewPersisted) {
        throw new Error(data?.error ?? "Could not save the document review.");
      }

      const nextStatus = data?.status ?? (action === "accept_document" ? "accepted" : "incorrect");
      setRows((current) =>
        current.map((item) =>
          item.fileId === row.fileId
            ? {
                ...item,
                checklistStatus: nextStatus,
                customerVisibleNote:
                  action === "reject_document" ? (data?.customerVisibleNote ?? note) : null,
              }
            : item,
        ),
      );
      setRejectingId(null);
      setRejectNote("");
      setFeedback({
        tone: data?.reviewPersisted ? "warning" : "success",
        text:
          data?.error ??
          data?.message ??
          (action === "accept_document" ? "Document accepted." : "Correction requested."),
      });
    } catch (error) {
      setFeedback({
        tone: "error",
        text: error instanceof Error ? error.message : "Could not save the document review.",
      });
    } finally {
      setSavingId(null);
    }
  }

  const feedbackClass =
    feedback?.tone === "error"
      ? "border-red-200 bg-red-50 text-red-700"
      : feedback?.tone === "warning"
        ? "border-amber-200 bg-amber-50 text-amber-800"
        : "border-teal-200 bg-teal-50 text-teal-800";

  return (
    <div>
      <div className="grid gap-3 rounded-md border border-navy-100 bg-white p-4 shadow-sm lg:grid-cols-[1fr_220px_180px]">
        <label>
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-navy-650">Search</span>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Company, email, file, or checklist item"
            className="mt-2 w-full rounded-md border border-navy-200 bg-white px-3 py-2 text-sm"
          />
        </label>
        <label>
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-navy-650">Filter</span>
          <select
            value={filter}
            onChange={(event) => setFilter(event.target.value as QueueFilter)}
            className="mt-2 w-full rounded-md border border-navy-200 bg-white px-3 py-2 text-sm"
          >
            <option value="all">All</option>
            <option value="waiting">Waiting for review</option>
            <option value="accepted">Accepted</option>
            <option value="rejected">Rejected / Needs correction</option>
            <option value="missing">Missing</option>
          </select>
        </label>
        <label>
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-navy-650">Sort</span>
          <select
            value={sortOrder}
            onChange={(event) => setSortOrder(event.target.value as SortOrder)}
            className="mt-2 w-full rounded-md border border-navy-200 bg-white px-3 py-2 text-sm"
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
          </select>
        </label>
      </div>

      {initialError ? (
        <div className="mt-6 rounded-md border border-red-200 bg-red-50 p-5 text-sm text-red-700">
          <p className="font-semibold">Could not load the document review queue.</p>
          <p className="mt-1">{initialError}</p>
        </div>
      ) : null}

      {feedback ? (
        <div className={`mt-6 rounded-md border p-4 text-sm font-semibold ${feedbackClass}`} role="status" aria-live="polite">
          {feedback.text}
        </div>
      ) : null}

      {!initialError ? (
        visibleRows.length === 0 ? (
          <div className="mt-8 rounded-md border border-navy-100 bg-white p-8 text-center shadow-sm">
            <h2 className="text-xl font-semibold text-navy-950">
              {filter === "waiting" && !normalizedSearch
                ? "No documents waiting for review."
                : "No documents match your filters."}
            </h2>
            <p className="mt-2 text-sm text-navy-650">
              Customer uploads will appear here when they are linked to a checklist item.
            </p>
          </div>
        ) : (
          <div className="mt-8 space-y-4">
            {visibleRows.map((row) => {
              const isRejecting = rejectingId === row.fileId;
              const isSaving = savingId === row.fileId;
              return (
                <article key={row.fileId} className="rounded-md border border-navy-100 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge status={row.checklistStatus} />
                      {row.priority ? (
                        <span className="rounded-full bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-800">
                          {row.priority}
                        </span>
                      ) : null}
                      <span className="rounded-full bg-navy-50 px-2 py-1 text-xs font-semibold text-navy-650">
                        {row.requestStatus}
                      </span>
                    </div>
                    <h2 className="mt-3 text-xl font-semibold text-navy-950">{row.companyName}</h2>
                    <p className="mt-1 text-sm text-navy-650">{row.customerEmail}</p>
                    <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
                      <QueueDetail label="Request type" value={row.requestType} />
                      <QueueDetail label="Checklist item" value={row.checklistItemName} />
                      <QueueDetail label="Uploaded file" value={row.fileName} />
                      <QueueDetail label="Uploaded" value={new Date(row.uploadedAt).toLocaleString()} />
                    </dl>
                    {row.customerVisibleNote && ["incorrect", "expired", "missing"].includes(row.checklistStatus) ? (
                      <p className="mt-4 rounded-md border border-red-100 bg-red-50 p-3 text-sm text-red-700">
                        Customer-facing note: {row.customerVisibleNote}
                      </p>
                    ) : null}
                  </div>

                  <div className="flex shrink-0 flex-wrap gap-2 xl:max-w-sm xl:justify-end">
                    <Link
                      href={`/admin/requests/${row.requestId}`}
                      className="rounded-md border border-navy-200 bg-white px-3 py-2 text-sm font-semibold text-navy-950"
                    >
                      Open request
                    </Link>
                    <Link
                      href={`/api/admin/files/${row.fileId}`}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-md border border-navy-200 bg-white px-3 py-2 text-sm font-semibold text-navy-950"
                    >
                      Download / view
                    </Link>
                    <button
                      type="button"
                      onClick={() => reviewDocument(row, "accept_document")}
                      disabled={isSaving || row.checklistStatus === "accepted"}
                      className="rounded-md bg-teal-500 px-3 py-2 text-sm font-semibold text-navy-950 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isSaving ? "Saving..." : "Accept document"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setRejectingId(row.fileId);
                        setRejectNote(row.customerVisibleNote ?? "");
                        setFeedback(null);
                      }}
                      disabled={isSaving}
                      className="rounded-md bg-red-700 px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Reject / request correction
                    </button>
                  </div>
                </div>

                {isRejecting ? (
                  <div className="mt-5 rounded-md border border-red-200 bg-red-50 p-4">
                    <label className="block">
                      <span className="text-sm font-semibold text-red-900">Customer-facing correction note</span>
                      <textarea
                        value={rejectNote}
                        onChange={(event) => setRejectNote(event.target.value)}
                        maxLength={2000}
                        placeholder="Explain what is incorrect and what the customer should upload instead."
                        className="mt-2 min-h-24 w-full rounded-md border border-red-200 bg-white px-3 py-2 text-sm text-navy-950"
                      />
                    </label>
                    <p className="mt-2 text-xs text-red-700">
                      This note will be visible to the customer on the related checklist item.
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => reviewDocument(row, "reject_document")}
                        disabled={isSaving || !rejectNote.trim()}
                        className="rounded-md bg-red-700 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {isSaving ? "Saving..." : "Confirm rejection"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setRejectingId(null);
                          setRejectNote("");
                        }}
                        disabled={isSaving}
                        className="rounded-md border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-800"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : null}
                </article>
              );
            })}
          </div>
        )
      ) : null}
    </div>
  );
}

function matchesFilter(status: string, filter: QueueFilter) {
  if (filter === "all") return true;
  if (filter === "waiting") return ["uploaded", "under_review"].includes(status);
  if (filter === "accepted") return status === "accepted";
  if (filter === "rejected") return ["incorrect", "expired"].includes(status);
  return status === "missing";
}

function QueueDetail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-teal-700">{label}</dt>
      <dd className="mt-1 break-words text-navy-650">{value}</dd>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const className =
    status === "accepted"
      ? "bg-teal-50 text-teal-800"
      : ["incorrect", "expired", "missing"].includes(status)
        ? "bg-red-50 text-red-800"
        : ["uploaded", "under_review"].includes(status)
          ? "bg-blue-50 text-blue-800"
          : "bg-navy-100 text-navy-650";

  return (
    <span className={`rounded-full px-2 py-1 text-xs font-semibold ${className}`}>
      {status.replaceAll("_", " ")}
    </span>
  );
}
