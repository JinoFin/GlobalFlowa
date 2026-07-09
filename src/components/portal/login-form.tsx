"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function PortalLoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setMessage(null);

    try {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) throw error;

      router.push("/portal/requests");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Login failed.");
    } finally {
      setIsLoading(false);
    }
  }

  async function resetPassword() {
    if (!email) {
      setMessage("Enter your email address first, then request a reset link.");
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      const supabase = createSupabaseBrowserClient();
      const origin = window.location.origin;
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${origin}/portal/login`,
      });

      if (error) throw error;
      setMessage("If this email has portal access, a reset link will be sent shortly.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not request a reset link.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      {message ? (
        <div className="rounded-md border border-navy-100 bg-navy-50 p-3 text-sm text-navy-700">
          {message}
        </div>
      ) : null}
      <label className="block">
        <span className="text-sm font-semibold text-navy-950">Email</span>
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="mt-2 w-full rounded-md border border-navy-200 px-4 py-3 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
          autoComplete="email"
          required
        />
      </label>
      <label className="block">
        <span className="text-sm font-semibold text-navy-950">Password</span>
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="mt-2 w-full rounded-md border border-navy-200 px-4 py-3 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
          autoComplete="current-password"
          required
        />
      </label>
      <button
        type="submit"
        disabled={isLoading}
        className="w-full rounded-md bg-navy-950 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
      >
        {isLoading ? "Signing in..." : "Access portal"}
      </button>
      <div className="flex flex-col gap-2 text-sm text-navy-650 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={resetPassword}
          disabled={isLoading}
          className="text-left font-semibold text-teal-700 disabled:opacity-50"
        >
          Reset password
        </button>
        <Link href="/" className="font-semibold text-navy-700 hover:text-teal-700">
          Back to website
        </Link>
      </div>
    </form>
  );
}
