"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

export type OperationalRequest = {
  id: string;
  companyName: string;
  status: string;
  priority: string;
  assignedTo: string | null;
  dueAt: string | null;
  updatedAt: string;
  documentsWaiting: number;
};

export type OperationalTask = {
  id: string;
  requestId: string;
  title: string;
  status: string;
  priority: string;
  assignedTo: string | null;
  dueAt: string | null;
};

export function OperationalAlerts({ requests, tasks, currentUserId }: {
  requests: OperationalRequest[];
  tasks: OperationalTask[];
  currentUserId: string;
}) {
  const [currentTime, setCurrentTime] = useState<number | null>(null);
  useEffect(() => {
    const timer = window.setTimeout(() => setCurrentTime(Date.now()), 0);
    return () => window.clearTimeout(timer);
  }, []);

  const data = useMemo(() => {
    const activeRequests = requests.filter((request) => !["Completed", "Cancelled"].includes(request.status));
    const openTasks = tasks.filter((task) => !["completed", "cancelled"].includes(task.status));
    const dueWithinWeek = (value: string | null) => {
      if (!value || currentTime === null) return false;
      const timestamp = new Date(value).getTime();
      return timestamp >= currentTime && timestamp <= currentTime + 7 * 24 * 60 * 60 * 1000;
    };
    const overdue = (value: string | null) => Boolean(value && currentTime !== null && new Date(value).getTime() < currentTime);
    const waitingTooLong = (request: OperationalRequest) =>
      request.status === "Waiting for Customer" &&
      currentTime !== null &&
      new Date(request.updatedAt).getTime() < currentTime - 7 * 24 * 60 * 60 * 1000;

    return {
      metrics: [
        ["Unassigned requests", activeRequests.filter((request) => !request.assignedTo).length],
        ["Overdue requests", activeRequests.filter((request) => overdue(request.dueAt)).length],
        ["Requests due within 7 days", activeRequests.filter((request) => dueWithinWeek(request.dueAt)).length],
        ["Urgent requests", activeRequests.filter((request) => request.priority === "urgent").length],
        ["Open internal tasks", openTasks.length],
        ["Blocked tasks", openTasks.filter((task) => task.status === "blocked").length],
        ["Tasks due within 7 days", openTasks.filter((task) => dueWithinWeek(task.dueAt)).length],
        ["My assigned requests", activeRequests.filter((request) => request.assignedTo === currentUserId).length],
        ["My open tasks", openTasks.filter((task) => task.assignedTo === currentUserId).length],
      ] as Array<[string, number]>,
      overdueRequests: activeRequests.filter((request) => overdue(request.dueAt)),
      urgentUnassigned: activeRequests.filter((request) => request.priority === "urgent" && !request.assignedTo),
      blockedTasks: openTasks.filter((task) => task.status === "blocked"),
      uploadsWaiting: activeRequests.filter((request) => request.documentsWaiting > 0),
      waitingCustomer: activeRequests.filter(waitingTooLong),
    };
  }, [currentTime, currentUserId, requests, tasks]);

  const requestById = new Map(requests.map((request) => [request.id, request]));

  if (currentTime === null) {
    return (
      <div className="mt-8 rounded-md border border-navy-100 bg-white p-6 text-sm text-navy-650 shadow-sm" role="status">
        Calculating operational metrics and deadline alerts...
      </div>
    );
  }

  return (
    <div className="mt-8">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-700">Phase 5 operations</p>
          <h2 className="mt-1 text-2xl font-semibold text-navy-950">Team workload and alerts</h2>
        </div>
        <Link href="/admin/workboard" className="text-sm font-semibold text-teal-800 underline decoration-teal-300 underline-offset-4">Open full workboard</Link>
      </div>

      <section className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5" aria-label="Operational metrics">
        {data.metrics.map(([label, value]) => (
          <div key={label} className="rounded-md border border-navy-100 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-navy-650">{label}</p>
            <p className="mt-2 text-3xl font-semibold text-navy-950">{currentTime === null ? "—" : value}</p>
          </div>
        ))}
      </section>

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <RequestAlert title="Overdue requests" empty="No requests are overdue." requests={data.overdueRequests} detail={(request) => request.dueAt ? `Due ${new Date(request.dueAt).toLocaleString()}` : ""} />
        <RequestAlert title="Urgent unassigned requests" empty="No urgent requests are unassigned." requests={data.urgentUnassigned} detail={() => "Assign an owner immediately"} />
        <TaskAlert title="Blocked tasks" empty="No internal tasks are blocked." tasks={data.blockedTasks} requestById={requestById} />
        <RequestAlert title="Customer uploads waiting for review" empty="No customer uploads are waiting for review." requests={data.uploadsWaiting} detail={(request) => `${request.documentsWaiting} document${request.documentsWaiting === 1 ? "" : "s"} waiting`} />
        <RequestAlert title="Waiting for customer over 7 days" empty="No requests have been waiting more than 7 days." requests={data.waitingCustomer} detail={(request) => `Last request update ${new Date(request.updatedAt).toLocaleDateString()}`} />
      </div>
    </div>
  );
}

function RequestAlert({ title, empty, requests, detail }: {
  title: string;
  empty: string;
  requests: OperationalRequest[];
  detail: (request: OperationalRequest) => string;
}) {
  return (
    <section className="rounded-md border border-navy-100 bg-white p-5 shadow-sm">
      <h3 className="text-lg font-semibold text-navy-950">{title}</h3>
      {requests.length ? (
        <ul className="mt-3 divide-y divide-navy-100">
          {requests.slice(0, 6).map((request) => (
            <li key={request.id} className="py-3 first:pt-0 last:pb-0">
              <Link href={`/admin/requests/${request.id}`} className="font-semibold text-navy-950 hover:text-teal-700">{request.companyName}</Link>
              <p className="mt-1 text-xs text-navy-650">{detail(request)}</p>
            </li>
          ))}
        </ul>
      ) : <p className="mt-3 text-sm text-navy-650">{empty}</p>}
    </section>
  );
}

function TaskAlert({ title, empty, tasks, requestById }: {
  title: string;
  empty: string;
  tasks: OperationalTask[];
  requestById: Map<string, OperationalRequest>;
}) {
  return (
    <section className="rounded-md border border-navy-100 bg-white p-5 shadow-sm">
      <h3 className="text-lg font-semibold text-navy-950">{title}</h3>
      {tasks.length ? (
        <ul className="mt-3 divide-y divide-navy-100">
          {tasks.slice(0, 6).map((task) => (
            <li key={task.id} className="py-3 first:pt-0 last:pb-0">
              <Link href={`/admin/requests/${task.requestId}#internal-tasks`} className="font-semibold text-navy-950 hover:text-teal-700">{task.title}</Link>
              <p className="mt-1 text-xs text-navy-650">{requestById.get(task.requestId)?.companyName ?? "Service request"}</p>
            </li>
          ))}
        </ul>
      ) : <p className="mt-3 text-sm text-navy-650">{empty}</p>}
    </section>
  );
}
