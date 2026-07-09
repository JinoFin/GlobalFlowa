# Globalflowa Phase 1 MVP

Professional B2B website and service request portal for Globalflowa, a Germany market-entry, compliance, warehouse, labeling, packing, and marketplace preparation partner for foreign sellers.

## Phase 1 scope

- Homepage and premium B2B public website
- Services index and service detail pages
- Compliance knowledge pages
- Requirement checker with service recommendations
- Smart multi-service request form with service-specific questions
- File upload inputs and confirmation step
- `/api/submit-request` validation, Supabase persistence, Storage upload, and email notifications
- Basic Supabase Auth admin dashboard
- Request list, filters, detail view, status updates, internal notes, missing-document marking, assignment field, activity history, and CSV export

Phase 2 items such as customer portal, customer status tracking, advanced document checklist, pricing calculator, and German/Chinese localization are intentionally not built yet.

## Tech stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Supabase Database, Auth, and Storage
- Resend-compatible email sending
- Vercel-ready deployment structure

## Local setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

Set these variables in `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
EMAIL_PROVIDER_API_KEY=
INTERNAL_NOTIFICATION_EMAIL=info@globalflowa.com
```

`EMAIL_PROVIDER_API_KEY` is implemented with Resend. The current sender is `Globalflowa Portal <onboarding@resend.dev>` for setup simplicity; replace it with a verified production sender domain before launch.

## Supabase setup

1. Create a Supabase project.
2. Open the SQL editor.
3. Run `supabase/schema.sql`.
4. Run `supabase/seed.sql`.
5. Optional for QA and demos: run `supabase/demo-data.sql`.
6. Create at least one Supabase Auth user for the admin.
7. Add a matching `profiles` row:

```sql
insert into public.profiles (id, email, full_name, role)
values ('AUTH_USER_UUID', 'admin@example.com', 'Admin User', 'admin');
```

The schema enables RLS on public tables, grants read access to active service catalog data, and restricts request/admin data to authenticated users with `profiles.role` of `admin` or `team`. Public customer submissions go through the server API route using the service role key.

Storage bucket:

- `request-documents`
- Private bucket
- Files are uploaded by the server route under `{submissionId}/{uuid}-{fileName}`
- Admin file links use short-lived signed URLs after the admin session is verified.

## Demo data

Run `supabase/demo-data.sql` after `schema.sql` and `seed.sql` to load three realistic sample requests:

- WEEE + EU Responsible Person + Amazon compliance case for a rechargeable LED desk lamp seller.
- Company formation + VAT + bookkeeping coordination case for a US outdoor-products seller.
- Warehouse storage + relabeling + FNSKU labeling case for inbound marketplace stock.

The demo file uses deterministic request IDs and deletes/recreates those same three requests when re-run.

## Submission flow

The smart request form sends multipart form data to:

```text
/api/submit-request
```

The route:

1. Applies basic in-memory rate limiting.
2. Validates the payload with Zod.
3. Creates a `service_requests` row.
4. Inserts selected services into `request_services`.
5. Stores product and service-specific answers in `request_answers`.
6. Uploads files to Supabase Storage.
7. Stores file metadata in `request_files`.
8. Writes an activity log entry.
9. Sends an internal email and a customer confirmation email when email credentials are configured.

If Supabase environment variables are missing, the API returns a graceful JSON setup error instead of crashing the app. Real persistence, file storage, email delivery, and admin detail verification require real Supabase and email environment variables.

Internal email subject format:

```text
New Globalflowa Request - [Main Service] - [Company Name]
```

## Admin dashboard

Routes:

- `/admin/login`
- `/admin/requests`
- `/admin/requests/[id]`
- `/admin/services`
- `/api/admin/export`

Admins can filter requests by status, service, urgency, country, and date, open a request detail page, review answers/files/activity, update status, add notes, mark missing documents, assign a profile UUID, and export request data as CSV.

## Phase 1 QA checklist

Use this checklist before moving to Phase 2:

- Homepage renders the premium Germany market-entry positioning and both primary CTAs point to `/check-requirements` and `/request`.
- Service index and service detail pages show category, who-needs-it copy, required information, required documents, process steps, and “Request this service”.
- Requirement checker stores progress locally and returns specific recommendations. A non-EU electronics seller flow should recommend WEEE, Battery, VerpackG/LUCID, GPSR Responsible Person, marketplace support, and VAT where relevant.
- Request form only shows service-specific questions for selected services. For example, `/request?service=weee-elektrog-registration` should show WEEE fields and not VAT or company formation fields.
- Request form validates required customer fields, accepts file selection, shows a confirmation screen, and submits multipart data to `/api/submit-request`.
- Missing Supabase credentials should produce a clear form error from the API. Do not treat that as a successful persistence test.
- With Supabase configured, submitted requests should appear in `/admin/requests`, open in `/admin/requests/[id]`, show answers/files/notes/activity, and support status updates.
- Admin uploaded-file links should redirect through `/api/admin/files/[id]` and create a short-lived signed URL only after admin session/RLS verification.
- Admin empty state appears when filters return no requests.
- Mobile layouts should avoid horizontal overflow on `/`, `/services`, `/check-requirements`, `/request`, and `/admin/login`.
- RLS review: all public-schema tables in `supabase/schema.sql` have RLS enabled; public roles only read active service catalog rows; request data is restricted to authenticated admin/team profiles; customer submissions use the server-side service role.
- Storage review: `request-documents` is private; uploads happen server-side; admin downloads use signed URLs; the service role key is never exposed to browser code.

## Environment verification notes

- Live Supabase verification requires `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`.
- Live email verification requires `EMAIL_PROVIDER_API_KEY` and a production-ready verified sender.
- If those variables are missing, the public site, checker, request UI, and admin setup screens can still be reviewed locally, but persistence, email delivery, private file storage, and authenticated admin request details cannot be proven end to end.
- After environment setup, test a real request with at least one uploaded file, confirm the row exists in Supabase, confirm internal/customer emails are delivered, and open the request in `/admin/requests/[id]`.
- If Playwright browser binaries are unavailable locally, use the route smoke checks and then run visual/mobile QA in a normal browser or CI environment with browser binaries installed.

## Vercel deployment

1. Push the repository to GitHub.
2. Import the project into Vercel.
3. Add the environment variables from `.env.example`.
4. Deploy.
5. Confirm Supabase Auth redirect URLs include the Vercel production domain.
6. Replace the email sender with a verified production sender domain.

Build command:

```bash
npm run build
```

Start command:

```bash
npm run start
```

## Useful commands

```bash
npm run lint
npm run build
npm audit --audit-level=moderate
```

Route smoke checks:

```bash
npm run build
npm run start -- --port 3011
curl -I http://localhost:3011/
curl -I http://localhost:3011/services
curl -I http://localhost:3011/check-requirements
curl -I http://localhost:3011/request
curl -I http://localhost:3011/admin/login
```
