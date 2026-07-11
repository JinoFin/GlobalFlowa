export const lifecycleStages = ["received", "initial_review", "waiting_for_documents", "document_review", "processing", "external_processing", "final_review", "completed", "archived"] as const;
export type LifecycleStage = (typeof lifecycleStages)[number];

export const lifecycleInfo: Record<LifecycleStage, { label: string; description: string; next: string }> = {
  received: { label: "Request received", description: "We received your request and will begin the initial review.", next: "Our team will begin the initial review." },
  initial_review: { label: "Initial review", description: "Our team is reviewing your request and requirements.", next: "We will confirm the requirements and next steps." },
  waiting_for_documents: { label: "Waiting for documents", description: "We need information or documents from you before we can continue.", next: "Provide the requested information or documents." },
  document_review: { label: "Documents under review", description: "Your submitted documents are being reviewed.", next: "We will review the submitted documents." },
  processing: { label: "Processing", description: "Your request is currently being processed.", next: "No action is required while processing continues." },
  external_processing: { label: "Authority or partner processing", description: "Your request is being processed by an authority or external partner.", next: "No action is required while external processing continues." },
  final_review: { label: "Final review", description: "Our team is completing the final review.", next: "No action is required during final review." },
  completed: { label: "Completed", description: "Your request has been completed.", next: "View final documents and completion information." },
  archived: { label: "Archived", description: "This request has been archived.", next: "No further action is available." },
};

export function normalizeLifecycleStage(value: string | null | undefined): LifecycleStage {
  return lifecycleStages.includes(value as LifecycleStage) ? value as LifecycleStage : "received";
}

export function lifecycleProgress(stage: LifecycleStage) {
  return Math.round(((lifecycleStages.indexOf(stage) + 1) / lifecycleStages.length) * 100);
}

export function getCustomerNextAction({ stage, checklist, hasActionMessage = false, hasPublishedDeliverables = false }: { stage: LifecycleStage; checklist: Array<{ status: string; required: boolean }>; hasActionMessage?: boolean; hasPublishedDeliverables?: boolean }) {
  if (stage === "archived") return { label: "No further action available", tone: "archived" };
  if (checklist.some((item) => item.required && ["incorrect", "expired"].includes(item.status))) return { label: "Upload a corrected document", tone: "action" };
  if (checklist.some((item) => item.required && ["required", "missing"].includes(item.status))) return { label: "Upload the required document", tone: "action" };
  if (hasActionMessage) return { label: "Review the latest message", tone: "action" };
  if (checklist.some((item) => ["uploaded", "under_review"].includes(item.status))) return { label: "No action required — document under review", tone: "review" };
  if (stage === "completed") return { label: hasPublishedDeliverables ? "Download your final documents" : "Final documents will be available soon", tone: "completed" };
  if (stage === "waiting_for_documents") return { label: "Provide the requested information", tone: "action" };
  if (stage === "final_review") return { label: "No action required — final review in progress", tone: "processing" };
  if (["processing", "external_processing"].includes(stage)) return { label: "No action required", tone: "processing" };
  return { label: lifecycleInfo[stage].next, tone: "review" };
}
