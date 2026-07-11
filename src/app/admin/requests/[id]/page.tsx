import Link from "next/link";
import { redirect } from "next/navigation";
import {
  DocumentChecklistSection,
  type AdminChecklistItem,
  type AdminFileOption,
} from "@/components/admin/document-checklist-section";
import {
  CustomerMessageSection,
  type CustomerMessageChecklistItem,
} from "@/components/admin/customer-message-section";
import { RequestActions } from "@/components/admin/request-actions";
import { CustomerPortalAccess } from "@/components/admin/customer-portal-access";
import {
  InternalTasksSection,
  type InternalTaskItem,
} from "@/components/admin/internal-tasks-section";
import {
  RequestOwnershipSection,
  type StaffProfileOption,
} from "@/components/admin/request-ownership-section";
import { createSupabaseServerClient } from "@/lib/supabase/auth-server";
import { isAdminUser } from "@/lib/supabase/roles";

export const dynamic = "force-dynamic";

type RequestDetailPageProps = {
  params: Promise<{ id: string }>;
};

type RequestRow = {
  id: string;
  created_at: string;
  status: string;
  priority: string;
  assigned_to: string | null;
  due_at: string | null;
  assigned_at: string | null;
  assigned_by: string | null;
  company_name: string;
  contact_person: string;
  email: string;
  customer_email: string | null;
  customer_user_id: string | null;
  customer_access_enabled: boolean | null;
  phone: string | null;
  whatsapp: string | null;
  wechat: string | null;
  country: string;
  preferred_language: string | null;
  main_service: string | null;
  urgency: string | null;
  deadline: string | null;
  message: string | null;
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
  field_key: string;
  file_name: string;
  storage_bucket: string;
  storage_path: string;
  uploaded_by_role: string | null;
  linked_checklist_item_id: string | null;
  customer_note: string | null;
};

type NoteRow = {
  id: string;
  note: string;
  missing_documents: string[];
  customer_visible: boolean;
  created_at: string;
};

type ActivityRow = {
  id: string;
  actor_type: string;
  action: string;
  details: Record<string, unknown>;
  created_at: string;
};

type CustomerMessageRow = {
  id: string;
  subject: string;
  message: string;
  email_status: string;
  customer_visible: boolean;
  created_at: string;
  sent_at: string | null;
};

type StaffProfileRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  role: string;
};

type CustomerProfileRow = { email: string | null; full_name: string | null; phone: string | null; job_title: string | null };
type CustomerCompanyRow = { legal_name: string | null; country_code: string | null; registration_number: string | null; vat_number: string | null; address_line_1: string | null; address_line_2: string | null; city: string | null; postal_code: string | null };

