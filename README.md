# Globalflowa MVP + Phase 3C Document Review Queue

Professional B2B website and service request portal for Globalflowa, a Germany market-entry, compliance, warehouse, labeling, packing, and marketplace preparation partner for foreign sellers.

Customer lifecycle tracking is separate from internal request status. Allowed customer stages are `received`, `initial_review`, `waiting_for_documents`, `document_review`, `processing`, `external_processing`, `final_review`, `completed`, and `archived`. Admin/team users control the stage through a protected API; portal queries expose only the stage and update time. Missing-document messages and requested-document uploads apply the only automatic transitions, and never overwrite completed or archived stages. Customer next actions prioritize corrections, missing documents, action messages, and uploads under review before the general lifecycle stage.

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

Phase 2A adds the automated document checklist. Phase 2B adds production/staging setup documentation, live QA guidance, and small runtime hardening for real deployments. Phase 3A adds the customer portal and missing-document upload flow. Phase 3B adds structured admin-to-customer document request messages by email and portal display. Phase 3C adds an admin document review queue for accepting customer uploads or requesting corrections. Pricing calculator, multilingual work, and chat/realtime messaging are intentionally not built yet.

## Phase 2C live QA status

Phase 2C staging/live QA passed on 2026-07-09.

- GitHub repository: `JinoFin/GlobalFlowa`
- Vercel deployment: `https://globalflowa.vercel.app`
- Supabase schema and seed SQL applied successfully.
- Admin login, request submission, persistence, document checklist generation, checklist updates, file upload/download, file-to-checklist linking, and email delivery were confirmed live.
- Secrets are stored only in Vercel, Supabase, and Resend. No secrets are committed to this repository.

See [docs/live-qa-checklist.md](docs/live-qa-checklist.md) for the completed live QA result and repeatable QA checklist.

## Phase 3A customer portal

Phase 3A adds a secure case-tracking portal for customers.

Customer routes:

- `/portal/login`
- `/portal`
- `/portal/requests`
- `/portal/requests/[id]`
- `/portal/profile`

Customer portal capabilities:

- Email/password login through Supabase Auth.
- Customers see only requests linked to their authenticated email address or `customer_user_id`.
- Request cards show current status, urgency, service, checklist completion, and missing/incorrect/expired document counts.
- Request detail pages show selected services, request status, submitted customer/product information, customer-visible admin notes, and generated document checklist groups.
- Customers can upload missing or corrected documents against a checklist item.
- Customers can add a short note to a checklist item.
- Customer uploads are saved to the private `request-documents` bucket and recorded in `request_files`.
- Uploaded files are linked to `request_document_checklist`, and the checklist item moves to `under_review`.
- Customer downloads use `/api/portal/files/[id]`, which verifies the customer session and RLS visibility before creating a short-lived signed URL.
- Internal upload notification emails are sent to `INTERNAL_NOTIFICATION_EMAIL` when email is configured.

Admin Phase 3A updates:

- Admin request detail shows whether a request has portal access, customer email, and linked customer user ID.
- Customer-uploaded files are labeled in the uploaded files section.
- Customer notes on checklist items are visible to admins.
- Admins can decide whether a checklist admin note is visible to the customer.
- Admin notes can be marked customer-visible when saved from the admin action panel.
- Existing checklist review, file linking, secure admin download, status updates, activity history, and CSV export remain in place.

Customer account linking:

- MVP linking uses Option A: a signed-in customer can read requests where `service_requests.customer_user_id` equals the auth user ID, or where `service_requests.customer_email`/`email` matches the auth user email.
- The portal attempts a server-side auto-link by email when a customer opens their requests, but the email-based RLS policy already allows access when the email matches.
- Customers cannot change checklist status directly. They can only upload files or add customer notes through `/api/portal/upload`.
- If a customer submitted a request with a different email address, an admin should update `customer_email` or link `customer_user_id` after verifying the customer.

Phase 3A schema changes:

- `service_requests.customer_user_id`
- `service_requests.customer_email`
- `service_requests.customer_access_enabled`
- `request_document_checklist.customer_visible`
- `request_document_checklist.admin_note_customer_visible`
- `admin_notes.customer_visible`
- `request_files.uploaded_by_user_id`
- `request_files.uploaded_by_role`
- `request_files.linked_checklist_item_id`
- `request_files.customer_note`
- `request_files.file_size`
- `request_files.file_type`

