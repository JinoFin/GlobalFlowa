import { contentSources } from "@/lib/content-sources";
import { services, type Service } from "@/lib/catalog";

export type ServiceContent = {
  regulated: boolean;
  scope: string;
  whoMayNotNeedIt: string;
  legalBasis: string;
  authority: string;
  whatGlobalflowaDoes: string[];
  customerResponsibilities: string[];
  ongoingObligations: string[];
  importantLimitations: string[];
  commonMistakes: string[];
  sourceIds: string[];
  lastReviewed: "2026-07-12";
  requiresIndividualAssessment: boolean;
  disclaimer: string;
};

const legalDisclaimer = "Globalflowa provides operational, documentation and coordination support. This service does not replace product-specific legal, tax, technical or authority advice.";
const warehouseDisclaimer = "Operational scope and acceptance are confirmed after reviewing the products, quantities, dimensions, handling requirements and destination rules.";

const sourceIdsBySlug: Record<string, string[]> = {
  "company-formation-germany": ["de-gmbhg", "de-startup", "de-commercial-register"],
  "german-business-address": ["de-gmbhg", "de-commercial-register"],
  "vat-registration-germany": ["eu-vat", "de-ustg", "de-bzst"],
  "bookkeeping-tax-coordination": ["eu-vat", "de-ustg", "de-bzst"],
  "marketplace-seller-setup": ["eu-gpsr", "amazon-seller", "temu-seller", "ebay-seller", "shopify-gpsr"],
  "weee-elektrog-registration": ["eu-weee", "de-elektrog", "de-ear"],
  "battery-battg-registration": ["eu-batteries", "de-battdg", "de-ear"],
  "packaging-verpackg-lucid": ["de-verpackg", "eu-ppwr", "de-zsvr"],
  "gpsr-eu-responsible-person": ["eu-gpsr", "eu-market-surveillance", "eu-gpsr-guidelines", "eu-product-safety"],
  "product-compliance-review": ["eu-gpsr", "eu-market-surveillance", "eu-product-safety"],
  "declaration-of-conformity-review": ["eu-market-surveillance", "eu-product-safety"],
  "test-report-review": ["eu-market-surveillance", "eu-product-safety"],
  "marketplace-compliance-support": ["eu-gpsr", "amazon-seller", "temu-seller", "ebay-seller", "shopify-gpsr"],
  "authority-case-support": ["eu-gpsr", "eu-gpsr-guidelines"],
  "amazon-compliance-support": ["eu-gpsr", "amazon-seller"],
  "temu-compliance-support": ["eu-gpsr", "temu-seller"],
  "aliexpress-support": ["eu-gpsr"],
  "ebay-support": ["eu-gpsr", "ebay-seller"],
  "shopify-support": ["eu-gpsr", "shopify-gpsr"],
  "product-listing-document-support": ["eu-gpsr", "eu-market-surveillance", "amazon-seller", "ebay-seller", "shopify-gpsr"],
  "marketplace-suspension-support": ["eu-gpsr", "amazon-seller", "temu-seller", "ebay-seller", "shopify-gpsr"],
};

