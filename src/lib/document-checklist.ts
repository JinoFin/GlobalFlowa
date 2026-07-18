import type { RequestPayload } from "@/lib/validation";

export const checklistStatuses = [
  "required",
  "uploaded",
  "under_review",
  "accepted",
  "missing",
  "incorrect",
  "expired",
  "not_applicable",
] as const;

export type ChecklistStatus = (typeof checklistStatuses)[number];

export const checklistCategories = [
  "Company Documents",
  "Product Documents",
  "Compliance Documents",
  "Marketplace Documents",
  "Warehouse Documents",
  "Tax / VAT Documents",
  "Other",
] as const;

export type ChecklistCategory = (typeof checklistCategories)[number];

export type ChecklistSignal =
  | "company_formation"
  | "vat"
  | "electronics"
  | "battery"
  | "marketplace"
  | "urgent_case"
  | "warehouse"
  | "relabeling";

export type ChecklistRule = {
  includeWhen?: ChecklistSignal[];
  requiredWhen?: ChecklistSignal[];
};

export type DocumentTemplate = {
  id?: string | null;
  service_slug: string;
  title: string;
  description: string;
  document_key: string;
  category: ChecklistCategory;
  required_by_default: boolean;
  conditional_rule?: ChecklistRule | null;
  accepted_file_types?: string[] | null;
  example_description?: string | null;
  sort_order: number;
  is_active?: boolean;
};

export type UploadedFileSummary = {
  id?: string;
  field: string;
  name: string;
  path?: string;
};

export type GeneratedChecklistItem = {
  document_template_id: string | null;
  document_key: string;
  title: string;
  description: string;
  category: ChecklistCategory;
  status: ChecklistStatus;
  admin_note: string | null;
  customer_note: string | null;
  linked_file_id: string | null;
  required: boolean;
  sort_order: number;
  source_service_slugs: string[];
};

type GenerateChecklistOptions = {
  selectedServices: string[];
  payload: RequestPayload;
  templates: DocumentTemplate[];
  uploadedFiles?: UploadedFileSummary[];
};

const selectedServiceGroups: Record<ChecklistSignal, string[]> = {
  company_formation: ["company-formation-germany", "german-business-address"],
  vat: ["vat-registration-germany", "bookkeeping-tax-coordination"],
  electronics: ["weee-elektrog-registration", "product-compliance-review", "declaration-of-conformity-review", "test-report-review"],
  battery: ["battery-battg-registration"],
  marketplace: [
    "marketplace-seller-setup",
    "marketplace-compliance-support",
    "authority-case-support",
    "amazon-compliance-support",
    "temu-compliance-support",
    "aliexpress-support",
    "ebay-support",
    "shopify-support",
    "product-listing-document-support",
    "marketplace-suspension-support",
  ],
  urgent_case: ["authority-case-support", "marketplace-suspension-support"],
  warehouse: [
    "warehouse-storage-germany",
    "packing-service",
    "repacking-umverpackung",
    "product-inspection",
    "return-handling",
    "shipment-preparation",
  ],
  relabeling: ["relabeling-umlabeln", "barcode-fnsku-labeling"],
};

const fileAliases: Record<string, string[]> = {
  business_registration: ["business_license", "company_registration", "other_files"],
  founder_id: ["founder_id", "passport", "other_files"],
  founder_address: ["proof_of_address", "address", "other_files"],
  product_photos: ["product_photos", "product_photo"],
  label_photos: ["label_photos", "current_label_photos"],
  user_manual: ["manual_upload", "manual"],
  test_reports: ["test_reports", "test_report"],
  declaration_of_conformity: ["declaration_of_conformity", "doc"],
  risk_assessment: ["risk_assessment", "other_files"],
  marketplace_notice: ["marketplace_notice", "screenshots", "notice", "other_files"],
  label_file: ["label_file", "barcode_file", "fnsku", "other_files"],
  packing_list: ["packing_list", "carton_list", "other_files"],
  shipping_marks: ["shipping_marks", "other_files"],
};

