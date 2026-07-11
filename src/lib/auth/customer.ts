import type { SupabaseClient, User } from "@supabase/supabase-js";
import { getProfileRole } from "@/lib/supabase/roles";

export function isVerifiedUser(user: User | null) {
  return Boolean(user?.email && user.email_confirmed_at);
}

export async function isVerifiedCustomer(supabase: SupabaseClient, user: User | null) {
  if (!isVerifiedUser(user)) return false;
  return (await getProfileRole(supabase, user)) === "customer";
}
