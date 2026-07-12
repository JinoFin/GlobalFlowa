"use client";

import Link from "next/link";
import { useState } from "react";
import { emailSchema } from "@/lib/auth/validation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { getConfiguredSiteUrl } from "@/lib/auth/redirects";

const genericSuccess = "If an account exists for this email, a password-reset link will be sent shortly.";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Enter a valid email address.");
      return;
    }
    setError(null);
    setIsLoading(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const callbackUrl = new URL("/auth/callback", getConfiguredSiteUrl());
      callbackUrl.searchParams.set("next", "/portal/update-password");
      await supabase.auth.resetPasswordForEmail(parsed.data, { redirectTo: callbackUrl.toString() });
    } finally {
      setMessage(genericSuccess);
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5" noValidate>
      {message ? <div className="rounded-md border border-teal-200 bg-teal-50 p-3 text-sm text-teal-800" role="status">{message}</div> : null}
      <label className="block">
        <span className="text-sm font-semibold text-navy-950">Email</span>
        <input type="email" value={email} onChange={(event) => { setEmail(event.target.value); setError(null); }} autoComplete="email" aria-invalid={Boolean(error)} aria-describedby={error ? "forgot-email-error" : undefined} className="mt-2 w-full rounded-md border border-navy-200 px-4 py-3 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100" required />
        {error ? <span id="forgot-email-error" className="mt-1 block text-sm text-red-700">{error}</span> : null}
      </label>
      <button type="submit" disabled={isLoading} className="w-full rounded-md bg-navy-950 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">{isLoading ? "Requesting link..." : "Send reset link"}</button>
      <p className="text-center text-sm"><Link href="/portal/login" className="font-semibold text-teal-700">Back to login</Link></p>
    </form>
  );
}
