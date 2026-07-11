import { z } from "zod";

export const finalDeliverableCategories = [
  "final_deliverable",
  "authority_document",
  "certificate",
  "report",
  "agreement",
  "invoice",
  "correspondence",
  "other",
] as const;

export type FinalDeliverableCategory = (typeof finalDeliverableCategories)[number];

export const finalDeliverableCategoryLabels: Record<FinalDeliverableCategory, string> = {
  final_deliverable: "Final document",
  authority_document: "Authority document",
  certificate: "Certificate",
  report: "Final report",
  agreement: "Agreement",
  invoice: "Invoice",
  correspondence: "Official correspondence",
  other: "Other document",
};

export const finalDeliverableMetadataSchema = z.object({
  request_id: z.string().uuid(),
  title: z.string().trim().min(2, "Enter a customer-facing title.").max(160),
  description: z.string().trim().max(1000).optional().transform((value) => value || null),
  file_category: z.enum(finalDeliverableCategories),
  publish_immediately: z.boolean().default(false),
}).strict();

export const finalDeliverableActionSchema = z.object({
  action: z.enum(["publish", "unpublish"]),
}).strict();

const allowedFileTypes: Record<string, readonly string[]> = {
  pdf: ["application/pdf"],
  png: ["image/png"],
  jpg: ["image/jpeg"],
  jpeg: ["image/jpeg"],
  doc: ["application/msword"],
  docx: ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
  xls: ["application/vnd.ms-excel"],
  xlsx: ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
  csv: ["text/csv", "application/csv", "application/vnd.ms-excel"],
  txt: ["text/plain"],
};

export const maxFinalDeliverableBytes = 20 * 1024 * 1024;

export function validateFinalDeliverableFile(file: File) {
  if (!file.size) return "The selected file is empty.";
  if (file.size > maxFinalDeliverableBytes) return "File is too large. Upload a file under 20 MB.";
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  const allowedMimeTypes = allowedFileTypes[extension];
  if (!allowedMimeTypes || !allowedMimeTypes.includes(file.type.toLowerCase())) {
    return "This file type is not supported. Upload PDF, PNG, JPEG, DOC, DOCX, XLS, XLSX, CSV, or TXT.";
  }
  return null;
}

export function sanitizeDisplayFilename(filename: string) {
  const normalized = filename.normalize("NFKC").replace(/[\\/\0\r\n]/g, "-").trim();
  return (normalized || "final-document").slice(0, 180);
}

export function safeStorageFilename(filename: string) {
  return sanitizeDisplayFilename(filename).replace(/[^a-zA-Z0-9._-]/g, "-").replace(/-+/g, "-").slice(0, 140);
}

export function hasValidDeliverableStorage(requestId: string, bucket: string, path: string) {
  return bucket === "request-documents" && path.startsWith(`requests/${requestId}/deliverables/`) && !path.includes("..") && !path.includes("\\");
}

export function isSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  return !origin || origin === new URL(request.url).origin;
}
