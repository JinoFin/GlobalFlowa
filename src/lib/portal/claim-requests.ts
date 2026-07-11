import type { SupabaseClient } from "@supabase/supabase-js";

export async function claimRequestsForCurrentCustomer(supabase: SupabaseClient) {
  const { data, error } = await supabase.rpc("claim_requests_for_current_customer");
  if (error) throw new Error("Customer request linking failed.");
  return typeof data === "number" && Number.isSafeInteger(data) && data >= 0 ? data : 0;
}
