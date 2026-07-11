"use client";

import Link from "next/link";
import { useState } from "react";
import { passwordConfirmationSchema, passwordRequirements } from "@/lib/auth/validation";

type FieldErrors = Partial<Record<"password" | "confirmPassword", string[]>>;

export function UpdatePasswordForm() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [message, setMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = passwordConfirmationSchema.safeParse({ password, confirmPassword });
    if (!parsed.success) {
      setFieldErrors(parsed.error.flatten().fieldErrors);
      return;
    }
    setFieldErrors({});
    setMessage(null);
    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/update-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const result = (await response.json()) as { ok: boolean; message?: string; fieldErrors?: FieldErrors };
      if (!result.ok) {
        setFieldErrors(result.fieldErrors ?? {});
        setMessage(result.message ?? "Password could not be updated.");
        return;
      }
      setSuccess(true);
      setMessage("Your password has been updated. You can now sign in.");
    } catch {
      setMessage("Password could not be updated. Please request a new recovery link.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5" noValidate>
      {message ? <div className={`rounded-md border p-3 text-sm ${success ? "border-teal-200 bg-teal-50 text-teal-800" : "border-red-200 bg-red-50 text-red-700"}`} role={success ? "status" : "alert"}>{message}</div> : null}
      <PasswordField label="New password" value={password} error={fieldErrors.password?.[0]} onChange={(value) => { setPassword(value); setFieldErrors((current) => ({ ...current, password: undefined })); }} />
      <p className="-mt-3 text-xs leading-5 text-navy-500">{passwordRequirements}</p>
      <PasswordField label="Confirm new password" value={confirmPassword} error={fieldErrors.confirmPassword?.[0]} onChange={(value) => { setConfirmPassword(value); setFieldErrors((current) => ({ ...current, confirmPassword: undefined })); }} />
      <button type="submit" disabled={isLoading || success} className="w-full rounded-md bg-navy-950 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">{isLoading ? "Updating password..." : "Update password"}</button>
      {success ? <p className="text-center text-sm"><Link href="/portal/login" className="font-semibold text-teal-700">Continue to login</Link></p> : null}
    </form>
  );
}

function PasswordField({ label, value, error, onChange }: { label: string; value: string; error?: string; onChange: (value: string) => void }) {
  const errorId = `${label.toLowerCase().replaceAll(" ", "-")}-error`;
  return (
    <label className="block">
      <span className="text-sm font-semibold text-navy-950">{label}</span>
      <input type="password" value={value} onChange={(event) => onChange(event.target.value)} autoComplete="new-password" aria-invalid={Boolean(error)} aria-describedby={error ? errorId : undefined} className="mt-2 w-full rounded-md border border-navy-200 px-4 py-3 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100" required />
      {error ? <span id={errorId} className="mt-1 block text-sm text-red-700">{error}</span> : null}
    </label>
  );
}
