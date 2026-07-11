import { cookies } from "next/headers";
import Link from "next/link";
import { UpdatePasswordForm } from "@/components/portal/update-password-form";
import { isVerifiedCustomer } from "@/lib/auth/customer";
import { createSupabaseServerClient } from "@/lib/supabase/auth-server";

export const dynamic = "force-dynamic";
export const metadata = { title: "Update Customer Portal Password" };

export default async function UpdatePasswordPage() {
  const cookieStore = await cookies();
  let recoverySession = cookieStore.get("gf-recovery")?.value === "1";
  let authorizedCustomer = false;
  try {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase.auth.getUser();
    recoverySession = recoverySession && Boolean(data.user);
    authorizedCustomer = await isVerifiedCustomer(supabase, data.user);
  } catch {
    recoverySession = false;
  }

  return (
    <div className="bg-navy-50 px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-md rounded-md border border-navy-100 bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-teal-700">Customer Portal</p>
        <h1 className="mt-3 text-3xl font-semibold text-navy-950">Choose a new password</h1>
        {recoverySession || authorizedCustomer ? (
          <div className="mt-8"><UpdatePasswordForm /></div>
        ) : (
          <div className="mt-6 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            This password-recovery link is invalid or expired. <Link href="/portal/forgot-password" className="font-semibold underline">Request a new link.</Link>
          </div>
        )}
      </div>
    </div>
  );
}
