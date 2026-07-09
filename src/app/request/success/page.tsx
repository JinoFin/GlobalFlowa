import Link from "next/link";
import { CheckCircle2 } from "lucide-react";

export const metadata = {
  title: "Request Submitted",
};

type SuccessPageProps = {
  searchParams: Promise<{ id?: string }>;
};

export default async function SuccessPage({ searchParams }: SuccessPageProps) {
  const { id } = await searchParams;

  return (
    <div className="bg-navy-50 px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl rounded-md border border-navy-100 bg-white p-8 text-center shadow-sm">
        <CheckCircle2 className="mx-auto h-12 w-12 text-teal-700" />
        <h1 className="mt-6 text-3xl font-semibold tracking-tight text-navy-950">
          Thank you. Your request has been submitted successfully.
        </h1>
        <p className="mt-4 leading-7 text-navy-650">
          Globalflowa will review your information and contact you shortly.
        </p>
        {id ? (
          <p className="mt-4 rounded-md bg-navy-50 px-4 py-3 font-mono text-sm text-navy-700">
            Submission ID: {id}
          </p>
        ) : null}
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link href="/" className="rounded-md bg-navy-950 px-5 py-3 text-sm font-semibold text-white">
            Back to home
          </Link>
          <Link href="/services" className="rounded-md border border-navy-200 px-5 py-3 text-sm font-semibold text-navy-950">
            View services
          </Link>
        </div>
      </div>
    </div>
  );
}
