import { PortalLogoutButton } from "@/components/portal/logout-button";

export function LogoutButtonShell() {
  return (
    <PortalLogoutButton className="rounded-md border border-navy-200 bg-white px-4 py-2 text-sm font-semibold text-navy-950 hover:border-teal-400 hover:text-teal-700 disabled:opacity-50" />
  );
}

export function StatusBadge({ status }: { status: string }) {
  const normalized = status.toLowerCase();
  const classes =
    normalized.includes("completed") || normalized === "accepted"
      ? "bg-teal-50 text-teal-800"
      : normalized.includes("missing") || normalized.includes("incorrect") || normalized.includes("expired")
        ? "bg-red-50 text-red-800"
        : normalized.includes("review") || normalized.includes("progress") || normalized.includes("uploaded")
          ? "bg-blue-50 text-blue-800"
          : "bg-navy-100 text-navy-700";

  return (
    <span className={`rounded-full px-2 py-1 text-xs font-semibold ${classes}`}>
      {status.replaceAll("_", " ")}
    </span>
  );
}

export function PortalConfigNotice({ message }: { message: string }) {
  return (
    <div className="bg-navy-50 px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl rounded-md border border-navy-100 bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-teal-700">
          Customer Portal
        </p>
        <h1 className="mt-3 text-2xl font-semibold text-navy-950">Portal unavailable</h1>
        <p className="mt-3 text-navy-650">{message}</p>
      </div>
    </div>
  );
}

export function formatDate(value: string) {
  return new Date(value).toLocaleString("en", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