export function generateDocumentChecklist({
  selectedServices,
  payload,
  templates,
  uploadedFiles = [],
}: GenerateChecklistOptions) {
  const signalSet = detectSignals(selectedServices, payload);
  const activeSelectedTemplates = templates
    .filter((template) => template.is_active !== false)
    .filter((template) => selectedServices.includes(template.service_slug));
  const byDocumentKey = new Map<string, GeneratedChecklistItem>();

  for (const template of activeSelectedTemplates) {
    const include = shouldIncludeTemplate(template, signalSet);
    if (!include) continue;

    const required = isTemplateRequired(template, signalSet);
    const linkedFile = findLinkedFile(template.document_key, uploadedFiles);
    const existing = byDocumentKey.get(template.document_key);

    if (existing) {
      existing.required = existing.required || required;
      existing.sort_order = Math.min(existing.sort_order, template.sort_order);
      existing.linked_file_id = existing.linked_file_id ?? linkedFile?.id ?? null;
      existing.status = existing.linked_file_id ? "uploaded" : existing.status;
      existing.source_service_slugs = Array.from(
        new Set([...existing.source_service_slugs, template.service_slug]),
      );
      continue;
    }

    byDocumentKey.set(template.document_key, {
      document_template_id: template.id ?? null,
      document_key: template.document_key,
      title: template.title,
      description: template.description,
      category: template.category,
      status: linkedFile ? "uploaded" : "required",
      admin_note: null,
      customer_note: template.example_description ?? null,
      linked_file_id: linkedFile?.id ?? null,
      required,
      sort_order: template.sort_order,
      source_service_slugs: [template.service_slug],
    });
  }

  return Array.from(byDocumentKey.values()).sort((a, b) => {
    if (a.required !== b.required) return a.required ? -1 : 1;
    if (a.category !== b.category) return a.category.localeCompare(b.category);
    return a.sort_order - b.sort_order;
  });
}

export function getDefaultDocumentTemplatesForServices(selectedServices: string[]) {
  return defaultDocumentTemplates.filter((template) =>
    selectedServices.includes(template.service_slug),
  );
}

export function groupChecklistByCategory(items: GeneratedChecklistItem[]) {
  return checklistCategories
    .map((category) => ({
      category,
      items: items.filter((item) => item.category === category),
    }))
    .filter((group) => group.items.length > 0);
}

function shouldIncludeTemplate(template: DocumentTemplate, signalSet: Set<ChecklistSignal>) {
  const includeWhen = template.conditional_rule?.includeWhen;
  if (!includeWhen?.length) return true;
  return includeWhen.some((signal) => signalSet.has(signal));
}

function isTemplateRequired(template: DocumentTemplate, signalSet: Set<ChecklistSignal>) {
  if (template.required_by_default) return true;
  const requiredWhen = template.conditional_rule?.requiredWhen;
  return Boolean(requiredWhen?.some((signal) => signalSet.has(signal)));
}

function detectSignals(selectedServices: string[], payload: RequestPayload) {
  const signals = new Set<ChecklistSignal>();
  const selected = new Set(selectedServices);
  const answerText = serializeAnswers(payload).toLowerCase();

  for (const signal of Object.keys(selectedServiceGroups) as ChecklistSignal[]) {
    if (selectedServiceGroups[signal].some((slug) => selected.has(slug))) {
      signals.add(signal);
    }
  }

  if (containsAny(answerText, ["electronic", "electrical", "led", "lamp", "charger", "device"])) {
    signals.add("electronics");
  }

  if (containsAny(answerText, ["battery", "batteries", "rechargeable", "lithium"]) || answerText.includes("battery_included yes")) {
    signals.add("battery");
  }

  if (containsAny(answerText, ["amazon", "temu", "aliexpress", "ebay", "shopify", "asin", "sku", "case id"])) {
    signals.add("marketplace");
  }

  if (containsAny(answerText, ["urgent", "authority deadline", "marketplace case", "case deadline"])) {
    signals.add("urgent_case");
  }

  if (
    answerText.includes("relabeling_needed yes") ||
    answerText.includes("repacking_needed yes") ||
    answerText.includes("packing_needed yes") ||
    containsAny(answerText, ["fnsku", "barcode", "label file"])
  ) {
    signals.add("relabeling");
  }

  if (answerText.includes("vat_registration yes") || answerText.includes("need_german_vat yes")) {
    signals.add("vat");
  }

  return signals;
}

