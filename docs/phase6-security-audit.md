# Phase 6 security and compatibility audit

Audit date: 2026-07-12. This report records static review and read-only environment evidence. It does not claim that the unapplied Phase 6 migration or authenticated production workflows were executed.

## Live Phase 5 compatibility

Read-only inspection confirmed the production Supabase project is healthy and still has the Phase 5 structures required by the consolidated migration:

- `profiles` has the auth-user primary/foreign key, email, role, and customer default.
- `service_requests` has customer ownership/email fields plus Phase 5 assignment, priority, and deadline fields.
- `request_files` has the existing private-storage metadata, uploader role, checklist link, size, and MIME fields.
- `customer_messages`, `request_activity_log`, `internal_tasks`, and the checklist tables have the expected Phase 5 columns and foreign keys.
- `customer_companies` and the Phase 6 lifecycle/deliverable fields are not present, as expected.
- RLS is enabled on the inspected protected tables. The live legacy customer policies still include email fallback; the Phase 6 migration replaces these with verified-user-ID ownership.
- The `request-documents` bucket exists and is private. Its live direct storage policy is staff-read-only; customer download continues through an authorized server route.
- Live legacy role helper functions were owned by `postgres`, used `search_path=public`, and were executable too broadly. The migration now replaces both legacy naming variants with fixed-path implementations and revokes anonymous execution.
- The Supabase Auth advisor reported leaked-password protection disabled. Enable it manually when available before public launch; this is not changed by SQL migration.
- Supabase migration history is empty in the connected integration, so production application of the consolidated migration must use the project’s controlled process and be recorded operationally.

No live SQL mutation, Auth change, storage change, or migration application was performed.

## Consolidated migration review

File: `supabase/migrations/202607110002_phase6_customer_lifecycle.sql`.

- Statement order: columns precede constraints/indexes/triggers; tables precede views and policies; functions precede grants and triggers; policies reference existing helpers and relations.
- Data safety: profile and request rows are preserved; missing profiles are provisioned as customers without changing existing roles; request lifecycle is conservatively mapped from known Phase 5 statuses; existing files become customer uploads or internal documents and remain unpublished.
- Ownership: no historical request is claimed during migration. Claiming occurs only through the verified authenticated function and never overwrites non-null ownership.
- Idempotency: columns/indexes/tables use guarded creation; named policies and triggers are dropped before recreation; check constraints are normalized by name before recreation. Correctness-sensitive backfills and grants remain explicit.
- Transaction and locks: all statements can run in one transaction. Existing-row updates and non-concurrent index/constraint creation can take locks, so a quiet release window is required. Runtime terminal actions and customer-file inserts lock one request row to serialize completion/archive against uploads.
- Roll-forward: the schema is additive and compatible with temporary Phase 5 application rollback. Destructive rollback is intentionally not provided.
- Execution: SQL received static review only. No local Supabase CLI, Docker, or `psql` runtime was available, and the production migration was not applied.

## Authentication and role security

- Signup sends a PKCE confirmation redirect to the configured canonical site URL and does not accept role metadata.
- The auth-user trigger creates customer profiles and no longer overwrites an existing privileged role on conflict.
- Verification and recovery callback destinations are allowlisted internal paths; callback responses do not expose codes, tokens, or provider errors.
- Protected portal code requires both confirmed email and `profiles.role='customer'`.
- Password reset uses a generic account-enumeration-safe response. Passwords remain exclusively in Supabase Auth.
- Service-role code is marked server-only and no service key is referenced from client components.
- Production redirects, confirmation, password policy, SMTP, and DNS authentication remain manual settings documented separately.

## Ownership, lifecycle, and storage findings

- Claiming derives user ID, confirmed email, and role in the database; accepts no email/user parameter; matches normalized email only on unclaimed, non-archived requests; and has minimal execute grants.
- Manual lifecycle changes and their activity entry are atomic in a row-locking database function, so a concurrent terminal action cannot be overwritten. Complete/reopen/archive/restore remain in the dedicated row-locking database function.
- Customer file inserts use a database trigger that locks the request and rejects completed/archived stages. The upload route removes the exact storage object if metadata insertion fails.
- Deliverables reuse `request_files` and the private bucket. Draft, unpublished, internal, customer-upload, and deleted rows fail customer download authorization.
- Download routes create 60-second signed URLs only after authorization, request download content disposition with a sanitized filename, and return private no-store redirects. Signed URLs are neither stored nor logged.
- Office documents are accepted only with matching extension and MIME. ZIP, executable, HTML, and SVG uploads are not accepted.

## Customer privacy review

Portal request selections omit `assigned_to`, `assigned_by`, `assigned_at`, `priority`, `due_at`, `internal_notes`, `lifecycle_stage_updated_by`, `completed_by`, `reopened_by`, `archived_by`, `completion_summary`, staff profiles/emails, raw activity metadata, bucket names, and storage paths. Request answers now use an explicit field list. A security-invoker checklist view returns an admin note only when its customer-visible flag is true.

## Access matrix

RLS is the final row-level boundary for authenticated roles; the service role is used only in server code after application authorization.

| Resource | Anon | Verified customer | Admin/team | Service/server |
| --- | --- | --- | --- | --- |
| `profiles` | None | Select self; update allowed personal columns on self | Read required profiles; admin management per existing policy | Full server capability |
| `customer_companies` | None | Select/insert/update own; no delete | Read customer companies | Full server capability |
| `service_requests` | None directly | Select owned enabled requests only; no customer update policy | Manage through staff RLS/routes | Validated submission/claim support |
| `customer_messages` | None | Select own customer-visible rows only | Select/insert/update | Server email workflow |
| `request_files` | None | Select own customer uploads and published deliverables only | Manage request files/deliverables | Validated upload and exact cleanup |
| `request_activity_log` | None | No direct customer timeline access | Manage/read internal activity | Reliable event writes |
| `internal_tasks` | None | None | Manage | Full server capability |
| `storage.objects` | None | No broad direct read/write | Existing staff read policy | Exact-object upload/sign/delete |
| Claim function | No execute | Execute for self; function rechecks verified customer | Execution harmlessly fails customer-role check | Owner/server operational access |
| Lifecycle update/action functions | No execute | Execute grant exists but internal role checks reject | Execute; row-locked atomic staff actions | Owner/server operational access |

The authenticated execute grant on exposed RPC functions is intentional; each function independently derives and validates the caller. Trigger functions have no browser execute grant.

## Read-only Vercel evidence

The latest production deployment was `READY` at Phase 5E commit `272df15`; no Phase 6 deployment occurred. The seven-day runtime-error view contained two historical groups: one workboard query observed a missing Phase 5 operations column during an earlier rollout, and one customer email send failed because the configured test sender domain was not production-authorized. The current live schema inspection shows the operations column exists. Custom production email delivery remains a required pre-launch action.

Environment-variable values were not read or exposed. Required names are documented in the repository. No Vercel setting or deployment was changed.

## Remaining acceptance work

After the migration and Auth/SMTP configuration, production acceptance must exercise real email delivery, recovery, SQL functions, RLS negative cases, storage upload/download/expiry, concurrency, and all 67 checks in the live QA checklist. Until then Phase 6 is deployment-ready for reviewed migration application, not production-tested.