export default async function RequestDetailPage({ params }: RequestDetailPageProps) {
  const { id } = await params;
  let supabase;

  try {
    supabase = await createSupabaseServerClient();
  } catch (error) {
    console.error("Admin request detail setup failed", {
      reason: error instanceof Error ? error.message : "unknown error",
    });
    return <ConfigNotice message="Admin request detail is not configured." />;
  }

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    redirect("/admin/login");
  }
  if (!(await isAdminUser(supabase, userData.user))) {
    redirect("/portal/requests");
  }

  const [{ data: request }, { data: services }, { data: answers }, { data: files }, { data: checklist }, { data: notes }, { data: activity }, { data: customerMessages }, { data: staffProfiles }, { data: internalTasks }] =
    await Promise.all([
      supabase.from("service_requests").select("*").eq("id", id).single(),
      supabase.from("request_services").select("service_name, service_slug").eq("request_id", id),
      supabase.from("request_answers").select("*").eq("request_id", id).order("created_at"),
      supabase.from("request_files").select("*").eq("request_id", id).order("created_at"),
      supabase.from("request_document_checklist").select("*").eq("request_id", id).order("sort_order"),
      supabase.from("admin_notes").select("*").eq("request_id", id).order("created_at", { ascending: false }),
      supabase.from("request_activity_log").select("*").eq("request_id", id).order("created_at", { ascending: false }),
      supabase
        .from("customer_messages")
        .select("id, subject, message, email_status, customer_visible, created_at, sent_at")
        .eq("request_id", id)
        .order("created_at", { ascending: false }),
      supabase
        .from("profiles")
        .select("id, full_name, email, role")
        .in("role", ["admin", "team"])
        .order("full_name"),
      supabase
        .from("internal_tasks")
        .select("id, title, description, status, priority, assigned_to, due_at, completed_at, created_at")
        .eq("request_id", id)
        .order("created_at", { ascending: false }),
    ]);

  if (!request) {
    return <ConfigNotice message="Request not found or your admin profile does not have access." />;
  }

  const requestRow = request as RequestRow;
  const activityRows = (activity ?? []) as ActivityRow[];
  const linkedActivity = activityRows.find((item) => item.action === "customer_account_linked");
  const [customerProfileResult, customerCompanyResult] = requestRow.customer_user_id
    ? await Promise.all([
        supabase.from("profiles").select("email, full_name, phone, job_title").eq("id", requestRow.customer_user_id).maybeSingle(),
        supabase.from("customer_companies").select("legal_name, country_code, registration_number, vat_number, address_line_1, address_line_2, city, postal_code").eq("owner_user_id", requestRow.customer_user_id).maybeSingle(),
      ])
    : [{ data: null }, { data: null }];
  const customerProfile = customerProfileResult.data as CustomerProfileRow | null;
  const customerCompany = customerCompanyResult.data as CustomerCompanyRow | null;
  const companyAddress = customerCompany
    ? [customerCompany.address_line_1, customerCompany.address_line_2, customerCompany.postal_code, customerCompany.city].filter(Boolean).join(", ") || null
    : null;
  const staffRows = (staffProfiles ?? []) as StaffProfileRow[];
  const staffOptions = staffRows.map((profile) => ({
    id: profile.id,
    fullName: profile.full_name,
    email: profile.email,
    role: profile.role,
  })) satisfies StaffProfileOption[];
  const assignedByName = staffOptions.find((profile) => profile.id === requestRow.assigned_by);
  const checklistRows = (checklist ?? []) as AdminChecklistItem[];
  const nextAction = getAdminNextAction(requestRow.status, checklistRows);
  const customerActionItems = checklistRows
    .filter(
      (item) =>
        item.customer_visible &&
        ["required", "missing", "incorrect", "expired"].includes(item.status),
    )
    .map((item) => ({
      id: item.id,
      title: item.title,
      category: item.category,
      status: item.status,
    })) satisfies CustomerMessageChecklistItem[];

  return (
    <div className="bg-navy-50 px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm font-semibold text-teal-700">
          <div className="flex flex-wrap gap-4">
            <Link href="/admin/overview">Overview</Link>
            <Link href="/admin/requests">Requests</Link>
          </div>
          <Link href="/admin/document-review">Document Review</Link>
        </div>
        <div className="mt-5 grid gap-8 lg:grid-cols-[1fr_360px]">
          <div className="space-y-6">
            <section className="rounded-md border border-navy-100 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-teal-700">
                    Request status
                  </p>
                  <h1 className="mt-2 text-3xl font-semibold text-navy-950">
                    {requestRow.company_name}
                  </h1>
                  <p className="mt-2 text-navy-650">
                    {requestRow.main_service} · {new Date(requestRow.created_at).toLocaleString()}
                  </p>
                </div>
                <span className="w-fit rounded-full bg-teal-50 px-3 py-1 text-sm font-semibold text-teal-800">
                  {requestRow.status}
                </span>
              </div>

              <div className="mt-6 rounded-md border border-teal-200 bg-teal-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-teal-800">
                  Next recommended action
                </p>
                <h2 className="mt-2 text-lg font-semibold text-navy-950">{nextAction.title}</h2>
                <p className="mt-1 text-sm text-navy-650">{nextAction.description}</p>
                <Link
                  href={nextAction.href}
                  className="mt-3 inline-flex text-sm font-semibold text-teal-800 underline decoration-teal-300 underline-offset-4"
                >
                  {nextAction.linkLabel}
                </Link>
              </div>
            </section>

            <RequestOwnershipSection
              requestId={requestRow.id}
              initialAssignedTo={requestRow.assigned_to}
              initialPriority={requestRow.priority}
              initialDueAt={requestRow.due_at}
              assignedAt={requestRow.assigned_at}
              assignedByName={assignedByName?.fullName || assignedByName?.email || null}
              staff={staffOptions}
            />

            <InternalTasksSection
              requestId={requestRow.id}
              initialTasks={(internalTasks ?? []) as InternalTaskItem[]}
              staff={staffOptions}
            />

            <InfoGrid
              title="Customer details"
              rows={{
                "Contact person": requestRow.contact_person,
                Email: requestRow.email,
                "Portal email": requestRow.customer_email,
                "Portal linked user": requestRow.customer_user_id,
                "Portal access": requestRow.customer_access_enabled === false ? "Disabled" : "Enabled",
                Phone: requestRow.phone,
                WhatsApp: requestRow.whatsapp,
                WeChat: requestRow.wechat,
                Country: requestRow.country,
                "Preferred language": requestRow.preferred_language,
                Urgency: requestRow.urgency,
                Deadline: requestRow.deadline,
                Message: requestRow.message,
              }}
            />

            <CustomerPortalAccess
              email={customerProfile?.email || requestRow.customer_email || requestRow.email}
              customerUserId={requestRow.customer_user_id}
              linkedAt={linkedActivity ? new Date(linkedActivity.created_at).toLocaleString() : null}
              summary={requestRow.customer_user_id ? {
                fullName: customerProfile?.full_name ?? null,
                phone: customerProfile?.phone ?? null,
                jobTitle: customerProfile?.job_title ?? null,
                legalName: customerCompany?.legal_name ?? null,
                countryCode: customerCompany?.country_code ?? null,
                registrationNumber: customerCompany?.registration_number ?? null,
                vatNumber: customerCompany?.vat_number ?? null,
                address: companyAddress,
              } : null}
            />

            <ListSection
              title="Selected services"
              items={(services ?? []).map((service) => `${service.service_name} (${service.service_slug})`)}
            />

            <AnswersSection answers={(answers ?? []) as AnswerRow[]} />

            <SectionLabel
              title="Document status"
              description="Customer uploads and the review state of every checklist requirement."
            />
            <FilesSection files={(files ?? []) as FileRow[]} />
            <div id="document-checklist" className="scroll-mt-6">
              <DocumentChecklistSection
                requestId={requestRow.id}
                initialItems={checklistRows}
                files={(files ?? []) as AdminFileOption[]}
              />
            </div>

            <SectionLabel
              title="Customer communication"
              description="Messages in this section are customer-facing. Internal notes remain separate below."
            />
            <CustomerMessagesHistory messages={(customerMessages ?? []) as CustomerMessageRow[]} />
            <div id="customer-message" className="scroll-mt-6">
              <CustomerMessageSection
                requestId={requestRow.id}
                actionItems={customerActionItems}
              />
            </div>

            <SectionLabel
              title="Internal operations"
              description="Admin notes and request activity are visible to the Globalflowa team only unless a note was explicitly marked customer-visible."
            />
            <NotesSection notes={(notes ?? []) as NoteRow[]} />
            <ActivitySection activity={activityRows} />
          </div>

          <div id="admin-actions" className="scroll-mt-6">
            <RequestActions requestId={requestRow.id} currentStatus={requestRow.status} />
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoGrid({ title, rows }: { title: string; rows: Record<string, string | null> }) {
  return (
    <section className="rounded-md border border-navy-100 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-navy-950">{title}</h2>
      <dl className="mt-5 grid gap-4 md:grid-cols-2">
        {Object.entries(rows).map(([key, value]) => (
          <div key={key}>
            <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-teal-700">{key}</dt>
            <dd className="mt-1 text-sm text-navy-650">{value || "Not provided"}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function ListSection({ title, items }: { title: string; items: string[] }) {
  return (
    <section className="rounded-md border border-navy-100 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-navy-950">{title}</h2>
      {items.length ? (
        <ul className="mt-4 space-y-2 text-sm text-navy-650">
          {items.map((item) => <li key={item}>- {item}</li>)}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-navy-650">No records yet.</p>
      )}
    </section>
  );
}

function AnswersSection({ answers }: { answers: AnswerRow[] }) {
  return (
    <section className="rounded-md border border-navy-100 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-navy-950">Customer answers</h2>
      {answers.length ? (
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {answers.map((answer) => (
            <div key={answer.id} className="rounded-md bg-navy-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-teal-700">
                {answer.scope} {answer.service_slug ? `· ${answer.service_slug}` : ""}
              </p>
              <p className="mt-2 font-semibold text-navy-950">{answer.question_key}</p>
              <p className="mt-1 text-sm text-navy-650">
                {Array.isArray(answer.answer) ? answer.answer.join(", ") : String(answer.answer ?? "")}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-3 text-sm text-navy-650">No answers stored yet.</p>
      )}
    </section>
  );
}

function FilesSection({ files }: { files: FileRow[] }) {
  return (
    <section className="rounded-md border border-navy-100 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-navy-950">Uploaded files</h2>
      {files.length ? (
        <ul className="mt-4 space-y-3 text-sm text-navy-650">
          {files.map((file) => (
            <li key={file.id} className="rounded-md bg-navy-50 p-3">
              <Link
                href={`/api/admin/files/${file.id}`}
                className="font-semibold text-navy-950 underline decoration-teal-300 underline-offset-4 hover:text-teal-700"
              >
                {file.file_name}
              </Link>
              <span className="ml-2 rounded-full bg-white px-2 py-1 text-xs font-semibold text-navy-650">
                {file.uploaded_by_role ?? "customer"}
              </span>
              <span className="block font-mono text-xs">{file.storage_bucket}/{file.storage_path}</span>
              {file.linked_checklist_item_id ? (
                <span className="mt-1 block text-xs text-teal-700">
                  Linked to checklist item {file.linked_checklist_item_id}
                </span>
              ) : null}
              {file.customer_note ? (
                <p className="mt-2 text-xs text-navy-650">Customer note: {file.customer_note}</p>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-navy-650">No files uploaded.</p>
      )}
    </section>
  );
}

function NotesSection({ notes }: { notes: NoteRow[] }) {
  return (
    <section className="rounded-md border border-navy-100 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-navy-950">Internal notes</h2>
      {notes.length ? (
        <div className="mt-4 space-y-3">
          {notes.map((note) => (
            <div key={note.id} className="rounded-md bg-navy-50 p-4">
              <p className="text-sm text-navy-650">{note.note}</p>
              {note.missing_documents?.length ? (
                <p className="mt-2 text-sm font-semibold text-teal-700">
                  Missing: {note.missing_documents.join(", ")}
                </p>
              ) : null}
              {note.customer_visible ? (
                <p className="mt-2 text-xs font-semibold text-teal-700">Visible to customer</p>
              ) : null}
              <p className="mt-2 text-xs text-navy-650">{new Date(note.created_at).toLocaleString()}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-3 text-sm text-navy-650">No notes yet.</p>
      )}
    </section>
  );
}

function CustomerMessagesHistory({ messages }: { messages: CustomerMessageRow[] }) {
  return (
    <section className="rounded-md border border-navy-100 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-navy-950">Customer-visible message history</h2>
      {messages.length ? (
        <div className="mt-4 space-y-3">
          {messages.map((message) => (
            <article key={message.id} className="rounded-md border border-teal-100 bg-teal-50/40 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-navy-950">{message.subject}</h3>
                  <p className="mt-1 text-xs text-navy-500">
                    {new Date(message.sent_at ?? message.created_at).toLocaleString()}
                  </p>
                </div>
                <span className="rounded-full bg-white px-2 py-1 text-xs font-semibold text-teal-800">
                  Email {message.email_status}
                </span>
              </div>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-navy-650">{message.message}</p>
              {!message.customer_visible ? (
                <p className="mt-3 text-xs font-semibold text-amber-800">Hidden from the customer portal</p>
              ) : null}
            </article>
          ))}
        </div>
      ) : (
        <p className="mt-3 text-sm text-navy-650">No customer messages have been sent for this request yet.</p>
      )}
    </section>
  );
}

function ActivitySection({ activity }: { activity: ActivityRow[] }) {
  return (
    <section id="activity-history" className="scroll-mt-6 rounded-md border border-navy-100 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-navy-950">Activity history</h2>
      {activity.length ? (
        <ol className="mt-5 border-l border-navy-200 pl-5 text-sm text-navy-650">
          {activity.map((item) => (
            <li key={item.id} className="relative pb-5 last:pb-0">
              <span className="absolute -left-[1.55rem] top-1 h-3 w-3 rounded-full border-2 border-white bg-teal-600" />
              <p className="font-semibold text-navy-950">{formatActivityAction(item.action)}</p>
              <p className="mt-1 text-xs">
                {item.actor_type} · {new Date(item.created_at).toLocaleString()}
              </p>
              {describeActivity(item.details) ? (
                <p className="mt-2 text-sm text-navy-650">{describeActivity(item.details)}</p>
              ) : null}
            </li>
          ))}
        </ol>
      ) : (
        <p className="mt-3 text-sm text-navy-650">No activity yet.</p>
      )}
    </section>
  );
}

function SectionLabel({ title, description }: { title: string; description: string }) {
  return (
    <div className="pt-2">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-700">Workspace</p>
      <h2 className="mt-1 text-2xl font-semibold text-navy-950">{title}</h2>
      <p className="mt-2 text-sm text-navy-650">{description}</p>
    </div>
  );
}

function getAdminNextAction(status: string, checklist: AdminChecklistItem[]) {
  const reviewCount = checklist.filter((item) => ["uploaded", "under_review"].includes(item.status)).length;
  const customerActionCount = checklist.filter(
    (item) => item.required && ["required", "missing", "incorrect", "expired"].includes(item.status),
  ).length;
  const requiredItems = checklist.filter((item) => item.required);
  const allRequiredAccepted = requiredItems.length > 0 && requiredItems.every((item) => item.status === "accepted");

  if (status === "Completed") {
    return {
      title: "Request completed",
      description: "No operational action is required unless the case needs to be reopened.",
      href: "#activity-history",
      linkLabel: "Review timeline",
    };
  }
  if (reviewCount > 0) {
    return {
      title: "Review documents",
      description: `${reviewCount} customer ${reviewCount === 1 ? "document is" : "documents are"} waiting for review.`,
      href: "/admin/document-review",
      linkLabel: "Open document review",
    };
  }
  if (customerActionCount > 0 && status === "Waiting for Customer") {
    return {
      title: "Waiting for customer upload",
      description: `${customerActionCount} required ${customerActionCount === 1 ? "item needs" : "items need"} customer action.`,
      href: "#customer-message",
      linkLabel: "Review customer communication",
    };
  }
  if (customerActionCount > 0) {
    return {
      title: "Send customer message",
      description: "Tell the customer which missing or corrected documents should be uploaded through the portal.",
      href: "#customer-message",
      linkLabel: "Prepare customer message",
    };
  }
  if (allRequiredAccepted || status === "In Progress" || status === "Submitted to Authority") {
    return {
      title: "Mark completed when work is finished",
      description: "Document requirements are clear. Complete the remaining service work, then update the request status.",
      href: "#admin-actions",
      linkLabel: "Open admin actions",
    };
  }
  return {
    title: "Review request details",
    description: "Confirm the service scope and checklist before moving the request forward.",
    href: "#document-checklist",
    linkLabel: "Review checklist",
  };
}

function formatActivityAction(action: string) {
  return action.replaceAll("_", " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

function describeActivity(details: Record<string, unknown>) {
  const values = [
    details.checklist_item,
    details.file_name,
    details.subject,
    details.status,
    typeof details.previous_status === "string" ? `Previously ${details.previous_status}` : null,
  ]
    .filter((value): value is string => typeof value === "string" && value.length > 0);
  return values.join(" · ");
}

function ConfigNotice({ message }: { message: string }) {
  return (
    <div className="bg-navy-50 px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl rounded-md border border-navy-100 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-navy-950">Request unavailable</h1>
        <p className="mt-3 text-navy-650">{message}</p>
      </div>
    </div>
  );
}
