"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { isVerifiedUser } from "@/lib/auth/customer";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function PortalLoginForm({ initialMessage }: { initialMessage?: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(initialMessage ?? null);
  const [isLoading, setIsLoading] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setMessage(null);

    try {
      const supabase = createSupabaseBrowserClient();
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        if (error.code === "email_not_confirmed" || /email not confirmed/i.test(error.message)) {
          setMessage("Please verify your email before signing in. Check your inbox for the verification link.");
          return;
        }
        throw error;
      }
      if (!isVerifiedUser(data.user)) {
        await supabase.auth.signOut();
        setMessage("Please verify your email before signing in. Check your inbox for the verification link.");
        return;
      }

      router.push("/portal/requests");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Login failed.");
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
        <Link href="/portal/forgot-password" className="font-semibold text-teal-700">Forgot password?</Link>
        <Link href="/portal/signup" className="font-semibold text-teal-700">Create account</Link>
        <Link href="/" className="font-semibold text-navy-700 hover:text-teal-700">
          Back to website
        </Link>
      </div>
    </form>
  );
}
