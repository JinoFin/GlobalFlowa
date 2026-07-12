import type { SupabaseClient, User } from "@supabase/supabase-js";

export type ProfileRole = "admin" | "team" | "customer";

export async function getProfileRole(supabase: SupabaseClient, user: User | null) {
  if (!user) return null;

  const { data } = await supabase.rpc("current_user_role");

  return (data ?? null) as ProfileRole | null;
}

export async function isAdminUser(supabase: SupabaseClient, user: User | null) {
  const role = await getProfileRole(supabase, user);
  return role === "admin" || role === "team";
}