function serializeAnswers(payload: RequestPayload) {
  const serviceAnswers = Object.entries(payload.serviceAnswers)
    .flatMap(([serviceSlug, answers]) =>
      Object.entries(answers).map(([key, value]) => `${serviceSlug} ${key} ${stringifyAnswer(value)}`),
    )
    .join(" ");

  return [
    Object.entries(payload.customer).map(([key, value]) => `${key} ${stringifyAnswer(value)}`).join(" "),
    Object.entries(payload.product).map(([key, value]) => `${key} ${stringifyAnswer(value)}`).join(" "),
    serviceAnswers,
  ].join(" ");
}

function stringifyAnswer(value: unknown) {
  if (Array.isArray(value)) return value.join(" ");
  return String(value ?? "");
}

function containsAny(value: string, needles: string[]) {
  return needles.some((needle) => value.includes(needle));
}

function findLinkedFile(documentKey: string, files: UploadedFileSummary[]) {
  const aliases = fileAliases[documentKey] ?? [documentKey];
  return files.find((file) => {
    const haystack = `${file.field} ${file.name}`.toLowerCase();
    return aliases.some((alias) => haystack.includes(alias.toLowerCase()));
  });
}

function template(
  serviceSlug: string,
  documentKey: string,
  title: string,
  category: ChecklistCategory,
  description: string,
  sortOrder: number,
  options: Partial<DocumentTemplate> = {},
): DocumentTemplate {
  return {
    service_slug: serviceSlug,
    document_key: documentKey,
    title,
    category,
    description,
    sort_order: sortOrder,
    required_by_default: options.required_by_default ?? true,
    conditional_rule: options.conditional_rule ?? null,
    accepted_file_types: options.accepted_file_types ?? null,
    example_description: options.example_description ?? null,
    is_active: options.is_active ?? true,
  };
}

const companyFormationTemplates = (serviceSlug: string) => [
  template(serviceSlug, "founder_id", "Founder passport / ID", "Company Documents", "Passport or national ID for each founder or managing director.", 10),
  template(serviceSlug, "founder_address", "Founder address", "Company Documents", "Current residential address or proof of address for founder identity checks.", 20),
  template(serviceSlug, "desired_company_name", "Desired company name", "Company Documents", "Preferred German company name options for availability review.", 30),
  template(serviceSlug, "business_activity", "Business activity description", "Company Documents", "Clear description of the planned German business activity.", 40),
  template(serviceSlug, "shareholder_details", "Shareholder details", "Company Documents", "Names, nationalities, ownership percentages, and roles of shareholders.", 50),
  template(serviceSlug, "german_business_address", "German business address requirement", "Company Documents", "Information about whether a German address is needed for setup or correspondence.", 60, { required_by_default: false, conditional_rule: { requiredWhen: ["company_formation"] } }),
  template(serviceSlug, "vat_registration_info", "VAT registration information", "Tax / VAT Documents", "VAT need, sales channels, and expected launch date for tax coordination.", 70, { required_by_default: false, conditional_rule: { requiredWhen: ["vat"] } }),
  template(serviceSlug, "power_of_attorney", "Power of attorney if applicable", "Company Documents", "Authorization document if Globalflowa or partners coordinate steps on your behalf.", 80, { required_by_default: false }),
];

const vatTemplates = (serviceSlug: string) => [
  template(serviceSlug, "business_registration", "Company registration document", "Company Documents", "Official company registration, business license, or equivalent document.", 10),
  template(serviceSlug, "founder_id", "Founder/director ID", "Company Documents", "Passport or ID of the founder, director, or responsible representative.", 20),
  template(serviceSlug, "existing_vat_tax_number", "Existing VAT/tax number if available", "Tax / VAT Documents", "Existing local VAT, tax, or company tax number.", 30, { required_by_default: false }),
  template(serviceSlug, "marketplace_seller_info", "Marketplace seller account information", "Marketplace Documents", "Seller account country, store links, and marketplace account details.", 40, { required_by_default: false, conditional_rule: { requiredWhen: ["marketplace"] } }),
  template(serviceSlug, "sales_estimate", "Sales estimate", "Tax / VAT Documents", "Estimated monthly and yearly sales volumes for Germany.", 50),
  template(serviceSlug, "bookkeeping_records", "Bookkeeping records if applicable", "Tax / VAT Documents", "Existing transaction reports, bookkeeping exports, or tax advisor information.", 60, { required_by_default: false }),
];

