# Globalflowa Live QA Checklist

Use this checklist for Vercel Preview, staging, and production verification after real Supabase and email credentials are configured.

## Completed Phase 2C Live QA Result

Date: 2026-07-09

Live environment:

- GitHub repo connected: `JinoFin/GlobalFlowa`
- Vercel deployed: `https://globalflowa.vercel.app`
- Supabase `schema.sql` applied successfully.
- Supabase `seed.sql` applied successfully.
- Admin Auth user and matching `profiles` row configured successfully.
- Admin login works through `/admin/login`.
- Admin request list and detail pages work.
- Request submission works from the deployed site.
- Supabase request persistence works.
- Document checklist generation works.
- Checklist status updates work in admin.
- Email delivery works after Resend configuration was corrected.
- File upload and secure file download work.
- Uploaded files can be linked to document checklist items.

Security note:

- Secrets are stored only in Vercel, Supabase, and Resend configuration.
- No API keys, service role keys, admin passwords, email provider secrets, or real customer-sensitive data are committed to this repository.

## Before QA

- Confirm Vercel has all environment variables for the tested environment.
- Confirm Supabase `schema.sql` and `seed.sql` have been run.
- Confirm the `request-documents` storage bucket is private.
- Confirm at least one Supabase Auth admin user has a matching `profiles` row with role `admin` or `team`.
- Confirm Resend has a verified sender domain for production use.

## Customer Workflow

- Open the homepage.
- Open `/portal/login` and confirm the customer portal page loads.
- Open `/services`.
- Open `/check-requirements`.
- Complete the requirement checker with a realistic foreign-seller scenario.
- Start a request from recommended services.
- Fill required customer fields in `/request`.
- Select one or more services.
- Complete service-specific questions.
- Upload at least one small test file.
- Review the confirmation screen.
- Confirm the generated document checklist preview is reasonable.
- Submit the request.
- See `/request/success`.
- Confirm the customer receives the confirmation email.

## Customer Portal Workflow

- Create a Supabase Auth customer user whose email matches a submitted request.
- Confirm the customer profile is not `admin` or `team`.
- Log in through `/portal/login`.
- Confirm `/portal` redirects to `/portal/requests`.
- Confirm only requests for that customer email/user ID appear.
- Open `/portal/requests/[id]`.
- Confirm request status, selected services, submitted information, visible checklist items, and customer-visible notes display.
- Confirm missing, incorrect, expired, and required-without-file checklist items are highlighted.
- Upload one missing or corrected document for a checklist item.
- Add a short customer note.
- Confirm the upload succeeds and the item moves to `under_review`.
- Confirm the uploaded file appears in the portal linked-files list.
- Open the customer file download link and confirm it uses `/api/portal/files/[id]`.
- Confirm Customer A cannot access Customer B’s request detail URL.
- Confirm an unauthenticated visitor cannot access `/portal`, `/portal/requests`, or request detail pages.

## Admin Workflow

- Log in through `/admin/login`.
- Open `/admin/requests`.
- Confirm the new request appears.
- Confirm the checklist completion summary appears in the list.
- Open the request detail page.
- Review customer details and selected services.
- Review product and service-specific answers.
- Confirm uploaded files are listed.
- Confirm customer-uploaded files are labeled clearly.
- Download an uploaded file through `/api/admin/files/[id]`.
- Confirm the signed URL opens the file and expires after a short time.
- Confirm generated document checklist items appear grouped by category.
- Update at least one checklist status to `under_review`.
- Update one checklist status to `accepted`.
- Mark one item as `missing`, `incorrect`, or `expired`.
- Add an admin note to a checklist item.
- Mark a checklist admin note visible to the customer and confirm it appears in the portal.
- Link an uploaded file to a checklist item.
- Refresh and confirm status, note, and linked file persist.
- Change the request status.
- Add an internal admin note.
- Add a customer-visible admin note and confirm it appears in the customer portal.
- Export CSV from `/api/admin/export`.

## Data Workflow

- Confirm `service_requests` contains the submitted request.
- Confirm `request_services` contains all selected services.
- Confirm `request_answers` contains product and service-specific answers.
- Confirm uploaded file metadata exists in `request_files`.
- Confirm customer-uploaded rows include `uploaded_by_role='customer'`, `uploaded_by_user_id`, `linked_checklist_item_id`, and `customer_note` where provided.
- Confirm the physical file exists in the private `request-documents` bucket.
- Confirm generated checklist rows exist in `request_document_checklist`.
- Confirm customer uploads update the linked checklist item to `under_review`.
- Confirm checklist rows link to uploaded file IDs where expected.
- Confirm `request_activity_log` contains submission, admin update, and customer upload/note events.
- Confirm internal email was sent to `INTERNAL_NOTIFICATION_EMAIL`.
- Confirm customer confirmation email was sent to the request email.
- Confirm customer upload notification email was sent to `INTERNAL_NOTIFICATION_EMAIL` when email is configured.
- If email fails, confirm the request and checklist still remain saved.

## Three Required Sample Flows

- WEEE + EU Responsible Person: electronics product, battery included, marketplace case, urgent deadline, product photos, label photos, and test report upload.
- Company formation + VAT: foreign company/founder, German company setup, VAT registration, marketplace sales channels, founder/company document upload.
- Warehouse + relabeling: carton/pallet storage, FNSKU or barcode labeling, label file upload, packing list upload, urgent delivery date.

## Pass Criteria

- Public pages and request flow load without console/server errors.
- Request submission succeeds with real Supabase credentials.
- Files are private and only downloadable by authenticated admin/team users.
- Customer portal files are private and only downloadable by the owning authenticated customer or authenticated admin/team users.
- Checklist items are generated and editable in admin.
- Customers cannot edit checklist statuses directly; uploads and customer notes go through the secure portal API route.
- Emails send successfully or fail gracefully without deleting saved request data.
- No public response exposes Supabase service-role keys, email API keys, storage paths beyond intended admin views, or stack traces.
