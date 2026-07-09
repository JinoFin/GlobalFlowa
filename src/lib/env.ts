export const requiredEnvironmentVariables = {
  public: [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "NEXT_PUBLIC_SITE_URL",
  ],
  server: [
    "SUPABASE_SERVICE_ROLE_KEY",
    "EMAIL_PROVIDER_API_KEY",
    "INTERNAL_NOTIFICATION_EMAIL",
    "EMAIL_FROM",
  ],
} as const;

export function getMissingEnvironmentVariables(scope: "public" | "server" | "all" = "all") {
  const keys =
    scope === "all"
      ? [...requiredEnvironmentVariables.public, ...requiredEnvironmentVariables.server]
      : [...requiredEnvironmentVariables[scope]];

  return keys.filter((key) => !process.env[key]);
}
