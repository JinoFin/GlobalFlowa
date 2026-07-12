import Link from "next/link";
import { redirect } from "next/navigation";
import { PortalConfigNotice } from "@/app/portal/requests/portal-ui";
import { AppPageHeader } from "@/components/app-page";
import { PortalProfileEditor } from "@/components/portal/profile-editor";
import { isVerifiedCustomer } from "@/lib/auth/customer";
import { createSupabaseServerClient } from "@/lib/supabase/auth-server";
import { getSupabaseServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const metadata = { title: "Customer Profile" };

type ProfileRow = {
  full_name: string | null;
  job_title: string | null;
  phone: string | null;
  preferred_language: string | null;
  timezone: string | null;
};

type CompanyRow = {
  legal_name: string | null;
  trading_name: string | null;
  registration_number: string | null;
  vat_number: string | null;
  country_code: string | null;
  address_line_1: string | null;
  address_line_2: string | null;
  city: string | null;
  postal_code: string | null;
  website: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
};

export default async function PortalProfilePage() {
  let supabase;
  try {
    supabase = await createSupabaseServerClient();
  } catch (error) {
    return <PortalConfigNotice message={error instanceof Error ? error.message : "Supabase auth is not configured."} />;
  }

  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user || !(await isVerifiedCustomer(supabase, user))) redirect("/portal/login");

  let dataClient;
  try { dataClient = getSupabaseServiceClient(); }
  catch { return <PortalConfigNotice message="Your profile is temporarily unavailable." />; }

  const [profileResult, companyResult] = await Promise.all([
    dataClient.from("profiles").select("full_name, job_title, phone, preferred_language, timezone").eq("id", user.id).maybeSingle(),
    dataClient.from("customer_companies").select("legal_name, trading_name, registration_number, vat_number, country_code, address_line_1, address_line_2, city, postal_code, website, contact_name, contact_email, contact_phone").eq("owner_user_id", user.id).maybeSingle(),
  ]);

  if (profileResult.error || companyResult.error) {
    return <PortalConfigNotice message="Your profile could not be loaded. Please try again later." />;
  }

  const profile = (profileResult.data ?? {}) as Partial<ProfileRow>;
  const company = (companyResult.data ?? {}) as Partial<CompanyRow>;
  const value = (input: string | null | undefined) => input ?? "";

  return (
    <div className="bg-navy-50 px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <AppPageHeader eyebrow="Customer Portal" title="Profile & Company" description="Manage your account details and primary company profile securely." breadcrumbs={[{ label: "Dashboard", href: "/portal" }, { label: "Profile & Company" }]} actions={<><Link href="/portal" className="rounded-md border border-navy-200 bg-white px-4 py-2 text-sm font-semibold text-navy-950">Back to Dashboard</Link><Link href="/portal/requests" className="rounded-md border border-navy-200 bg-white px-4 py-2 text-sm font-semibold text-navy-950">My Requests</Link></>} />
        <PortalProfileEditor
          loginEmail={user.email ?? ""}
          emailVerified={Boolean(user.email_confirmed_at)}
          initialPersonal={{ full_name: value(profile.full_name), job_title: value(profile.job_title), phone: value(profile.phone), preferred_language: value(profile.preferred_language), timezone: value(profile.timezone) }}
          initialCompany={{ legal_name: value(company.legal_name), trading_name: value(company.trading_name), registration_number: value(company.registration_number), vat_number: value(company.vat_number), country_code: value(company.country_code), address_line_1: value(company.address_line_1), address_line_2: value(company.address_line_2), city: value(company.city), postal_code: value(company.postal_code), website: value(company.website), contact_name: value(company.contact_name), contact_email: value(company.contact_email), contact_phone: value(company.contact_phone) }}
        />
      </div>
    </div>
  );
}
