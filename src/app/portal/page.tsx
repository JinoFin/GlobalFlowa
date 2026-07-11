import { redirect } from "next/navigation";
import { isVerifiedCustomer } from "@/lib/auth/customer";
import { claimRequestsForCurrentCustomer } from "@/lib/portal/claim-requests";
import { createSupabaseServerClient } from "@/lib/supabase/auth-server";

export const dynamic = "force-dynamic";

export default async function PortalPage({ searchParams }: { searchParams: Promise<{ linked?: string }> }) {
  let target = "/portal/login";

  try {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase.auth.getUser();
    if (await isVerifiedCustomer(supabase, data.user)) {
      const providedCount = Number.parseInt((await searchParams).linked ?? "", 10);
      const claimedCount = Number.isSafeInteger(providedCount) && providedCount > 0
        ? providedCount
        : await claimRequestsForCurrentCustomer(supabase).catch(() => 0);
      target = claimedCount > 0 ? `/portal/requests?linked=${claimedCount}` : "/portal/requests";
    }
  } catch {
    target = "/portal/login";
  }

  redirect(target);
}
