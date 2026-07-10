"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  checklistCategories,
  checklistStatuses,
  type ChecklistStatus,
} from "@/lib/document-checklist";

export type AdminChecklistItem = {
  id: string;
  document_key: string;
  title: string;
  description: string;
  category: string;
  status: ChecklistStatus;
  admin_note: string | null;
  admin_note_customer_visible: boolean;
  customer_note: string | null;
  linked_file_id: string | null;
  required: boolean;
  sort_order: number;
  customer_visible: boolean;
};

export type AdminFileOption = {
  id: string;
  field_key: string;
  file_name: string;
};

type EditableItem = AdminChecklistItem & {
  draftStatus: ChecklistStatus;
  draftNote: string;
  draftAdminNoteCustomerVisible: boolean;
  draftFileId: string;
};

export function DocumentChecklistSection({
  requestId,
  initialItems,
  files,
}: {
  requestId: string;
  initialItems: AdminChecklistItem[];
  files: AdminFileOption[];
}) {
  const router = useRouter();
  const [items, setItems] = useState<EditableItem[]>(
    initialItems.map((item) => ({
      ...item,
      draftStatus: item.status,
      draftNote: item.admin_note ?? "",
      draftAdminNoteCustomerVisible: item.admin_note_customer_visible,
      draftFileId: item.linked_file_id ?? "",
    })),
  );
  const [savingId, setSavingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const summary = useMemo(() => {
    const requiredItems = items.filter((item) => item.required);
    const accepted = requiredItems.filter((item) => item.status === "accepted").length;
    const attention = requiredItems.filter((item) =>
      ["missing", "incorrect", "expired"].includes(item.status),
    ).length;
    const percent = requiredItems.length
      ? Math.round((accepted / requiredItems.length) * 100)
      : 0;

    return { total: requiredItems.length, accepted, attention, percent };
  }, [items]);

  const attentionItems = items.filter((item) =>
    ["missing", "incorrect", "expired"].includes(item.status),
  );

  function updateDraft(id: string, updates: Partial<EditableItem>) {
    setItems((current) =>
      current.map((item) => (item.id === id ? { ...item, ...updates } : item)),
    );
  }

  async function saveItem(item: EditableItem) {
    setSavingId(item.id);
    setMessage(null);

    try {
      const supabase = createSupabaseBrowserClient();
      const { data: userData } = await supabase.auth.getUser();
      const actorId = userData.user?.id ?? null;

      const { error } = await supabase
        .from("request_document_checklist")
        .update({
          status: item.draftStatus,
          admin_note: item.draftNote || null,
          admin_note_customer_visible: item.draftAdminNoteCustomerVisible,
          linked_file_id: item.draftFileId || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", item.id);

      if (error) throw error;

      await supabase.from("request_activity_log").insert({
        request_id: requestId,
        actor_id: actorId,
        actor_type: "admin",
        action: "checklist_updated",
        details: {
          document_key: item.document_key,
          status: item.draftStatus,
          linked_file_id: item.draftFileId || null,
        },
      });

      setItems((current) =>
        current.map((currentItem) =>
          currentItem.id === item.id
            ? {
                ...currentItem,
                status: item.draftStatus,
                admin_note: item.draftNote || null,
                admin_note_customer_visible: item.draftAdminNoteCustomerVisible,
                linked_file_id: item.draftFileId || null,
              }
            : currentItem,
        ),
      );
      setMessage("Checklist item saved.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save checklist item.");
    } finally {
      setSavingId(null);
    }
  }

  return (
    <section className="rounded-md border border-navy-100 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-navy-950">Document Checklist</h2>
          <p className="mt-2 text-sm leading-6 text-navy-650">
            Track which documents are received, missing, incorrect, expired, or accepted.
          </p>
        </div>
        <div className="rounded-md border border-navy-100 bg-navy-50 px-4 py-3 text-sm">
          <p className="font-semibold text-navy-950">{summary.percent}% complete</p>
          <p className="mt-1 text-navy-650">
            {summary.accepted}/{summary.total} required accepted
          </p>
          {summary.attention > 0 ? (
            <p className="mt-1 font-semibold text-red-700">{summary.attention} need attention</p>
          ) : null}
        </div>
      </div>

      {message ? <p className="mt-4 text-sm font-semibold text-teal-700">{message}</p> : null}

      {items.length === 0 ? (
        <div className="mt-6 rounded-md border border-dashed border-navy-200 bg-navy-50 p-5 text-sm text-navy-650">
          No checklist has been generated for this request yet. New submissions generate one automatically after Phase 2A schema and seed data are applied.
        </div>
      ) : (
        <div className="mt-6 space-y-6">
          {attentionItems.length > 0 ? (
            <div className="rounded-md border border-red-200 bg-red-50 p-4">
              <p className="font-semibold text-red-800">Needs attention</p>
              <ul className="mt-2 space-y-1 text-sm text-red-700">
                {attentionItems.map((item) => (
                  <li key={item.id}>- {item.title} ({formatStatus(item.status)})</li>
                ))}
              </ul>
            </div>
          ) : null}

          {checklistCategories.map((category) => {
            const categoryItems = items
              .filter((item) => item.category === category)
              .sort((a, b) => a.sort_order - b.sort_order);
            if (!categoryItems.length) return null;

            return (
              <div key={category}>
                <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-teal-700">
                  {category}
                </h3>
                <div className="mt-3 space-y-3">
                  {categoryItems.map((item) => (
                    <ChecklistCard
                      key={item.id}
                      item={item}
                      files={files}
                      savingId={savingId}
                      onDraft={updateDraft}
                      onSave={saveItem}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function ChecklistCard({
  item,
  files,
  savingId,
  onDraft,
  onSave,
}: {
  item: EditableItem;
  files: AdminFileOption[];
  savingId: string | null;
  onDraft: (id: string, updates: Partial<EditableItem>) => void;
  onSave: (item: EditableItem) => void;
}) {
  const linkedFile = files.find((file) => file.id === item.linked_file_id);

  return (
    <div className="rounded-md border border-navy-100 bg-navy-50 p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="font-semibold text-navy-950">{item.title}</h4>
            <StatusBadge status={item.status} />
            {item.required ? (
              <span className="rounded-full bg-white px-2 py-1 text-xs font-semibold text-navy-650">
                Required
              </span>
            ) : (
              <span className="rounded-full bg-white px-2 py-1 text-xs font-semibold text-navy-650">
                Recommended
              </span>
            )}
          </div>
          <p className="mt-2 text-sm leading-6 text-navy-650">{item.description}</p>
          {item.customer_note ? (
            <p className="mt-2 text-xs text-navy-650">Customer note: {item.customer_note}</p>
          ) : null}
          {linkedFile ? (
            <Link
              href={`/api/admin/files/${linkedFile.id}`}
              className="mt-3 inline-block text-sm font-semibold text-navy-950 underline decoration-teal-300 underline-offset-4 hover:text-teal-700"
            >
              Linked file: {linkedFile.file_name}
            </Link>
          ) : null}
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-[180px_1fr]">
        <label>
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-navy-650">Status</span>
          <select
            value={item.draftStatus}
            onChange={(event) =>
              onDraft(item.id, { draftStatus: event.target.value as ChecklistStatus })
            }
            className="mt-2 w-full rounded-md border border-navy-200 bg-white px-3 py-2 text-sm"
          >
            {checklistStatuses.map((status) => (
              <option key={status} value={status}>{formatStatus(status)}</option>
            ))}
          </select>
        </label>
        <label>
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-navy-650">Link uploaded file</span>
          <select
            value={item.draftFileId}
            onChange={(event) => onDraft(item.id, { draftFileId: event.target.value })}
            className="mt-2 w-full rounded-md border border-navy-200 bg-white px-3 py-2 text-sm"
          >
            <option value="">No linked file</option>
            {files.map((file) => (
              <option key={file.id} value={file.id}>
                {file.file_name} ({file.field_key})
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="mt-3 block">
        <span className="text-xs font-semibold uppercase tracking-[0.14em] text-navy-650">Admin note</span>
        <textarea
          value={item.draftNote}
          onChange={(event) => onDraft(item.id, { draftNote: event.target.value })}
          className="mt-2 min-h-20 w-full rounded-md border border-navy-200 bg-white px-3 py-2 text-sm"
          placeholder="Add correction notes, expiry comments, or review decisions."
        />
      </label>
      <label className="mt-3 flex items-start gap-2 text-sm text-navy-650">
        <input
          type="checkbox"
          checked={item.draftAdminNoteCustomerVisible}
          onChange={(event) =>
            onDraft(item.id, { draftAdminNoteCustomerVisible: event.target.checked })
          }
          className="mt-1 h-4 w-4 rounded border-navy-300 text-teal-700"
        />
        <span>Show this admin note in the customer portal</span>
      </label>
      <button
        type="button"
        onClick={() => onSave(item)}
        disabled={savingId === item.id}
        className="mt-3 rounded-md bg-navy-950 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
      >
        {savingId === item.id ? "Saving..." : "Save checklist item"}
      </button>
    </div>
  );
}

function StatusBadge({ status }: { status: ChecklistStatus }) {
  const classes: Record<ChecklistStatus, string> = {
    required: "bg-amber-50 text-amber-800",
    uploaded: "bg-blue-50 text-blue-800",
    under_review: "bg-violet-50 text-violet-800",
    accepted: "bg-teal-50 text-teal-800",
    missing: "bg-red-50 text-red-800",
    incorrect: "bg-red-50 text-red-800",
    expired: "bg-red-50 text-red-800",
    not_applicable: "bg-navy-100 text-navy-650",
  };

  return (
    <span className={`rounded-full px-2 py-1 text-xs font-semibold ${classes[status]}`}>
      {formatStatus(status)}
    </span>
  );
}

function formatStatus(status: ChecklistStatus) {
  return status.replaceAll("_", " ");
}
