import "server-only";

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
  const deliveries = await Promise.allSettled([
    sendTextEmail(resend, {
      to: internalEmail,
      subject: `New service request: ${companyName} — ${mainService}`,
      text: buildInternalEmail(payload, submissionId, uploadedFiles, checklistItems),
    }),
    sendTextEmail(resend, {
      to: payload.customer.email,
      subject: `We received your Globalflowa request — ${companyName}`,
      text: buildCustomerEmail(payload, submissionId, checklistItems),
    }),
  ]);

  const failedDeliveries = deliveries.filter((delivery) => delivery.status === "rejected");
  if (failedDeliveries.length > 0) {
    throw new Error(`${failedDeliveries.length} request email delivery attempt(s) failed.`);
  }
}

export async function sendCustomerUploadEmail({
  companyName,
  customerEmail,
  requestId,
  checklistTitle,
  fileName,
  customerNote,
}: {
  companyName: string;
  customerEmail: string;
  requestId: string;
  checklistTitle: string;
  fileName: string | null;
  customerNote: string | null;
}) {
  const resend = getResend();
  if (!resend) {
    console.warn("EMAIL_PROVIDER_API_KEY is not configured. Customer upload email was not sent.");
    return;
  }

  const internalEmail = process.env.INTERNAL_NOTIFICATION_EMAIL ?? "info@globalflowa.com";
  const adminUrl = buildSiteLink(`/admin/requests/${requestId}`);

  await sendTextEmail(resend, {
    to: internalEmail,
    subject: `Document uploaded: ${companyName} — ${checklistTitle}`,
    text: [
      "Customer document upload",
      "========================",
      "",
      `Company: ${companyName}`,
      `Customer email: ${customerEmail}`,
      `Request ID: ${requestId}`,
      `Checklist item: ${checklistTitle}`,
      `File name: ${fileName ?? "No file uploaded; note only"}`,
      `Customer note: ${customerNote || "No note provided."}`,
      "",
      "Review this upload in the admin portal:",
      adminUrl,
      "",
      ...globalflowaSignature("Operations"),
    ].join("\n"),
  });
}

export async function sendCustomerMessageEmail({
  customerEmail,
  companyName,
  requestId,
  subject,
  message,
  checklistItems,
}: {
  customerEmail: string;
  companyName: string;
  requestId: string;
  subject: string;
  message: string;
  checklistItems: Array<{ title: string; status: string }>;
}) {
  const resend = getResend();
  if (!resend) {
    throw new Error("EMAIL_PROVIDER_API_KEY is not configured.");
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "");
  if (!siteUrl) {
    throw new Error("NEXT_PUBLIC_SITE_URL is not configured.");
  }

  const portalUrl = `${siteUrl}/portal/requests/${requestId}`;
  const messageStartsWithGreeting = /^(hello|hi|dear)\b/i.test(message.trim());
  await sendTextEmail(resend, {
    to: customerEmail,
    subject,
    text: [
      ...(messageStartsWithGreeting ? [message] : ["Hello,", "", message]),
      "",
      "Request summary",
      "---------------",
      `Company: ${companyName}`,
      `Request ID: ${requestId}`,
      "",
      "Documents requiring your attention:",
      ...(checklistItems.length
        ? checklistItems.map((item) => `- ${item.title} (${formatEmailStatus(item.status)})`)
        : ["- No checklist items were selected."]),
      "",
      "Open your request to upload missing or corrected files:",
      portalUrl,
      "",
      ...globalflowaSignature("Customer Operations"),
    ].join("\n"),
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
    "New Globalflowa service request",
    "===============================",
    "",
    `Company: ${payload.customer.company_name}`,
    `Primary service: ${getServiceBySlug(payload.selectedServices[0] ?? "")?.name ?? "Service Request"}`,
    `Request ID: ${submissionId}`,
    "",
    "Customer details",
    "----------------",
    formatObject(payload.customer),
    "",
    "Selected services",
    "-----------------",
    selectedServices,
    "",
    "Product information",
    "-------------------",
    formatObject(payload.product),
    "",
    "Service-specific answers",
    "------------------------",
    formatNestedObject(payload.serviceAnswers),
    "",
    "Uploaded documents",
    "------------------",
    uploadedFiles.length
      ? uploadedFiles.map((file) => `- ${file.field}: ${file.name}`).join("\n")
      : "No files uploaded.",
    "",
    "Generated document checklist",
    "----------------------------",
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
    "",
    "Open this request in the admin portal:",
    buildSiteLink(`/admin/requests/${submissionId}`),
    "",
    ...globalflowaSignature("Operations"),
  ].join("\n");
}

function buildCustomerEmail(
  payload: RequestPayload,
  submissionId: string,
  checklistItems: GeneratedChecklistItem[],
) {
  const portalUrl = buildSiteLink(`/portal/requests/${submissionId}`);

  return [
    `Hello ${payload.customer.contact_person || "there"},`,
    "",
    "We received your Globalflowa service request.",
    "",
    `Company: ${payload.customer.company_name}`,
    `Request ID: ${submissionId}`,
    "",
    "Our team will review the submitted information and contact you if anything is missing or needs correction.",
    "",
    "Documents that may be required",
    "------------------------------",
    formatCustomerChecklist(checklistItems),
    "",
    "Track the request and upload documents securely in your customer portal:",
    portalUrl,
    "",
    ...globalflowaSignature("Customer Operations"),
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

function formatEmailStatus(status: string) {
  return status.replaceAll("_", " ");
}

async function sendTextEmail(
  resend: Resend,
  email: { to: string; subject: string; text: string },
) {
  const { error } = await resend.emails.send({
    from: process.env.EMAIL_FROM ?? "Globalflowa Portal <onboarding@resend.dev>",
    ...email,
  });

  if (error) {
    throw new Error(error.message || "Email provider rejected the message.");
  }
}

function buildSiteLink(path: string) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "");
  return siteUrl ? `${siteUrl}${path}` : path;
}

function globalflowaSignature(team: string) {
  return ["Kind regards,", `Globalflowa ${team}`, "globalflowa.com"];
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
