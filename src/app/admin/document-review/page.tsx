import Link from "next/link";
import { redirect } from "next/navigation";
import {
  DocumentReviewQueue,
  type DocumentReviewQueueRow,
} from "@/components/admin/document-review-queue";
import { LogoutButton } from "@/components/admin/logout-button";
import { createSupabaseServerClient } from "@/lib/supabase/auth-server";
import { isAdminUser } from "@/lib/supabase/roles";
import { getSupabaseServiceClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Admin Document Review",
};

export const dynamic = "force-dynamic";

type RequestFileRow = {
  id: string;
  request_id: string;
  file_name: string;
  created_at: string;
  linked_checklist_item_id: string | null;
};

type ChecklistRow = {
  id: string;
  request_id: string;
  title: string;
  status: string;
  linked_file_id: string | null;
  admin_note: string | null;
  admin_note_customer_visible: boolean;
};

type ServiceRequestRow = {
  id: string;
  company_name: string;
  email: string;
  customer_email: string | null;
  main_service: string | null;
  priority: string | null;
  status: string;
};

export default async function AdminDocumentReviewPage() {
  let supabase;

  try {
    supabase = await createSupabaseServerClient();
  } catch (error) {
    console.error("Document review page setup failed", {
      reason: error instanceof Error ? error.message : "unknown error",
    });
    return (
      <DocumentReviewPageShell showLogout={false}>
        <DocumentReviewQueue
          initialRows={[]}
          initialError="Document review is not configured."
        />
      </DocumentReviewPageShell>
    );
  }

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    redirect("/admin/login");
  }
  if (!(await isAdminUser(supabase, userData.user))) {
    redirect("/portal/requests");
  }
  const dataClient = getSupabaseServiceClient();

  const { data: fileData, error: fileError } = await dataClient
    .from("request_files")
    .select("id, request_id, file_name, created_at, linked_checklist_item_id")
    .eq("uploaded_by_role", "customer")
    .order("created_at", { ascending: false });

  const fileRows = (fileData ?? []) as RequestFileRow[];
  if (fileError || fileRows.length === 0) {
    if (fileError) {
      console.error("Document review file queue load failed", { reason: fileError.message });
    }
    return (
      <DocumentReviewPageShell>
        <DocumentReviewQueue
          initialRows={[]}
          initialError={fileError ? "Could not load the document review queue." : null}
        />
      </DocumentReviewPageShell>
    );
  }

  const requestIds = [...new Set(fileRows.map((file) => file.request_id))];
  const [{ data: checklistData, error: checklistError }, { data: requestData, error: requestError }] =
    await Promise.all([
      dataClient
        .from("request_document_checklist")
        .select("id, request_id, title, status, linked_file_id, admin_note, admin_note_customer_visible")
        .in("request_id", requestIds),
      dataClient
        .from("service_requests")
        .select("id, company_name, email, customer_email, main_service, priority, status")
        .in("id", requestIds),
    ]);

  if (checklistError || requestError) {
    console.error("Document review context load failed", {
      reason: checklistError?.message ?? requestError?.message ?? "unknown error",
    });
  }
  const initialError =
    checklistError || requestError ? "Could not load the document review queue." : null;
  const checklistRows = (checklistData ?? []) as ChecklistRow[];
  const requestRows = (requestData ?? []) as ServiceRequestRow[];
  const checklistById = new Map(checklistRows.map((item) => [item.id, item]));
  const checklistByFileId = new Map(
    checklistRows
      .filter((item) => item.linked_file_id)
      .map((item) => [item.linked_file_id as string, item]),
  );
  const requestById = new Map(requestRows.map((request) => [request.id, request]));

  const rows = fileRows.flatMap((file): DocumentReviewQueueRow[] => {
    const checklist =
      (file.linked_checklist_item_id
        ? checklistById.get(file.linked_checklist_item_id)
        : undefined) ?? checklistByFileId.get(file.id);
    const serviceRequest = requestById.get(file.request_id);

    if (!checklist || !serviceRequest || checklist.linked_file_id !== file.id) {
      return [];
    }

    return [{
      fileId: file.id,
      requestId: serviceRequest.id,
      checklistItemId: checklist.id,
      companyName: serviceRequest.company_name,
      customerEmail: serviceRequest.customer_email || serviceRequest.email,
      requestType: serviceRequest.main_service || "Service request",
      checklistItemName: checklist.title,
      fileName: file.file_name,
      uploadedAt: file.created_at,
      checklistStatus: checklist.status,
      priority: serviceRequest.priority,
      requestStatus: serviceRequest.status,
      customerVisibleNote:
        checklist.admin_note_customer_visible ? checklist.admin_note : null,
    }];
  });

  return (
    <DocumentReviewPageShell>
      <DocumentReviewQueue initialRows={rows} initialError={initialError} />
    </DocumentReviewPageShell>
  );
}

function DocumentReviewPageShell({
  children,
  showLogout = true,
}: {
  children: React.ReactNode;
  showLogout?: boolean;
}) {
  return (
    <div className="bg-navy-50 px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex flex-wrap gap-4 text-sm font-semibold text-teal-700">
              <Link href="/admin/overview">Overview</Link>
              <Link href="/admin/requests">Requests</Link>
              <Link href="/admin/workboard">Workboard</Link>
            </div>
            <p className="mt-5 text-sm font-semibold uppercase tracking-[0.18em] text-teal-700">
              Admin dashboard
            </p>
            <h1 className="mt-2 text-3xl font-semibold text-navy-950">Document Review</h1>
            <p className="mt-3 max-w-3xl text-navy-650">
              Review the current customer upload for each checklist item, open its request, and accept it or request a correction.
            </p>
          </div>
          {showLogout ? <LogoutButton /> : null}
        </div>
        <div className="mt-8">{children}</div>
      </div>
    </div>
  );
}
