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
- For new Supabase projects, confirm `schema.sql` and `seed.sql` have been run.
- For existing Phase 2C live projects, confirm `supabase/migrations/202607100001_phase3a_customer_portal_live_fix.sql` has been run before Phase 3A QA.
- For existing Phase 3A live projects, apply only `supabase/migrations/202607100002_phase3b_customer_messages.sql` before Phase 3B QA. Do not re-run `schema.sql` on live.
- Confirm `customer_messages` has RLS enabled and the customer policy is select-only for customer-visible messages on the authenticated customer’s own requests.
- Phase 3C has no database migration. It reuses existing Phase 3B file, checklist, request, and activity tables; deploy the application commit without running `schema.sql` on live.
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
- Confirm “Messages from Globalflowa” appears near the top, including the empty-state text when no message has been sent.
- After an admin sends a Phase 3B request, confirm its date, subject, message, related checklist items, statuses, and action hints display.
- Follow a related checklist item link and confirm the corrected/missing file can be uploaded directly under that item.
- Confirm missing, incorrect, expired, and required-without-file checklist items are highlighted.
- Upload one missing or corrected document for a checklist item.
- Add a short customer note.
- Confirm the upload succeeds and the item moves to `under_review`.
- After an admin rejects the upload, confirm the checklist item shows `incorrect`, clearly labels the correction request, displays only the customer-facing correction reason, and keeps the replacement upload form available.
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
- Open `/admin/document-review` from the “Document Review” dashboard link.
- Confirm the default queue shows the current customer uploads with `uploaded` or `under_review` status, newest first.
- Confirm company, customer email, request type, checklist item, file name, upload date, checklist status, request status, and priority appear where available.
- Test All, Waiting for review, Accepted, Rejected / Needs correction, and Missing filters.
- Search by company name, customer email, file name, and checklist item name; test oldest-first sorting.
- Open the related request and download/view the file through `/api/admin/files/[id]`.
- Accept one document and confirm it leaves the default queue and the checklist becomes `accepted`.
- Reject another document, confirm a customer-facing note is required, and confirm the checklist becomes `incorrect`.
- Confirm customers cannot access `/admin/document-review` or call `POST /api/admin/document-review`.
- Update at least one checklist status to `under_review`.
- Update one checklist status to `accepted`.
- Mark one item as `missing`, `incorrect`, or `expired`.
- In “Customer Message / Missing Documents Request,” confirm all customer-visible `required`, `missing`, `incorrect`, and `expired` items have checkboxes.
- Use “Select all action items,” edit the subject/message if needed, review the selected-item preview, and click “Send request to customer.”
- Confirm the UI shows a loading state followed by sent, saved-with-email-failure, or error feedback.
- Confirm a request in `New`, `In Review`, or `Missing Documents` changes to `Waiting for Customer` after the message attempt is recorded.
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
- Confirm Phase 3C acceptance writes `document_accepted` to `request_activity_log` with checklist item, file ID, and reviewer.
- Confirm Phase 3C rejection writes `document_rejected` with checklist item, file ID, reviewer, and customer-facing note.
- Confirm Phase 3C does not create duplicate file/checklist tables and does not alter existing uploaded file rows.
- Confirm `customer_messages` contains the request, author, subject, message, selected checklist UUIDs, recipient email, and `customer_visible=true`.
- Confirm a successful email has `email_status='sent'` and `sent_at`; an email failure retains the row with `email_status='failed'` and no `sent_at`.
- Confirm `request_activity_log` contains `customer_message_sent` with subject, selected checklist item IDs, and `sent_to_email`.
- Confirm checklist rows link to uploaded file IDs where expected.
- Confirm `request_activity_log` contains submission, admin update, and customer upload/note events.
- Confirm internal email was sent to `INTERNAL_NOTIFICATION_EMAIL`.
- Confirm customer confirmation email was sent to the request email.
- Confirm customer upload notification email was sent to `INTERNAL_NOTIFICATION_EMAIL` when email is configured.
- Confirm the Phase 3B customer email uses the saved subject and includes greeting, company/request context, admin message, requested-document list, Globalflowa signature, and the direct portal request URL.
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
- Customer users cannot call `POST /api/admin/customer-message` and cannot insert, update, or delete `customer_messages`.
- Customer users cannot access the document review queue or review API; admin/team authorization is checked inside both the page and route handler.
- Rejecting a document exposes only the explicitly customer-facing checklist note, never unrelated internal admin notes.
- Customer A cannot read customer-visible or hidden messages for Customer B’s request, and hidden messages are not displayed to their owner.
- Emails send successfully or fail gracefully without deleting saved request data.
- No public response exposes Supabase service-role keys, email API keys, storage paths beyond intended admin views, or stack traces.
