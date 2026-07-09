import { PortalLoginForm } from "@/components/portal/login-form";

export const metadata = {
  title: "Customer Portal Login",
};

export default function PortalLoginPage() {
  return (
    <div className="bg-navy-50 px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-md rounded-md border border-navy-100 bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-teal-700">
          Customer Portal
        </p>
        <h1 className="mt-3 text-3xl font-semibold text-navy-950">
          Track your Globalflowa request
        </h1>
        <p className="mt-3 text-sm leading-6 text-navy-650">
          Access your Globalflowa request status and upload missing or corrected documents securely.
        </p>
        <div className="mt-8">
          <PortalLoginForm />
        </div>
      </div>
    </div>
  );
}
