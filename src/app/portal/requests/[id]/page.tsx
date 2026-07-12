import Link from "next/link";
import { redirect } from "next/navigation";
import { DocumentUploadForm } from "@/components/portal/document-upload-form";
import { checklistCategories } from "@/lib/document-checklist";
import { isVerifiedCustomer } from "@/lib/auth/customer";
import { createSupabaseServerClient } from "@/lib/supabase/auth-server";
import { LogoutButtonShell, PortalConfigNotice, StatusBadge, formatDate } from "../portal-ui";
import { LifecycleProgress } from "@/components/portal/lifecycle-progress";
import { getCustomerNextAction, normalizeLifecycleStage } from "@/lib/request-lifecycle";
import { finalDeliverableCategoryLabels, finalDeliverableCategories, type FinalDeliverableCategory } from "@/lib/final-deliverables";

export const dynamic = "force-dynamic";

type RequestDetailPageProps = {
  params: Promise<{ id: string }>;
};

type RequestRow = {
  id: string;
  created_at: string;
  lifecycle_stage: string;
  lifecycle_stage_updated_at: string | null;
  completed_at: string | null;
  customer_completion_note: string | null;
  archived_at: string | null;
  company_name: string;
  contact_person: string;
  email: string;
  country: string;
  preferred_language: string | null;
  main_service: string | null;
  urgency: string | null;
  deadline: string | null;
  message: string | null;
};

type ServiceRow = {
  service_name: string;
  service_slug: string;
};

type AnswerRow = {
  id: string;
  scope: string;
  service_slug: string | null;
  question_key: string;
  answer: string | string[] | number | boolean | null;
};

type FileRow = {
  id: string;
  file_name: string;
  uploaded_by_role: string | null;
  linked_checklist_item_id: string | null;
  customer_note: string | null;
  created_at: string;
};

type ChecklistRow = {
  id: string;
  document_key: string;
  title: string;
  description: string;
  category: string;
  status: string;
  admin_note: string | null;
  admin_note_customer_visible: boolean;
  customer_note: string | null;
  linked_file_id: string | null;
  required: boolean;
  sort_order: number;
};

type NoteRow = {
  id: string;
  note: string;
  missing_documents: string[];
  created_at: string;
};

type CustomerMessageRow = {
  id: string;
  created_at: string;
  subject: string;
  message: string;
  checklist_item_ids: string[];
};

type FinalDeliverableRow = {
  id: string;
  title: string;
  description: string | null;
  file_category: string;
  file_name: string;
  file_size: number | null;
  published_at: string;
};

