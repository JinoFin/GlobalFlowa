import { z } from "zod";

const optionalText = (max: number) =>
  z.string().trim().max(max, `Use ${max} characters or fewer.`).transform((value) => value || null);

const optionalPhone = z
  .string()
  .trim()
  .refine((value) => !value || (value.length >= 7 && value.length <= 30), "Enter a phone number between 7 and 30 characters.")
  .refine((value) => !value || /^[+0-9().\s-]+$/.test(value), "Enter a valid phone number.")
  .transform((value) => value || null);

const optionalEmail = z
  .string()
  .trim()
  .max(320, "Use 320 characters or fewer.")
  .refine((value) => !value || z.email().safeParse(value).success, "Enter a valid email address.")
  .transform((value) => value || null);

const optionalWebsite = z
  .string()
  .trim()
  .max(500, "Use 500 characters or fewer.")
  .refine((value) => {
    if (!value) return true;
    try {
      const url = new URL(value);
      return url.protocol === "https:" || url.protocol === "http:";
    } catch {
      return false;
    }
  }, "Enter a valid website URL beginning with https:// or http://.")
  .transform((value) => value || null);

export const personalProfileSchema = z.object({
  section: z.literal("personal"),
  full_name: optionalText(160),
  job_title: optionalText(120),
  phone: optionalPhone,
  preferred_language: optionalText(80),
  timezone: optionalText(100),
}).strict();

export const companyProfileSchema = z.object({
  section: z.literal("company"),
  legal_name: optionalText(200),
  trading_name: optionalText(200),
  registration_number: optionalText(100),
  vat_number: optionalText(100),
  country_code: z.string().trim().toUpperCase().refine((value) => !value || /^[A-Z]{2}$/.test(value), "Use a two-letter country code.").transform((value) => value || null),
  address_line_1: optionalText(200),
  address_line_2: optionalText(200),
  city: optionalText(120),
  postal_code: optionalText(40),
  website: optionalWebsite,
  contact_name: optionalText(160),
  contact_email: optionalEmail,
  contact_phone: optionalPhone,
}).strict();

export const portalProfileSchema = z.discriminatedUnion("section", [personalProfileSchema, companyProfileSchema]);

export type PersonalProfileValues = Omit<z.input<typeof personalProfileSchema>, "section">;
export type CompanyProfileValues = Omit<z.input<typeof companyProfileSchema>, "section">;
