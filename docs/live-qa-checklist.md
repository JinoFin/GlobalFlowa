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

- For the Phase 6 release, follow `docs/phase6-deployment-runbook.md`: apply only `supabase/migrations/202607110002_phase6_customer_lifecycle.sql` before deploying the seven Phase 6 commits. Do not run `schema.sql` on the existing production project.
- Complete `docs/supabase-auth-configuration.md`, including confirmed-email signup, exact production redirects, custom SMTP, and sender-domain DNS authentication.
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

## Phase 5 Operations Workflow

- Open an admin request detail and use **Ownership and Deadline** to assign an admin/team profile, select low/normal/high/urgent priority, and set a due date.
- Confirm assignment date/author and overdue state appear only in admin operations UI.
- Create an internal task with title, description, assignee, priority, and due date.
- Move tasks through open, in progress, blocked, completed, reopened, and cancelled workflows.
- Confirm the activity timeline records request assignment/reassignment, priority/deadline changes, and every task lifecycle action.
- Open `/admin/workboard` and test All Work, My Work, Unassigned, Overdue, Due Soon, Urgent/High, Waiting for Customer, Tasks Assigned to Me, and Blocked Tasks.
- Search by company, customer email, service, and staff member. Test assignee, priority, status, overdue, due-this-week, and unassigned filters plus priority/due/newest/oldest sorting.
- Use quick actions to open a request, change assignment/priority/due date, open document review, and jump to internal task creation.
- Confirm `/admin/overview` shows the Phase 5 workload metrics and operational alert sections.

## Phase 6 Secure Request Linking Acceptance

1. Create a guest request using Customer A's email and confirm `customer_user_id` is null.
2. Sign up Customer A with that exact email and complete email verification.
3. Enter the customer portal and confirm the unclaimed request links to Customer A and becomes visible.
4. Repeat the claim and confirm no duplicate `customer_account_linked` request activity is created.
5. Confirm Customer B cannot view or claim Customer A's request.
6. Confirm a request already linked to Customer B is never overwritten by Customer A.
7. Confirm leading/trailing whitespace and email letter case normalize correctly.
8. Confirm a request addressed to another email remains unclaimed.
9. Submit a new request while signed in as a verified customer and confirm it is linked immediately using the authenticated identity.
10. Confirm guest request submission remains available and leaves `customer_user_id` null.
11. Confirm admin request detail shows linked status, the authorized profile summary, and a reliable link timestamp when activity exists.
12. Re-test customer messaging, uploads, document review, request assignments, and internal tasks.
13. Confirm browser-supplied email, user ID, profile ID, or role values cannot influence ownership.
14. Confirm unauthenticated and unverified callers cannot execute the claim function.

Shared-mailbox limitation: exact verified-email matching means one Supabase Auth account controls all still-unclaimed requests addressed to that login email. Shared company inboxes should therefore be used only where that ownership model is acceptable. Multi-user company membership and claim codes are deferred beyond Phase 6C.

## Phase 6 Customer Lifecycle Acceptance

1. Confirm a new request starts at `received`.
2. Change it to `initial_review` and confirm the customer sees Initial review.
3. Send a missing-document request and confirm the customer sees Waiting for documents.
4. Upload the missing file and confirm Documents under review where configured.
5. Change to `processing`, `external_processing`, and `final_review`; confirm safe customer wording and no-action guidance.
6. Confirm an invalid stage update is rejected and an unchanged update creates no duplicate activity.
7. Confirm a customer cannot call the lifecycle API or update lifecycle columns directly.
8. Confirm portal queries never expose `lifecycle_stage_updated_by`, assignments, tasks, priorities, or deadlines.
9. Confirm automatic transitions never overwrite `completed` or `archived`.
10. Re-test messaging, uploads, document review, profiles, signup, password recovery, and secure request linking.

## Phase 6 Secure Final Deliverables Acceptance

