"use client";

import Link from "next/link";
import { useState } from "react";
import { passwordRequirements, signupSchema } from "@/lib/auth/validation";

type FieldErrors = Partial<Record<"email" | "password" | "confirmPassword", string[]>>;

export function PortalSignupForm() {
  const [values, setValues] = useState({ email: "", password: "", confirmPassword: "" });
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [message, setMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    const parsed = signupSchema.safeParse(values);
    if (!parsed.success) {
      setFieldErrors(parsed.error.flatten().fieldErrors);
      return;
    }

    setFieldErrors({});
    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const result = (await response.json()) as { ok: boolean; message?: string; fieldErrors?: FieldErrors };
      if (!result.ok) {
        setFieldErrors(result.fieldErrors ?? {});
        setMessage(result.message ?? null);
        return;
      }
      setSuccess(true);
      setMessage("Please check your email to verify your account.");
    } catch {
      setMessage("We could not create your account. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  function field(name: keyof typeof values, value: string) {
    setValues((current) => ({ ...current, [name]: value }));
    setFieldErrors((current) => ({ ...current, [name]: undefined }));
  }

  return (
    <form onSubmit={submit} className="space-y-5" noValidate>
      {message ? (
        <div className={`rounded-md border p-3 text-sm ${success ? "border-teal-200 bg-teal-50 text-teal-800" : "border-red-200 bg-red-50 text-red-700"}`} role={success ? "status" : "alert"}>
          {message}
        </div>
      ) : null}
      <AuthField label="Email" name="email" type="email" value={values.email} error={fieldErrors.email?.[0]} autoComplete="email" onChange={(value) => field("email", value)} />
      <AuthField label="Password" name="password" type="password" value={values.password} error={fieldErrors.password?.[0]} autoComplete="new-password" onChange={(value) => field("password", value)} />
      <p className="-mt-3 text-xs leading-5 text-navy-500">{passwordRequirements}</p>
      <AuthField label="Confirm password" name="confirmPassword" type="password" value={values.confirmPassword} error={fieldErrors.confirmPassword?.[0]} autoComplete="new-password" onChange={(value) => field("confirmPassword", value)} />
      <button type="submit" disabled={isLoading || success} className="w-full rounded-md bg-navy-950 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">
        {isLoading ? "Creating account..." : success ? "Verification email requested" : "Create account"}
      </button>
      <p className="text-center text-sm text-navy-650">
        Already have an account? <Link href="/portal/login" className="font-semibold text-teal-700">Sign in</Link>
      </p>
    </form>
  );
}

function AuthField({ label, name, type, value, error, autoComplete, onChange }: { label: string; name: string; type: string; value: string; error?: string; autoComplete: string; onChange: (value: string) => void }) {
  const errorId = `${name}-error`;
  return (
    <label className="block">
      <span className="text-sm font-semibold text-navy-950">{label}</span>
      <input name={name} type={type} value={value} onChange={(event) => onChange(event.target.value)} autoComplete={autoComplete} aria-invalid={Boolean(error)} aria-describedby={error ? errorId : undefined} className="mt-2 w-full rounded-md border border-navy-200 px-4 py-3 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100" required />
      {error ? <span id={errorId} className="mt-1 block text-sm text-red-700">{error}</span> : null}
    </label>
  );
}
