import Link from "next/link";
import { redirect } from "next/navigation";
import { RequestActions } from "@/components/admin/request-actions";
import { createSupabaseServerClient } from "@/lib/supabase/auth-server";

export const dynamic = "force-dynamic";

type RequestDetailPageProps = {
  params: Promise<{ id: string }>;
};

type RequestRow = {
  id: string;
  created_at: string;
  status: string;
  company_name: string;
  contact_person: string;
  email: string;
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
};

type NoteRow = {
  id: string;
  note: string;
  missing_documents: string[];
  created_at: string;
};

type ActivityRow = {
  id: string;
  actor_type: string;
  action: string;
  details: Record<string, unknown>;
  created_at: string;
};

export default async function RequestDetailPage({ params }: RequestDetailPageProps) {
  const { id } = await params;
  let supabase;

  try {
    supabase = await createSupabaseServerClient();
  } catch (error) {
    return <ConfigNotice message={error instanceof Error ? error.message : "Supabase is not configured."} />;
  }

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    redirect("/admin/login");
  }

  const [{ data: request }, { data: services }, { data: answers }, { data: files }, { data: notes }, { data: activity }] =
    await Promise.all([
      supabase.from("service_requests").select("*").eq("id", id).single(),
      supabase.from("request_services").select("service_name, service_slug").eq("request_id", id),
      supabase.from("request_answers").select("*").eq("request_id", id).order("created_at"),
      supabase.from("request_files").select("*").eq("request_id", id).order("created_at"),
      supabase.from("admin_notes").select("*").eq("request_id", id).order("created_at", { ascending: false }),
      supabase.from("request_activity_log").select("*").eq("request_id", id).order("created_at", { ascending: false }),
    ]);

  if (!request) {
    return <ConfigNotice message="Request not found or your admin profile does not have access." />;
  }

  const requestRow = request as RequestRow;

  return (
    <div className="bg-navy-50 px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <Link href="/admin/requests" className="text-sm font-semibold text-teal-700">
          Back to requests
        </Link>
        <div className="mt-5 grid gap-8 lg:grid-cols-[1fr_360px]">
          <div className="space-y-6">
            <section className="rounded-md border border-navy-100 bg-white p-6 shadow-sm">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-teal-700">
                {requestRow.status}
              </p>
              <h1 className="mt-2 text-3xl font-semibold text-navy-950">
                {requestRow.company_name}
              </h1>
              <p className="mt-2 text-navy-650">
                {requestRow.main_service} · {new Date(requestRow.created_at).toLocaleString()}
              </p>
            </section>

            <InfoGrid
              title="Customer details"
              rows={{
                "Contact person": requestRow.contact_person,
                Email: requestRow.email,
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

            <ListSection
              title="Selected services"
              items={(services ?? []).map((service) => `${service.service_name} (${service.service_slug})`)}
            />

            <AnswersSection answers={(answers ?? []) as AnswerRow[]} />
            <FilesSection files={(files ?? []) as FileRow[]} />
            <NotesSection notes={(notes ?? []) as NoteRow[]} />
            <ActivitySection activity={(activity ?? []) as ActivityRow[]} />
          </div>

          <RequestActions requestId={requestRow.id} currentStatus={requestRow.status} />
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
              <span className="block font-mono text-xs">{file.storage_bucket}/{file.storage_path}</span>
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

function ActivitySection({ activity }: { activity: ActivityRow[] }) {
  return (
    <section className="rounded-md border border-navy-100 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-navy-950">Activity history</h2>
      {activity.length ? (
        <ul className="mt-4 space-y-3 text-sm text-navy-650">
          {activity.map((item) => (
            <li key={item.id} className="rounded-md bg-navy-50 p-3">
              <span className="font-semibold text-navy-950">{item.action}</span>
              <span className="block text-xs">{item.actor_type} · {new Date(item.created_at).toLocaleString()}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-navy-650">No activity yet.</p>
      )}
    </section>
  );
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
