import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { RequestSuccessChecklist } from "@/components/request-success-checklist";

export const metadata = {
  title: "Request Submitted",
};

type SuccessPageProps = {
  searchParams: Promise<{ id?: string; notification?: string }>;
};

export default async function SuccessPage({ searchParams }: SuccessPageProps) {
  const { id, notification } = await searchParams;
  const notificationSucceeded = notification === "sent";

  return (
    <div className="bg-navy-50 px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl rounded-md border border-navy-100 bg-white p-8 text-center shadow-sm">
        <CheckCircle2 className="mx-auto h-12 w-12 text-teal-700" />
        <h1 className="mt-6 text-3xl font-semibold tracking-tight text-navy-950">
          Thank you. Your request was saved successfully.
        </h1>
        <p className="mt-4 leading-7 text-navy-650">
          Globalflowa can now review the information saved with your submission ID.
        </p>
        {notificationSucceeded ? <p className="mt-3 text-sm leading-6 text-navy-650">A confirmation email was requested. Check your inbox and spam folder, then use the customer portal to track status and upload documents.</p> : <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">Your request is saved, but email delivery could not be confirmed. Keep the submission ID below and contact Globalflowa if you need immediate help.</p>}
        {id ? (
          <p className="mt-4 rounded-md bg-navy-50 px-4 py-3 font-mono text-sm text-navy-700">
            Submission ID: {id}
          </p>
        ) : null}
        <RequestSuccessChecklist />
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link href="/portal/signup" className="rounded-md bg-navy-950 px-5 py-3 text-sm font-semibold text-white">
            Create portal account
          </Link>
          <Link href="/contact" className="rounded-md border border-navy-200 px-5 py-3 text-sm font-semibold text-navy-950">
            Contact Globalflowa
          </Link>
          <Link href="/portal/login" className="rounded-md border border-teal-200 bg-teal-50 px-5 py-3 text-sm font-semibold text-teal-800">
            Log in to portal
          </Link>
        </div>
      </div>
    </div>
  );
}
