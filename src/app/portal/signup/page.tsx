import { PortalSignupForm } from "@/components/portal/signup-form";

export const metadata = { title: "Create Customer Portal Account" };

export default function PortalSignupPage() {
  return (
    <div className="bg-navy-50 px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-md rounded-md border border-navy-100 bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-teal-700">Customer Portal</p>
        <h1 className="mt-3 text-3xl font-semibold text-navy-950">Create your account</h1>
        <p className="mt-3 text-sm leading-6 text-navy-650">Create your secure Globalflowa portal account. You will need to verify your email before accessing the portal.</p>
        <div className="mt-8"><PortalSignupForm /></div>
      </div>
    </div>
  );
}
