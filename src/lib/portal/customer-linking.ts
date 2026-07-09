import type { User } from "@supabase/supabase-js";
import { getSupabaseServiceClient } from "@/lib/supabase/server";

export async function linkCustomerRequestsByEmail(user: User | null) {
  const email = user?.email?.trim().toLowerCase();
  if (!user || !email) return;

  try {
    const serviceClient = getSupabaseServiceClient();
    await serviceClient
      .from("service_requests")
      .update({
        customer_user_id: user.id,
        customer_email: email,
        updated_at: new Date().toISOString(),
      })
      .eq("customer_access_enabled", true)
      .is("customer_user_id", null)
      .ilike("email", email);

    await serviceClient
      .from("service_requests")
      .update({
        customer_user_id: user.id,
        customer_email: email,
        updated_at: new Date().toISOString(),
      })
      .eq("customer_access_enabled", true)
      .is("customer_user_id", null)
      .ilike("customer_email", email);
  } catch (error) {
    console.warn("Customer request auto-link skipped", {
      userId: user.id,
      reason: error instanceof Error ? error.message : "unknown error",
    });
  }
}
