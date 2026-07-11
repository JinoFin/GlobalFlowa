"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { activeLifecycleStages, completionWarningLabels, lifecycleInfo, type LifecycleStage } from "@/lib/request-lifecycle";

type RequestCompletionArchiveProps = {
  requestId: string;
  stage: LifecycleStage;
  completedAt: string | null;
  archivedAt: string | null;
  customerCompletionNote: string | null;
  completionSummary: string | null;
  archivedFromStage: string | null;
  initialWarnings: string[];
};

export function RequestCompletionArchive({ requestId, stage, completedAt, archivedAt, customerCompletionNote, completionSummary, archivedFromStage, initialWarnings }: RequestCompletionArchiveProps) {
  const router = useRouter();
  const [customerNote, setCustomerNote] = useState(customerCompletionNote ?? "");
  const [internalSummary, setInternalSummary] = useState(completionSummary ?? "");
  const [targetStage, setTargetStage] = useState<string>(stage === "archived" ? "" : "processing");
  const [warnings, setWarnings] = useState<string[]>(initialWarnings);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  async function run(action: "complete" | "reopen" | "archive" | "restore", confirmWarnings = false, selectedTarget?: string | null) {
    setBusy(true); setFeedback(null);
    try {
      const response = await fetch("/api/admin/request-lifecycle-action", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ request_id: requestId, action, customer_completion_note: action === "complete" ? customerNote : null, completion_summary: action === "complete" ? internalSummary : null, target_stage: selectedTarget ?? null, confirm_warnings: confirmWarnings }) });
      const result = await response.json() as { error?: string; warnings?: string[]; requires_confirmation?: boolean };
      if (response.status === 409 && result.requires_confirmation) { setWarnings(result.warnings ?? []); setFeedback("Review every warning, then explicitly confirm completion."); return; }
      if (!response.ok) throw new Error(result.error || "Could not update the request.");
      setWarnings([]); setFeedback("Request lifecycle updated."); router.refresh();
    } catch (error) { setFeedback(error instanceof Error ? error.message : "Could not update the request."); }
    finally { setBusy(false); }
  }

  const active = !["completed", "archived"].includes(stage);
  return <section className="rounded-md border border-navy-100 bg-white p-6 shadow-sm">
    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-teal-700">Lifecycle controls</p>
    <h2 className="mt-2 text-xl font-semibold text-navy-950">Request Completion and Archive</h2>
    <p className="mt-2 text-sm text-navy-650">Current state: <strong>{lifecycleInfo[stage].label}</strong>. History, files, messages, assignments, and tasks are always retained.</p>
    <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2"><div><dt className="font-semibold text-navy-700">Completed</dt><dd>{completedAt ? new Date(completedAt).toLocaleString() : "Not completed"}</dd></div><div><dt className="font-semibold text-navy-700">Archived</dt><dd>{archivedAt ? new Date(archivedAt).toLocaleString() : "Not archived"}</dd></div></dl>
    {customerCompletionNote ? <p className="mt-4 rounded-md bg-teal-50 p-3 text-sm"><strong>Customer note:</strong> {customerCompletionNote}</p> : null}
    {completionSummary ? <p className="mt-3 rounded-md bg-navy-50 p-3 text-sm"><strong>Internal summary:</strong> {completionSummary}</p> : null}

    {active ? <div className="mt-5 space-y-3"><label className="block text-sm font-semibold text-navy-800">Customer completion note<textarea value={customerNote} onChange={(event) => setCustomerNote(event.target.value)} maxLength={2000} rows={3} className="mt-2 w-full rounded-md border border-navy-200 px-3 py-2 font-normal" /></label><label className="block text-sm font-semibold text-navy-800">Internal completion summary (staff only)<textarea value={internalSummary} onChange={(event) => setInternalSummary(event.target.value)} maxLength={4000} rows={3} className="mt-2 w-full rounded-md border border-navy-200 px-3 py-2 font-normal" /></label><p className="text-xs text-navy-500">Draft deliverables will not be published automatically.</p><button disabled={busy || !customerNote.trim()} onClick={() => run("complete")} className="rounded-md bg-teal-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Complete request</button></div> : null}

    {stage === "completed" ? <div className="mt-5 flex flex-wrap items-end gap-3"><StageSelect value={targetStage} onChange={setTargetStage} /><button disabled={busy} onClick={() => run("reopen", false, targetStage)} className="rounded-md bg-navy-950 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Reopen request</button></div> : null}
    {stage === "archived" ? <div className="mt-5 space-y-3"><p className="text-sm text-navy-650">Suggested restoration: {archivedFromStage ? lifecycleInfo[archivedFromStage as LifecycleStage]?.label ?? archivedFromStage : "Automatic safe stage"}.</p><div className="flex flex-wrap items-end gap-3"><label className="text-sm font-semibold text-navy-800">Restore stage<select value={targetStage} onChange={(event) => setTargetStage(event.target.value)} className="mt-2 block rounded-md border border-navy-200 px-3 py-2 font-normal"><option value="">Automatic safe stage</option><option value="completed">Completed</option>{activeLifecycleStages.map((item) => <option key={item} value={item}>{lifecycleInfo[item].label}</option>)}</select></label><button disabled={busy} onClick={() => run("restore", false, targetStage || null)} className="rounded-md bg-teal-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Restore request</button>{completedAt ? <button disabled={busy} onClick={() => run("reopen", false, targetStage || "processing")} className="rounded-md bg-navy-950 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Reopen as active</button> : null}</div></div> : null}
    {stage !== "archived" ? <button disabled={busy} onClick={() => window.confirm("Archive this request? It will leave active queues, become read-only for the customer, and retain all history and published final documents.") && run("archive", true)} className="mt-5 rounded-md border border-red-300 px-4 py-2 text-sm font-semibold text-red-700 disabled:opacity-50">Archive request</button> : null}
    {warnings.length && active ? <div className="mt-5 rounded-md border border-amber-300 bg-amber-50 p-4"><h3 className="font-semibold text-amber-900">Completion warnings</h3><ul className="mt-2 space-y-1 text-sm text-amber-900">{warnings.map((warning) => <li key={warning}>- {completionWarningLabels[warning] ?? warning}</li>)}</ul><button disabled={busy || !customerNote.trim()} onClick={() => run("complete", true)} className="mt-3 rounded-md bg-amber-800 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Confirm warnings and complete</button></div> : null}
    {feedback ? <p role="status" className="mt-4 rounded-md bg-navy-50 p-3 text-sm font-semibold text-navy-800">{feedback}</p> : null}
  </section>;
}

function StageSelect({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return <label className="text-sm font-semibold text-navy-800">Reopen stage<select value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 block rounded-md border border-navy-200 px-3 py-2 font-normal">{activeLifecycleStages.map((item) => <option key={item} value={item}>{lifecycleInfo[item].label}</option>)}</select></label>;
}
