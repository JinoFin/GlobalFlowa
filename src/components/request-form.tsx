"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, FileUp } from "lucide-react";
import { services, type QuestionType, type ServiceQuestion } from "@/lib/catalog";
import {
  generateDocumentChecklist,
  getDefaultDocumentTemplatesForServices,
  groupChecklistByCategory,
} from "@/lib/document-checklist";
import type { RequestPayload } from "@/lib/validation";

type Answers = Record<string, string | string[]>;
type FilesByKey = Record<string, File[]>;
type ValidationErrors = Record<string, string>;

const selectedServicesKey = "globalflowa.selectedServices";
const draftKey = "globalflowa.requestDraft";

const generalCustomerFields: ServiceQuestion[] = [
  { key: "company_name", label: "Company name", type: "text", required: true, order: 1 },
  { key: "country", label: "Country", type: "text", required: true, order: 2 },
  { key: "contact_person", label: "Contact person", type: "text", required: true, order: 3 },
  { key: "email", label: "Email", type: "email", required: true, order: 4 },
  { key: "phone", label: "Phone", type: "phone", order: 5 },
  { key: "whatsapp", label: "WhatsApp", type: "phone", order: 6 },
  { key: "wechat", label: "WeChat", type: "text", order: 7 },
  { key: "website", label: "Website", type: "text", order: 8 },
  { key: "marketplace_links", label: "Marketplace links", type: "textarea", order: 9 },
  { key: "preferred_language", label: "Preferred language", type: "select", options: ["English", "German", "Chinese"], order: 10 },
  { key: "urgency", label: "Urgency level", type: "select", options: ["Standard", "Soon", "Urgent", "Authority deadline"], order: 11 },
  { key: "deadline", label: "Deadline if any", type: "date", order: 12 },
  { key: "message", label: "Message / special request", type: "textarea", order: 13 },
];

const productFields: ServiceQuestion[] = [
  { key: "product_name", label: "Product name", type: "text", order: 1 },
  { key: "brand_name", label: "Brand name", type: "text", order: 2 },
  { key: "model_number", label: "Model number", type: "text", order: 3 },
  { key: "product_category", label: "Product category", type: "text", order: 4 },
  { key: "product_description", label: "Product description", type: "textarea", order: 5 },
  { key: "target_market", label: "Target market", type: "text", order: 6 },
  { key: "monthly_sales", label: "Estimated monthly sales", type: "text", order: 7 },
  { key: "yearly_quantity", label: "Estimated yearly quantity", type: "text", order: 8 },
  { key: "product_photos", label: "Product photos upload", type: "file", order: 9 },
  { key: "label_photos", label: "Label photos upload", type: "file", order: 10 },
  { key: "manual_upload", label: "Manual upload", type: "file", order: 11 },
  { key: "test_reports", label: "Test reports upload", type: "file", order: 12 },
  { key: "declaration_of_conformity", label: "Declaration of Conformity upload", type: "file", order: 13 },
  { key: "other_files", label: "Other files upload", type: "file", order: 14 },
];

