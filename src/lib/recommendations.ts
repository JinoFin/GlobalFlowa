import { getServiceBySlug } from "@/lib/catalog";

export type CheckerAnswerValue = string | string[] | boolean | null;
export type CheckerAnswers = Record<string, CheckerAnswerValue>;

export type CheckerQuestion = {
  key: string;
  label: string;
  type: "text" | "yes_no" | "select" | "multiselect";
  options?: string[];
};

export type Recommendation = {
  serviceSlug: string;
  reason: string;
  requiredDocuments: string[];
};

export const checkerQuestions: CheckerQuestion[] = [
  { key: "company_location", label: "Where is your company located?", type: "text" },
  { key: "has_german_company", label: "Do you already have a German company?", type: "yes_no" },
  { key: "wants_german_company", label: "Do you want to open a German company?", type: "yes_no" },
  { key: "has_german_vat", label: "Do you already have a German VAT number?", type: "yes_no" },
  { key: "sells_physical_products", label: "Do you sell physical products in Germany?", type: "yes_no" },
  {
    key: "marketplaces",
    label: "Which marketplaces do you use?",
    type: "multiselect",
    options: ["Amazon", "Temu", "AliExpress", "eBay", "Shopify", "Other"],
  },
  { key: "product_categories", label: "What product categories do you sell?", type: "text" },
  { key: "contains_electronics", label: "Do your products contain electronics?", type: "yes_no" },
  { key: "contains_batteries", label: "Do your products contain batteries?", type: "yes_no" },
  { key: "packaged_products", label: "Do you sell packaged products?", type: "yes_no" },
  { key: "needs_responsible_person", label: "Have you been asked to identify an EU responsible economic operator?", type: "yes_no" },
  { key: "has_weee", label: "Do you already have WEEE registration?", type: "yes_no" },
  { key: "has_battery_registration", label: "Do you already have Battery registration?", type: "yes_no" },
  { key: "has_lucid", label: "Do you already have LUCID / Packaging registration?", type: "yes_no" },
  { key: "needs_storage", label: "Do you need storage in Germany?", type: "yes_no" },
  { key: "needs_preparation", label: "Do you need packing, repacking, relabeling, or barcode labeling?", type: "yes_no" },
  { key: "urgent_case", label: "Do you have an urgent marketplace or authority case?", type: "yes_no" },
];

export function getRecommendations(answers: CheckerAnswers): Recommendation[] {
  const recommendations: Recommendation[] = [];
  const add = (serviceSlug: string, reason: string) => {
    if (recommendations.some((item) => item.serviceSlug === serviceSlug)) {
      return;
    }

    const service = getServiceBySlug(serviceSlug);
    recommendations.push({
      serviceSlug,
      reason,
      requiredDocuments: service?.requiredDocuments ?? [],
    });
  };

  const companyLocation = String(answers.company_location ?? "");
  const isLikelyOutsideEu = isOutsideEu(companyLocation);
  const marketplaces = Array.isArray(answers.marketplaces) ? answers.marketplaces : [];
  const sellsPhysicalProducts = answers.sells_physical_products === true;
  const usesMarketplace = marketplaces.length > 0;

  if (answers.wants_german_company === true) {
    add("company-formation-germany", "You said you want to open a German company, so formation, address, VAT, and bookkeeping planning should be reviewed together.");
  }

  if (answers.has_german_company === false && answers.wants_german_company !== true && sellsPhysicalProducts) {
    add("marketplace-seller-setup", "You do not have a German company yet, so seller setup should be checked before deciding whether formation is necessary.");
  }

  if (answers.has_german_vat === false && (sellsPhysicalProducts || usesMarketplace || answers.needs_storage === true)) {
    add("vat-registration-germany", "German VAT should be reviewed because you sell physical products, use marketplaces, or may hold stock in Germany.");
  }

  if (answers.packaged_products === true && answers.has_lucid !== true) {
    add("packaging-verpackg-lucid", "Packaged products sold to German customers commonly require both LUCID registration and system participation evidence.");
  }

  if (answers.contains_electronics === true && answers.has_weee !== true) {
    add("weee-elektrog-registration", "Electrical and electronic products commonly need WEEE / ElektroG classification, brand, and registration evidence.");
  }

  if (answers.contains_batteries === true && answers.has_battery_registration !== true) {
    add("battery-battg-registration", "Products containing, shipping with, or separately selling batteries need assessment under the EU Batteries Regulation and Germany's BattDG.");
  }

  if (answers.needs_responsible_person === true || (isLikelyOutsideEu && sellsPhysicalProducts)) {
    add(
      "gpsr-eu-responsible-person",
      isLikelyOutsideEu
        ? "A non-EU seller placing consumer products in Germany should review product scope, product-specific law and the applicable EU economic-operator route."
        : "You indicated an economic-operator request, so the product scope, roles and documents should be checked.",
    );
  }

  if (answers.needs_storage === true) {
    add("warehouse-storage-germany", "You indicated that German stock storage is needed, so carton, pallet, dimension, and handling details should be collected.");
  }

  if (answers.needs_preparation === true) {
    add("relabeling-umlabeln", "Packing, repacking, relabeling, or barcode work should be reviewed before stock moves to marketplaces.");
  }

  if (answers.urgent_case === true) {
    add("authority-case-support", "An urgent marketplace or authority case should be triaged with notices, deadlines, and requested documents.");
  }

  for (const marketplace of marketplaces.slice(0, 2)) {
    const serviceMap: Record<string, string> = {
      Amazon: "amazon-compliance-support",
      Temu: "temu-compliance-support",
      AliExpress: "aliexpress-support",
      eBay: "ebay-support",
      Shopify: "shopify-support",
    };

    add(
      serviceMap[marketplace] ?? "marketplace-compliance-support",
      `${marketplace} sales usually require a readiness check for seller, VAT, product, and compliance documents.`,
    );
  }

  if (recommendations.length === 0) {
    add("product-compliance-review", "Based on your answers, a general product compliance review is the safest first step.");
  }

  return recommendations;
}

function isOutsideEu(location: string) {
  const normalized = location.trim().toLowerCase();
  if (!normalized) return false;

  const euSignals = [
    "germany",
    "deutschland",
    "france",
    "italy",
    "spain",
    "netherlands",
    "poland",
    "belgium",
    "austria",
    "sweden",
    "denmark",
    "ireland",
    "portugal",
    "finland",
    "czech",
    "romania",
    "hungary",
    "eu",
    "european union",
  ];

  return !euSignals.some((signal) => normalized.includes(signal));
}
