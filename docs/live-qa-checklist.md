# Globalflowa Live QA Checklist

Use this checklist for Vercel Preview, staging, and production verification after real Supabase and email credentials are configured.

## Before QA

- Confirm Vercel has all environment variables for the tested environment.
- Confirm Supabase `schema.sql` and `seed.sql` have been run.
- Confirm the `request-documents` storage bucket is private.
- Confirm at least one Supabase Auth admin user has a matching `profiles` row with role `admin` or `team`.
- Confirm Resend has a verified sender domain for production use.

## Customer Workflow

- Open the homepage.
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

## Admin Workflow

- Log in through `/admin/login`.
- Open `/admin/requests`.
- Confirm the new request appears.
- Confirm the checklist completion summary appears in the list.
- Open the request detail page.
- Review customer details and selected services.
- Review product and service-specific answers.
- Confirm uploaded files are listed.
- Download an uploaded file through `/api/admin/files/[id]`.
- Confirm the signed URL opens the file and expires after a short time.
- Confirm generated document checklist items appear grouped by category.
- Update at least one checklist status to `under_review`.
- Update one checklist status to `accepted`.
- Mark one item as `missing`, `incorrect`, or `expired`.
- Add an admin note to a checklist item.
- Link an uploaded file to a checklist item.
- Refresh and confirm status, note, and linked file persist.
- Change the request status.
- Add an internal admin note.
- Export CSV from `/api/admin/export`.

## Data Workflow

- Confirm `service_requests` contains the submitted request.
- Confirm `request_services` contains all selected services.
- Confirm `request_answers` contains product and service-specific answers.
- Confirm uploaded file metadata exists in `request_files`.
- Confirm the physical file exists in the private `request-documents` bucket.
- Confirm generated checklist rows exist in `request_document_checklist`.
- Confirm checklist rows link to uploaded file IDs where expected.
- Confirm `request_activity_log` contains submission and admin update events.
- Confirm internal email was sent to `INTERNAL_NOTIFICATION_EMAIL`.
- Confirm customer confirmation email was sent to the request email.
- If email fails, confirm the request and checklist still remain saved.

## Three Required Sample Flows

- WEEE + EU Responsible Person: electronics product, battery included, marketplace case, urgent deadline, product photos, label photos, and test report upload.
- Company formation + VAT: foreign company/founder, German company setup, VAT registration, marketplace sales channels, founder/company document upload.
- Warehouse + relabeling: carton/pallet storage, FNSKU or barcode labeling, label file upload, packing list upload, urgent delivery date.

## Pass Criteria

- Public pages and request flow load without console/server errors.
- Request submission succeeds with real Supabase credentials.
- Files are private and only downloadable by authenticated admin/team users.
- Checklist items are generated and editable in admin.
- Emails send successfully or fail gracefully without deleting saved request data.
- No public response exposes Supabase service-role keys, email API keys, storage paths beyond intended admin views, or stack traces.