export function RequestForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedService = searchParams.get("service");
  const initialState = useMemo(
    () => loadSavedRequestState(preselectedService),
    [preselectedService],
  );
  const [selectedServices, setSelectedServices] = useState<string[]>(initialState.selectedServices);
  const [answers, setAnswers] = useState<Answers>(initialState.answers);
  const [files, setFiles] = useState<FilesByKey>({});
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [stage, setStage] = useState<"editing" | "confirming" | "submitting">("editing");
  const [submitError, setSubmitError] = useState<string | null>(null);

  const selectedServiceObjects = useMemo(
    () => selectedServices.map((slug) => services.find((service) => service.slug === slug)).filter(Boolean),
    [selectedServices],
  );

  useEffect(() => {
    window.localStorage.setItem(draftKey, JSON.stringify({ answers, selectedServices }));
  }, [answers, selectedServices]);

  function updateAnswer(key: string, value: string | string[]) {
    setAnswers((current) => ({ ...current, [key]: value }));
  }

  function updateFiles(key: string, fileList: FileList | null) {
    setFiles((current) => ({
      ...current,
      [key]: fileList ? Array.from(fileList) : [],
    }));
  }

  function toggleService(slug: string) {
    setSelectedServices((current) =>
      current.includes(slug)
        ? current.filter((item) => item !== slug)
        : [...current, slug],
    );
  }

  function validate() {
    const nextErrors: ValidationErrors = {};
    for (const field of generalCustomerFields.filter((item) => item.required)) {
      if (!answers[field.key]) {
        nextErrors[field.key] = `${field.label} is required.`;
      }
    }

    if (typeof answers.email === "string" && !/^\S+@\S+\.\S+$/.test(answers.email)) {
      nextErrors.email = "Enter a valid email address.";
    }

    if (selectedServices.length === 0) {
      nextErrors.selected_services = "Select at least one service.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function openConfirmation() {
    if (validate()) {
      setStage("confirming");
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  async function submitRequest() {
    if (!validate()) return;
    setStage("submitting");
    setSubmitError(null);

    const payload = buildRequestPayload(answers, files, selectedServices);

    const formData = new FormData();
    formData.append("payload", JSON.stringify(payload));
    for (const [key, selectedFiles] of Object.entries(files)) {
      for (const file of selectedFiles) {
        formData.append(`files.${key}`, file);
      }
    }

    try {
      const response = await fetch("/api/submit-request", {
        method: "POST",
        body: formData,
      });

      const result = (await response.json()) as { submissionId?: string; error?: string };
      if (!response.ok) {
        throw new Error(result.error ?? "Submission failed.");
      }

      const checklistSummary = generateDocumentChecklist({
        selectedServices,
        payload,
        templates: getDefaultDocumentTemplatesForServices(selectedServices),
        uploadedFiles: Object.entries(files).flatMap(([field, selectedFiles]) =>
          selectedFiles.map((file) => ({ field, name: file.name })),
        ),
      })
        .filter((item) => item.required)
        .map((item) => ({ category: item.category, title: item.title }));

      window.sessionStorage.setItem(
        "globalflowa.lastChecklist",
        JSON.stringify(checklistSummary),
      );
      window.localStorage.removeItem(draftKey);
      window.localStorage.removeItem(selectedServicesKey);
      router.push(`/request/success?id=${result.submissionId ?? ""}`);
    } catch (error) {
      setStage("confirming");
      setSubmitError(error instanceof Error ? error.message : "Submission failed.");
    }
  }

  return (
    <div className="rounded-md border border-navy-100 bg-white shadow-sm">
      <div className="border-b border-navy-100 p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-teal-700">
              Smart service request
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-navy-950">
              {stage === "confirming" ? "Confirm your request" : "Tell us what you need"}
            </h2>
          </div>
          <div className="rounded-md bg-navy-50 px-4 py-2 text-sm font-semibold text-navy-700">
            {selectedServices.length} service{selectedServices.length === 1 ? "" : "s"} selected
          </div>
        </div>
      </div>

      {submitError ? (
        <div className="m-5 flex gap-3 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle className="h-5 w-5 shrink-0" />
          {submitError}
        </div>
      ) : null}

      {stage === "confirming" || stage === "submitting" ? (
        <Confirmation
          answers={answers}
          files={files}
          selectedServices={selectedServices}
          onBack={() => setStage("editing")}
          onSubmit={submitRequest}
          isSubmitting={stage === "submitting"}
        />
      ) : (
        <div className="space-y-10 p-5 sm:p-8">
          <section>
            <h3 className="text-xl font-semibold text-navy-950">Select services</h3>
            {errors.selected_services ? (
              <p className="mt-2 text-sm text-red-600">{errors.selected_services}</p>
            ) : null}
            <div className="mt-5 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {services.map((service) => {
                const isSelected = selectedServices.includes(service.slug);
                return (
                  <button
                    key={service.slug}
                    type="button"
                    onClick={() => toggleService(service.slug)}
                    className={`rounded-md border p-4 text-left transition ${
                      isSelected
                        ? "border-teal-500 bg-teal-50"
                        : "border-navy-100 bg-white hover:border-teal-300"
                    }`}
                  >
                    <span className="flex items-start gap-3">
                      <span className={`mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
                        isSelected ? "border-teal-600 bg-teal-600" : "border-navy-200"
                      }`}>
                        {isSelected ? <CheckCircle2 className="h-4 w-4 text-white" /> : null}
                      </span>
                      <span>
                        <span className="block font-semibold text-navy-950">{service.name}</span>
                        <span className="mt-1 block text-sm leading-6 text-navy-650">
                          {service.shortDescription}
                        </span>
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          <FormSection title="Customer details" fields={generalCustomerFields} answers={answers} errors={errors} onAnswer={updateAnswer} onFiles={updateFiles} files={files} />
          <FormSection title="Product information and documents" fields={productFields} answers={answers} errors={errors} onAnswer={updateAnswer} onFiles={updateFiles} files={files} />

          {selectedServiceObjects.length > 0 ? (
            <section>
              <h3 className="text-xl font-semibold text-navy-950">Service-specific questions</h3>
              <div className="mt-5 space-y-6">
                {selectedServiceObjects.map((service) => service ? (
                  <div key={service.slug} className="rounded-md border border-navy-100 bg-navy-50 p-5">
                    <h4 className="font-semibold text-navy-950">{service.name}</h4>
                    <div className="mt-5 grid gap-4 md:grid-cols-2">
                      {service.questions
                        .sort((a, b) => a.order - b.order)
                        .map((question) => (
                          <Field
                            key={`${service.slug}.${question.key}`}
                            field={{ ...question, key: `${service.slug}.${question.key}` }}
                            value={answers[`${service.slug}.${question.key}`]}
                            error={errors[`${service.slug}.${question.key}`]}
                            onAnswer={updateAnswer}
                            onFiles={updateFiles}
                            files={files[`${service.slug}.${question.key}`] ?? []}
                          />
                        ))}
                    </div>
                  </div>
                ) : null)}
              </div>
            </section>
          ) : null}

          <div className="flex justify-end">
            <button
              type="button"
              onClick={openConfirmation}
              className="rounded-md bg-navy-950 px-6 py-3 text-sm font-semibold text-white hover:bg-navy-900"
            >
              Review before submission
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function FormSection({
  title,
  fields,
  answers,
  errors,
  files,
  onAnswer,
  onFiles,
}: {
  title: string;
  fields: ServiceQuestion[];
  answers: Answers;
  errors: ValidationErrors;
  files: FilesByKey;
  onAnswer: (key: string, value: string | string[]) => void;
  onFiles: (key: string, fileList: FileList | null) => void;
}) {
  return (
    <section>
      <h3 className="text-xl font-semibold text-navy-950">{title}</h3>
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        {fields.map((field) => (
          <Field
            key={field.key}
            field={field}
            value={answers[field.key]}
            error={errors[field.key]}
            onAnswer={onAnswer}
            onFiles={onFiles}
            files={files[field.key] ?? []}
          />
        ))}
      </div>
    </section>
  );
}

function Field({
  field,
  value,
  error,
  files,
  onAnswer,
  onFiles,
}: {
  field: ServiceQuestion;
  value: string | string[] | undefined;
  error?: string;
  files: File[];
  onAnswer: (key: string, value: string | string[]) => void;
  onFiles: (key: string, fileList: FileList | null) => void;
}) {
  const commonClasses =
    "mt-2 w-full rounded-md border border-navy-200 px-4 py-3 text-navy-950 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100";

  return (
    <label className={field.type === "textarea" || field.type === "file" ? "md:col-span-2" : ""}>
      <span className="text-sm font-semibold text-navy-950">
        {field.label}
        {field.required ? <span className="text-red-600"> *</span> : null}
      </span>
      {renderInput(field, value, commonClasses, onAnswer, onFiles)}
      {field.helpText ? <span className="mt-1 block text-xs text-navy-650">{field.helpText}</span> : null}
      {field.type === "file" && files.length > 0 ? (
        <div className="mt-3 space-y-2">
          {files.map((file) => (
            <div key={`${field.key}-${file.name}`} className="rounded-md bg-navy-50 p-3 text-sm text-navy-650">
              <div className="flex items-center gap-2">
                <FileUp className="h-4 w-4 text-teal-700" />
                <span>{file.name}</span>
              </div>
              <div className="mt-2 h-1.5 rounded-full bg-navy-100">
                <div className="h-1.5 w-full rounded-full bg-teal-500" />
              </div>
              <p className="mt-1 text-xs">Ready to upload on submission</p>
            </div>
          ))}
        </div>
      ) : null}
      {error ? <span className="mt-1 block text-sm text-red-600">{error}</span> : null}
    </label>
  );
}

function renderInput(
  field: ServiceQuestion,
  value: string | string[] | undefined,
  commonClasses: string,
  onAnswer: (key: string, value: string | string[]) => void,
  onFiles: (key: string, fileList: FileList | null) => void,
) {
  if (field.type === "textarea") {
    return (
      <textarea
        value={typeof value === "string" ? value : ""}
        onChange={(event) => onAnswer(field.key, event.target.value)}
        className={`${commonClasses} min-h-32`}
      />
    );
  }

  if (field.type === "select" || field.type === "yes_no") {
    const options = field.type === "yes_no" ? ["Yes", "No"] : field.options ?? [];
    return (
      <select
        value={typeof value === "string" ? value : ""}
        onChange={(event) => onAnswer(field.key, event.target.value)}
        className={commonClasses}
      >
        <option value="">Select</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    );
  }

  if (field.type === "multiselect") {
    const selected = Array.isArray(value) ? value : [];
    return (
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        {field.options?.map((option) => (
          <label key={option} className="flex items-center gap-2 rounded-md border border-navy-200 px-3 py-2 text-sm">
            <input
              type="checkbox"
              checked={selected.includes(option)}
              onChange={() =>
                onAnswer(
                  field.key,
                  selected.includes(option)
                    ? selected.filter((item) => item !== option)
                    : [...selected, option],
                )
              }
            />
            {option}
          </label>
        ))}
      </div>
    );
  }

  if (field.type === "file") {
    return (
      <input
        type="file"
        multiple
        onChange={(event) => onFiles(field.key, event.target.files)}
        className={commonClasses}
      />
    );
  }

  const inputTypeByQuestionType: Partial<Record<QuestionType, string>> = {
    date: "date",
    email: "email",
    number: "number",
    phone: "tel",
  };

  return (
    <input
      type={inputTypeByQuestionType[field.type] ?? "text"}
      value={typeof value === "string" ? value : ""}
      onChange={(event) => onAnswer(field.key, event.target.value)}
      className={commonClasses}
    />
  );
}

function Confirmation({
  answers,
  files,
  selectedServices,
  onBack,
  onSubmit,
  isSubmitting,
}: {
  answers: Answers;
  files: FilesByKey;
  selectedServices: string[];
  onBack: () => void;
  onSubmit: () => void;
  isSubmitting: boolean;
}) {
  const selectedServiceNames = selectedServices
    .map((slug) => services.find((service) => service.slug === slug)?.name)
    .filter(Boolean);
  const payload = buildRequestPayload(answers, files, selectedServices);
  const uploadedFiles = Object.entries(files).flatMap(([field, selectedFiles]) =>
    selectedFiles.map((file) => ({ field, name: file.name })),
  );
  const checklistPreview = generateDocumentChecklist({
    selectedServices,
    payload,
    templates: getDefaultDocumentTemplatesForServices(selectedServices),
    uploadedFiles,
  });
  const requiredPreview = checklistPreview.filter((item) => item.required).slice(0, 12);
  const recommendedCount = checklistPreview.filter((item) => !item.required).length;

  return (
    <div className="space-y-8 p-5 sm:p-8">
      <div className="rounded-md border border-teal-100 bg-teal-50 p-5">
        <h3 className="font-semibold text-navy-950">Confirmation screen</h3>
        <p className="mt-2 text-sm leading-6 text-navy-650">
          Review the summary below. When you submit, Globalflowa receives a
          structured request and the information is stored for admin review.
        </p>
      </div>

      <SummaryBlock title="Customer details" rows={pickAnswers(generalCustomerFields, answers)} />
      <SummaryBlock title="Product information" rows={pickAnswers(productFields.filter((field) => field.type !== "file"), answers)} />
      <SummaryBlock title="Selected services" rows={{ services: selectedServiceNames.join(", ") }} />
      <ChecklistPreview items={requiredPreview} recommendedCount={recommendedCount} />
      <SummaryBlock
        title="Uploaded documents"
        rows={Object.fromEntries(
          Object.entries(files).map(([key, selectedFiles]) => [
            key,
            selectedFiles.map((file) => file.name).join(", "),
          ]),
        )}
      />

      <div className="flex flex-col justify-end gap-3 sm:flex-row">
        <button
          type="button"
          onClick={onBack}
          disabled={isSubmitting}
          className="rounded-md border border-navy-200 px-5 py-3 text-sm font-semibold text-navy-950 disabled:opacity-50"
        >
          Back to edit
        </button>
        <button
          type="button"
          onClick={onSubmit}
          disabled={isSubmitting}
          className="rounded-md bg-navy-950 px-5 py-3 text-sm font-semibold text-white hover:bg-navy-900 disabled:opacity-50"
        >
          {isSubmitting ? "Submitting..." : "Submit request"}
        </button>
      </div>
    </div>
  );
}

function ChecklistPreview({
  items,
  recommendedCount,
}: {
  items: ReturnType<typeof generateDocumentChecklist>;
  recommendedCount: number;
}) {
  return (
    <section className="rounded-md border border-navy-100 bg-white p-5">
      <h3 className="font-semibold text-navy-950">Document checklist preview</h3>
      <p className="mt-2 text-sm leading-6 text-navy-650">
        Based on your selected services, these documents may be required. Our
        team will review your uploaded documents and contact you if anything is
        missing or needs correction.
      </p>
      {items.length > 0 ? (
        <div className="mt-4 space-y-4">
          {groupChecklistByCategory(items).map((group) => (
            <div key={group.category}>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-teal-700">
                {group.category}
              </p>
              <ul className="mt-2 space-y-1 text-sm text-navy-650">
                {group.items.map((item) => (
                  <li key={item.document_key}>- {item.title}</li>
                ))}
              </ul>
            </div>
          ))}
          {recommendedCount > 0 ? (
            <p className="rounded-md bg-navy-50 px-3 py-2 text-xs text-navy-650">
              {recommendedCount} additional recommended document{recommendedCount === 1 ? "" : "s"} may be confirmed during review.
            </p>
          ) : null}
        </div>
      ) : (
        <p className="mt-3 text-sm text-navy-650">
          Globalflowa will confirm the exact document list after reviewing your request.
        </p>
      )}
    </section>
  );
}

function SummaryBlock({ title, rows }: { title: string; rows: Record<string, string | string[]> }) {
  const entries = Object.entries(rows).filter(([, value]) =>
    Array.isArray(value) ? value.length > 0 : Boolean(value),
  );

  return (
    <section className="rounded-md border border-navy-100 bg-white p-5">
      <h3 className="font-semibold text-navy-950">{title}</h3>
      {entries.length > 0 ? (
        <dl className="mt-4 grid gap-4 md:grid-cols-2">
          {entries.map(([key, value]) => (
            <div key={key}>
              <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-teal-700">
                {key.replaceAll("_", " ")}
              </dt>
              <dd className="mt-1 text-sm leading-6 text-navy-650">
                {Array.isArray(value) ? value.join(", ") : value}
              </dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="mt-3 text-sm text-navy-650">No details provided yet.</p>
      )}
    </section>
  );
}

function pickAnswers(fields: ServiceQuestion[], answers: Answers) {
  return Object.fromEntries(
    fields
      .map((field) => [field.key, answers[field.key] ?? ""])
      .filter(([, value]) => (Array.isArray(value) ? value.length > 0 : Boolean(value))),
  ) as Record<string, string | string[]>;
}

function buildRequestPayload(answers: Answers, files: FilesByKey, selectedServices: string[]): RequestPayload {
  const serviceAnswers: Record<string, Answers> = {};
  for (const serviceSlug of selectedServices) {
    const service = services.find((item) => item.slug === serviceSlug);
    if (!service) continue;
    serviceAnswers[service.slug] = {};
    for (const question of service.questions) {
      const answerKey = `${service.slug}.${question.key}`;
      if (answers[answerKey]) {
        serviceAnswers[service.slug][question.key] = answers[answerKey];
      }
    }
  }

  return {
    customer: pickAnswers(generalCustomerFields, answers),
    product: pickAnswers(productFields.filter((field) => field.type !== "file"), answers),
    selectedServices,
    serviceAnswers,
    fileFields: Object.fromEntries(
      Object.entries(files).map(([key, selectedFiles]) => [
        key,
        selectedFiles.map((file) => ({ name: file.name, size: file.size, type: file.type })),
      ]),
    ),
  } as RequestPayload;
}

function loadSavedRequestState(preselectedService: string | null) {
  if (typeof window === "undefined") {
    return { answers: {} as Answers, selectedServices: preselectedService ? [preselectedService] : [] };
  }

  const serviceSet = new Set<string>();
  const savedServices = window.localStorage.getItem(selectedServicesKey);
  const savedDraft = window.localStorage.getItem(draftKey);
  let answers: Answers = {};

  if (savedServices) {
    try {
      for (const slug of JSON.parse(savedServices) as string[]) {
        serviceSet.add(slug);
      }
    } catch {
      window.localStorage.removeItem(selectedServicesKey);
    }
  }

  if (savedDraft) {
    try {
      const parsed = JSON.parse(savedDraft) as { answers?: Answers; selectedServices?: string[] };
      answers = parsed.answers ?? {};
      for (const slug of parsed.selectedServices ?? []) {
        serviceSet.add(slug);
      }
    } catch {
      window.localStorage.removeItem(draftKey);
    }
  }

  if (preselectedService) {
    serviceSet.add(preselectedService);
  }

  return { answers, selectedServices: Array.from(serviceSet) };
}