const special: Record<string, Partial<ServiceContent>> = {
  "weee-elektrog-registration": {
    scope: "German ElektroG producer-status, brand and equipment-type assessment, registration preparation and marketplace evidence support. A German registration does not cover registrations required in other EU Member States.",
    whoMayNotNeedIt: "The registration path may differ where another compliant producer is already responsible, the item is outside ElektroG scope, or the seller is acting only as a distributor of correctly registered equipment. The statutory role must be checked.",
    legalBasis: "Directive 2012/19/EU and Germany's ElektroG.", authority: "stiftung ear is Germany's entrusted authority and register for ElektroG implementation; it is not a private certification body.",
    whatGlobalflowaDoes: ["Reviews product, brand, equipment type and B2B/B2C information", "Coordinates registration or authorised-representative intake where legally and contractually available", "Organises registration evidence for marketplace requests"],
    customerResponsibilities: ["Provide accurate product, brand and supply-chain information", "Confirm who is the statutory manufacturer, importer or distributor", "Maintain reporting, financing/guarantee and take-back arrangements that apply after registration"],
    ongoingObligations: ["Quantity reporting and notifications", "B2C guarantee and take-back duties where applicable", "Keeping registration data and marketplace evidence current"],
    importantLimitations: ["Registration is not disposal or recycling service", "Equipment classification and guarantee requirements differ", "No approval or registration outcome is promised"],
    commonMistakes: ["Assuming one registration covers the EU", "Using a supplier's number without checking brand/equipment coverage", "Treating registration evidence as product certification"],
  },
  "battery-battg-registration": {
    scope: "Assessment and coordination under Regulation (EU) 2023/1542 and Germany's BattDG for batteries and products containing batteries.",
    whoMayNotNeedIt: "The producer-responsibility path depends on who first makes the battery available in Germany, establishment, supply chain and battery category. Existing registrations require transition review.",
    legalBasis: "Regulation (EU) 2023/1542 and the German BattDG. Most of the former BattG was repealed on 7 October 2025.", authority: "stiftung ear administers German battery registration functions under the current framework.",
    whatGlobalflowaDoes: ["Classifies the use case against current battery categories", "Coordinates registration and producer-responsibility-organisation evidence", "Identifies labelling, documentation and transition questions for specialist review"],
    customerResponsibilities: ["Provide chemistry, category, weight, model and supply-chain data", "Arrange applicable producer-responsibility, take-back and reporting duties", "Check product-specific safety, transport and labelling rules"],
    ongoingObligations: ["Producer-responsibility organisation and reporting duties where applicable", "Take-back and information duties", "Obligation-specific labelling and documentation dates"],
    importantLimitations: ["Not all obligations began on the same date", "Battery passport rules from 18 February 2027 cover LMT batteries, EV batteries and industrial batteries over 2 kWh—not every battery", "Legacy BattG terminology may require transition analysis"],
    commonMistakes: ["Using only the old portable/industrial/automotive categories", "Assuming every battery needs a passport", "Treating registration as the whole compliance assessment"],
  },
  "packaging-verpackg-lucid": {
    scope: "Assessment and coordination of LUCID registration, system participation and data reporting for packaging placed on the German market.",
    whoMayNotNeedIt: "System participation does not apply identically to every packaging type. Reusable, transport, service and other packaging categories require classification under the VerpackG facts.",
    legalBasis: "Germany's VerpackG as reviewed on 12 July 2026. Regulation (EU) 2025/40 is in force and generally begins applying on 12 August 2026, so the position must be reassessed before that date.", authority: "Zentrale Stelle Verpackungsregister (ZSVR) operates the LUCID Packaging Register.",
    whatGlobalflowaDoes: ["Reviews producer role and packaging types", "Coordinates LUCID and system-participation information", "Organises evidence for marketplace checks"],
    customerResponsibilities: ["Register personally in LUCID where the law makes this non-transferable", "Conclude system participation for relevant packaging", "Report consistent material and mass data to the system and LUCID"],
    ongoingObligations: ["Keep registration data current", "System participation and volume reporting where applicable", "Retain reliable packaging calculations"],
    importantLimitations: ["LUCID registration alone does not complete VerpackG compliance", "Not every packaging type has identical system-participation duties", "A service provider cannot assume every non-transferable producer responsibility", "The incoming PPWR requires a fresh case review before its general application on 12 August 2026"],
    commonMistakes: ["Confusing registration with system participation", "Omitting shipment packaging", "Using unsupported volume estimates"],
  },
  "gpsr-eu-responsible-person": {
    scope: "Product-scope and economic-operator assessment, document gap review, and responsible-person or authorised-representative support where legally and contractually applicable.",
    whoMayNotNeedIt: "GPSR has exclusions and interacts with product-specific Union harmonisation legislation. The responsible economic operator may already be an EU manufacturer or importer; an authorised representative is not interchangeable with an importer.",
    legalBasis: "Regulation (EU) 2023/988, Regulation (EU) 2019/1020 where applicable, and the product-specific EU legislation identified for the product.", authority: "Market-surveillance authorities enforce the applicable rules; Globalflowa is not a certification or approval authority.",
    whatGlobalflowaDoes: ["Reviews product identity, labels, instructions and available technical documentation", "Identifies gaps and applicable product-law questions", "Supports written mandates, document handling and authority communication where the role is legally available"],
    customerResponsibilities: ["Ensure the product is safe and compliant with all applicable product-specific rules", "Maintain accurate risk assessment and technical documentation where required", "Ensure product, packaging and online-offer information is consistent"],
    ongoingObligations: ["Cooperate on safety incidents, corrective action and recalls", "Keep traceability and contact information current", "Maintain documents for the periods required by applicable law"],
    importantLimitations: ["A responsible-person address does not make an unsafe or undocumented product compliant", "CE marking and a Declaration of Conformity are not required for every consumer product", "A service agreement does not transfer every manufacturer duty"],
    commonMistakes: ["Assuming every non-EU seller has the same GPSR route", "Treating importer and authorised representative as synonyms", "Using GPSR instead of checking product-specific legislation"],
  },
  "vat-registration-germany": {
    scope: "Fact-finding and coordination for possible German VAT registration and the related filing workflow.", whoMayNotNeedIt: "Selling to Germany does not automatically create the same registration outcome for every business. Stock location, transaction chain, customer type, imports and applicable OSS/IOSS or other schemes matter.", legalBasis: "Directive 2006/112/EC and Germany's UStG.", authority: "The competent German tax authority depends on the business and procedure; BZSt operates specified central procedures.",
    whatGlobalflowaDoes: ["Collects transaction and fulfilment facts", "Coordinates registration and filing intake with qualified tax professionals where needed", "Organises marketplace and transaction records"], customerResponsibilities: ["Provide complete transaction-chain and stock-location facts", "Obtain qualified tax advice for individual treatment", "File accurate returns and pay tax by applicable deadlines"], ongoingObligations: ["Returns and record keeping after registration", "Monitoring stock, channels and transaction changes", "Reconciling marketplace and accounting data"], importantLimitations: ["This is not individual tax advice", "Registration and ongoing filings are separate", "No universal VAT trigger is stated"], commonMistakes: ["Assuming all German sales require the same registration", "Ignoring stock movements", "Registering without a filing and bookkeeping plan"],
  },
  "company-formation-germany": {
    scope: "Formation-project coordination for a potential German GmbH or UG, including checklist, address, notary, register and tax-workflow coordination.", whoMayNotNeedIt: "A German entity may not be the appropriate structure for every seller. Entity choice requires individual legal and tax assessment.", legalBasis: "Germany's GmbHG and applicable register, notarial, trade and tax rules.", authority: "Notaries, courts/register authorities and other competent bodies make the formal decisions.",
    whatGlobalflowaDoes: ["Coordinates intake and formation steps", "Organises communication with notarial, legal, tax and banking professionals", "Tracks documents and next actions"], customerResponsibilities: ["Select the entity and governance structure with qualified advisers", "Attend or complete legally valid notarial steps", "Provide source-of-funds, identity and beneficial-owner information requested by professionals"], ongoingObligations: ["Corporate, register, accounting and tax compliance after formation", "Maintaining a valid business address and corporate records"], importantLimitations: ["Globalflowa does not provide notarial services or promise registration", "Formation is not universally fully online", "Capital, management, banking and residence questions are fact-specific"], commonMistakes: ["Choosing an entity from a generic capital figure alone", "Assuming an address solves substance or tax questions", "Planning sales before banking, tax and operational readiness"],
  },
};