Security and RLS notes:

- `profiles.role` now defaults to `customer`; admin/team roles must be assigned explicitly.
- Customer RLS policies allow authenticated customers to read only their own requests, services, answers, files, visible checklist items, and customer-visible notes.
- Customer uploads are handled by a server route that performs an ownership check before using the service role for private storage and checklist updates.
- Customers cannot read all requests, cannot access admin routes, cannot update checklist statuses, and cannot download files from another request.
- Admin file downloads require an admin/team profile; customer file downloads use a separate customer route.
- The Supabase service role key remains server-only and is never exposed to browser code.

## Phase 3B customer document request messaging

Phase 3B gives admin/team users a structured workflow for requesting missing, incorrect, expired, or otherwise required documents from a customer.

- The admin request detail page lists customer-visible checklist items with `required`, `missing`, `incorrect`, or `expired` status.
- Admin/team users can select items, edit a subject and customer-facing message, preview the selection, and send through `POST /api/admin/customer-message`.
- The route re-verifies the authenticated user and admin/team profile, validates the JSON payload with Zod, confirms every checklist item belongs to the request and requires customer action, and resolves `customer_email` with `email` as fallback.
- A `customer_messages` row is saved with `pending` status before email is attempted.
- Successful sends set `email_status='sent'` and `sent_at`; failed sends keep the saved message and set `email_status='failed'`.
- Every completed attempt adds `customer_message_sent` to `request_activity_log`. Requests in `New`, `In Review`, or `Missing Documents` move to `Waiting for Customer`.
- The customer request detail page shows “Messages from Globalflowa,” related checklist items, current document status, action guidance, and links to the existing per-item upload form.

Phase 3B database objects:

- `customer_messages` with request, author, subject, message, checklist UUID array, recipient, delivery status, timestamps, and customer visibility.
- Indexes on `request_id`, `sent_to_email`, and `created_at`.
- Admin/team select, insert, and update policies using `public.is_admin_or_team()`.
- A customer select-only policy limited to customer-visible messages on requests owned by the authenticated customer. No customer insert, update, or delete policy exists.

The live-safe migration is:

```text
supabase/migrations/202607100002_phase3b_customer_messages.sql
```

For an existing live Phase 3A project, apply only that migration through the Supabase SQL editor or the project’s controlled migration process. Do not run `supabase/schema.sql` on the live database. The migration creates the table, indexes, grants, restricted helper functions, RLS policies, and PostgREST schema reload without changing existing customer request or checklist data.

## Phase 3C admin document review queue

Phase 3C adds `/admin/document-review`, an admin/team-only queue for reviewing the current customer upload linked to each checklist item.

Queue capabilities:

- Default view shows `uploaded` and `under_review` documents that need review.
- Filters cover all documents, waiting for review, accepted, rejected/needs correction, and missing.
- Search covers company name, customer email, uploaded file name, and checklist item name.
- Results sort newest-first by default with an oldest-first option.
- Each result shows company, customer email, request type, checklist item, file, upload time, checklist status, request status, and priority when available.
- Quick actions open the request, use the existing protected admin file download route, accept the document, or request a correction with a required customer-facing note.

Review behavior:

- `POST /api/admin/document-review` re-verifies the authenticated admin/team profile and validates the action, request, checklist item, and file with Zod.
- The route verifies that the file is still the current customer upload linked to the checklist item before updating anything.
- Accepting changes the checklist status to `accepted`, hides any previous customer-visible correction note, and logs `document_accepted`.
- Rejecting changes the checklist status to `incorrect`, stores the correction reason in the existing customer-visible checklist note, keeps the item visible, and logs `document_rejected`.
- The customer portal highlights the correction request and retains the existing replacement upload form under the affected checklist item.
- Internal admin notes are never exposed by the review queue; only the note entered in the explicitly customer-facing rejection field is published.

Phase 3C reuses `request_files`, `request_document_checklist`, `service_requests`, and `request_activity_log`. No new columns or tables are required, so there is no Phase 3C database migration to apply and `supabase/schema.sql` is unchanged. Deploy the application commit only; do not run `schema.sql` on the live Phase 3B database.

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

## Environment variables

Copy `.env.example` to `.env.local` for local development. In Vercel, set the same keys in Project Settings -> Environment Variables for Preview and Production.

Public client-side variables:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

