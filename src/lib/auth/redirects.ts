const approvedAuthDestinations = new Set(["/portal", "/portal/update-password"]);

export function safeAuthDestination(value: string | null) {
  return value && approvedAuthDestinations.has(value) ? value : "/portal";
}

export function getConfiguredSiteUrl() {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "");
  if (!configured) throw new Error("NEXT_PUBLIC_SITE_URL is not configured.");

  const url = new URL(configured);
  const localDevelopment = url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname);
  if ((url.protocol !== "https:" && !localDevelopment) || url.pathname !== "/" || url.search || url.hash) {
    throw new Error("NEXT_PUBLIC_SITE_URL must be an HTTPS origin or a local development origin.");
  }
  return url.origin;
}
