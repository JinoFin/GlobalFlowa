import { redirect } from "next/navigation";
import { LogoutButtonShell, PortalConfigNotice } from "@/app/portal/requests/portal-ui";
import { createSupabaseServerClient } from "@/lib/supabase/auth-server";
import { linkCustomerRequestsByEmail } from "@/lib/portal/customer-linking";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Customer Profile",
};

type RequestCompanyRow = {
  company_name: string;
};

export default async function PortalProfilePage() {
  let supabase;

  try {
    supabase = await createSupabaseServerClient();
  } catch (error) {
    return <PortalConfigNotice message={error instanceof Error ? error.message : "Supabase auth is not configured."} />;
  }

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user?.email) {
    redirect("/portal/login");
  }

  await linkCustomerRequestsByEmail(userData.user);
  const ownerFilter = [
    `customer_user_id.eq.${userData.user.id}`,
    `customer_email.ilike.${userData.user.email}`,
    `email.ilike.${userData.user.email}`,
  ].join(",");

  const { data: requests } = await supabase
    .from("service_requests")
    .select("company_name")
    .eq("customer_access_enabled", true)
    .or(ownerFilter)
    .order("created_at", { ascending: false });
  const companies = Array.from(new Set(((requests ?? []) as RequestCompanyRow[]).map((request) => request.company_name)));

  return (
    <div className="bg-navy-50 px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl rounded-md border border-navy-100 bg-white p-8 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-teal-700">
              Customer Profile
            </p>
            <h1 className="mt-2 text-3xl font-semibold text-navy-950">Account details</h1>
          </div>
          <LogoutButtonShell />
        </div>
        <dl className="mt-8 grid gap-5 md:grid-cols-2">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-teal-700">Email</dt>
            <dd className="mt-1 text-sm text-navy-650">{userData.user.email}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-teal-700">Full name</dt>
            <dd className="mt-1 text-sm text-navy-650">
              {typeof userData.user.user_metadata?.full_name === "string"
                ? userData.user.user_metadata.full_name
                : "Not provided"}
            </dd>
          </div>
          <div className="md:col-span-2">
            <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-teal-700">Linked companies</dt>
            <dd className="mt-1 text-sm text-navy-650">
              {companies.length ? companies.join(", ") : "No linked requests yet."}
            </dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
