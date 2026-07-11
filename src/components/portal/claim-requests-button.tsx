"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ClaimRequestsButton() {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function claim() {
    setLoading(true);
    setMessage(null);
    try {
      const response = await fetch("/api/portal/claim-requests", { method: "POST" });
      const result = (await response.json()) as { success: boolean; claimed_count?: number };
      if (!response.ok || !result.success) throw new Error();
      const count = result.claimed_count ?? 0;
      setMessage(count ? `We linked ${count} existing request${count === 1 ? "" : "s"} to your account.` : "No additional requests were found for your verified email.");
      router.refresh();
    } catch {
      setMessage("Requests could not be refreshed right now. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return <div className="mt-5"><button type="button" onClick={claim} disabled={loading} className="rounded-md border border-navy-200 bg-white px-4 py-2 text-sm font-semibold text-navy-950 disabled:opacity-50">{loading ? "Refreshing..." : "Refresh linked requests"}</button>{message ? <p className="mt-3 text-sm text-navy-650" role="status">{message}</p> : null}</div>;
}