const weeeTemplates = (serviceSlug: string) => [
  template(serviceSlug, "business_registration", "Business license / company registration", "Company Documents", "Company registration evidence for producer or seller identity.", 10),
  template(serviceSlug, "brand_list", "Brand name list", "Compliance Documents", "Brand names used on electrical or electronic products sold in Germany.", 20),
  template(serviceSlug, "product_photos", "Product photos", "Product Documents", "Clear product photos showing the product and key components.", 30),
  template(serviceSlug, "label_photos", "Product label photos", "Product Documents", "Photos of product labels, rating plates, packaging labels, and brand markings.", 40),
  template(serviceSlug, "user_manual", "User manual", "Product Documents", "User manual or instruction sheet provided with the product.", 50),
  template(serviceSlug, "technical_description", "Technical product description", "Product Documents", "Short technical description, device type, power source, and use case.", 60),
  template(serviceSlug, "yearly_quantity", "Estimated yearly quantity", "Compliance Documents", "Expected annual quantity placed on the German market.", 70),
  template(serviceSlug, "existing_weee_number", "Existing WEEE number if available", "Compliance Documents", "Existing WEEE registration number or evidence, if already registered.", 80, { required_by_default: false }),
  template(serviceSlug, "battery_info", "Battery information if product contains battery", "Compliance Documents", "Battery type, chemistry, weight, and whether it is built in or separate.", 90, { required_by_default: false, conditional_rule: { includeWhen: ["battery"], requiredWhen: ["battery"] } }),
];

const batteryTemplates = (serviceSlug: string) => [
  template(serviceSlug, "business_registration", "Business license / company registration", "Company Documents", "Company registration evidence for producer or seller identity.", 10),
  template(serviceSlug, "battery_type", "Battery type information", "Compliance Documents", "Battery type, installation method, and whether batteries are built in or separate.", 20),
  template(serviceSlug, "battery_chemistry", "Battery chemistry information", "Compliance Documents", "Chemistry such as lithium-ion, alkaline, NiMH, or another type.", 30),
  template(serviceSlug, "battery_weight", "Battery weight per unit", "Compliance Documents", "Battery weight per unit or per product set.", 40),
  template(serviceSlug, "product_photos", "Product photos", "Product Documents", "Product photos showing the battery-powered item or battery packaging.", 50),
  template(serviceSlug, "label_photos", "Product label photos", "Product Documents", "Battery or product label photos showing markings and warnings.", 60),
  template(serviceSlug, "battery_quantity", "Estimated yearly battery quantity", "Compliance Documents", "Expected yearly battery quantity placed on the German market.", 70),
  template(serviceSlug, "existing_battery_registration", "Existing battery registration if available", "Compliance Documents", "Existing battery registration or transition evidence under the BattDG framework, if already registered.", 80, { required_by_default: false }),
];

const packagingTemplates = (serviceSlug: string) => [
  template(serviceSlug, "business_registration", "Business license / company registration", "Company Documents", "Company registration evidence for LUCID and system participation intake.", 10),
  template(serviceSlug, "packaging_material", "Packaging material information", "Compliance Documents", "Packaging materials such as paper, cardboard, plastic, glass, or metal.", 20),
  template(serviceSlug, "packaging_quantity", "Packaging quantity estimate", "Compliance Documents", "Estimated yearly packaging quantities by material.", 30),
  template(serviceSlug, "existing_lucid_number", "Existing LUCID number if available", "Compliance Documents", "Existing LUCID registration number or evidence, if already registered.", 40, { required_by_default: false }),
  template(serviceSlug, "system_participation_contract", "Existing system participation contract if available", "Compliance Documents", "Existing system participation contract or certificate, if already arranged.", 50, { required_by_default: false }),
  template(serviceSlug, "marketplace_seller_info", "Marketplace seller information", "Marketplace Documents", "Marketplace names, seller account country, and listing/store links.", 60, { required_by_default: false, conditional_rule: { requiredWhen: ["marketplace"] } }),
];

