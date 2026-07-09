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
  { key: "needs_responsible_person", label: "Do you need an EU Responsible Person?", type: "yes_no" },
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

  if (answers.wants_german_company === true || answers.has_german_company === false) {
    add("company-formation-germany", "You may need a German legal presence or formation path before selling at scale.");
  }

  if (answers.has_german_vat === false || answers.sells_physical_products === true) {
    add("vat-registration-germany", "Physical product sales or German stock can trigger German VAT review.");
  }

  if (answers.packaged_products === true && answers.has_lucid !== true) {
    add("packaging-verpackg-lucid", "Packaged products sold to German customers commonly require VerpackG / LUCID readiness.");
  }

  if (answers.contains_electronics === true && answers.has_weee !== true) {
    add("weee-elektrog-registration", "Electrical and electronic products commonly need WEEE / ElektroG registration evidence.");
  }

  if (answers.contains_batteries === true && answers.has_battery_registration !== true) {
    add("battery-battg-registration", "Products containing or shipping with batteries may need BattG registration support.");
  }

  if (answers.needs_responsible_person === true) {
    add("gpsr-eu-responsible-person", "Non-EU sellers may need an EU Responsible Person and GPSR document review.");
  }

  if (answers.needs_storage === true) {
    add("warehouse-storage-germany", "You indicated that stock storage in Germany is needed.");
  }

  if (answers.needs_preparation === true) {
    add("relabeling-umlabeln", "Packing, repacking, relabeling, or barcode work should be reviewed before stock moves to marketplaces.");
  }

  const marketplaces = Array.isArray(answers.marketplaces) ? answers.marketplaces : [];
  if (answers.urgent_case === true || marketplaces.length > 0) {
    const primaryMarketplace = marketplaces[0];
    const serviceMap: Record<string, string> = {
      Amazon: "amazon-compliance-support",
      Temu: "temu-compliance-support",
      AliExpress: "aliexpress-support",
      eBay: "ebay-support",
      Shopify: "shopify-support",
    };

    add(
      serviceMap[primaryMarketplace] ?? "marketplace-compliance-support",
      answers.urgent_case === true
        ? "An urgent marketplace or authority case should be triaged with documents and deadline details."
        : "Marketplace sales usually require a readiness check for seller, VAT, product, and compliance documents.",
    );
  }

  if (recommendations.length === 0) {
    add("product-compliance-review", "Based on your answers, a general product compliance review is the safest first step.");
  }

  return recommendations;
}
