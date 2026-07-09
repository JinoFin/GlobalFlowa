import { Resend } from "resend";
import { getServiceBySlug } from "@/lib/catalog";
import { groupChecklistByCategory, type GeneratedChecklistItem } from "@/lib/document-checklist";
import type { RequestPayload } from "@/lib/validation";

let resendClient: Resend | null = null;

function getResend() {
  const apiKey = process.env.EMAIL_PROVIDER_API_KEY;
  if (!apiKey) {
    return null;
  }

  if (!resendClient) {
    resendClient = new Resend(apiKey);
  }

  return resendClient;
}

export async function sendRequestEmails({
  payload,
  submissionId,
  uploadedFiles,
  checklistItems = [],
}: {
  payload: RequestPayload;
  submissionId: string;
  uploadedFiles: Array<{ field: string; name: string; path: string }>;
  checklistItems?: GeneratedChecklistItem[];
}) {
  const resend = getResend();
  if (!resend) {
    console.warn("EMAIL_PROVIDER_API_KEY is not configured. Emails were not sent.");
    return;
  }

  const internalEmail = process.env.INTERNAL_NOTIFICATION_EMAIL ?? "info@globalflowa.com";
  const mainService =
    getServiceBySlug(payload.selectedServices[0] ?? "")?.name ?? "Service Request";
  const companyName = payload.customer.company_name;
  const subject = `New Globalflowa Request - ${mainService} - ${companyName}`;

  await resend.emails.send({
    from: "Globalflowa Portal <onboarding@resend.dev>",
    to: internalEmail,
    subject,
    text: buildInternalEmail(payload, submissionId, uploadedFiles, checklistItems),
  });

  await resend.emails.send({
    from: "Globalflowa Portal <onboarding@resend.dev>",
    to: payload.customer.email,
    subject: "Globalflowa received your request",
    text: buildCustomerEmail(submissionId, checklistItems),
  });
}

function buildInternalEmail(
  payload: RequestPayload,
  submissionId: string,
  uploadedFiles: Array<{ field: string; name: string; path: string }>,
  checklistItems: GeneratedChecklistItem[],
) {
  const selectedServices = payload.selectedServices
    .map((slug) => getServiceBySlug(slug)?.name ?? slug)
    .join(", ");

  return [
    "Customer details",
    formatObject(payload.customer),
    "",
    "Selected services",
    selectedServices,
    "",
    "Product information",
    formatObject(payload.product),
    "",
    "Service-specific answers",
    formatNestedObject(payload.serviceAnswers),
    "",
    "Uploaded documents",
    uploadedFiles.length
      ? uploadedFiles.map((file) => `- ${file.field}: ${file.name} (${file.path})`).join("\n")
      : "No files uploaded.",
    "",
    "Generated Document Checklist",
    formatInternalChecklist(checklistItems),
    "",
    "Urgency / deadline",
    `Urgency: ${payload.customer.urgency ?? "Not specified"}`,
    `Deadline: ${payload.customer.deadline ?? "Not specified"}`,
    "",
    "Notes",
    payload.customer.message ?? "No notes provided.",
    "",
    "Submission ID",
    submissionId,
  ].join("\n");
}

function buildCustomerEmail(submissionId: string, checklistItems: GeneratedChecklistItem[]) {
  return [
    "Thank you. Your request has been submitted successfully.",
    "",
    "Globalflowa will review your information and contact you shortly.",
    "",
    "Based on your request, the following documents may be required:",
    formatCustomerChecklist(checklistItems),
    "",
    "Our team will review your uploaded documents and contact you if anything is missing or needs correction.",
    "",
    `Submission ID: ${submissionId}`,
  ].join("\n");
}

function formatCustomerChecklist(checklistItems: GeneratedChecklistItem[]) {
  const requiredItems = checklistItems.filter((item) => item.required);
  if (requiredItems.length === 0) {
    return "Globalflowa will confirm the exact document list after reviewing your request.";
  }

  return groupChecklistByCategory(requiredItems)
    .map((group) => [
      group.category,
      ...group.items.map((item) => `- ${item.title}`),
    ].join("\n"))
    .join("\n\n");
}

function formatInternalChecklist(checklistItems: GeneratedChecklistItem[]) {
  if (checklistItems.length === 0) {
    return "No checklist items generated.";
  }

  const required = checklistItems.filter((item) => item.required);
  const recommended = checklistItems.filter((item) => !item.required);
  const uploaded = checklistItems.filter((item) => item.linked_file_id);

  return [
    "Required documents",
    required.length ? formatChecklistItems(required) : "No required documents generated.",
    "",
    "Conditional / recommended documents",
    recommended.length ? formatChecklistItems(recommended) : "No recommended documents generated.",
    "",
    "Already uploaded documents if detectable",
    uploaded.length
      ? uploaded.map((item) => `- ${item.title} (${item.status})`).join("\n")
      : "No checklist items were automatically linked to uploaded files.",
  ].join("\n");
}

function formatChecklistItems(items: GeneratedChecklistItem[]) {
  return groupChecklistByCategory(items)
    .map((group) => [
      group.category,
      ...group.items.map((item) => `- ${item.title}${item.required ? "" : " (recommended)"}`),
    ].join("\n"))
    .join("\n\n");
}

function formatObject(value: Record<string, unknown>) {
  const entries = Object.entries(value).filter(([, item]) =>
    Array.isArray(item) ? item.length > 0 : Boolean(item),
  );

  if (entries.length === 0) {
    return "No details provided.";
  }

  return entries
    .map(([key, item]) => `${key}: ${Array.isArray(item) ? item.join(", ") : item}`)
    .join("\n");
}

function formatNestedObject(value: Record<string, Record<string, unknown>>) {
  const sections = Object.entries(value);
  if (sections.length === 0) {
    return "No service-specific answers provided.";
  }

  return sections
    .map(([serviceSlug, answers]) => {
      const serviceName = getServiceBySlug(serviceSlug)?.name ?? serviceSlug;
      return `${serviceName}\n${formatObject(answers)}`;
    })
    .join("\n\n");
}