Server-only variables:

```bash
SUPABASE_SERVICE_ROLE_KEY=
EMAIL_PROVIDER_API_KEY=
INTERNAL_NOTIFICATION_EMAIL=info@globalflowa.com
EMAIL_FROM="Globalflowa Portal <onboarding@resend.dev>"
```

Environment notes:

- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are safe browser configuration values from Supabase.
- `NEXT_PUBLIC_SITE_URL` should be `http://localhost:3000` locally, the Vercel Preview URL for staging checks when needed, and the production domain in Production.
- `SUPABASE_SERVICE_ROLE_KEY` is server-only and must never be exposed in browser code or committed to source control.
- `EMAIL_PROVIDER_API_KEY` is the Resend API key.
- `INTERNAL_NOTIFICATION_EMAIL` receives structured internal request notifications.
- `EMAIL_FROM` must use a verified sender/domain before production launch. The `onboarding@resend.dev` placeholder is only suitable for early setup tests.

Local development variables live in `.env.local`. Vercel Preview and Production variables should be set in the Vercel dashboard or with `vercel env add`. Re-pull local variables with `vercel env pull .env.local --yes` after changing Vercel settings.

## Local setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

Minimum local UI-only testing can run without Supabase and email values, but real request persistence, file upload, admin request detail, checklist persistence, and email delivery require real credentials.

Useful local environment check:

```bash
while IFS='=' read -r key _; do
  [[ -z "$key" || "$key" == \#* ]] && continue
  grep -q "^${key}=" .env.local || echo "Missing in .env.local: $key"
done < .env.example
```

## Supabase setup

