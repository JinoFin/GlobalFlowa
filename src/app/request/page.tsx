import { Suspense } from "react";
import { RequestForm } from "@/components/request-form";

export const metadata = {
  title: "Start Service Request",
};

export default function RequestPage() {
  return (
    <div className="bg-navy-50">
      <section className="bg-navy-950 px-4 py-16 text-white sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-teal-300">
            Service request
          </p>
          <h1 className="mt-5 text-4xl font-semibold tracking-tight sm:text-5xl">
            Submit one structured request for Globalflowa review.
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-navy-100">
            Select one or more services, answer the relevant questions, upload
            documents, and confirm the submission before sending.
          </p>
        </div>
      </section>
      <section className="px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <Suspense fallback={<div className="rounded-md bg-white p-8">Loading request form...</div>}>
            <RequestForm />
          </Suspense>
        </div>
      </section>
    </div>
  );
}