function defaultContent(service: Service): ServiceContent {
  const regulated = service.category !== "warehouse";
  const marketplace = service.category === "marketplace" || service.slug.includes("marketplace");
  return {
    regulated,
    scope: service.shortDescription,
    whoMayNotNeedIt: regulated ? "Applicability depends on the product, business model, supply chain and sales route. An individual assessment may show a different service or professional is needed." : "The service may not fit restricted goods, unsupported handling needs or volumes outside the confirmed operating scope.",
    legalBasis: regulated ? "The applicable official sources are listed below; product-specific legislation and the facts must be checked before relying on a general summary." : "Operational service; legal sources apply only where a regulatory claim is made.",
    authority: regulated ? "The relevant authority, register, tax office, marketplace or qualified professional makes the final decision." : "Carrier and marketplace acceptance remain subject to their current rules.",
    whatGlobalflowaDoes: marketplace ? ["Reviews the current seller notice and requested evidence", "Organises documents and submission steps", "Tracks the case and identifies gaps"] : ["Reviews the intake and available documents", "Identifies missing information and coordinates next steps", "Organises the requested operational support"],
    customerResponsibilities: service.category === "warehouse" ? ["Provide accurate labels, instructions, dimensions, weights and handling requirements", "Disclose batteries, dangerous goods, food, cosmetics and restricted products for acceptance review", "Confirm carrier and marketplace requirements"] : ["Provide complete and accurate facts and documents", "Confirm product-specific legal and professional advice where needed", "Remain responsible for the product, business and submissions"],
    ongoingObligations: regulated ? ["Monitor changes to products, supply chains, sales routes and official requirements", "Keep registrations, documents and marketplace information current"] : ["Keep instructions, labels and shipment data current"],
    importantLimitations: service.category === "warehouse" ? ["Pricing depends on volume, dimensions, weight, handling and duration", "Operational inspection is not laboratory testing or product certification", "Packing or relabelling does not make a non-compliant product compliant"] : marketplace ? ["Marketplace requests are contractual/policy requirements, not legislation", "Globalflowa cannot promise document acceptance, listing reinstatement or account outcomes", "The marketplace makes the final account or listing decision"] : ["Document review is not certification or an authority decision", "Requirements can change and depend on the product and facts", "No outcome or approval is guaranteed"],
    commonMistakes: service.category === "warehouse" ? ["Sending stock before acceptance review", "Providing incomplete labels or instructions", "Treating visual inspection as conformity testing"] : ["Treating a checklist as a universal legal conclusion", "Submitting documents with inconsistent product identity", "Assuming a service provider takes over every legal duty"],
    sourceIds: sourceIdsBySlug[service.slug] ?? [], lastReviewed: "2026-07-12", requiresIndividualAssessment: regulated, disclaimer: regulated ? legalDisclaimer : warehouseDisclaimer,
  };
}