The `request-documents` bucket must remain private. Final deliverables reuse `request_files`; upload is draft-first, publication is explicit, and customer download authorization checks the verified user, request ownership, final-deliverable flag, publication state, and soft-deletion state before creating a 60-second signed URL. Signed URLs must never be stored or logged. Publishing does not change lifecycle stage; archived requests retain already-published files unless a later archive policy explicitly changes that behavior.

1. Admin uploads a final document as draft.
2. Customer cannot see the draft.
3. Customer cannot download the draft by guessing its ID.
4. Admin securely downloads the draft.
5. Admin publishes the document.
6. Customer sees it on the correct request.
7. Customer securely downloads it.
8. Customer A cannot download Customer B's document.
9. Direct bucket URL is unavailable.
10. Signed URL expires.
11. Admin unpublishes the document.
12. Customer no longer sees or downloads it.
13. Repeated publish does not create duplicate activity.
14. Admin republishes the document.
15. Admin deletes the exact deliverable with confirmation.
16. Deleted file is no longer downloadable.
17. Customer uploads remain unaffected.
18. Internal documents remain invisible.
19. Document review queue remains functional.
20. Completed request shows final-document guidance.
21. Archived requests retain published final documents as documented.
22. Existing signup, profiles, claiming, lifecycle, messaging, assignments, and tasks still work.

## Phase 6 Completion, Archive, and Dashboard Acceptance

Completion, reopening, archive, and restore use the protected lifecycle-action API and its atomic database function. The function derives the staff actor from `auth.uid()`, checks the profile role, locks the request, recomputes warnings, changes state, and records activity in one transaction. Archived and completed requests reject customer uploads server-side. Archive retains every request record and published final document.

1. Admin opens an active request and submits completion.
2. Confirm completion warnings are calculated on the server.
3. Confirm missing warning approval returns HTTP 409 without completing.
4. Confirm the required customer completion note is enforced.
5. Admin explicitly confirms warnings and the request becomes completed.
6. Customer sees the completion banner, date, and customer note.
7. Confirm the internal completion summary and staff actor fields are absent from portal data.
8. Published final documents remain securely downloadable.
9. Draft, unpublished, internal, and deleted deliverables remain unavailable.
10. Completed requests reject customer uploads.
11. Admin reopens to a validated active stage and the customer sees active progress again.
12. Allowed customer uploads return only after reopening.
13. Admin archives an active request with explicit confirmation.
14. Archived request leaves active request/workboard/overview workload queues.
15. Customer still sees the archived request as read-only.
16. Customer can download its published final documents but cannot upload.
17. Admin restores the archived request to its recorded previous stage.
18. Invalid reopen or restore target stages are rejected.
19. Repeated complete or archive actions do not create duplicate activity.
20. Customer A cannot see Customer B's completed or archived request.
21. Customer and unauthenticated callers cannot execute lifecycle actions.
22. Completed, archived, ready-for-completion, and missing-deliverable metrics are accurate.
23. No request, message, task, checklist item, file metadata, or activity is deleted during archive.
24. Existing signup, profile, claim, messaging, review, assignment, task, lifecycle, and deliverable workflows still work.

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

## Production MVP Acceptance Checklist

Record the tested deployment URL, Git commit, tester, date, and result before marking the MVP accepted.

### Public website and request submission

- [ ] `/`, `/services`, `/check-requirements`, `/request`, and `/contact` load on desktop and mobile without broken layout or unexpected console/server errors.
- [ ] A realistic service request can be completed with customer details, service answers, and a small test file.
- [ ] `/request/success` appears only after persistence succeeds.
- [ ] Supabase contains the matching `service_requests`, `request_services`, `request_answers`, checklist, activity, and file-metadata rows.
- [ ] The customer receives the polished request confirmation email with the correct company, request ID, portal link, and Globalflowa signature.

### Admin operations

