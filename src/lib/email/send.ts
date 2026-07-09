import { Resend } from "resend";
import { getServiceBySlug } from "@/lib/catalog";
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
}: {
  payload: RequestPayload;
  submissionId: string;
  uploadedFiles: Array<{ field: string; name: string; path: string }>;
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
    text: buildInternalEmail(payload, submissionId, uploadedFiles),
  });

  await resend.emails.send({
    from: "Globalflowa Portal <onboarding@resend.dev>",
    to: payload.customer.email,
    subject: "Globalflowa received your request",
    text: [
      "Thank you. Your request has been submitted successfully.",
      "",
      "Globalflowa will review your information and contact you shortly.",
      "",
      `Submission ID: ${submissionId}`,
    ].join("\n"),
  });
}

function buildInternalEmail(
  payload: RequestPayload,
  submissionId: string,
  uploadedFiles: Array<{ field: string; name: string; path: string }>,
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
