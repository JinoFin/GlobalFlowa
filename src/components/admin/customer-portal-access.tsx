"use client";

import { useState } from "react";

type CustomerSummary = {
  fullName: string | null;
  phone: string | null;
  jobTitle: string | null;
  legalName: string | null;
  countryCode: string | null;
  registrationNumber: string | null;
  vatNumber: string | null;
  address: string | null;
};

export function CustomerPortalAccess({ email, customerUserId, linkedAt, summary }: { email: string; customerUserId: string | null; linkedAt: string | null; summary: CustomerSummary | null }) {
  const [copied, setCopied] = useState(false);

  async function copySignupLink() {
    await navigator.clipboard.writeText(`${window.location.origin}/portal/signup`);
    setCopied(true);
  }

  return (
    <section className="rounded-md border border-navy-100 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-navy-950">Customer Portal Access</h2>
      <dl className="mt-5 grid gap-4 md:grid-cols-2">
        <div><dt className="text-xs font-semibold uppercase tracking-[0.14em] text-teal-700">Customer email</dt><dd className="mt-1 text-sm text-navy-650">{email}</dd></div>
        <div><dt className="text-xs font-semibold uppercase tracking-[0.14em] text-teal-700">Portal account</dt><dd className="mt-1 text-sm text-navy-650">{customerUserId ? "Linked" : "Not linked"}</dd></div>
        {customerUserId ? <div className="md:col-span-2"><dt className="text-xs font-semibold uppercase tracking-[0.14em] text-teal-700">Linked customer identifier</dt><dd className="mt-1 font-mono text-sm text-navy-650">{customerUserId}</dd></div> : null}
        {linkedAt ? <div className="md:col-span-2"><dt className="text-xs font-semibold uppercase tracking-[0.14em] text-teal-700">Linked at</dt><dd className="mt-1 text-sm text-navy-650">{linkedAt}</dd></div> : null}
      </dl>
      {summary ? (
        <div className="mt-6 border-t border-navy-100 pt-5">
          <h3 className="font-semibold text-navy-950">Customer profile summary</h3>
          <dl className="mt-4 grid gap-4 md:grid-cols-2">
            <SummaryItem label="Full name" value={summary.fullName} />
            <SummaryItem label="Phone" value={summary.phone} />
            <SummaryItem label="Job title" value={summary.jobTitle} />
            <SummaryItem label="Legal company name" value={summary.legalName} />
            <SummaryItem label="Country" value={summary.countryCode} />
            <SummaryItem label="Registration number" value={summary.registrationNumber} />
            <SummaryItem label="VAT number" value={summary.vatNumber} />
            <SummaryItem label="Company address" value={summary.address} />
          </dl>
        </div>
      ) : null}
      <button type="button" onClick={copySignupLink} className="mt-5 rounded-md border border-navy-200 bg-white px-4 py-2 text-sm font-semibold text-navy-950 hover:border-teal-400 hover:text-teal-700">{copied ? "Signup link copied" : "Copy signup-page link"}</button>
    </section>
  );
}

function SummaryItem({ label, value }: { label: string; value: string | null }) {
  return <div><dt className="text-xs font-semibold uppercase tracking-[0.14em] text-teal-700">{label}</dt><dd className="mt-1 text-sm text-navy-650">{value || "Not provided"}</dd></div>;
}
