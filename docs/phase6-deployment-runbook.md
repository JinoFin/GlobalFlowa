# Phase 6 deployment runbook

Phase 6 is one coordinated application and database release. The application reads new tables, columns, views, and functions, so the consolidated migration must be applied before the Phase 6 commits are pushed and deployed.

## Preconditions

1. Confirm the seven local Phase 6 commits (6A–6G), the access-control correction commit, a clean worktree, and the expected `main` history.
2. Run lint, production build, dependency audit, diff check, secret scan, and the structural route checks.
3. Review `supabase/migrations/202607110002_phase6_customer_lifecycle.sql` in full. Do not substitute `supabase/schema.sql`; that file is bootstrap/reference SQL only.
4. Confirm production remains on the Phase 5 application and schema.
5. Confirm a recent Supabase backup and the project recovery procedure are available.

## Release order

1. Apply only `supabase/migrations/202607110002_phase6_customer_lifecycle.sql` through the controlled production migration process.
2. Verify the migration committed successfully as one transaction.
3. Verify the added profile fields, `customer_companies`, lifecycle/completion/archive fields, deliverable fields, indexes, triggers, functions, RLS policies, explicit grants, and private storage behavior.
4. Confirm `claim_requests_for_current_customer()`, `update_request_lifecycle_stage(...)`, and `perform_request_lifecycle_action(...)` reject anonymous execution and have the intended authenticated grants.
5. Query table and routine grants and confirm the privilege matrix in `docs/phase6-security-audit.md`: protected tables have no `anon`/`authenticated` privileges, neither browser role has `TRUNCATE`, `REFERENCES`, or `TRIGGER`, and only the vetted RPCs are executable by `authenticated`.
6. Test direct Data API requests with customer credentials: protected base tables must return permission denied, including `service_requests`, `request_files`, `internal_tasks`, and `request_activity_log`.
7. Configure the Auth and URL settings in `docs/supabase-auth-configuration.md`.
8. Configure or verify custom SMTP and the verified sending domain. Test the email templates.
9. Run read-only database smoke queries and confirm the `request-documents` bucket is still private.
10. Push the eight reviewed local commits to GitHub.
11. Wait for the Vercel production deployment and confirm the build is `READY`.
12. Review runtime errors without exposing customer data or secrets.
13. Execute every test in the Phase 6 final acceptance record in `docs/live-qa-checklist.md`.
14. Keep Phase 7 blocked until all Phase 6 acceptance results pass or have an approved disposition.

Deploying application code first is unsafe: Phase 6 queries reference schema that does not exist in Phase 5 and would cause production runtime failures.

## Migration operation notes

- Run the migration in one transaction. Its table changes, functions, policies, triggers, indexes, grants, and PostgREST notification are transaction-safe.
- The lifecycle and file-category backfills scan existing rows. Schedule a quiet release window and inspect table size first. Indexes are created non-concurrently and may briefly lock writes.
- The migration is additive and preserves existing ownership, requests, customer uploads, internal files, messages, activities, assignments, and tasks.
- Its final privilege block first revokes all protected-table privileges inherited from Phase 5 for `anon`, `authenticated`, and `service_role`, then restores only server-role `SELECT`, `INSERT`, and `UPDATE`. Public catalog tables restore read-only browser access.
- Protected application data is server-only. RLS remains enabled as defense in depth, while direct customer/admin browser access is limited to the vetted role, verification, claim, and lifecycle functions.
- Historical requests are not claimed during migration. Historical files default to non-public and are never promoted to final deliverables.
- The upload guard and lifecycle action function lock only the affected request row during mutations; they do not take broad table locks at runtime.

## Failure and roll-forward plan

If the migration fails before commit:

1. Do not push Phase 6 application code.
2. Capture the exact SQL statement and database error.
3. Confirm the transaction rolled back and the Phase 5 application still works.
4. Correct the consolidated migration in review; do not run `schema.sql` or make destructive ad hoc changes.

If the migration succeeds but deployment fails:

1. Retain the additive Phase 6 schema.
2. Redeploy the last known-good Phase 5 application if necessary.
3. Investigate and correct the build/runtime problem before retrying. The Phase 6 schema is designed to remain backward-compatible with Phase 5 code.

If acceptance finds a serious authorization defect:

1. Disable or roll back the affected application feature.
2. Do not destructively remove Phase 6 columns or data.
3. Prepare a separately reviewed hotfix migration only when a database correction is required.

No rollback or hotfix migration is created by Phase 6G.