- [ ] An admin/team user can log in at `/admin/login`; a customer user cannot access admin pages.
- [ ] `/admin/overview` shows request totals, New, In Review, Waiting for Customer, documents needing review, Completed, recent messages, uploads, and activity.
- [ ] Quick links from the overview open Requests, Document Review, Services, Export, and the customer portal.
- [ ] `/admin/requests` filters correctly and opens the intended request.
- [ ] Admin request detail clearly separates document status, customer communication, and internal operations.
- [ ] The next recommended action matches the current checklist/request state.
- [ ] The request timeline shows submission, admin updates, customer messaging, upload/replacement, and accept/reject activity where applicable.
- [ ] Internal notes are visible to admin/team users and do not appear in the customer portal unless explicitly marked customer-visible.
- [ ] Request ownership, priority, due date, assignment timestamp, and assigning user save and remain visible after refresh.
- [ ] `/admin/workboard` shows the same ownership/deadline values and its views, filters, search, sorting, and quick actions work.
- [ ] Internal tasks can be created, assigned, updated, blocked, completed, reopened, and cancelled.
- [ ] My Work shows requests assigned to the current user and Tasks Assigned to Me shows requests with their open assigned tasks.
- [ ] Overdue and due-soon badges/metrics use the configured operational due dates.
- [ ] Overview metrics and alerts agree with workboard/request-detail data.

### Customer portal, messages, and uploads

- [ ] A customer can log in at `/portal/login` and sees only their own requests in `/portal/requests`.
- [ ] Request detail shows request status, next customer action, documents needing action, messages, and uploaded-file status.
- [ ] A Phase 3B customer message appears with subject, message, related checklist items, and action hints.
- [ ] The customer-message email is delivered with the saved subject, document list, direct request link, and Globalflowa signature.
- [ ] A required/missing item accepts a customer upload and shows a clear success message.
- [ ] Client and server reject files larger than 20 MB; the UI displays file-type/size guidance.
- [ ] The checklist shows the most recent linked upload and changes to `under_review`.
- [ ] Rejecting a document shows only the explicit correction reason and keeps the replacement-upload action available.
- [ ] Uploading a replacement creates `customer_replaced_file` activity with the prior status/file context for admin review.
- [ ] Protected customer/admin download routes create short-lived signed URLs; no private storage URL is embedded directly in page data.

### Admin document review

- [ ] `/admin/document-review` defaults to current customer uploads waiting for review and supports all filters, search, and sorting.
- [ ] Accepting a current upload changes the checklist to `accepted` and writes `document_accepted` activity.
- [ ] Rejecting requires a customer-facing reason, changes the checklist to `incorrect`, and writes `document_rejected` activity.
- [ ] The customer sees the accepted/correction state after refresh and can replace a rejected file.
- [ ] Existing admin checklist edits and status updates still work after document review actions.

### Email delivery and Resend

- [ ] `EMAIL_FROM` uses a verified production sender/domain and `INTERNAL_NOTIFICATION_EMAIL` reaches the operating team.
- [ ] Request-submitted internal/customer emails, customer-message email, and customer-upload admin notification are delivered.
- [ ] Direct links resolve to the tested production domain from `NEXT_PUBLIC_SITE_URL`.
- [ ] Delivery failures are logged server-side without exposing provider details or secrets to customers.
- [ ] Persistence remains intact when an email delivery fails.

### Supabase RLS and storage security

- [ ] RLS is enabled on `service_requests`, `request_document_checklist`, `request_files`, `request_activity_log`, `admin_notes`, `customer_messages`, and `profiles`.
- [ ] Customer A cannot read Customer B’s request, files, checklist, messages, or visible notes by changing a URL/ID.
- [ ] Customer users cannot insert/update/delete `customer_messages`, write activity directly, change checklist status directly, or call admin review/message APIs.
- [ ] Admin/team policies use the existing safe helper functions and profile RLS remains non-recursive.
- [ ] `SUPABASE_SERVICE_ROLE_KEY` and `EMAIL_PROVIDER_API_KEY` exist only in server-side deployment configuration.
- [ ] The `request-documents` bucket is private and public object URLs are not used.
- [ ] `internal_tasks` has RLS enabled, explicit authenticated grants, one admin/team management policy using `is_admin_or_team()`, and no customer policy.
- [ ] Customer users cannot read or mutate internal tasks or call `/api/admin/internal-task` and `/api/admin/request-assignment`.
- [ ] Customer request queries do not select `assigned_to`, `assigned_by`, `assigned_at`, `priority`, or `due_at`.
- [ ] Profile staff-list access uses the non-recursive SECURITY DEFINER helper and only exposes admin/team profiles to authorized staff.