1. Create a Supabase project.
2. Copy the Project URL into `NEXT_PUBLIC_SUPABASE_URL`.
3. Copy the anon/public key into `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
4. Copy the service role key into `SUPABASE_SERVICE_ROLE_KEY`. Keep this server-only.
5. Open the SQL editor.
6. For a new Supabase project, run `supabase/schema.sql`.
7. For a new Supabase project, run `supabase/seed.sql`.
8. Optional for QA and demos: run `supabase/demo-data.sql`.
9. Confirm all public tables have RLS enabled in Authentication -> Policies or Database -> Tables.
10. Confirm active service catalog rows are publicly readable and request/admin tables are restricted to authenticated `admin`/`team` profiles.
11. Confirm the private storage bucket exists:

```text
request-documents
```

12. Confirm the bucket is private, not public.
13. Create at least one Supabase Auth user for the admin.
14. Add a matching `profiles` row:

```sql
insert into public.profiles (id, email, full_name, role)
values ('AUTH_USER_UUID', 'admin@example.com', 'Admin User', 'admin');
```

15. Add the local and Vercel app URLs to Supabase Auth URL settings:

```text
http://localhost:3000
https://your-preview-url.vercel.app
https://your-production-domain.com
```

16. Visit `/admin/login`, sign in with the admin user, and confirm `/admin/requests` opens.

The schema enables RLS on public tables, grants read access to active service catalog data, and restricts request/admin data to authenticated users with `profiles.role` of `admin` or `team`. Public customer submissions go through the server API route using the service role key.

For Phase 2A, re-run `supabase/schema.sql` and `supabase/seed.sql` on existing projects to create and seed:

- `document_templates`
- `request_document_checklist`

Public users do not receive unrestricted checklist-table access. The server route creates request checklist rows with the service role key after validating a submission. Admin/team users can read and update checklist rows through Supabase Auth and RLS.

For existing Phase 2C live projects, do not re-run the whole schema as a migration substitute. First run `supabase/migrations/202607100001_phase3a_customer_portal_live_fix.sql` to add the Phase 3A customer portal fields, file metadata, customer RLS policies, and SECURITY DEFINER admin role helpers. Existing admin users keep access only if their `profiles.role` is explicitly `admin` or `team`.

For an existing Phase 3A live project, run only `supabase/migrations/202607100002_phase3b_customer_messages.sql`. Do not run `schema.sql` on live. After the migration, confirm `customer_messages` has RLS enabled, authenticated customers have select-only access through the ownership policy, and no `anon` access or customer mutation policy exists.

For new projects, run only:

```text
supabase/schema.sql
supabase/seed.sql
```

Then optionally run `supabase/demo-data.sql` for staging/demo content.

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

Production diagnostics:

- Public API errors are intentionally generic and do not expose Supabase provider details, stack traces, service-role keys, or email API keys.
- Server logs include non-secret failure reasons and submission IDs where available.
- If request persistence succeeds but email sending fails, the saved request remains available in Supabase/admin.
- If checklist template loading fails, the submit route falls back to local default templates and logs the template load issue.

Internal email subject format:

```text
New Globalflowa Request - [Main Service] - [Company Name]
```

Internal emails include a “Generated Document Checklist” section grouped by required documents, conditional/recommended documents, and automatically detected uploaded documents. Customer confirmation emails include a shorter grouped list of likely required documents.

## Email provider setup

Email sending is implemented with Resend through `EMAIL_PROVIDER_API_KEY`.

Setup:

1. Create or open a Resend account.
2. Verify the sending domain for production, for example `globalflowa.com`.
3. Set `EMAIL_FROM` to a verified sender, for example:

```bash
EMAIL_FROM="Globalflowa Portal <portal@globalflowa.com>"
```

4. Set `INTERNAL_NOTIFICATION_EMAIL=info@globalflowa.com` or the operational inbox Globalflowa wants to monitor.
5. Submit a real staging request and confirm both emails are delivered:
   - Internal structured request email to `INTERNAL_NOTIFICATION_EMAIL`.
   - Customer confirmation email to the submitted customer email.

Graceful failure behavior:

- If `EMAIL_PROVIDER_API_KEY` is missing, the app logs that email is not configured and still returns a successful submission after persistence.
- If Resend returns an error after persistence, the app logs the email failure and keeps the saved request, files, answers, checklist, and activity log.
- Email failure should be handled operationally from logs and admin dashboard data; customers may not receive confirmation until email is configured correctly.

## Admin dashboard

Routes:

- `/admin/login`
- `/admin/requests`
- `/admin/requests/[id]`
- `/admin/document-review`
- `/admin/services`
- `/api/admin/document-review`
- `/api/admin/export`
- `/api/admin/customer-message`

Admins can filter requests by status, service, urgency, country, and date, open a request detail page, review answers/files/activity, update status, add notes, mark missing documents, assign a profile UUID, and export request data as CSV.

Phase 2A admin checklist features:

- View checklist items grouped by category.
- See required, uploaded, under-review, accepted, missing, incorrect, expired, and not-applicable states.
- Prioritize missing/incorrect/expired documents at the top of the detail section.
- Add an admin note per checklist item.
- Link an uploaded request file to a checklist item from a dropdown.
- Open linked files through the existing secure admin signed-URL route.
- See required-document completion percentage in the request list and detail view.

Phase 3A admin/customer coordination:

- Use checklist item status `missing`, `incorrect`, or `expired` to make action items clear in the customer portal.
- Add a checklist admin note and enable “Show this admin note in the customer portal” when the customer should see the correction reason.
- Use the admin note visibility checkbox only for customer-safe notes; internal notes remain private by default.
- Customer uploads appear in the same uploaded files list and can be linked to checklist items.

Phase 3B messaging checks:

1. Mark one customer-visible checklist item `missing`, `incorrect`, or `expired`, or leave it `required`.
2. Open the request detail page and select it under “Customer Message / Missing Documents Request.”
3. Send the default or edited subject/message and confirm the UI reports whether email sent or only the portal message was saved.
4. Confirm `customer_messages` contains the selected checklist UUIDs and the correct `sent_to_email` fallback.
5. Confirm `request_activity_log.action='customer_message_sent'` and the request status is `Waiting for Customer` when the prior status was eligible.
6. Log in as the matching customer, open `/portal/requests/[id]`, and confirm the message and related item appear near the top.
7. Follow the related item link, upload a corrected file, and confirm the existing upload/checklist review flow still works.
8. Verify a different customer cannot read the message and a customer session cannot call the admin messaging route.
9. For email QA, confirm the email subject, company/request context, admin message, document list, and absolute `${NEXT_PUBLIC_SITE_URL}/portal/requests/[requestId]` link.
10. Simulate or observe an email-provider failure and confirm the row remains with `email_status='failed'`.

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
- Live email verification requires `EMAIL_PROVIDER_API_KEY`, `INTERNAL_NOTIFICATION_EMAIL`, and production-ready `EMAIL_FROM`.
- Live URL-sensitive verification should set `NEXT_PUBLIC_SITE_URL` to the currently tested local, Preview, or Production URL.
- If those variables are missing, the public site, checker, request UI, and admin setup screens can still be reviewed locally, but persistence, email delivery, private file storage, and authenticated admin request details cannot be proven end to end.
- After environment setup, test a real request with at least one uploaded file, confirm the row exists in Supabase, confirm internal/customer emails are delivered, and open the request in `/admin/requests/[id]`.
- If Playwright browser binaries are unavailable locally, use the route smoke checks and then run visual/mobile QA in a normal browser or CI environment with browser binaries installed.

## Vercel deployment

1. Push the repository to GitHub.
2. Import the project into Vercel.
3. Connect the GitHub repository to the Vercel project.
4. Add every variable from `.env.example` in Vercel Project Settings -> Environment Variables.
5. Scope variables to Preview and Production. Use staging Supabase/Resend values for Preview if available.
6. Set `NEXT_PUBLIC_SITE_URL` to the tested Preview URL for staging checks and to the final production domain in Production.
7. Keep `SUPABASE_SERVICE_ROLE_KEY` and `EMAIL_PROVIDER_API_KEY` server-only. Do not add `NEXT_PUBLIC_` to secret names.
8. Confirm the build command is `npm run build`.
9. Deploy a Preview build.
10. Run the live QA checklist against the Preview URL.
11. Confirm Supabase Auth URL settings include the Preview URL and production domain.
12. Promote the validated Preview deployment or deploy Production from `main`.
13. Run the live QA checklist again against the production URL.

Build command:

```bash
npm run build
```

The current project build script runs `next build --webpack`. This is intentional for now because Turbopack attempted to bind a sandbox-blocked helper port during local verification. Vercel should use the `npm run build` script unless the build environment is explicitly updated and re-verified with Turbopack.

Start command:

```bash
npm run start
```

Optional Vercel CLI flow:

```bash
vercel link
vercel env pull .env.local --yes
npm run build
vercel deploy
vercel deploy --prod
```

## Real environment test instructions

Local with real credentials:

1. Copy `.env.example` to `.env.local`.
2. Fill in real Supabase, Resend, internal email, sender, and site URL values.
3. Run `npm run dev`.
4. Submit a request with at least one uploaded file.
5. Confirm the request, answers, files, checklist, and activity log exist in Supabase.
6. Confirm emails are delivered.
7. Log in as admin and verify detail, file download, checklist status updates, file linking, request status update, admin notes, and CSV export.

Customer portal local/staging test:

1. Create a Supabase Auth customer user with an email matching an existing `service_requests.email` or `customer_email`.
2. Do not give this profile `admin` or `team` role.
3. Log in at `/portal/login`.
4. Confirm only that customer’s requests appear in `/portal/requests`.
5. Open `/portal/requests/[id]`.
6. Confirm status, selected services, visible notes, linked files, and generated checklist display.
7. Mark a checklist item as `missing`, `incorrect`, or `expired` from admin, with a customer-visible note.
8. Refresh the customer portal and confirm the item is highlighted.
9. Upload a test file and optional note from the customer portal.
10. Confirm `request_files` has `uploaded_by_role='customer'`, `linked_checklist_item_id`, and `customer_note`.
11. Confirm the checklist item status becomes `under_review`.
12. Confirm `request_activity_log` includes the customer upload event.
13. Confirm the internal customer-upload email is delivered when email env vars are configured.
14. Log in as admin, download the uploaded file through `/api/admin/files/[id]`, then mark the item accepted.
15. Refresh the customer portal and confirm accepted status is visible.

Vercel Preview:

1. Add Preview environment variables.
2. Deploy Preview.
3. Add the Preview URL to Supabase Auth URL settings if needed.
4. Run `docs/live-qa-checklist.md` against the Preview URL.
5. Confirm Vercel function logs show no unexpected submit, auth, storage, or email errors.

Production:

1. Add Production environment variables.
2. Use the verified production email sender in `EMAIL_FROM`.
3. Add the production domain to Supabase Auth URL settings.
4. Deploy or promote after Preview QA passes.
5. Submit one low-risk production test request and delete/archive it afterward if desired.
6. Confirm internal operations know where request emails arrive and how to access `/admin/requests`.

## Live QA checklist

Use [docs/live-qa-checklist.md](docs/live-qa-checklist.md) for staging and production acceptance. It covers customer workflow, admin workflow, data workflow, the three required sample flows, and pass criteria.

## Production MVP acceptance

The MVP is ready for production acceptance when the following end-to-end paths have been verified against the deployed environment:

- Public pages, service discovery, requirement checking, and request submission load without unexpected errors.
- Admin login, operations overview, request review, customer messaging, document review, status updates, and export work for an `admin` or `team` profile.
- Customer login shows only the authenticated customer’s requests, customer-visible messages/notes, checklist status, and protected files.
- Customer uploads support missing documents and corrected replacements; accepted, waiting-for-review, and correction-required states remain clear after refresh.
- Request confirmation, customer-message, and customer-upload notification emails arrive with working direct links.
- Supabase RLS prevents cross-customer access and customer access to admin routes/data; the `request-documents` bucket remains private.
- The Vercel production deployment uses the intended Git commit and production environment variables.

The complete manual checklist, including negative authorization tests and known limitations, is in [docs/live-qa-checklist.md](docs/live-qa-checklist.md#production-mvp-acceptance-checklist).

## Phase 5 operations management

Phase 5 adds an internal daily-operations layer for authenticated `admin` and `team` users:

- Request ownership, priority, assignment audit, due dates, and overdue indicators on admin request detail.
- Internal request tasks with assignee, priority, due date, open/in-progress/blocked/completed/cancelled states, completion, reopening, and activity history.
- `/admin/workboard` views for My Work, unassigned, overdue, due soon, urgent/high priority, waiting for customer, assigned tasks, and blocked tasks.
- Workboard search, assignee/priority/status/deadline filters, sorting, and quick request/task/document-review actions.
- `/admin/overview` metrics and alerts for unassigned/overdue/urgent work, internal tasks, blocked tasks, due dates, uploads awaiting review, and older customer waits.

These fields and tasks are internal. Customer portal queries continue to use explicit customer-safe column lists, customer APIs cannot update operations fields, and `internal_tasks` has no customer RLS policy or grant.

## Supabase live migration status

- Phase 3A customer portal hardening: `supabase/migrations/202607100001_phase3a_customer_portal_live_fix.sql` — confirmed applied live.
- Phase 3B customer messages: `supabase/migrations/202607100002_phase3b_customer_messages.sql` — confirmed applied live.
- Phase 3C document review queue: no migration required.
- Phase 4A–4E MVP completion sprint: no migration required; existing Phase 3 tables, columns, and RLS policies are reused.
- Phase 5 operations management: `supabase/migrations/202607110001_phase5_operations_management.sql` — created locally and must be applied manually before the Phase 5 commits are pushed/deployed.

Never run `supabase/schema.sql` against the existing live database. If a future change needs database work, create and review a live-safe migration, apply it manually before deploying dependent code, and record the result in the live QA checklist.

## Deployment runbook

1. Pull the latest `main` with a fast-forward-only pull and confirm the worktree is clean.
2. Run `npm run lint`, `npm run build`, `git diff --check`, and `npm audit --audit-level=moderate` when registry access is available.
3. Apply only `supabase/migrations/202607110001_phase5_operations_management.sql` manually to the existing live project before pushing Phase 5. Verify the new request columns, normalized priority constraint, indexes, `internal_tasks`, grants, and admin/team RLS. Never run `schema.sql` on live.
4. Push the reviewed commits to GitHub without force pushing.
5. Wait for the matching Vercel deployment to finish and confirm the deployment uses the expected commit and environment.
6. Smoke test `/`, `/request`, `/admin/login`, `/admin/overview`, `/admin/requests`, `/admin/document-review`, `/admin/workboard`, `/portal/login`, and `/portal/requests`.
7. Run the production acceptance workflow in [docs/live-qa-checklist.md](docs/live-qa-checklist.md#manual-live-acceptance-test).
8. If a release fails, stop new acceptance activity, roll Vercel back to the last accepted deployment, and assess database compatibility before reverting code. Do not reverse a database migration until a reviewed down-migration/data plan exists.

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
curl -I http://localhost:3011/portal/login
curl -I http://localhost:3011/portal
curl -I http://localhost:3011/portal/requests
curl -I http://localhost:3011/admin/login
curl -I http://localhost:3011/admin/requests
curl -I http://localhost:3011/admin/overview
curl -I http://localhost:3011/admin/workboard
curl -I http://localhost:3011/admin/services
```
