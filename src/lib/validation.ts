import { z } from "zod";

const answerValueSchema = z.union([z.string(), z.array(z.string())]);

export const requestPayloadSchema = z.object({
  customer: z.object({
    company_name: z.string().min(1, "Company name is required."),
    country: z.string().min(1, "Country is required."),
    contact_person: z.string().min(1, "Contact person is required."),
    email: z.string().email("A valid email is required."),
    phone: z.string().optional(),
    whatsapp: z.string().optional(),
    wechat: z.string().optional(),
    website: z.string().optional(),
    marketplace_links: z.string().optional(),
    preferred_language: z.string().optional(),
    urgency: z.string().optional(),
    deadline: z.string().optional(),
    message: z.string().optional(),
  }),
  product: z.record(z.string(), answerValueSchema).default({}),
  selectedServices: z.array(z.string()).min(1, "Select at least one service."),
  serviceAnswers: z.record(z.string(), z.record(z.string(), answerValueSchema)).default({}),
  fileFields: z
    .record(
      z.string(),
      z.array(
        z.object({
          name: z.string(),
          size: z.number(),
          type: z.string(),
        }),
      ),
    )
    .default({}),
});

export type RequestPayload = z.infer<typeof requestPayloadSchema>;