### Vercel deployment

- [ ] Production reports a successful build for the intended Git commit.
- [ ] Production environment variables are present with correct Production scope; Preview values do not point at production unless intentionally approved.
- [ ] Supabase Auth redirect/site URLs include the production domain.
- [ ] Route smoke checks pass for `/`, `/request`, `/admin/login`, `/admin/overview`, `/admin/requests`, `/admin/document-review`, `/admin/workboard`, `/portal/login`, and `/portal/requests`.
- [ ] Vercel function logs show no unexpected auth, database, storage, upload, or email errors during acceptance.

### Known MVP limitations

- Operations remain human-reviewed; there is no AI document review or automatic acceptance.
- Messaging is structured admin-to-customer email plus portal display, not realtime chat.
- Pricing, payments, and multilingual localization are outside the current MVP.
- Customer request linking uses exact verified-email matching for unclaimed requests; shared-mailbox ownership remains a documented limitation pending a future membership model.
- Migrations are intentionally manual; the application does not apply live schema changes during deploy.

## Manual Live Acceptance Test

1. Record the production URL and deployed Git commit.
2. Submit a low-risk test request with a small document and confirm all expected Supabase rows plus both request-submission emails.
3. Log in as admin, open `/admin/overview`, then open the request and confirm the status card, next action, customer summary, checklist, timeline, and internal/customer-visible separation.
4. Send a structured missing-document request. Confirm the `customer_messages` row, `email_status='sent'`, activity entry, request status, and delivered email.
5. Log in as the matching customer. Confirm the message and requested checklist items, then upload the missing document.
6. Confirm the admin upload notification email, `request_files` metadata, `under_review` checklist status, and review-queue entry.
7. Reject the document with a safe correction reason. Confirm the customer sees the reason but no internal notes.
8. Upload a replacement as the customer. Confirm `customer_replaced_file` activity and the current replacement in the review queue.
9. Accept the replacement. Confirm the portal shows `accepted` and no further upload is requested.
10. Run the cross-customer, customer-to-admin, private-file, and secret-exposure negative tests before signing off.

## Phase 5 Live Acceptance Checklist

1. Log in as an admin/team user and assign a request to a staff profile.
2. Refresh request detail and confirm the assignment, assignment timestamp, and assigning user persist.
3. Open `/admin/workboard` and confirm the same assignment appears.
4. Change the request priority and verify the workboard ordering/filter plus `request_priority_changed` activity.
5. Set a due date and verify due-soon or overdue badges using a safe test timestamp.
6. Create an internal task for the request.
7. Assign the task to a team user and confirm `internal_task_assigned` activity.
8. Log in as that team user and confirm My Work / Tasks Assigned to Me includes the request.
9. Complete the task, then reopen it, confirming status and activity after each refresh.
10. Block and un-block/update a task and confirm the Blocked Tasks view and overview alert.
11. Confirm assignment, priority, due-date, and task actions appear in the request activity timeline.
12. Log in as a customer and confirm the portal HTML/data contains no staff names, assignments, internal deadlines, priorities, or tasks; direct calls to both Phase 5 admin APIs return forbidden/unauthorized.
13. Re-test customer messaging, upload/replacement, protected downloads, document review acceptance/rejection, and existing admin checklist updates.

## Historical Phase 5 Deployment Runbook

This section is retained as Phase 5 history. Use `docs/phase6-deployment-runbook.md` for the next production release.