const gpsrTemplates = (serviceSlug: string) => [
  template(serviceSlug, "business_registration", "Business license / manufacturer information", "Company Documents", "Company or manufacturer identity information for document review.", 10),
  template(serviceSlug, "product_photos", "Product photos", "Product Documents", "Clear product photos from relevant angles.", 20),
  template(serviceSlug, "label_photos", "Product label photos", "Product Documents", "Label and packaging photos showing safety, traceability, importer, and manufacturer details.", 30),
  template(serviceSlug, "declaration_of_conformity", "Declaration of Conformity if applicable", "Compliance Documents", "Declaration of Conformity for products where EU harmonization rules apply.", 40, { required_by_default: false, conditional_rule: { requiredWhen: ["electronics"] } }),
  template(serviceSlug, "test_reports", "Test reports", "Compliance Documents", "Relevant test reports matching the product model; reports are evidence, not automatic certification.", 50, { required_by_default: false, conditional_rule: { requiredWhen: ["electronics"] } }),
  template(serviceSlug, "user_manual", "User manual", "Product Documents", "User manual, safety instructions, and language versions currently available.", 60),
  template(serviceSlug, "risk_assessment", "Risk assessment if available", "Compliance Documents", "Risk assessment, safety file, or product safety analysis if available.", 70, { required_by_default: false }),
  template(serviceSlug, "manufacturer_address", "Manufacturer address", "Company Documents", "Full manufacturer name and address.", 80),
  template(serviceSlug, "product_category", "Product category information", "Product Documents", "Product category, intended use, and target customer group.", 90),
  template(serviceSlug, "marketplace_link", "Marketplace link", "Marketplace Documents", "Marketplace product link, ASIN, SKU, or listing URL.", 100, { required_by_default: false, conditional_rule: { requiredWhen: ["marketplace"] } }),
  template(serviceSlug, "marketplace_notice", "Authority/marketplace notice if urgent case", "Marketplace Documents", "Screenshots, emails, or notices showing the request and deadline.", 110, { required_by_default: false, conditional_rule: { includeWhen: ["urgent_case"], requiredWhen: ["urgent_case"] } }),
];

const warehouseTemplates = (serviceSlug: string) => [
  template(serviceSlug, "product_list", "Product list", "Warehouse Documents", "List of products, SKUs, and quantities included in the inbound stock.", 10),
  template(serviceSlug, "packing_list", "Carton list", "Warehouse Documents", "Carton list or packing list with carton counts and contents.", 20),
  template(serviceSlug, "pallet_info", "Pallet information", "Warehouse Documents", "Pallet counts, pallet type, dimensions, and stacking notes.", 30, { required_by_default: false }),
  template(serviceSlug, "product_dimensions", "Product dimensions", "Warehouse Documents", "Unit dimensions and carton dimensions.", 40),
  template(serviceSlug, "product_weight", "Product weight", "Warehouse Documents", "Unit and carton weights.", 50),
  template(serviceSlug, "delivery_notice", "Delivery notice", "Warehouse Documents", "Inbound delivery date, carrier details, and appointment or tracking information.", 60),
  template(serviceSlug, "shipping_marks", "Shipping marks", "Warehouse Documents", "Carton or pallet shipping marks and external labels.", 70, { required_by_default: false }),
  template(serviceSlug, "packing_instructions", "Packing instructions", "Warehouse Documents", "Packing, inspection, repacking, or handling instructions.", 80, { required_by_default: false }),
  template(serviceSlug, "relabeling_instructions", "Relabeling instructions if needed", "Warehouse Documents", "Relabeling scope, placement rules, and label matching instructions.", 90, { required_by_default: false, conditional_rule: { includeWhen: ["relabeling"], requiredWhen: ["relabeling"] } }),
];

