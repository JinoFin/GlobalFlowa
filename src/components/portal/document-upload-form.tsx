"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function DocumentUploadForm({
  requestId,
  checklistItemId,
  existingNote,
}: {
  requestId: string;
  checklistItemId: string;
  existingNote: string | null;
}) {
  const router = useRouter();
  const [note, setNote] = useState(existingNote ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    if (!file && !note.trim()) {
      setMessage("Add a file or a note before submitting.");
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

      setMessage(data?.message ?? "Document uploaded successfully. Globalflowa will review it and update the status.");
      setFile(null);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not upload this document.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-4 rounded-md border border-navy-100 bg-white p-3">
      {message ? <p className="mb-3 text-sm font-semibold text-teal-700">{message}</p> : null}
      <label className="block">
        <span className="text-xs font-semibold uppercase tracking-[0.14em] text-navy-650">
          Upload document
        </span>
        <input
          type="file"
          onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          className="mt-2 w-full rounded-md border border-navy-200 bg-white px-3 py-2 text-sm"
        />
      </label>
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
        {isSubmitting ? "Submitting..." : "Submit document update"}
      </button>
    </form>
  );
}