export function getServiceContent(service: Service): ServiceContent { return { ...defaultContent(service), ...special[service.slug] }; }

export function validateServiceContent() {
  const errors: string[] = [];
  const sourceIds = new Set<string>();
  const sourceUrls = new Set<string>();
  for (const source of contentSources) {
    if (sourceIds.has(source.id)) errors.push(`Duplicate source ID: ${source.id}`);
    if (!source.url.startsWith("https://")) errors.push(`Source URL must use HTTPS: ${source.id}`);
    sourceIds.add(source.id); sourceUrls.add(source.url);
  }
  const slugs = new Set<string>();
  const prohibited = /guaranteed compliance|instant registration|certified by globalflowa|official eu certificate|guaranteed amazon reinstatement|100% approval/i;
  const fixedProcessingTime = /\b\d+\s+(business\s+)?(days?|weeks?|months?)\b/i;
  const fixedGovernmentFee = /(?:€|EUR\s*)\d|\d[\d.,]*\s*(?:€|EUR)\b/i;
  for (const service of services) {
    if (slugs.has(service.slug)) errors.push(`Duplicate service slug: ${service.slug}`);
    slugs.add(service.slug);
    const content = getServiceContent(service);
    if (content.regulated && !content.sourceIds.length) errors.push(`Regulated service has no sources: ${service.slug}`);
    if (content.regulated && !content.lastReviewed) errors.push(`Regulated service has no review date: ${service.slug}`);
    for (const id of content.sourceIds) if (!sourceIds.has(id)) errors.push(`Unknown source ${id} on ${service.slug}`);
    for (const [key, value] of Object.entries(content)) if (Array.isArray(value) && ["whatGlobalflowaDoes", "customerResponsibilities", "importantLimitations"].includes(key) && !value.length) errors.push(`Empty required section ${key}: ${service.slug}`);
    const serialized = JSON.stringify({ service, content });
    if (prohibited.test(serialized)) errors.push(`Prohibited phrase: ${service.slug}`);
    if (fixedProcessingTime.test(serialized)) errors.push(`Unsupported fixed processing-time claim: ${service.slug}`);
    if (fixedGovernmentFee.test(serialized)) errors.push(`Unsupported fixed government-fee claim: ${service.slug}`);
  }
  if (errors.length) throw new Error(`Service content validation failed:\n${errors.join("\n")}`);
  return { services: services.length, regulated: services.filter((service) => getServiceContent(service).regulated).length, sources: sourceIds.size, sourceUrls: sourceUrls.size };
}

validateServiceContent();
