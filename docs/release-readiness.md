# GlobalFlowa release readiness

Last updated: 18 July 2026

Overall status: **Not ready for public launch**

This document is the single source of truth for production-readiness work. A successful build, deployment, or visual review does not by itself change the overall status.

## Current release baseline

- Repository: `JinoFin/GlobalFlowa` (currently public; owner confirmation is still required before launch).
- Production: `https://globalflowa.vercel.app`.
- Production commit: `36eb16d` (`Phase 7A: unify portal and admin navigation`).
- Starting local commit for this run: `3c95565` (`Phase 7C: visual QA accessibility and conversion`).
- GitHub baseline before recovery: `36eb16d`; local Phase 7B commit `9dcfc19` and Phase 7C commit `3c95565` were not present on GitHub.
- Review branch: `codex/phase7-release-governance`.
- Production Supabase project: healthy in `eu-central-1`, PostgreSQL 17.
- Production migration ledger: empty in the connected Supabase migration history.
- Production deployment status: `READY`; automatic deployments from `main` were active at the start of this run.

## Run log

### 18 July 2026 — Phase 7 recovery and release governance

#### Issues inspected

- Reconciled local and GitHub histories and recovered the missing Phase 7B/7C commits locally.
- Inspected the GitHub repository, open pull requests, open issues, repository visibility, and default branch.
- Inspected the Vercel project, current production deployment, deployment history, domains, runtime errors, and the production homepage response.
- Inspected the Supabase project health, migration ledger, public schema inventory, security advisor, and performance advisor.
- Reviewed the Phase 7B/7C diff, including request persistence/email status behavior, navigation, protected-area `noindex`, accessibility improvements, service content registry, and validation script.

#### Changes implemented

