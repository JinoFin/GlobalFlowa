# Phase 7C visual, accessibility and reliability QA

Review date: 13 July 2026

## Route inventory

Public routes remain stable: `/`, `/services`, `/knowledge`, `/check-requirements`, `/request`, `/request/success`, `/warehouse`, `/contact`, `/portal/login`, `/portal/signup`, `/portal/forgot-password`, `/portal/update-password`, `/admin/login` and `/auth/callback`.

Service detail routes (29):

- `/services/company-formation-germany`
- `/services/german-business-address`
- `/services/vat-registration-germany`
- `/services/bookkeeping-tax-coordination`
- `/services/marketplace-seller-setup`
- `/services/weee-elektrog-registration`
- `/services/battery-battg-registration`
- `/services/packaging-verpackg-lucid`
- `/services/gpsr-eu-responsible-person`
- `/services/product-compliance-review`
- `/services/declaration-of-conformity-review`
- `/services/test-report-review`
- `/services/marketplace-compliance-support`
- `/services/authority-case-support`
- `/services/warehouse-storage-germany`
- `/services/packing-service`
- `/services/repacking-umverpackung`
- `/services/relabeling-umlabeln`
- `/services/barcode-fnsku-labeling`
- `/services/product-inspection`
- `/services/return-handling`
- `/services/shipment-preparation`
- `/services/amazon-compliance-support`
- `/services/temu-compliance-support`
- `/services/aliexpress-support`
- `/services/ebay-support`
- `/services/shopify-support`
- `/services/product-listing-document-support`
- `/services/marketplace-suspension-support`

Knowledge routes (7): `/knowledge/weee-elektrog`, `/knowledge/battg`, `/knowledge/verpackg-lucid`, `/knowledge/gpsr-responsible-person`, `/knowledge/vat-germany`, `/knowledge/company-formation-germany`, `/knowledge/warehouse-preparation-marketplaces`.

Customer routes: `/portal`, `/portal/requests`, `/portal/requests/[id]`, `/portal/profile`.

Admin routes: `/admin/overview`, `/admin/requests`, `/admin/requests/[id]`, `/admin/workboard`, `/admin/document-review`, `/admin/services`.

User-journey APIs remain stable: `/api/submit-request`, `/api/auth/signup`, `/api/auth/update-password`, `/api/portal/profile`, `/api/portal/claim-requests`, `/api/portal/upload`, `/api/portal/files/[id]`, `/api/portal/files/[id]/download`, `/api/admin/request-update`, `/api/admin/request-lifecycle`, `/api/admin/request-lifecycle-action`, `/api/admin/request-assignment`, `/api/admin/checklist-item`, `/api/admin/customer-message`, `/api/admin/document-review`, `/api/admin/internal-task`, `/api/admin/final-deliverables`, `/api/admin/final-deliverables/[id]`, `/api/admin/files/[id]`, `/api/admin/files/[id]/download` and `/api/admin/export`.

## Implemented QA fixes

- Replaced the public horizontal mobile navigation strip with a labelled modal drawer. It exposes `aria-expanded`/`aria-controls`, traps focus, closes on Escape/overlay/navigation, restores trigger focus on dismissal and locks background scrolling while open.
- Added a global skip link and consistent high-visibility focus treatment. Public, portal and admin drawers now have labelled dialogs, focus trapping, Escape dismissal and focus restoration.
- Added reduced-motion handling and touch-sized primary navigation controls.
- Improved the service index with category jump links, clear regulated/operational/marketplace trust labels, a who-may-need-it summary and consistent cards.
- Added service-detail section navigation, anchored content regions, stronger limitation callouts and one shared wrapping-safe official-source presentation.
- Added knowledge-index return links and only explicitly mapped related-service links. Service request links preserve the selected service through the existing query parameter and saved draft behavior.
- Added request-form validation summary focus, `aria-invalid`/`aria-describedby` field associations, required-field announcements, service-selection pressed state, safe progress/status announcements and clearer post-submission next actions.
- Added a human-readable site 404 and marked portal/admin layouts `noindex, nofollow`.
- Expanded the read-only admin Services view with slug, category, regulated status, last-reviewed date, source count and validation status. Raw configuration/provider errors are not rendered.

This is a practical audit and not a claim of WCAG certification.

## Responsive and interaction matrix

The target widths are 320, 375, 768, 1024, 1280 and 1440 px. Static review confirms that the public header has no horizontal-scroller class, drawers use viewport-bounded widths, long source/legal titles use wrapping, grids collapse from one column, and authenticated table areas retain their intentional local scrolling rather than forcing document-level width.

The available in-app browser was unable to open the localhost target because its URL policy blocked the page. No Phase 7C screenshots or browser-console claims are therefore recorded. Before production acceptance, manually repeat the following at all six widths:

1. Open the homepage, Services, one service from each category, one knowledge article, checker and request form. Confirm `scrollWidth === clientWidth` and no clipped action.
2. At 320/375/768 px, open the public menu, Tab through every control, Shift+Tab from the first control, press Escape and confirm focus returns to Menu.
3. Repeat the focus/drawer test as a verified customer on Dashboard, Requests, Profile and request detail.
4. Repeat as staff on Overview, Requests, request detail, Workboard, Document Review and Services.
5. Confirm request detail activates My Requests/Requests, respectively, and exactly one navigation link has `aria-current="page"`.
6. Check browser console on all sampled pages; record any error before acceptance.

## Request-email reliability

Request persistence remains authoritative and is never rolled back because an email fails. The two request emails use deterministic provider idempotency keys derived from the persisted request ID. The API returns only a sanitized notification status; the confirmation page says the request was saved and does not claim staff notification when delivery cannot be confirmed. A failed/partial/unconfigured notification writes an admin-visible `request_notification_email_failed` activity with status/count only and logs the request ID without a provider payload or key.

The historical evidence in `docs/phase6-security-audit.md` identifies a test sender domain that was not production-authorized. The email helper no longer silently falls back to the Resend test sender when `EMAIL_FROM` is absent. Code cannot confirm the current Resend domain state, so production acceptance must still verify that `EMAIL_FROM` uses a verified domain, send one controlled request, confirm both recipients, and inspect the request activity/runtime log if delivery fails. No credentials or provider settings were changed.

A database-backed request-submission idempotency record would require schema work and is outside this no-migration milestone. The UI prevents repeat clicks; provider idempotency prevents duplicate sends for the same persisted request ID. Do not introduce automatic client retries without a future reviewed persistence-level idempotency design.

## Verification commands

Run `npm run validate:phase7c`, `npm run lint`, `npm run build`, `npm audit --audit-level=moderate`, `git diff --check`, the secret-pattern scan and the migration-diff check before release. The validator checks route-content counts, duplicate slugs/titles, internal service links, source/review presentation, prohibited claims, public mobile navigation attributes, portal/admin navigation presence, no-index metadata and request-email reliability markers.

Phase 7C requires no database migration and changes no schema, RLS, grants, policies, storage, Auth, SMTP or live Supabase configuration.