export default async function PortalRequestDetailPage({ params }: RequestDetailPageProps) {
  const { id } = await params;
  let supabase;

  try {
    supabase = await createSupabaseServerClient();
  } catch (error) {
    console.error("Customer request detail setup failed", {
      reason: error instanceof Error ? error.message : "unknown error",
    });
    return <PortalConfigNotice message="Customer portal is not configured." />;
  }

  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user || !(await isVerifiedCustomer(supabase, user))) {
    redirect("/portal/login");
  }

  const [{ data: request }, { data: services }, { data: answers }, { data: files }, { data: checklist }, { data: notes }, { data: customerMessages }, { data: deliverables }] =
    await Promise.all([
      supabase
        .from("service_requests")
        .select("id, created_at, lifecycle_stage, lifecycle_stage_updated_at, completed_at, customer_completion_note, archived_at, company_name, contact_person, email, country, preferred_language, main_service, urgency, deadline, message")
        .eq("id", id)
        .eq("customer_access_enabled", true)
        .eq("customer_user_id", user.id)
        .maybeSingle(),
      supabase.from("request_services").select("service_name, service_slug").eq("request_id", id),
      supabase.from("request_answers").select("id, scope, service_slug, question_key, answer").eq("request_id", id).order("created_at"),
      supabase.from("request_files").select("id, file_name, uploaded_by_role, linked_checklist_item_id, customer_note, created_at").eq("request_id", id).eq("uploaded_by_role", "customer").eq("is_final_deliverable", false).is("deleted_at", null).order("created_at", { ascending: false }),
      supabase
        .from("customer_request_checklist")
        .select("id, document_key, title, description, category, status, admin_note, admin_note_customer_visible, customer_note, linked_file_id, required, sort_order")
        .eq("request_id", id)
        .order("sort_order"),
      supabase
        .from("admin_notes")
        .select("id, note, missing_documents, created_at")
        .eq("request_id", id)
        .eq("customer_visible", true)
        .order("created_at", { ascending: false }),
      supabase
        .from("customer_messages")
        .select("id, created_at, subject, message, checklist_item_ids")
        .eq("request_id", id)
        .eq("customer_visible", true)
        .order("created_at", { ascending: false }),
      supabase
        .from("request_files")
        .select("id, title, description, file_category, file_name, file_size, published_at")
        .eq("request_id", id)
        .eq("is_final_deliverable", true)
        .eq("customer_visible", true)
        .not("published_at", "is", null)
        .is("deleted_at", null)
        .order("published_at", { ascending: false }),
    ]);

  if (!request) {
    return <PortalConfigNotice message="Request not found or this account does not have access." />;
  }

  const requestRow = request as RequestRow;
  const checklistRows = ((checklist ?? []) as ChecklistRow[]).sort((a, b) => a.sort_order - b.sort_order);
  const fileRows = (files ?? []) as FileRow[];
  const noteRows = (notes ?? []) as NoteRow[];
  const customerMessageRows = (customerMessages ?? []) as CustomerMessageRow[];
  const actionItems = checklistRows.filter((item) => needsCustomerAction(item));
  const summary = summarizeChecklist(checklistRows);
  const lifecycleStage = normalizeLifecycleStage(requestRow.lifecycle_stage);
  const deliverableRows = (deliverables ?? []) as FinalDeliverableRow[];
  const nextAction = getCustomerNextAction({ stage: lifecycleStage, checklist: checklistRows, hasActionMessage: customerMessageRows.some((message) => message.checklist_item_ids.length > 0), hasPublishedDeliverables: deliverableRows.length > 0 });

  return (
    <div className="bg-navy-50 px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <Link href="/portal/requests" className="text-sm font-semibold text-teal-700">
              Back to your requests
            </Link>
            <p className="mt-5 text-sm font-semibold uppercase tracking-[0.18em] text-teal-700">
              Customer Portal
            </p>
            <h1 className="mt-2 text-3xl font-semibold text-navy-950">{requestRow.company_name}</h1>
            <p className="mt-2 text-sm text-navy-650">
              {requestRow.main_service ?? "Service request"} · {formatDate(requestRow.created_at)}
            </p>
          </div>
          <LogoutButtonShell />
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_340px]">
          <div className="space-y-6">
            {lifecycleStage === "completed" ? <section className="rounded-md border border-teal-300 bg-teal-50 p-6"><h2 className="text-xl font-semibold text-teal-950">Request completed</h2><p className="mt-2 text-sm text-teal-900">{deliverableRows.length ? "Your request is complete. Your final documents are ready to download." : "Your request is complete. Final documents will appear here when they are published."}</p>{requestRow.customer_completion_note ? <p className="mt-3 text-sm text-teal-900">{requestRow.customer_completion_note}</p> : null}{requestRow.completed_at ? <p className="mt-2 text-xs text-teal-800">Completed {formatDate(requestRow.completed_at)}</p> : null}</section> : null}
            {lifecycleStage === "archived" ? <section className="rounded-md border border-navy-300 bg-navy-100 p-6"><h2 className="text-xl font-semibold text-navy-950">Archived request</h2><p className="mt-2 text-sm text-navy-700">This request is retained for reference and is read-only. Published final documents remain available.</p>{requestRow.archived_at ? <p className="mt-2 text-xs text-navy-600">Archived {formatDate(requestRow.archived_at)}</p> : null}</section> : null}
            <LifecycleProgress stage={lifecycleStage} updatedAt={requestRow.lifecycle_stage_updated_at} nextAction={nextAction.label} />
            <FinalDocuments files={deliverableRows} completed={lifecycleStage === "completed"} />
            <section className="rounded-md border border-navy-100 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-navy-950">Document progress</h2>
                  <p className="mt-2 text-sm leading-6 text-navy-650">
                    Globalflowa is tracking your case here. Upload missing or corrected documents below when requested.
                  </p>
                </div>
              </div>
              <div className="mt-5 h-2 overflow-hidden rounded-full bg-navy-100">
                <div className="h-full rounded-full bg-teal-600" style={{ width: `${summary.percent}%` }} />
              </div>
              <p className="mt-2 text-sm text-navy-650">
                {summary.accepted}/{summary.total} required documents accepted
                {summary.action ? ` · ${summary.action} need your attention` : ""}
              </p>
            </section>

            <MessagesFromGlobalflowa
              messages={customerMessageRows}
              checklistItems={checklistRows}
            />

            {actionItems.length ? (
              <section className="rounded-md border border-red-200 bg-red-50 p-5">
                <h2 className="text-lg font-semibold text-red-800">Documents needing action</h2>
                <ul className="mt-3 space-y-1 text-sm text-red-700">
                  {actionItems.map((item) => (
                    <li key={item.id}>- {item.title} ({item.status.replaceAll("_", " ")})</li>
                  ))}
                </ul>
              </section>
            ) : null}

            <section id="document-checklist" className="scroll-mt-6 rounded-md border border-navy-100 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-navy-950">Document checklist</h2>
              <p className="mt-2 text-sm leading-6 text-navy-650">
                Final requirements depend on Globalflowa review. Accepted items are complete; missing, incorrect, expired, or required items may need an upload.
              </p>

              {checklistRows.length ? (
                <div className="mt-6 space-y-6">
                  {checklistCategories.map((category) => {
                    const categoryItems = checklistRows.filter((item) => item.category === category);
                    if (!categoryItems.length) return null;

                    return (
                      <div key={category}>
                        <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-teal-700">
                          {category}
                        </h3>
                        <div className="mt-3 space-y-3">
                          {categoryItems.map((item) => (
                            <ChecklistItemCard
                              key={item.id}
                              requestId={requestRow.id}
                              item={item}
                              files={fileRows.filter(
                                (file) => file.linked_checklist_item_id === item.id || item.linked_file_id === file.id,
                              )}
                              acceptsUploads={!(["completed", "archived"].includes(lifecycleStage))}
                            />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="mt-5 rounded-md border border-dashed border-navy-200 bg-navy-50 p-5 text-sm text-navy-650">
                  No checklist has been published for this request yet. Globalflowa will update it after review.
                </div>
              )}
            </section>

            <InfoSection
              title="Submitted customer and product information"
              rows={[
                ["Contact person", requestRow.contact_person],
                ["Email", requestRow.email],
                ["Country", requestRow.country],
                ["Preferred language", requestRow.preferred_language],
                ["Urgency", requestRow.urgency],
                ["Deadline", requestRow.deadline],
                ["Message", requestRow.message],
              ]}
            />
            <ServicesSection services={(services ?? []) as ServiceRow[]} />
            <AnswersSection answers={(answers ?? []) as AnswerRow[]} />
          </div>

          <aside className="space-y-6">
            <section className="rounded-md border border-navy-100 bg-white p-5 shadow-sm">
              <h2 className="text-xl font-semibold text-navy-950">Request reference</h2>
              <p className="mt-3 rounded-md bg-navy-50 px-3 py-2 font-mono text-xs text-navy-700">{requestRow.id}</p>
              <p className="mt-4 text-sm text-navy-650">
                Our team will review your uploaded documents and contact you if anything is missing or needs correction.
              </p>
            </section>
            {noteRows.length ? (
              <section className="rounded-md border border-navy-100 bg-white p-5 shadow-sm">
                <h2 className="text-xl font-semibold text-navy-950">Globalflowa notes</h2>
                <div className="mt-4 space-y-3">
                  {noteRows.map((note) => (
                    <div key={note.id} className="rounded-md bg-navy-50 p-3">
                      <p className="text-sm text-navy-650">{note.note}</p>
                      {note.missing_documents?.length ? (
                        <p className="mt-2 text-xs font-semibold text-red-700">
                          Missing: {note.missing_documents.join(", ")}
                        </p>
                      ) : null}
                      <p className="mt-2 text-xs text-navy-500">{formatDate(note.created_at)}</p>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}
          </aside>
        </div>
      </div>
    </div>
  );
}

function FinalDocuments({ files, completed }: { files: FinalDeliverableRow[]; completed: boolean }) {
  return (
    <section className="rounded-md border border-navy-100 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-navy-950">Final Documents</h2>
      <p className="mt-2 text-sm text-navy-650">Published completion documents are available through a short-lived secure download link.</p>
      {files.length ? <div className="mt-5 space-y-3">{files.map((file) => {
        const category = finalDeliverableCategories.includes(file.file_category as FinalDeliverableCategory) ? file.file_category as FinalDeliverableCategory : "other";
        return <article key={file.id} className="rounded-md border border-navy-100 bg-navy-50 p-4"><h3 className="font-semibold text-navy-950">{file.title || file.file_name}</h3>{file.description ? <p className="mt-2 text-sm text-navy-650">{file.description}</p> : null}<p className="mt-2 text-xs text-navy-500">{finalDeliverableCategoryLabels[category]} · {file.file_name} · {formatFileSize(file.file_size)} · Published {formatDate(file.published_at)}</p><a href={`/api/portal/files/${file.id}/download`} className="mt-3 inline-flex rounded-md bg-teal-700 px-3 py-2 text-sm font-semibold text-white">Secure download</a></article>;
      })}</div> : <p className="mt-5 rounded-md border border-dashed border-navy-200 bg-navy-50 p-4 text-sm text-navy-650">{completed ? "Your request is completed. Final documents will appear here when they are published." : "Final documents have not been published yet."}</p>}
    </section>
  );
}

function formatFileSize(value: number | null) {
  if (!value) return "Size unavailable";
  return value < 1024 * 1024 ? `${Math.ceil(value / 1024)} KB` : `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function ChecklistItemCard({
  requestId,
  item,
  files,
  acceptsUploads,
}: {
  requestId: string;
  item: ChecklistRow;
  files: FileRow[];
  acceptsUploads: boolean;
}) {
  const actionNeeded = needsCustomerAction(item);
  const lastUploaded = files[0] ?? null;

  return (
    <div
      id={`checklist-${item.id}`}
      className={`scroll-mt-6 rounded-md border p-4 ${getChecklistCardTone(item.status, actionNeeded)}`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="font-semibold text-navy-950">{item.title}</h4>
            <StatusBadge status={item.status} />
            <span className="rounded-full bg-white px-2 py-1 text-xs font-semibold text-navy-650">
              {item.required ? "Required" : "Recommended"}
            </span>
          </div>
          <p className="mt-2 text-sm leading-6 text-navy-650">{item.description}</p>
          {item.status === "incorrect" ? (
            <p className="mt-3 rounded-md border border-red-200 bg-white px-3 py-2 text-sm font-semibold text-red-700">
              Correction requested. Review the reason below and upload a corrected file under this item.
            </p>
          ) : null}
          {item.admin_note_customer_visible && item.admin_note ? (
            <p className="mt-3 rounded-md bg-white px-3 py-2 text-sm text-navy-700">
              Globalflowa note: {item.admin_note}
            </p>
          ) : null}
          {item.customer_note ? (
            <p className="mt-2 text-xs text-navy-650">Your note: {item.customer_note}</p>
          ) : null}
          <p className="mt-3 text-sm font-semibold text-navy-700">
            {getChecklistActionHint(item.status)}
          </p>
        </div>
      </div>

      {files.length ? (
        <div className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-navy-650">Linked files</p>
          <ul className="mt-2 space-y-1 text-sm">
            {files.map((file) => (
              <li key={file.id}>
                <Link href={`/api/portal/files/${file.id}`} className="font-semibold text-navy-950 underline decoration-teal-300 underline-offset-4 hover:text-teal-700">
                  {file.file_name}
                </Link>
                <span className="ml-2 text-xs text-navy-500">{formatDate(file.created_at)}</span>
              </li>
            ))}
          </ul>
          {lastUploaded ? (
            <p className="mt-2 text-xs font-semibold text-navy-650">
              Last uploaded: {lastUploaded.file_name} · {formatDate(lastUploaded.created_at)}
            </p>
          ) : null}
        </div>
      ) : null}

      {acceptsUploads ? <DocumentUploadForm requestId={requestId} checklistItemId={item.id} existingNote={item.customer_note} isReplacement={["incorrect", "expired"].includes(item.status)} /> : <p className="mt-4 rounded-md bg-navy-50 p-3 text-sm font-semibold text-navy-650">This request is no longer accepting uploads.</p>}
    </div>
  );
}

function MessagesFromGlobalflowa({
  messages,
  checklistItems,
}: {
  messages: CustomerMessageRow[];
  checklistItems: ChecklistRow[];
}) {
  const checklistById = new Map(checklistItems.map((item) => [item.id, item]));

  return (
    <section className="rounded-md border border-navy-100 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-navy-950">Messages from Globalflowa</h2>
      {messages.length ? (
        <div className="mt-5 space-y-4">
          {messages.map((message) => {
            const relatedItems = message.checklist_item_ids
              .map((itemId) => checklistById.get(itemId))
              .filter((item): item is ChecklistRow => Boolean(item));

            return (
              <article key={message.id} className="rounded-md border border-teal-100 bg-teal-50/40 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-teal-700">
                  {formatDate(message.created_at)}
                </p>
                <h3 className="mt-2 text-lg font-semibold text-navy-950">{message.subject}</h3>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-navy-650">
                  {message.message}
                </p>

                {relatedItems.length ? (
                  <div className="mt-4 rounded-md bg-white p-4">
                    <h4 className="text-sm font-semibold text-navy-950">Documents requiring action</h4>
                    <ul className="mt-3 space-y-3">
                      {relatedItems.map((item) => (
                        <li key={item.id} className="text-sm text-navy-650">
                          <div className="flex flex-wrap items-center gap-2">
                            <Link
                              href={`#checklist-${item.id}`}
                              className="font-semibold text-navy-950 underline decoration-teal-300 underline-offset-4 hover:text-teal-700"
                            >
                              {item.title}
                            </Link>
                            <StatusBadge status={item.status} />
                          </div>
                          <p className="mt-1 text-xs">{getChecklistActionHint(item.status)}</p>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <p className="mt-4 text-xs text-navy-500">
                    The related checklist items are no longer available in the customer portal.
                  </p>
                )}
              </article>
            );
          })}
        </div>
      ) : (
        <p className="mt-3 text-sm text-navy-650">
          Globalflowa has not sent any messages for this request yet.
        </p>
      )}
    </section>
  );
}

