"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function DocumentUploadForm({
  requestId,
  checklistItemId,
  existingNote,
  isReplacement = false,
}: {
  requestId: string;
  checklistItemId: string;
  existingNote: string | null;
  isReplacement?: boolean;
}) {
  const router = useRouter();
  const [note, setNote] = useState(existingNote ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [feedback, setFeedback] = useState<{ tone: "success" | "error"; message: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fileInputKey, setFileInputKey] = useState(0);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback(null);

    if (!file && !note.trim()) {
      setFeedback({ tone: "error", message: "Choose a file or add a note before submitting." });
      return;
    }
    if (file && file.size > 20 * 1024 * 1024) {
      setFeedback({ tone: "error", message: "This file is larger than 20 MB. Choose a smaller file." });
      return;
    }

    const formData = new FormData();
    formData.set("requestId", requestId);
    formData.set("checklistItemId", checklistItemId);
    formData.set("customerNote", note.trim());
    if (file) formData.set("file", file);

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/portal/upload", {
        method: "POST",
        body: formData,
      });
      const data = (await response.json().catch(() => null)) as { error?: string; message?: string } | null;

      if (!response.ok) {
        throw new Error(data?.error ?? "Upload failed.");
      }

      setFeedback({
        tone: "success",
        message: data?.message ?? "Upload received. Globalflowa will review the document and update its status.",
      });
      setFile(null);
      setFileInputKey((current) => current + 1);
      router.refresh();
    } catch (error) {
      setFeedback({
        tone: "error",
        message: error instanceof Error ? error.message : "The upload could not be completed. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-4 rounded-md border border-navy-100 bg-white p-3">
      {feedback ? (
        <p
          className={`mb-3 rounded-md border p-3 text-sm font-semibold ${
            feedback.tone === "success"
              ? "border-teal-200 bg-teal-50 text-teal-800"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
          role={feedback.tone === "error" ? "alert" : "status"}
          aria-live="polite"
        >
          {feedback.message}
        </p>
      ) : null}
      <label className="block">
        <span className="text-xs font-semibold uppercase tracking-[0.14em] text-navy-650">
          {isReplacement ? "Upload replacement document" : "Upload document"}
        </span>
        <input
          key={fileInputKey}
          type="file"
          onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.xls,.xlsx,application/pdf,image/png,image/jpeg"
          className="mt-2 w-full rounded-md border border-navy-200 bg-white px-3 py-2 text-sm"
        />
      </label>
      <p className="mt-2 text-xs leading-5 text-navy-500">
        Maximum 20 MB. Common formats: PDF, JPG, PNG, Word, and Excel. Use a clear, readable file and avoid password protection.
      </p>
      {file ? (
        <p className="mt-2 text-xs font-semibold text-teal-800">
          Selected: {file.name} · {formatFileSize(file.size)}
        </p>
      ) : null}
      <label className="mt-3 block">
        <span className="text-xs font-semibold uppercase tracking-[0.14em] text-navy-650">
          Customer note
        </span>
        <textarea
          value={note}
          onChange={(event) => setNote(event.target.value)}
          className="mt-2 min-h-20 w-full rounded-md border border-navy-200 bg-white px-3 py-2 text-sm"
          placeholder="Add context for Globalflowa, for example document version or product model."
        />
      </label>
      <button
        type="submit"
        disabled={isSubmitting}
        className="mt-3 rounded-md bg-navy-950 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
      >
        {isSubmitting
          ? "Uploading..."
          : isReplacement
            ? "Submit replacement for review"
            : "Submit document update"}
      </button>
    </form>
  );
}

function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
