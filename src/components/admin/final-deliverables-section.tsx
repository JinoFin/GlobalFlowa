"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { finalDeliverableCategories, finalDeliverableCategoryLabels, type FinalDeliverableCategory } from "@/lib/final-deliverables";

export type AdminFinalDeliverable = {
  id: string;
  title: string | null;
  description: string | null;
  file_category: string;
  file_name: string;
  file_size: number | null;
  created_at: string;
  customer_visible: boolean;
  published_at: string | null;
  deleted_at: string | null;
};

export function FinalDeliverablesSection({ requestId, lifecycleStage, initialFiles }: { requestId: string; lifecycleStage: string | null; initialFiles: AdminFinalDeliverable[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function upload(formData: FormData) {
    setBusy("upload"); setMessage(null);
    formData.set("request_id", requestId);
    formData.set("publish_immediately", formData.get("publish_immediately") === "on" ? "true" : "false");
    try {
      const response = await fetch("/api/admin/final-deliverables", { method: "POST", body: formData });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || "Upload failed.");
      setMessage("Final deliverable uploaded.");
      router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Upload failed."); }
    finally { setBusy(null); }
  }

  async function changePublication(id: string, action: "publish" | "unpublish") {
    setBusy(id); setMessage(null);
    try {
      const response = await fetch(`/api/admin/final-deliverables/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || "Update failed.");
      setMessage(action === "publish" ? "Deliverable published to the customer." : "Deliverable unpublished.");
      router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Update failed."); }
    finally { setBusy(null); }
  }

  async function remove(id: string, title: string) {
    if (!window.confirm(`Delete “${title}”? This removes the exact stored file and cannot be undone.`)) return;
    setBusy(id); setMessage(null);
    try {
      const response = await fetch(`/api/admin/final-deliverables/${id}`, { method: "DELETE" });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || "Delete failed.");
      setMessage("Final deliverable deleted.");
      router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Delete failed."); }
    finally { setBusy(null); }
  }

  const files = initialFiles.filter((file) => !file.deleted_at);
  return (
    <section className="rounded-md border border-navy-100 bg-white p-6 shadow-sm">
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-teal-700">Secure delivery</p>
      <h2 className="mt-2 text-xl font-semibold text-navy-950">Final Customer Deliverables</h2>
      <p className="mt-2 text-sm text-navy-650">Only published final deliverables are visible in the customer portal. Uploads begin as drafts unless you explicitly publish them.</p>
      {lifecycleStage === "final_review" ? <p className="mt-3 rounded-md bg-teal-50 p-3 text-sm font-semibold text-teal-800">Recommended next step: review the deliverables, then complete the request when ready.</p> : null}

      <form action={upload} className="mt-6 grid gap-4 rounded-md border border-navy-100 bg-navy-50 p-4 md:grid-cols-2">
        <label className="text-sm font-semibold text-navy-800">File<input name="file" type="file" required accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.xls,.xlsx,.csv,.txt" className="mt-2 block w-full text-sm" /></label>
        <label className="text-sm font-semibold text-navy-800">Customer-facing title<input name="title" required maxLength={160} className="mt-2 w-full rounded-md border border-navy-200 bg-white px-3 py-2 font-normal" /></label>
        <label className="text-sm font-semibold text-navy-800">Category<select name="file_category" defaultValue="final_deliverable" className="mt-2 w-full rounded-md border border-navy-200 bg-white px-3 py-2 font-normal">{finalDeliverableCategories.map((category) => <option key={category} value={category}>{finalDeliverableCategoryLabels[category]}</option>)}</select></label>
        <label className="text-sm font-semibold text-navy-800 md:col-span-2">Description (optional)<textarea name="description" maxLength={1000} rows={3} className="mt-2 w-full rounded-md border border-navy-200 bg-white px-3 py-2 font-normal" /></label>
        <label className="flex items-center gap-2 text-sm font-semibold text-navy-800"><input name="publish_immediately" type="checkbox" /> Publish immediately</label>
        <button disabled={busy !== null} className="rounded-md bg-teal-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{busy === "upload" ? "Uploading…" : "Upload final deliverable"}</button>
      </form>
      {message ? <p role="status" className="mt-4 rounded-md bg-navy-50 p-3 text-sm font-semibold text-navy-800">{message}</p> : null}

      <div className="mt-6 space-y-4">
        {files.length ? files.map((file) => {
          const category = finalDeliverableCategories.includes(file.file_category as FinalDeliverableCategory) ? file.file_category as FinalDeliverableCategory : "other";
          const title = file.title || file.file_name;
          return <article key={file.id} className="rounded-md border border-navy-100 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold text-navy-950">{title}</h3><span className={`rounded-full px-2 py-1 text-xs font-semibold ${file.customer_visible ? "bg-teal-50 text-teal-800" : "bg-navy-100 text-navy-700"}`}>{file.customer_visible ? "Published to customer" : "Draft or unpublished"}</span></div><p className="mt-1 text-sm text-navy-650">{finalDeliverableCategoryLabels[category]} · {file.file_name} · {formatBytes(file.file_size)}</p>{file.description ? <p className="mt-2 text-sm text-navy-650">{file.description}</p> : null}<p className="mt-2 text-xs text-navy-500">Uploaded {new Date(file.created_at).toLocaleString()}{file.published_at ? ` · Published ${new Date(file.published_at).toLocaleString()}` : ""}</p></div></div>
            <div className="mt-4 flex flex-wrap gap-3 text-sm font-semibold"><a href={`/api/admin/files/${file.id}/download`} className="text-teal-700">Secure download</a><button disabled={busy !== null} onClick={() => changePublication(file.id, file.customer_visible ? "unpublish" : "publish")} className="text-teal-700 disabled:opacity-60">{file.customer_visible ? "Unpublish" : "Publish"}</button><button disabled={busy !== null} onClick={() => remove(file.id, title)} className="text-red-700 disabled:opacity-60">Delete</button></div>
            <div className="mt-4 rounded-md bg-navy-50 p-3"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-teal-700">Customer-visible preview</p><p className="mt-1 font-semibold text-navy-950">{title}</p>{file.description ? <p className="mt-1 text-sm text-navy-650">{file.description}</p> : null}<p className="mt-1 text-xs text-navy-500">{finalDeliverableCategoryLabels[category]}{file.published_at ? ` · ${new Date(file.published_at).toLocaleDateString()}` : " · Not published"}</p></div>
          </article>;
        }) : <p className="rounded-md border border-dashed border-navy-200 p-5 text-sm text-navy-650">No final customer deliverables have been uploaded.</p>}
      </div>
    </section>
  );
}

function formatBytes(value: number | null) {
  if (!value) return "Size unavailable";
  if (value < 1024 * 1024) return `${Math.ceil(value / 1024)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}