const relabelingTemplates = (serviceSlug: string) => [
  template(serviceSlug, "label_file", "Label file", "Warehouse Documents", "Final label PDF, barcode, FNSKU, or product label file.", 10),
  template(serviceSlug, "barcode_list", "Barcode / FNSKU list", "Warehouse Documents", "SKU, ASIN, barcode, or FNSKU list mapped to each product.", 20),
  template(serviceSlug, "product_photos", "Product photos", "Product Documents", "Product photos used to confirm label placement.", 30),
  template(serviceSlug, "label_photos", "Current label photos", "Product Documents", "Photos of current labels and label issues.", 40),
  template(serviceSlug, "quantity_list", "Quantity list", "Warehouse Documents", "Unit quantity by SKU or carton for relabeling work.", 50),
  template(serviceSlug, "deadline_info", "Deadline information", "Warehouse Documents", "Marketplace, carrier, or launch deadline for relabeling.", 60, { required_by_default: false, conditional_rule: { requiredWhen: ["urgent_case"] } }),
];

const marketplaceTemplates = (serviceSlug: string) => [
  template(serviceSlug, "marketplace_notice", "Marketplace notice screenshot", "Marketplace Documents", "Screenshot, email, or notice from the marketplace showing the issue.", 10, { required_by_default: false, conditional_rule: { requiredWhen: ["urgent_case", "marketplace"] } }),
  template(serviceSlug, "product_link", "Product link", "Marketplace Documents", "Product listing URL or marketplace link.", 20),
  template(serviceSlug, "asin_sku_item_id", "ASIN / SKU / item ID", "Marketplace Documents", "ASIN, SKU, item ID, or listing identifier for the affected product.", 30),
  template(serviceSlug, "case_id", "Case ID", "Marketplace Documents", "Marketplace case, ticket, or support ID if available.", 40, { required_by_default: false }),
  template(serviceSlug, "requested_documents", "Requested documents list", "Marketplace Documents", "List of documents requested by the marketplace.", 50),
  template(serviceSlug, "marketplace_communication", "Previous communication with marketplace", "Marketplace Documents", "Emails, chat screenshots, or marketplace support messages.", 60, { required_by_default: false }),
  template(serviceSlug, "deadline_info", "Deadline information", "Marketplace Documents", "Deadline or response date stated by the marketplace.", 70, { required_by_default: false, conditional_rule: { requiredWhen: ["urgent_case"] } }),
];

export const defaultDocumentTemplates: DocumentTemplate[] = [
  ...companyFormationTemplates("company-formation-germany"),
  ...companyFormationTemplates("german-business-address"),
  ...vatTemplates("vat-registration-germany"),
  ...vatTemplates("bookkeeping-tax-coordination"),
  ...marketplaceTemplates("marketplace-seller-setup"),
  ...weeeTemplates("weee-elektrog-registration"),
  ...batteryTemplates("battery-battg-registration"),
  ...packagingTemplates("packaging-verpackg-lucid"),
  ...gpsrTemplates("gpsr-eu-responsible-person"),
  ...gpsrTemplates("product-compliance-review"),
  ...gpsrTemplates("declaration-of-conformity-review"),
  ...gpsrTemplates("test-report-review"),
  ...marketplaceTemplates("marketplace-compliance-support"),
  ...marketplaceTemplates("authority-case-support"),
  ...warehouseTemplates("warehouse-storage-germany"),
  ...warehouseTemplates("packing-service"),
  ...warehouseTemplates("repacking-umverpackung"),
  ...relabelingTemplates("relabeling-umlabeln"),
  ...relabelingTemplates("barcode-fnsku-labeling"),
  ...warehouseTemplates("product-inspection"),
  ...warehouseTemplates("return-handling"),
  ...warehouseTemplates("shipment-preparation"),
  ...marketplaceTemplates("amazon-compliance-support"),
  ...marketplaceTemplates("temu-compliance-support"),
  ...marketplaceTemplates("aliexpress-support"),
  ...marketplaceTemplates("ebay-support"),
  ...marketplaceTemplates("shopify-support"),
  ...marketplaceTemplates("product-listing-document-support"),
  ...marketplaceTemplates("marketplace-suspension-support"),
];
