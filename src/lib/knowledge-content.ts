export type KnowledgeContent = { applicableScope: string; misconceptions: string[]; stepsBeforeSelling: string[]; ongoingObligations: string[]; sourceIds: string[]; relatedServiceSlugs: string[]; lastReviewed: "2026-07-12"; disclaimer: string };

const relatedServices: Record<string, string[]> = {
  "weee-elektrog": ["weee-elektrog-registration"],
  battg: ["battery-battg-registration"],
  "verpackg-lucid": ["packaging-verpackg-lucid"],
  "gpsr-responsible-person": ["gpsr-eu-responsible-person", "product-compliance-review"],
  "vat-germany": ["vat-registration-germany", "bookkeeping-tax-coordination"],
  "company-formation-germany": ["company-formation-germany", "german-business-address"],
  "warehouse-preparation-marketplaces": ["shipment-preparation", "product-inspection"],
};

const sources: Record<string, string[]> = {
  "weee-elektrog": ["eu-weee", "de-elektrog", "de-ear"],
  battg: ["eu-batteries", "de-battdg", "de-ear"],
  "verpackg-lucid": ["de-verpackg", "eu-ppwr", "de-zsvr"],
  "gpsr-responsible-person": ["eu-gpsr", "eu-market-surveillance", "eu-gpsr-guidelines"],
  "vat-germany": ["eu-vat", "de-ustg", "de-bzst"],
  "company-formation-germany": ["de-gmbhg", "de-startup", "de-commercial-register"],
  "warehouse-preparation-marketplaces": [],
};

const scope: Record<string, string> = {
  "weee-elektrog": "Electrical and electronic equipment placed on the German market. Producer status, brand, equipment type and B2B/B2C facts affect the path; registration in Germany is not EU-wide.",
  battg: "Batteries and products containing batteries under Regulation (EU) 2023/1542 and Germany's BattDG, with category- and date-specific obligations.",
  "verpackg-lucid": "Packaging placed on the German market; registration, system participation and reporting must be assessed separately by packaging type.",
  "gpsr-responsible-person": "Consumer products within GPSR scope, read together with product-specific Union legislation and the applicable economic-operator framework.",
  "vat-germany": "German VAT outcomes depend on transaction chain, stock location, customer type, imports and available special schemes.",
  "company-formation-germany": "Potential GmbH/UG formation involving notarial, commercial-register, tax and operational steps; entity choice is case-specific.",
  "warehouse-preparation-marketplaces": "Operational storage and preparation after product acceptance review; it is not conformity assessment or certification.",
};

export function getKnowledgeContent(slug: string): KnowledgeContent {
  return {
    applicableScope: scope[slug] ?? "Applicability depends on the facts and current official requirements.",
    misconceptions: slug === "gpsr-responsible-person" ? ["Every product needs CE marking or a Declaration of Conformity", "An importer and authorised representative are interchangeable", "A responsible-person address alone makes a product compliant"] : slug === "battg" ? ["BattG remains the sole current German framework", "Every battery has the same category and start dates", "Every battery needs a battery passport"] : ["One checklist applies to every business", "Registration or a document alone completes all obligations", "A service provider assumes every legal responsibility"],
    stepsBeforeSelling: ["Identify the product, supply chain and sales countries", "Check the directly applicable and product-specific rules", "Confirm roles, documents, registrations and current marketplace fields", "Escalate unresolved legal, tax or technical questions to a qualified professional"],
    ongoingObligations: ["Keep facts, documents and registration data current", "Monitor official guidance, legal amendments and marketplace policy changes", "Maintain reporting, corrective-action and record workflows where applicable"],
    sourceIds: sources[slug] ?? [], relatedServiceSlugs: relatedServices[slug] ?? [], lastReviewed: "2026-07-12",
    disclaimer: "This guide is general information. It does not replace product-specific legal, tax, technical or authority advice.",
  };
}
