# Supabase Auth configuration

Phase 6A adds application support for customer self-signup, email confirmation, and password recovery. These production settings must be configured manually in Supabase; the migration does not change Auth settings.

## Email provider

In **Authentication → Providers → Email**:

- Enable email/password signup.
- Enable **Confirm email**.
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

Production verification and password-reset email delivery should use custom SMTP with a verified Globalflowa sending domain. Configure SMTP credentials in Supabase-managed secrets only. Never commit SMTP usernames, passwords, provider keys, or recovery/verification tokens.

After configuration, test signup confirmation and password recovery end to end with a non-privileged customer account before production acceptance.
