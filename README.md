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
5. Create at least one Supabase Auth user for the admin.
6. Add a matching `profiles` row:

```sql
insert into public.profiles (id, email, full_name, role)
values ('AUTH_USER_UUID', 'admin@example.com', 'Admin User', 'admin');
```

The schema enables RLS on public tables, grants read access to active service catalog data, and restricts request/admin data to authenticated users with `profiles.role` of `admin` or `team`. Public customer submissions go through the server API route using the service role key.

Storage bucket:

- `request-documents`
- Private bucket
- Files are uploaded by the server route under `{submissionId}/{uuid}-{fileName}`

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
```
