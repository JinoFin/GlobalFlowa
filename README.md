# Globalflowa Phase 1 MVP + Phase 2A Document Checklist

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

Phase 2A adds the automated document checklist. Other Phase 2 items such as customer portal, customer status tracking, pricing calculator, and German/Chinese localization are intentionally not built yet.

## Phase 2A document checklist

The portal now generates a request-specific document checklist from selected services, product details, service answers, and uploaded files.

What it does:

- Stores editable checklist templates in `document_templates`.
- Creates request-specific checklist items in `request_document_checklist` after `/api/submit-request` saves the request.
- Avoids duplicate documents when multiple services need the same item, such as company registration, product photos, or label photos.
- Uses simple conditional signals for electronics, batteries, marketplace cases, urgent authority/marketplace cases, VAT, company formation, warehousing, and relabeling.
- Links obvious uploaded files to checklist items when field names match, such as product photos, label photos, manuals, test reports, DoC files, label files, or packing lists.
- Adds a grouped checklist preview to the request confirmation and success screens.
- Includes checklist summaries in internal and customer confirmation emails.
- Adds an admin “Document Checklist” section on request details with status updates, admin notes, uploaded-file linking, and progress tracking.
- Adds checklist completion summary to the admin request list.

Checklist statuses:

- `required`
- `uploaded`
- `under_review`
- `accepted`
- `missing`
- `incorrect`
- `expired`
- `not_applicable`

Checklist categories:

- Company Documents
- Product Documents
- Compliance Documents
- Marketplace Documents
- Warehouse Documents
- Tax / VAT Documents
- Other

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

For Phase 2A, re-run `supabase/schema.sql` and `supabase/seed.sql` on existing projects to create and seed:

- `document_templates`
- `request_document_checklist`

Public users do not receive unrestricted checklist-table access. The server route creates request checklist rows with the service role key after validating a submission. Admin/team users can read and update checklist rows through Supabase Auth and RLS.

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

Phase 2A demo data also creates request-specific checklist rows for the same three requests, including missing-document examples and linked uploaded-file metadata where a demo file exists.

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
8. Generates a document checklist from `document_templates` and stores it in `request_document_checklist`.
9. Writes an activity log entry.
10. Sends an internal email and a customer confirmation email when email credentials are configured.

If Supabase environment variables are missing, the API returns a graceful JSON setup error instead of crashing the app. Real persistence, file storage, email delivery, and admin detail verification require real Supabase and email environment variables.

Internal email subject format:

```text
New Globalflowa Request - [Main Service] - [Company Name]
```

Internal emails include a “Generated Document Checklist” section grouped by required documents, conditional/recommended documents, and automatically detected uploaded documents. Customer confirmation emails include a shorter grouped list of likely required documents.

## Admin dashboard

Routes:

- `/admin/login`
- `/admin/requests`
- `/admin/requests/[id]`
- `/admin/services`
- `/api/admin/export`

Admins can filter requests by status, service, urgency, country, and date, open a request detail page, review answers/files/activity, update status, add notes, mark missing documents, assign a profile UUID, and export request data as CSV.

Phase 2A admin checklist features:

- View checklist items grouped by category.
- See required, uploaded, under-review, accepted, missing, incorrect, expired, and not-applicable states.
- Prioritize missing/incorrect/expired documents at the top of the detail section.
- Add an admin note per checklist item.
- Link an uploaded request file to a checklist item from a dropdown.
- Open linked files through the existing secure admin signed-URL route.
- See required-document completion percentage in the request list and detail view.

## How checklist generation works

Checklist templates are seeded per service in `supabase/seed.sql`. The reusable generator in `src/lib/document-checklist.ts` accepts selected services, request answers, and uploaded file metadata.

Generation rules stay intentionally simple:

- Selected service templates are included.
- Required-by-default templates become required checklist items.
- Conditional templates use JSON rules such as `includeWhen` and `requiredWhen`.
- Signals are inferred from selected services and answers, including electronics, battery, marketplace, urgent case, warehouse, relabeling, company formation, and VAT.
- Duplicate `document_key` values are merged so one request does not show the same document repeatedly.
- Uploaded files are linked when field/file names clearly match the checklist document key.

Future improvements can move more matching rules into the database, add customer-visible secure upload follow-up links, track document expiry dates, and expose template editing in a richer admin UI.

## Testing checklist generation

With Supabase and email environment variables configured:

1. Run `supabase/schema.sql`, `supabase/seed.sql`, and optionally `supabase/demo-data.sql`.
2. Submit a WEEE + EU Responsible Person request with electronics, batteries, Amazon, and an urgent case. Confirm the checklist includes WEEE documents, product photos, label photos, manual, test reports/DoC when applicable, battery information, marketplace notice, and manufacturer details.
3. Submit a company formation + VAT request. Confirm founder ID/address, desired company name, shareholder details, business activity, VAT information, company registration, seller/account information, and sales estimate appear.
4. Submit a warehouse + relabeling request. Confirm product list, packing/carton list, dimensions, weight, delivery notice, label file, barcode/FNSKU list, quantity list, current label photos, and relabeling instructions appear.
5. Open `/admin/requests`, confirm the checklist completion column appears.
6. Open a request detail page, update a checklist item status, add an admin note, link an uploaded file, and confirm the change persists after refresh.

If Supabase environment variables are missing, do not treat local UI-only testing as persistence verification. The API returns a graceful JSON setup error, but real checklist storage, admin detail verification, file linking, and email delivery require live Supabase and email credentials.

## Phase 1 QA checklist

Use this checklist before moving to Phase 2:

- Homepage renders the premium Germany market-entry positioning and both primary CTAs point to `/check-requirements` and `/request`.
- Service index and service detail pages show category, who-needs-it copy, required information, required documents, process steps, and “Request this service”.
- Requirement checker stores progress locally and returns specific recommendations. A non-EU electronics seller flow should recommend WEEE, Battery, VerpackG/LUCID, GPSR Responsible Person, marketplace support, and VAT where relevant.
- Request form only shows service-specific questions for selected services. For example, `/request?service=weee-elektrog-registration` should show WEEE fields and not VAT or company formation fields.
- Request form validates required customer fields, accepts file selection, shows a confirmation screen, and submits multipart data to `/api/submit-request`.
- Missing Supabase credentials should produce a clear form error from the API. Do not treat that as a successful persistence test.
- With Supabase configured, submitted requests should appear in `/admin/requests`, open in `/admin/requests/[id]`, show answers/files/notes/activity, and support status updates.
- With Phase 2A schema configured, submitted requests should also show generated document checklist rows in `/admin/requests/[id]`.
- Admin checklist testing should cover status changes, admin notes, linked uploaded files, and request-list completion percentages.
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
curl -I http://localhost:3011/request/success
curl -I http://localhost:3011/admin/login
curl -I http://localhost:3011/admin/requests
curl -I http://localhost:3011/admin/services
```