1. **Pull latest main:** confirm a clean worktree, fetch origin, and run `git pull --ff-only origin main`.
2. **Verify locally:** run `npm run lint`, `npm run build`, `git diff --check`, and `npm audit --audit-level=moderate` when registry access is available.
3. **Apply the Phase 5 migration:** before pushing/deploying dependent code, manually apply only `supabase/migrations/202607110001_phase5_operations_management.sql`. Verify request operations columns/constraints/indexes, the `internal_tasks` table/indexes, authenticated grants, the staff-read policy, and admin/team-only task RLS. Never run `supabase/schema.sql` on the existing live project.
4. **Push:** push the reviewed commits normally. Never force push and never commit environment files or secrets.
5. **Wait for Vercel:** confirm the deployment succeeds and is tied to the expected commit.
6. **Smoke test:** check the public, admin, overview, document-review, login, and portal routes listed above.
7. **Acceptance test:** execute the manual live test and record evidence for persistence, email delivery, customer visibility, uploads, and document review.
8. **Rollback:** if application behavior regresses, roll Vercel back to the last accepted deployment. If a database migration was applied, do not improvise a rollback; assess forward compatibility and use a separately reviewed corrective/down migration.

### Supabase migration ledger

- Applied live: `202607100001_phase3a_customer_portal_live_fix.sql` — Phase 3A customer portal/RLS hardening.
- Applied live: `202607100002_phase3b_customer_messages.sql` — Phase 3B structured customer messages.
- Phase 3C: no migration required.
- Phase 4A–4E MVP completion sprint: no migration required.
- Present in the inspected live Phase 5 schema: ownership/deadlines, priority hardening, staff-read policy, and admin/team-only internal tasks from `202607110001_phase5_operations_management.sql`.
- Pending Phase 6 release: `202607110002_phase6_customer_lifecycle.sql` — apply this consolidated migration once, before pushing Phase 6 application commits.
- Permanent safety rule: never run `supabase/schema.sql` on the existing live Supabase project.

## Phase 6 Final Acceptance Record

Run this only after the consolidated migration, Auth URLs, and custom SMTP are configured. Record `Pass`, `Fail`, or `Blocked` plus an evidence link/reference in the Result column.

