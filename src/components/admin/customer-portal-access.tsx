"use client";

import { useState } from "react";

export function CustomerPortalAccess({ email, customerUserId }: { email: string; customerUserId: string | null }) {
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
      </dl>
      <button type="button" onClick={copySignupLink} className="mt-5 rounded-md border border-navy-200 bg-white px-4 py-2 text-sm font-semibold text-navy-950 hover:border-teal-400 hover:text-teal-700">{copied ? "Signup link copied" : "Copy signup-page link"}</button>
    </section>
  );
}
