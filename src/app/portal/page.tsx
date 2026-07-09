import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/auth-server";

export const dynamic = "force-dynamic";

export default async function PortalPage() {
  let target = "/portal/login";

  try {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase.auth.getUser();
    target = data.user ? "/portal/requests" : "/portal/login";
  } catch {
    target = "/portal/login";
  }

  redirect(target);
}