function getChecklistActionHint(status: string) {
  if (["required", "missing", "incorrect", "expired"].includes(status)) {
    return "Upload the missing or corrected file under this checklist item below.";
  }
  if (["uploaded", "under_review"].includes(status)) {
    return "Your document is uploaded and awaiting Globalflowa review.";
  }
  if (status === "accepted") {
    return "Globalflowa has accepted this document.";
  }
  return "No customer action is currently required.";
}

function getChecklistCardTone(status: string, actionNeeded: boolean) {
  if (actionNeeded) return "border-red-200 bg-red-50";
  if (status === "accepted") return "border-teal-200 bg-teal-50/50";
  if (["uploaded", "under_review"].includes(status)) return "border-blue-200 bg-blue-50/50";
  return "border-navy-100 bg-navy-50";
}

function InfoSection({ title, rows }: { title: string; rows: Array<[string, string | null]> }) {
  return (
    <section className="rounded-md border border-navy-100 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-navy-950">{title}</h2>
      <dl className="mt-5 grid gap-4 md:grid-cols-2">
        {rows.map(([label, value]) => (
          <div key={label}>
            <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-teal-700">{label}</dt>
            <dd className="mt-1 text-sm text-navy-650">{value || "Not provided"}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function ServicesSection({ services }: { services: ServiceRow[] }) {
  return (
    <section className="rounded-md border border-navy-100 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-navy-950">Selected services</h2>
      {services.length ? (
        <ul className="mt-4 space-y-2 text-sm text-navy-650">
          {services.map((service) => (
            <li key={service.service_slug}>- {service.service_name}</li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-navy-650">No selected services are stored yet.</p>
      )}
    </section>
  );
}

function AnswersSection({ answers }: { answers: AnswerRow[] }) {
  const visibleAnswers = answers.filter((answer) => answer.scope === "product" || answer.scope === "general");

  return (
    <section className="rounded-md border border-navy-100 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-navy-950">Submitted answers</h2>
      {visibleAnswers.length ? (
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {visibleAnswers.map((answer) => (
            <div key={answer.id} className="rounded-md bg-navy-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-teal-700">
                {answer.scope}
              </p>
              <p className="mt-2 font-semibold text-navy-950">{answer.question_key}</p>
              <p className="mt-1 text-sm text-navy-650">
                {Array.isArray(answer.answer) ? answer.answer.join(", ") : String(answer.answer ?? "")}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-3 text-sm text-navy-650">No customer/product answer summary is stored yet.</p>
      )}
    </section>
  );
}

function summarizeChecklist(items: ChecklistRow[]) {
  const required = items.filter((item) => item.required);
  const accepted = required.filter((item) => item.status === "accepted").length;
  const action = required.filter((item) => needsCustomerAction(item)).length;
  const percent = required.length ? Math.round((accepted / required.length) * 100) : 0;

  return { total: required.length, accepted, action, percent };
}

function needsCustomerAction(item: ChecklistRow) {
  return item.required && (
    ["required", "missing", "incorrect", "expired"].includes(item.status) ||
    !item.linked_file_id
  );
}
