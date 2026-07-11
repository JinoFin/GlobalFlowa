"use client";

import Link from "next/link";
import { useState } from "react";
import type { CompanyProfileValues, PersonalProfileValues } from "@/lib/portal/profile-validation";

type FieldErrors = Record<string, string[] | undefined>;

export function PortalProfileEditor({ loginEmail, emailVerified, initialPersonal, initialCompany }: {
  loginEmail: string;
  emailVerified: boolean;
  initialPersonal: PersonalProfileValues;
  initialCompany: CompanyProfileValues;
}) {
  const [personal, setPersonal] = useState(initialPersonal);
  const [company, setCompany] = useState(initialCompany);
  const [saving, setSaving] = useState<"personal" | "company" | null>(null);
  const [personalErrors, setPersonalErrors] = useState<FieldErrors>({});
  const [companyErrors, setCompanyErrors] = useState<FieldErrors>({});
  const [personalMessage, setPersonalMessage] = useState<string | null>(null);
  const [companyMessage, setCompanyMessage] = useState<string | null>(null);

  async function save(section: "personal" | "company") {
    setSaving(section);
    const setErrors = section === "personal" ? setPersonalErrors : setCompanyErrors;
    const setMessage = section === "personal" ? setPersonalMessage : setCompanyMessage;
    setErrors({});
    setMessage(null);
    try {
      const response = await fetch("/api/portal/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ section, ...(section === "personal" ? personal : company) }),
      });
      const result = (await response.json()) as { ok: boolean; message?: string; fieldErrors?: FieldErrors };
      if (!result.ok) {
        setErrors(result.fieldErrors ?? {});
        setMessage(result.message ?? "Your profile could not be updated.");
        return;
      }
      setMessage("Your profile has been updated.");
    } catch {
      setMessage("Your profile could not be updated.");
    } finally {
      setSaving(null);
    }
  }

  const companyIncomplete = !company.legal_name && !company.trading_name;

  return (
    <div className="mt-8 space-y-8">
      <section className="rounded-md border border-navy-100 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-navy-950">Personal Profile</h2>
        <p className="mt-2 text-sm leading-6 text-navy-650">Keep your contact and communication preferences up to date.</p>
        <form onSubmit={(event) => { event.preventDefault(); void save("personal"); }} className="mt-6 grid gap-5 md:grid-cols-2">
          <ProfileField label="Full name" name="full_name" value={personal.full_name} error={personalErrors.full_name?.[0]} onChange={(value) => setPersonal((current) => ({ ...current, full_name: value }))} />
          <ProfileField label="Job title" name="job_title" value={personal.job_title} error={personalErrors.job_title?.[0]} onChange={(value) => setPersonal((current) => ({ ...current, job_title: value }))} />
          <ProfileField label="Phone number" name="phone" type="tel" value={personal.phone} error={personalErrors.phone?.[0]} onChange={(value) => setPersonal((current) => ({ ...current, phone: value }))} />
          <ProfileField label="Preferred language" name="preferred_language" value={personal.preferred_language} error={personalErrors.preferred_language?.[0]} onChange={(value) => setPersonal((current) => ({ ...current, preferred_language: value }))} />
          <ProfileField label="Time zone" name="timezone" value={personal.timezone} error={personalErrors.timezone?.[0]} placeholder="Europe/Berlin" onChange={(value) => setPersonal((current) => ({ ...current, timezone: value }))} />
          <div className="rounded-md border border-navy-100 bg-navy-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-teal-700">Login email</p>
            <p className="mt-1 text-sm text-navy-700">{loginEmail}</p>
            <p className="mt-2 text-xs text-navy-500">Managed securely through Supabase Auth. This differs from the business contact email below.</p>
            <p className="mt-2 text-xs font-semibold text-navy-650">Email status: {emailVerified ? "Verified" : "Verification required"}</p>
          </div>
          <div className="md:col-span-2 flex flex-wrap items-center gap-3">
            <button type="submit" disabled={saving !== null} className="rounded-md bg-navy-950 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">{saving === "personal" ? "Saving personal profile..." : "Save personal profile"}</button>
            <button type="button" disabled={saving !== null} onClick={() => { setPersonal(initialPersonal); setPersonalErrors({}); setPersonalMessage(null); }} className="rounded-md border border-navy-200 px-5 py-3 text-sm font-semibold text-navy-700 disabled:opacity-50">Cancel changes</button>
            <Link href="/portal/update-password" className="text-sm font-semibold text-teal-700">Change password</Link>
          </div>
          {personalMessage ? <Feedback message={personalMessage} success={personalMessage === "Your profile has been updated."} /> : null}
        </form>
      </section>

      <section className="rounded-md border border-navy-100 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-navy-950">Company Profile</h2>
        <p className="mt-2 text-sm leading-6 text-navy-650">Company profile changes do not overwrite information captured on historical service requests.</p>
        {companyIncomplete ? <p className="mt-4 rounded-md border border-dashed border-teal-200 bg-teal-50 p-4 text-sm text-teal-800">Add your legal or trading name to start your company profile.</p> : null}
        <form onSubmit={(event) => { event.preventDefault(); void save("company"); }} className="mt-6 grid gap-5 md:grid-cols-2">
          <ProfileField label="Legal company name" name="legal_name" value={company.legal_name} error={companyErrors.legal_name?.[0]} onChange={(value) => setCompany((current) => ({ ...current, legal_name: value }))} />
          <ProfileField label="Trading name" name="trading_name" value={company.trading_name} error={companyErrors.trading_name?.[0]} onChange={(value) => setCompany((current) => ({ ...current, trading_name: value }))} />
          <ProfileField label="Company registration number" name="registration_number" value={company.registration_number} error={companyErrors.registration_number?.[0]} onChange={(value) => setCompany((current) => ({ ...current, registration_number: value }))} />
          <ProfileField label="VAT number" name="vat_number" value={company.vat_number} error={companyErrors.vat_number?.[0]} onChange={(value) => setCompany((current) => ({ ...current, vat_number: value }))} />
          <ProfileField label="Country" name="country_code" value={company.country_code} error={companyErrors.country_code?.[0]} placeholder="Two-letter code, for example DE" onChange={(value) => setCompany((current) => ({ ...current, country_code: value }))} />
          <ProfileField label="Website" name="website" type="url" value={company.website} error={companyErrors.website?.[0]} placeholder="https://example.com" onChange={(value) => setCompany((current) => ({ ...current, website: value }))} />
          <ProfileField label="Address line 1" name="address_line_1" value={company.address_line_1} error={companyErrors.address_line_1?.[0]} onChange={(value) => setCompany((current) => ({ ...current, address_line_1: value }))} />
          <ProfileField label="Address line 2" name="address_line_2" value={company.address_line_2} error={companyErrors.address_line_2?.[0]} onChange={(value) => setCompany((current) => ({ ...current, address_line_2: value }))} />
          <ProfileField label="City" name="city" value={company.city} error={companyErrors.city?.[0]} onChange={(value) => setCompany((current) => ({ ...current, city: value }))} />
          <ProfileField label="Postal code" name="postal_code" value={company.postal_code} error={companyErrors.postal_code?.[0]} onChange={(value) => setCompany((current) => ({ ...current, postal_code: value }))} />
          <ProfileField label="Primary contact name" name="contact_name" value={company.contact_name} error={companyErrors.contact_name?.[0]} onChange={(value) => setCompany((current) => ({ ...current, contact_name: value }))} />
          <ProfileField label="Business contact email" name="contact_email" type="email" value={company.contact_email} error={companyErrors.contact_email?.[0]} onChange={(value) => setCompany((current) => ({ ...current, contact_email: value }))} />
          <ProfileField label="Business phone" name="contact_phone" type="tel" value={company.contact_phone} error={companyErrors.contact_phone?.[0]} onChange={(value) => setCompany((current) => ({ ...current, contact_phone: value }))} />
          <div className="md:col-span-2 flex flex-wrap gap-3">
            <button type="submit" disabled={saving !== null} className="rounded-md bg-navy-950 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">{saving === "company" ? "Saving company profile..." : "Save company profile"}</button>
            <button type="button" disabled={saving !== null} onClick={() => { setCompany(initialCompany); setCompanyErrors({}); setCompanyMessage(null); }} className="rounded-md border border-navy-200 px-5 py-3 text-sm font-semibold text-navy-700 disabled:opacity-50">Cancel changes</button>
          </div>
          {companyMessage ? <Feedback message={companyMessage} success={companyMessage === "Your profile has been updated."} /> : null}
        </form>
      </section>
    </div>
  );
}

function ProfileField({ label, name, value, error, type = "text", placeholder, onChange }: { label: string; name: string; value: string; error?: string; type?: string; placeholder?: string; onChange: (value: string) => void }) {
  const errorId = `${name}-error`;
  return <label className="block"><span className="text-sm font-semibold text-navy-950">{label}</span><input name={name} type={type} value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} aria-invalid={Boolean(error)} aria-describedby={error ? errorId : undefined} className="mt-2 w-full rounded-md border border-navy-200 px-4 py-3 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100" />{error ? <span id={errorId} className="mt-1 block text-sm text-red-700">{error}</span> : null}</label>;
}

function Feedback({ message, success }: { message: string; success: boolean }) {
  return <p className={`md:col-span-2 rounded-md border p-3 text-sm ${success ? "border-teal-200 bg-teal-50 text-teal-800" : "border-red-200 bg-red-50 text-red-700"}`} role={success ? "status" : "alert"}>{message}</p>;
}
