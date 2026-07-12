# Supabase Auth configuration

Phase 6A adds application support for customer self-signup, email confirmation, and password recovery. These production settings must be configured manually in Supabase; the migration does not change Auth settings.

## Email provider

In **Authentication → Providers → Email**:

- Enable email/password signup.
- Enable **Confirm email**.
- Configure secure password requirements at least as strong as the application rule: 10 characters with uppercase, lowercase, and numeric characters.
- Enable Supabase leaked-password protection when available for the production plan; the read-only pre-deployment advisor reported it disabled.
- Keep self-signup enabled; Globalflowa customer accounts do not require an admin invitation or approval.
- Do not enable automatic confirmation through application code or service-role credentials.

## URL configuration

Set the production Site URL to:

`https://globalflowa.vercel.app`

Allow these production redirect URLs:

- `https://globalflowa.vercel.app/auth/callback`
- `https://globalflowa.vercel.app/portal/update-password`

For local development, add only the matching URLs for the local origin in use, normally:

- `http://localhost:3000/auth/callback`
- `http://localhost:3000/portal/update-password`

Do not add wildcard production redirects. The application callback separately restricts its `next` destination to approved internal paths.

## Email delivery

Production verification and password-reset email delivery must use custom SMTP with a verified Globalflowa sending domain. Configure SMTP credentials in Supabase-managed secrets only. Never commit SMTP usernames, passwords, provider keys, or recovery/verification tokens.

- Use a customer-recognizable sender name and address on the verified domain.
- Configure SPF, DKIM, and DMARC through the chosen email provider and DNS host.
- Review the verification and password-reset templates for correct Globalflowa branding and links.
- Test verification, reset delivery, expiry, and spam placement before public launch.
- Store any related Vercel values in encrypted project settings; do not put values in source control.

After configuration, test signup confirmation and password recovery end to end with a non-privileged customer account before production acceptance.