- Added pull-request CI with stable `Quality`, `Production build`, and `Dependency audit` checks.
- Added `merge_group` coverage so required checks remain compatible with a future merge queue.
- Added a reusable `npm run typecheck` script.
- Added a reviewed Vercel Git gate that disables automatic deployments from `main` while preserving preview deployments from review branches.
- Activated and verified the classic `main` protection rule in the signed-in GitHub UI: pull requests, one approval, stale-approval dismissal, current branches, all three CI checks, conversation resolution, no administrator bypass, and no force-push/deletion.
- Created this release-readiness tracker.
- Created focused GitHub issues [#1](https://github.com/JinoFin/GlobalFlowa/issues/1), [#2](https://github.com/JinoFin/GlobalFlowa/issues/2), [#3](https://github.com/JinoFin/GlobalFlowa/issues/3), and [#4](https://github.com/JinoFin/GlobalFlowa/issues/4) for the confirmed release blockers.

#### Tests and evidence

- `npm ci`: passed; local Node 22.11 emitted an engine warning for a transitive ESLint package that requires Node 22.13 or newer. CI and Vercel use Node 24.
- `npm run validate:phase7c`: passed for 29 services, 7 knowledge articles, navigation, metadata, source presentation, and internal links.
- `npm run lint`: passed.
- `npm run typecheck`: passed.
- `npm run build`: passed with all 53 static/dynamic routes generated or registered successfully.
- `npm audit --audit-level=moderate`: passed with 0 vulnerabilities after network access was allowed.
- `git diff --check`: passed after this batch's edits.
- Phase 7B/7C database diff: none.
- Latest review-branch GitHub Actions run: `Quality`, `Production build`, and `Dependency audit` all passed on Node.js 24; the exact immutable head and logs are linked from the pull-request checks.
- Vercel Preview deployment: `READY`; Vercel reported the deployment check as successful.
- Preview browser smoke: homepage, Services, request, customer login, and admin login passed at 375 px, 768 px, and desktop without document-level horizontal overflow. Each sampled page had one H1 and one main landmark.
- Preview mobile navigation: labelled dialog opened, exposed its expanded state, closed on Escape, and restored focus to the trigger.
- Preview visual review: desktop and mobile homepage hero/layout rendered without clipping. No application-origin console errors were observed; the only captured warnings/errors came from the preceding Vercel authentication screen and Google sign-in client.
- Live Vercel runtime review: one request-email failure was recorded during the seven-day window. A historical workboard error preceded the current Phase 5 schema.
- Live homepage: returned successfully over HTTPS with HSTS, but the requested application security headers are not yet present.
- Signed-in GitHub verification: the active `main` rule requires `Quality`, `Production build`, and `Dependency audit`, plus one approval, an up-to-date branch, and resolved conversations; bypass, force pushes, and deletion are disabled.

#### Remaining blockers

- [Issue #1](https://github.com/JinoFin/GlobalFlowa/issues/1): Branch protection is active and verified. The issue remains open until PR #5 is reviewed and merged, the Vercel `main` deployment gate is verified after merge, and the documented manual release/promotion gate is exercised.
- The Vercel `main` deployment gate has passed review-branch Preview checks but must still be verified after merge; production must not be promoted as part of this batch.
- [Issue #3](https://github.com/JinoFin/GlobalFlowa/issues/3): Production request email is not reliable. Implement and test a durable outbox, retries, delivery status, and worker alerts.
- [Issue #2](https://github.com/JinoFin/GlobalFlowa/issues/2): Public request and upload endpoints still need durable rate limiting, bot protection, strict file-count/type/size validation, quarantine preparation, persistence idempotency, and transactional object/record cleanup.
- [Issue #4](https://github.com/JinoFin/GlobalFlowa/issues/4): Production Supabase schema is ahead of its empty migration ledger. Reconciliation needs a reviewed, checksum-recorded, live-safe procedure and an explicit release gate.
- Supabase leaked-password protection is disabled.
- Supabase security advisor reports externally callable `SECURITY DEFINER` functions. Each function needs an intent/access review; helper functions that must remain callable require documented justification and least-privilege execution grants.
- Supabase performance advisor reports unindexed foreign keys and additional policy/index findings requiring a separate reviewed migration.
- Legal pages, intended production domain, canonical/Auth/email URL settings, repository visibility, security headers, malware-scanning provider, backup/recovery evidence, and observation-window monitoring remain unresolved.

#### Security findings

- Repository visibility is public. No credentials were found in the reviewed Phase 7 diff, but public visibility remains an explicit owner decision.
- Production has HSTS. CSP, clickjacking, MIME-sniffing, referrer, and permissions-policy headers remain a launch blocker.
- The migration ledger mismatch prevents reproducible production schema assurance.
- Leaked-password protection is disabled.
- Email failure is recorded after persistence, so the customer request is retained, but no durable retry mechanism exists.

#### Database and migration status

- No database migration was created or applied during this run.
- `supabase/schema.sql` was not run against production.
- The connected production migration ledger remains empty.
- Phase 7B/7C contain no schema or migration changes.

#### Preview deployment

- `READY`: the Vercel review-branch Preview for the current pull-request head; the exact immutable deployment is linked from the pull-request check.
- Vercel check passed. Public-route responsive and interaction smoke checks passed as recorded above.
- No production deployment or domain promotion was performed.

#### Pull request

- Draft PR [#5 — Recover Phase 7 and add release governance](https://github.com/JinoFin/GlobalFlowa/pull/5).
- The recovered application and release-control tree was introduced in `b5c2320`; subsequent commits only record verification evidence. GitHub is authoritative for the current immutable PR head.
- CI and Vercel checks passed. The PR remains unmerged and production remains on `36eb16d`.

#### Recommended next batch

1. Harden `/api/submit-request` and `/api/portal/upload` with a shared server-side upload policy, adversarial tests, durable rate limiting/bot controls, quarantine metadata, idempotency, and cleanup semantics.
2. Implement the database-backed email outbox and retry/alert workflow, then verify success and failure against connected Preview services.
3. Reconcile the production Supabase migration ledger and security-advisor findings through an additive reviewed migration plan without applying it to production.

## Acceptance gates

The platform remains **not ready** until every item below has current evidence:

- [ ] No critical or high-severity security finding remains.
- [x] Pull requests and the `Quality`, `Production build`, and `Dependency audit` checks are enforced on `main`; one approval, current branches, conversation resolution, no bypass, and no force-push/deletion were verified in GitHub.
- [ ] Production deploys only through an explicit reviewed release gate.
- [ ] Production migrations and checksums are recorded and reproducible.
- [ ] Customer A versus Customer B and role-boundary tests pass against a connected environment.
- [ ] Request, upload, replacement, document review, final delivery, and archive journeys pass end to end.
- [ ] Email success, failure, retry, alert, and idempotency behavior pass end to end.
- [ ] Template authoring, versioning, preview, PDF, DOCX, correction, and publication journeys pass end to end.
- [ ] Accessibility, keyboard, responsive, mobile, and visual regression checks pass with recorded evidence.
- [ ] Legal/privacy content is approved and the production domain/Auth/email/canonical settings are correct.
- [ ] Production is on the reviewed release commit and runtime errors remain clear for the agreed observation window.
- [ ] Rollback and recovery procedures have been exercised and recorded.
