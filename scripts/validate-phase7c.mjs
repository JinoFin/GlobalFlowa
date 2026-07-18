import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (path) => readFileSync(join(root, path), "utf8");
const catalog = read("src/lib/catalog.ts");
const serviceSection = catalog.slice(catalog.indexOf("export const services"), catalog.indexOf("export const featuredServices"));
const knowledgeSection = catalog.slice(catalog.indexOf("export const knowledgeArticles"), catalog.indexOf("export function getCategory"));
const serviceSlugs = [...serviceSection.matchAll(/slug: "([a-z0-9-]+)"/g)].map((match) => match[1]);
const serviceNames = [...serviceSection.matchAll(/name: "([^"]+)"/g)].map((match) => match[1]);
const knowledgeSlugs = [...knowledgeSection.matchAll(/slug: "([a-z0-9-]+)"/g)].map((match) => match[1]);
const knowledgeTitles = [...knowledgeSection.matchAll(/title: "([^"]+)"/g)].map((match) => match[1]);

const failures = [];
const check = (condition, message) => { if (!condition) failures.push(message); };
const unique = (values) => new Set(values).size === values.length;

check(serviceSlugs.length === 29, `Expected 29 service slugs, found ${serviceSlugs.length}.`);
check(knowledgeSlugs.length === 7, `Expected 7 knowledge slugs, found ${knowledgeSlugs.length}.`);
check(unique(serviceSlugs), "Duplicate service slug found.");
check(unique(knowledgeSlugs), "Duplicate knowledge slug found.");
check(unique(serviceNames), "Duplicate service page title found.");
check(unique(knowledgeTitles), "Duplicate knowledge page title found.");

const servicePage = read("src/app/services/[slug]/page.tsx");
const knowledgePage = read("src/app/knowledge/[slug]/page.tsx");
check(servicePage.includes("<OfficialSources sources={sources}"), "Service detail pages are missing the shared official-source section.");
check(servicePage.includes("Last reviewed") || read("src/components/official-sources.tsx").includes("Last reviewed"), "Service detail pages are missing a review date.");
check(knowledgePage.includes("<OfficialSources sources={sources}"), "Knowledge pages are missing the shared official-source section.");
check(knowledgePage.includes("Back to knowledge"), "Knowledge articles are missing the index return path.");

const publicHeader = read("src/components/site-header.tsx");
const publicMenu = read("src/components/public-mobile-navigation.tsx");
check(!publicHeader.includes("overflow-x-auto"), "Public header still contains a horizontally scrolling navigation pattern.");
for (const attribute of ["aria-expanded", "aria-controls", "aria-modal", "Escape", "focus-visible"]) {
  check(publicMenu.includes(attribute), `Public mobile navigation is missing ${attribute}.`);
}

const appShell = read("src/components/app-shell.tsx");
for (const route of ["/portal/profile", "/admin/overview", "/admin/requests", "/admin/workboard", "/admin/document-review", "/admin/services"]) {
  check(appShell.includes(route), `Shared application navigation is missing ${route}.`);
}
check(read("src/components/application-chrome.tsx").includes("Skip to main content"), "Global skip link is missing.");
check(read("src/app/portal/layout.tsx").includes("index: false"), "Portal routes are not marked noindex.");
check(read("src/app/admin/layout.tsx").includes("index: false"), "Admin routes are not marked noindex.");
const submitRoute = read("src/app/api/submit-request/route.ts");
const emailSender = read("src/lib/email/send.ts");
check(submitRoute.includes("request_notification_email_failed"), "Admin-visible request email failure activity is missing.");
check(submitRoute.includes("notificationStatus"), "Request success responses do not report sanitized notification status.");
check(emailSender.includes("idempotencyKey: `request-${submissionId}-internal`"), "Internal request email idempotency key is missing.");
check(emailSender.includes("idempotencyKey: `request-${submissionId}-customer`"), "Customer request email idempotency key is missing.");
check(!emailSender.includes('?? "Globalflowa Portal <onboarding@resend.dev>"'), "Production email code still falls back to the Resend test sender.");

const sourceFiles = [];
function collect(path) {
  for (const entry of readdirSync(join(root, path))) {
    const relative = join(path, entry);
    if (statSync(join(root, relative)).isDirectory()) collect(relative);
    else if (/\.(ts|tsx)$/.test(entry)) sourceFiles.push(relative);
  }
}
collect("src");
const sourceText = sourceFiles.filter((path) => path !== "src/lib/service-content.ts").map((path) => read(path)).join("\n");
for (const match of sourceText.matchAll(/href=["']\/services\/([a-z0-9-]+)["']/g)) {
  check(serviceSlugs.includes(match[1]), `Broken internal service link: /services/${match[1]}.`);
}
for (const phrase of ["guaranteed compliance", "guaranteed approval", "guaranteed amazon reinstatement", "official eu certificate"]) {
  check(!sourceText.toLowerCase().includes(phrase), `Prohibited marketing phrase found: ${phrase}.`);
}

if (failures.length) {
  console.error("Phase 7C validation failed:\n" + failures.map((failure) => `- ${failure}`).join("\n"));
  process.exit(1);
}

console.log(`Phase 7C validation passed: ${serviceSlugs.length} services, ${knowledgeSlugs.length} knowledge articles, navigation, metadata, source presentation and internal links.`);