| # | Manual step | Expected result | Result |
| ---: | --- | --- | --- |
| 1 | Open `/portal/signup`. | Public signup form loads. | — |
| 2 | Submit a compliant new customer password. | Account is created without admin approval. | — |
| 3 | Check the customer mailbox. | Verification email arrives from the approved Globalflowa sender. | — |
| 4 | Attempt portal access before verification. | Protected customer data is denied. | — |
| 5 | Click the verification link. | Supabase code exchange succeeds once. | — |
| 6 | Observe the callback redirect. | Redirect ends at an approved internal portal route with no code/token shown. | — |
| 7 | Inspect the new profile. | Role is `customer`. | — |
| 8 | Attempt privileged signup metadata/inputs. | Admin/team/internal roles cannot be created. | — |
| 9 | Request password recovery for existing and unknown emails. | Both receive the same generic response. | — |
| 10 | Check the existing-account mailbox. | Recovery email arrives. | — |
| 11 | Follow the valid recovery link and update the password. | Password changes through Supabase Auth. | — |
| 12 | Reuse an expired/invalid recovery link. | Update fails safely without provider details. | — |
| 13 | Update Customer A personal profile. | Only allowed personal fields persist. | — |
| 14 | Update Customer A company profile. | One owned company row is inserted/updated. | — |
| 15 | Review login and business emails. | Login email is read-only and distinct from business contact email. | — |
| 16 | Attempt Customer A access to Customer B profile/company. | Read and mutation are denied. | — |
| 17 | Open admin request detail. | Safe customer profile/company summary appears without Auth secrets. | — |
| 18 | Create a guest request with Customer A email. | Request is accepted. | — |
| 19 | Inspect ownership before signup. | `customer_user_id` is null. | — |
| 20 | Verify Customer A with the exact normalized email. | Claim flow becomes eligible. | — |
| 21 | Enter the portal. | Unowned matching request links to Customer A. | — |
| 22 | Repeat the claim action. | Claimed count is zero and no duplicate activity is created. | — |
| 23 | Attempt claim/view as Customer B. | Access is denied and ownership is unchanged. | — |
| 24 | Test an already-owned request. | Existing ownership is never overwritten. | — |
| 25 | Change lifecycle as admin/team. | Valid non-terminal stage persists and logs once. | — |
| 26 | View the request as its customer. | Safe lifecycle label, progress, and next action appear. | — |
| 27 | Inspect portal HTML/data. | Staff actors, assignments, priorities, deadlines, tasks, summaries, and internal notes are absent. | — |
| 28 | Send a missing-document message. | Lifecycle moves to `waiting_for_documents` only when configured by the workflow. | — |
| 29 | Upload the requested file. | Checklist moves under review and lifecycle may move to `document_review`. | — |
| 30 | Repeat automation on completed/archived requests. | Terminal stages are not overwritten. | — |
| 31 | Upload a final deliverable as draft. | Staff sees draft; customer does not. | — |
| 32 | Guess the draft download ID as customer. | Generic denial is returned. | — |
| 33 | Publish the deliverable. | Publication state and one activity entry persist. | — |
| 34 | View/download as owning customer. | Metadata appears and secure download succeeds. | — |
| 35 | Request the file as Customer B. | Generic denial is returned. | — |
| 36 | Reuse the signed URL after expiry. | URL no longer works. | — |
| 37 | Unpublish the deliverable. | Customer metadata/download access is removed; object remains internal. | — |
| 38 | Try the old customer link after unpublish. | Access is denied after signed URL expiry and no new URL is issued. | — |
| 39 | Delete the deliverable with confirmation. | Exact object is removed and metadata is soft-deleted. | — |
| 40 | Re-test customer uploads and review queue. | Existing customer-document workflow is unaffected. | — |
| 41 | Start completion with outstanding warnings. | Server returns the current warning set. | — |
| 42 | Submit without warning confirmation. | Completion is prevented. | — |
| 43 | Confirm warnings and provide the required customer note. | Request becomes completed and logs once. | — |
| 44 | View completed request as customer. | Customer completion note and final-document state appear. | — |
| 45 | Inspect customer output. | Internal completion summary remains absent. | — |
| 46 | Attempt customer upload to completed request. | Server/database rejects it and orphan storage is cleaned up. | — |
| 47 | Reopen as admin/team to a valid active stage. | Request resumes active lifecycle and logs once. | — |
| 48 | Re-test active workflow. | Allowed customer mutations and next-action logic resume. | — |
| 49 | Archive with explicit confirmation. | Request becomes archived without data deletion. | — |
| 50 | Check active admin queues/metrics. | Archived request is excluded. | — |
| 51 | View archived request as owner. | Read-only request remains visible. | — |
| 52 | Download a published final file from archived request. | Authorized download remains available. | — |
| 53 | Attempt archived customer upload/note mutation. | Mutation is rejected. | — |
| 54 | Restore the request. | Recorded or validated target lifecycle returns. | — |
| 55 | Inspect progress and next action. | Correct restored stage and action appear. | — |
| 56 | Log in at `/admin/login`. | Existing admin/team login works. | — |
| 57 | Log in at `/portal/login`. | Existing verified customer login works. | — |
| 58 | Submit `/request` as guest and verified customer. | Guest remains unowned; authenticated request links to session user. | — |
| 59 | Trigger configured notification/resend behavior. | Expected notifications send or fail safely with persisted state. | — |
| 60 | Send and view customer messages. | Authorized message flow works. | — |
| 61 | Upload/replace customer documents. | Private upload flow works. | — |
| 62 | Review documents in admin. | Accept/reject queue and customer-safe correction reason work. | — |
| 63 | Exercise assignments, deadlines, and internal tasks. | Phase 5 internal workflows work and remain customer-hidden. | — |
| 64 | Open `/admin/workboard`. | Active workload data and filters work. | — |
| 65 | Open `/admin/overview`. | Metrics exclude completed/archived where specified. | — |
| 66 | Inspect Vercel runtime errors after the test run. | No new unhandled Phase 6 errors are present. | — |
| 67 | Run cross-customer negative tests across requests, messages, checklist, files, profiles, and companies. | No Customer A/B data crossover occurs. | — |
