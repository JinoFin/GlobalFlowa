import {
  BadgeCheck,
  Boxes,
  Building2,
  ClipboardCheck,
  FileSearch,
  Globe2,
  PackageCheck,
  ShieldCheck,
  Store,
  Truck,
} from "lucide-react";

export type ServiceCategoryKey =
  | "market-entry"
  | "compliance"
  | "warehouse"
  | "marketplace";

export type QuestionType =
  | "text"
  | "textarea"
  | "select"
  | "multiselect"
  | "number"
  | "date"
  | "yes_no"
  | "file"
  | "email"
  | "phone";

export type ServiceQuestion = {
  key: string;
  label: string;
  type: QuestionType;
  required?: boolean;
  options?: string[];
  helpText?: string;
  order: number;
};

export type Service = {
  slug: string;
  name: string;
  category: ServiceCategoryKey;
  shortDescription: string;
  whoNeedsIt: string;
  requiredInformation: string[];
  requiredDocuments: string[];
  processSteps: string[];
  questions: ServiceQuestion[];
};

export type ServiceCategory = {
  key: ServiceCategoryKey;
  title: string;
  summary: string;
  icon: typeof Building2;
};

export type KnowledgeArticle = {
  slug: string;
  title: string;
  summary: string;
  whatItIs: string;
  whoNeedsIt: string;
  requiredDocuments: string[];
  commonMistakes: string[];
  howGlobalflowaHelps: string;
};

export const serviceCategories: ServiceCategory[] = [
  {
    key: "market-entry",
    title: "Market Entry Germany",
    summary:
      "Company setup, German business address, VAT registration, bookkeeping coordination, and seller setup support.",
    icon: Building2,
  },
  {
    key: "compliance",
    title: "Compliance & Registrations",
    summary:
      "WEEE, BattG, VerpackG/LUCID, GPSR Responsible Person, product document review, and authority case support.",
    icon: ShieldCheck,
  },
  {
    key: "warehouse",
    title: "Warehouse & Product Preparation",
    summary:
      "Storage, packing, repacking, relabeling, barcode/FNSKU labeling, inspection, returns, and shipment preparation.",
    icon: Boxes,
  },
  {
    key: "marketplace",
    title: "Marketplace Support",
    summary:
      "Amazon, Temu, AliExpress, eBay, Shopify, product listing documents, and missing-document cases.",
    icon: Store,
  },
];

const companyFormationQuestions: ServiceQuestion[] = [
  { key: "founder_name", label: "Founder name", type: "text", required: true, order: 1 },
  { key: "founder_nationality", label: "Founder nationality", type: "text", order: 2 },
  { key: "shareholders", label: "Number of shareholders", type: "number", order: 3 },
  {
    key: "company_type",
    label: "Desired company type",
    type: "select",
    options: ["GmbH", "UG", "Not sure"],
    order: 4,
  },
  { key: "business_activity", label: "Desired business activity", type: "textarea", order: 5 },
  { key: "business_address", label: "Need German business address?", type: "yes_no", order: 6 },
  { key: "vat_registration", label: "Need VAT registration?", type: "yes_no", order: 7 },
  { key: "bookkeeping", label: "Need bookkeeping support?", type: "yes_no", order: 8 },
  { key: "bank_account", label: "Need bank account support?", type: "yes_no", order: 9 },
  { key: "preferred_company_name", label: "Preferred company name", type: "text", order: 10 },
  { key: "desired_start_date", label: "Desired start date", type: "date", order: 11 },
  { key: "formation_notes", label: "Notes", type: "textarea", order: 12 },
];

const vatQuestions: ServiceQuestion[] = [
  { key: "existing_company_country", label: "Existing company country", type: "text", order: 1 },
  { key: "existing_vat_number", label: "Existing VAT number", type: "text", order: 2 },
  { key: "need_german_vat", label: "Need German VAT number?", type: "yes_no", order: 3 },
  { key: "sales_channels", label: "Sales channels", type: "multiselect", options: ["Amazon", "Temu", "AliExpress", "eBay", "Shopify", "Other"], order: 4 },
  { key: "monthly_sales_estimate", label: "Monthly sales estimate", type: "text", order: 5 },
  { key: "monthly_filing", label: "Need monthly filing?", type: "yes_no", order: 6 },
  { key: "tax_advisor", label: "Existing tax advisor?", type: "yes_no", order: 7 },
  { key: "bookkeeping_support", label: "Need bookkeeping support?", type: "yes_no", order: 8 },
];

const weeeQuestions: ServiceQuestion[] = [
  { key: "product_type", label: "Product type", type: "text", required: true, order: 1 },
  { key: "electrical_category", label: "Electrical/electronic category", type: "text", order: 2 },
  { key: "brand_name", label: "Brand name", type: "text", order: 3 },
  { key: "device_type", label: "Device type", type: "text", order: 4 },
  { key: "b2b_b2c", label: "B2B or B2C", type: "select", options: ["B2B", "B2C", "Both", "Not sure"], order: 5 },
  { key: "yearly_quantity", label: "Estimated yearly quantity", type: "number", order: 6 },
  { key: "battery_included", label: "Battery included?", type: "yes_no", order: 7 },
  { key: "existing_weee", label: "Existing WEEE registration?", type: "yes_no", order: 8 },
  { key: "weee_number", label: "Existing WEEE number", type: "text", order: 9 },
  { key: "marketplace_link", label: "Marketplace link", type: "text", order: 10 },
];

const batteryQuestions: ServiceQuestion[] = [
  { key: "battery_type", label: "Battery type", type: "text", order: 1 },
  { key: "battery_chemistry", label: "Battery chemistry", type: "text", order: 2 },
  { key: "battery_installation", label: "Built-in or separate battery", type: "select", options: ["Built-in", "Separate", "Both", "Not sure"], order: 3 },
  { key: "battery_weight", label: "Battery weight per unit", type: "text", order: 4 },
  { key: "battery_quantity", label: "Estimated yearly battery quantity", type: "number", order: 5 },
  { key: "battery_product", label: "Product linked to battery", type: "text", order: 6 },
  { key: "existing_battery_registration", label: "Existing battery registration?", type: "yes_no", order: 7 },
  { key: "battery_registration_number", label: "Existing registration number", type: "text", order: 8 },
];

const packagingQuestions: ServiceQuestion[] = [
  { key: "packaging_type", label: "Packaging type", type: "text", order: 1 },
  { key: "packaging_material", label: "Packaging material", type: "text", order: 2 },
  { key: "packaging_use", label: "Sales or shipping packaging", type: "select", options: ["Sales packaging", "Shipping packaging", "Both", "Not sure"], order: 3 },
  { key: "packaging_quantity", label: "Estimated yearly packaging quantity", type: "text", order: 4 },
  { key: "lucid_number", label: "Existing LUCID number?", type: "yes_no", order: 5 },
  { key: "system_participation", label: "Existing system participation?", type: "yes_no", order: 6 },
  { key: "marketplace_used", label: "Marketplace used", type: "multiselect", options: ["Amazon", "Temu", "AliExpress", "eBay", "Shopify", "Other"], order: 7 },
];

const responsiblePersonQuestions: ServiceQuestion[] = [
  { key: "gpsr_product_category", label: "Product category", type: "text", order: 1 },
  { key: "manufacturer_name", label: "Manufacturer name", type: "text", order: 2 },
  { key: "manufacturer_address", label: "Manufacturer address", type: "textarea", order: 3 },
  { key: "doc_available", label: "Declaration of Conformity available?", type: "yes_no", order: 4 },
  { key: "test_reports_available", label: "Test reports available?", type: "yes_no", order: 5 },
  { key: "manual_available", label: "User manual available?", type: "yes_no", order: 6 },
  { key: "risk_assessment_available", label: "Risk assessment available?", type: "yes_no", order: 7 },
  { key: "marketplace_link", label: "Marketplace link", type: "text", order: 8 },
  { key: "urgent_case", label: "Urgent authority or marketplace case?", type: "yes_no", order: 9 },
  { key: "case_deadline", label: "Case deadline", type: "date", order: 10 },
];

const warehouseQuestions: ServiceQuestion[] = [
  { key: "warehouse_product_type", label: "Product type", type: "text", order: 1 },
  { key: "cartons", label: "Number of cartons", type: "number", order: 2 },
  { key: "pallets", label: "Number of pallets", type: "number", order: 3 },
  { key: "unit_dimensions", label: "Unit dimensions", type: "text", order: 4 },
  { key: "carton_dimensions", label: "Carton dimensions", type: "text", order: 5 },
  { key: "unit_weight", label: "Weight per unit", type: "text", order: 6 },
  { key: "carton_weight", label: "Weight per carton", type: "text", order: 7 },
  { key: "storage_duration", label: "Storage duration", type: "text", order: 8 },
  { key: "delivery_date", label: "Delivery date", type: "date", order: 9 },
  { key: "forwarding_details", label: "Pickup / forwarding details", type: "textarea", order: 10 },
  { key: "inspection_needed", label: "Need product inspection?", type: "yes_no", order: 11 },
  { key: "packing_needed", label: "Need packing?", type: "yes_no", order: 12 },
  { key: "repacking_needed", label: "Need repacking?", type: "yes_no", order: 13 },
  { key: "relabeling_needed", label: "Need relabeling?", type: "yes_no", order: 14 },
  { key: "shipping_prep_needed", label: "Need shipping preparation?", type: "yes_no", order: 15 },
];

const relabelingQuestions: ServiceQuestion[] = [
  { key: "units", label: "Number of units", type: "number", order: 1 },
  { key: "label_type", label: "Label type", type: "select", options: ["Barcode", "FNSKU", "Product label", "Warning label", "Other"], order: 2 },
  { key: "current_label_issue", label: "Current label issue", type: "textarea", order: 3 },
  { key: "label_design_needed", label: "Need label design?", type: "yes_no", order: 4 },
  { key: "label_deadline", label: "Deadline", type: "date", order: 5 },
];

const marketplaceQuestions: ServiceQuestion[] = [
  { key: "marketplace_name", label: "Marketplace name", type: "select", options: ["Amazon", "Temu", "AliExpress", "eBay", "Shopify", "Other"], order: 1 },
  { key: "seller_account_country", label: "Seller account country", type: "text", order: 2 },
  { key: "product_link", label: "Product link", type: "text", order: 3 },
  { key: "item_id", label: "ASIN / item ID / SKU", type: "text", order: 4 },
  { key: "case_id", label: "Case ID", type: "text", order: 5 },
  { key: "issue_reason", label: "Reason for issue", type: "textarea", order: 6 },
  { key: "deadline", label: "Deadline", type: "date", order: 7 },
  { key: "requested_documents", label: "Documents requested by marketplace", type: "textarea", order: 8 },
];

export const services: Service[] = [
  {
    slug: "company-formation-germany",
    name: "Open a company in Germany",
    category: "market-entry",
    shortDescription:
      "Structured support for founders preparing a German GmbH or UG market-entry setup.",
    whoNeedsIt:
      "Foreign sellers who want a German legal presence, local credibility, or a stronger operating base for EU sales.",
    requiredInformation: ["Founder details", "Shareholder structure", "Business activity", "Desired company name", "Target start date"],
    requiredDocuments: ["Founder passport", "Proof of address", "Business activity description", "Shareholder information"],
    processSteps: ["Scope the setup", "Prepare formation checklist", "Coordinate German address and VAT needs", "Prepare next actions with partners"],
    questions: companyFormationQuestions,
  },
  {
    slug: "german-business-address",
    name: "German business address support",
    category: "market-entry",
    shortDescription: "Address support for companies building a German market-entry presence.",
    whoNeedsIt: "Sellers who need a reliable German address for setup, correspondence, or marketplace onboarding.",
    requiredInformation: ["Company details", "Intended use", "Expected mail volume"],
    requiredDocuments: ["Company documents", "Representative ID"],
    processSteps: ["Confirm use case", "Review eligibility", "Prepare address support path"],
    questions: companyFormationQuestions.filter((q) => ["business_address", "preferred_company_name", "formation_notes"].includes(q.key)),
  },
  {
    slug: "vat-registration-germany",
    name: "VAT registration support",
    category: "market-entry",
    shortDescription: "German VAT number and filing coordination for foreign sellers.",
    whoNeedsIt: "Companies selling taxable goods in Germany or holding stock in Germany.",
    requiredInformation: ["Company country", "Sales channels", "Sales estimates", "Existing VAT status"],
    requiredDocuments: ["Business license", "Tax certificate if available", "Marketplace seller details"],
    processSteps: ["Check VAT trigger", "Collect documents", "Coordinate application and filing path"],
    questions: vatQuestions,
  },
  {
    slug: "bookkeeping-tax-coordination",
    name: "Bookkeeping / tax coordination",
    category: "market-entry",
    shortDescription: "Coordination for bookkeeping, monthly filing needs, and German tax workflow setup.",
    whoNeedsIt: "Sellers who need ongoing tax coordination after VAT registration or company formation.",
    requiredInformation: ["Sales channels", "Transaction volume", "Existing advisor status"],
    requiredDocuments: ["Company documents", "VAT documents", "Marketplace reports if available"],
    processSteps: ["Assess volume", "Prepare bookkeeping workflow", "Coordinate recurring filing support"],
    questions: vatQuestions,
  },
  {
    slug: "marketplace-seller-setup",
    name: "Marketplace seller setup support",
    category: "market-entry",
    shortDescription: "Setup support for sellers entering Amazon, Temu, eBay, Shopify, or other channels.",
    whoNeedsIt: "Companies opening or regularizing marketplace accounts for Germany.",
    requiredInformation: ["Marketplace names", "Seller account country", "Product categories"],
    requiredDocuments: ["Company documents", "VAT details", "Compliance registrations if available"],
    processSteps: ["Review channel requirements", "Map missing documents", "Prepare onboarding checklist"],
    questions: marketplaceQuestions,
  },
  {
    slug: "weee-elektrog-registration",
    name: "WEEE / ElektroG registration",
    category: "compliance",
    shortDescription: "Registration support for electrical and electronic products sold in Germany.",
    whoNeedsIt: "Sellers offering electrical or electronic equipment under their brand in Germany.",
    requiredInformation: ["Brand", "Device category", "B2B/B2C status", "Yearly quantity"],
    requiredDocuments: ["Business license", "Product photos", "Label photos", "Manual", "Brand information"],
    processSteps: ["Classify product", "Review brand/device data", "Prepare registration path", "Support marketplace evidence"],
    questions: weeeQuestions,
  },
  {
    slug: "battery-battg-registration",
    name: "Battery / BattG registration",
    category: "compliance",
    shortDescription: "Battery registration support for products containing or shipping with batteries.",
    whoNeedsIt: "Sellers placing batteries, built-in batteries, or battery-powered products on the German market.",
    requiredInformation: ["Battery type", "Chemistry", "Weight", "Estimated yearly quantity"],
    requiredDocuments: ["Product photos", "Battery specification", "Existing registration if any"],
    processSteps: ["Identify battery obligation", "Collect technical data", "Prepare registration support"],
    questions: batteryQuestions,
  },
  {
    slug: "packaging-verpackg-lucid",
    name: "Packaging / VerpackG / LUCID registration",
    category: "compliance",
    shortDescription: "Packaging registration and system participation coordination for Germany.",
    whoNeedsIt: "Sellers shipping packaged products to German end customers.",
    requiredInformation: ["Packaging materials", "Packaging quantity", "Marketplace used", "Existing LUCID status"],
    requiredDocuments: ["Company documents", "Packaging estimates", "Marketplace details"],
    processSteps: ["Check VerpackG obligation", "Prepare LUCID and system data", "Document marketplace proof"],
    questions: packagingQuestions,
  },
  {
    slug: "gpsr-eu-responsible-person",
    name: "EU Responsible Person / GPSR service",
    category: "compliance",
    shortDescription: "Support for GPSR Responsible Person needs and product documentation review.",
    whoNeedsIt: "Non-EU sellers placing consumer products on EU marketplaces or facing GPSR document requests.",
    requiredInformation: ["Manufacturer details", "Product category", "Marketplace link", "Urgency and deadlines"],
    requiredDocuments: ["Product photos", "Label photos", "DoC", "Test reports", "User manual", "Risk assessment"],
    processSteps: ["Review product documents", "Identify missing evidence", "Prepare Responsible Person path"],
    questions: responsiblePersonQuestions,
  },
  {
    slug: "product-compliance-review",
    name: "Product compliance document review",
    category: "compliance",
    shortDescription: "Review product photos, labels, manuals, test reports, and marketplace compliance requests.",
    whoNeedsIt: "Sellers unsure whether their product documentation is ready for Germany or EU marketplaces.",
    requiredInformation: ["Product category", "Marketplace", "Documents requested", "Deadline"],
    requiredDocuments: ["Product photos", "Label photos", "Manual", "Test reports", "Declarations"],
    processSteps: ["Review submitted documents", "Flag gaps", "Prepare next-step checklist"],
    questions: [...responsiblePersonQuestions, ...marketplaceQuestions.slice(2)],
  },
  {
    slug: "declaration-of-conformity-review",
    name: "Declaration of Conformity review",
    category: "compliance",
    shortDescription: "Review DoC structure and product-document alignment for applicable products.",
    whoNeedsIt: "Sellers asked by marketplaces or authorities to provide a Declaration of Conformity.",
    requiredInformation: ["Product category", "Standards referenced", "Manufacturer details"],
    requiredDocuments: ["Declaration of Conformity", "Test reports", "Manual", "Label photos"],
    processSteps: ["Check DoC completeness", "Compare with evidence", "Prepare correction notes"],
    questions: responsiblePersonQuestions,
  },
  {
    slug: "test-report-review",
    name: "Test report review",
    category: "compliance",
    shortDescription: "Review test reports against marketplace or product compliance expectations.",
    whoNeedsIt: "Sellers with test reports who need to understand whether the documents fit German/EU requirements.",
    requiredInformation: ["Product category", "Standards", "Marketplace issue if any"],
    requiredDocuments: ["Test reports", "Product photos", "Manual", "Marketplace notice if any"],
    processSteps: ["Review report scope", "Check product match", "Summarize gaps and next steps"],
    questions: responsiblePersonQuestions,
  },
  {
    slug: "marketplace-compliance-support",
    name: "Marketplace compliance support",
    category: "compliance",
    shortDescription: "Support for missing compliance documents, blocked listings, and marketplace requests.",
    whoNeedsIt: "Sellers with urgent marketplace compliance warnings, missing-document cases, or listing blocks.",
    requiredInformation: ["Marketplace", "Case ID", "Product link", "Documents requested", "Deadline"],
    requiredDocuments: ["Screenshots", "Emails/notices", "Product documents", "Registration proof"],
    processSteps: ["Review notice", "Map required documents", "Prepare response package"],
    questions: marketplaceQuestions,
  },
  {
    slug: "authority-case-support",
    name: "Authority case support",
    category: "compliance",
    shortDescription: "Structured intake for urgent German authority or official compliance cases.",
    whoNeedsIt: "Companies contacted by authorities or facing deadlines for product, tax, or registration evidence.",
    requiredInformation: ["Authority name", "Deadline", "Case summary", "Products affected"],
    requiredDocuments: ["Authority letter", "Product documents", "Company documents", "Prior correspondence"],
    processSteps: ["Review case documents", "Prioritize deadline", "Prepare information request and next actions"],
    questions: [...marketplaceQuestions, ...responsiblePersonQuestions],
  },
  {
    slug: "warehouse-storage-germany",
    name: "Storage / Einlagerung",
    category: "warehouse",
    shortDescription: "German warehouse storage intake for cartons, pallets, marketplace stock, and prepared goods.",
    whoNeedsIt: "Foreign sellers who need stock held in Germany before marketplace delivery or onward shipment.",
    requiredInformation: ["Product type", "Carton/pallet count", "Dimensions", "Weights", "Storage duration"],
    requiredDocuments: ["Packing list", "Product photos", "Delivery documents if available"],
    processSteps: ["Review stock profile", "Confirm storage and handling needs", "Plan inbound and outbound steps"],
    questions: warehouseQuestions,
  },
  {
    slug: "packing-service",
    name: "Packing service",
    category: "warehouse",
    shortDescription: "Packing support for units, cartons, marketplace shipments, or relaunch preparation.",
    whoNeedsIt: "Sellers whose products need packing before delivery to marketplaces or customers.",
    requiredInformation: ["Unit count", "Packaging needs", "Deadline", "Outbound destination"],
    requiredDocuments: ["Product photos", "Packing instructions", "Label files if available"],
    processSteps: ["Confirm packing scope", "Review materials and labels", "Prepare packing schedule"],
    questions: warehouseQuestions,
  },
  {
    slug: "repacking-umverpackung",
    name: "Repacking / Umverpackung",
    category: "warehouse",
    shortDescription: "Repacking for products that need German/EU-ready presentation or marketplace-ready cartons.",
    whoNeedsIt: "Sellers with packaging issues, damaged outer packaging, or marketplace preparation needs.",
    requiredInformation: ["Units", "Current packaging issue", "Target packaging", "Deadline"],
    requiredDocuments: ["Product photos", "Packaging photos", "Instructions", "Label files if needed"],
    processSteps: ["Review current packaging", "Define repacking method", "Prepare handling timeline"],
    questions: warehouseQuestions,
  },
  {
    slug: "relabeling-umlabeln",
    name: "Relabeling / Umlabeln",
    category: "warehouse",
    shortDescription: "Relabeling for barcode, compliance, marketplace, or product label corrections.",
    whoNeedsIt: "Sellers whose goods need new labels before entering Amazon, Temu, or other channels.",
    requiredInformation: ["Unit count", "Label type", "Current issue", "Deadline"],
    requiredDocuments: ["Label file", "Product photos", "Current label photos"],
    processSteps: ["Check label files", "Confirm unit count", "Plan relabeling and quality check"],
    questions: relabelingQuestions,
  },
  {
    slug: "barcode-fnsku-labeling",
    name: "Barcode / FNSKU labeling",
    category: "warehouse",
    shortDescription: "Barcode, FNSKU, and marketplace label application for prepared stock.",
    whoNeedsIt: "Sellers preparing inventory for Amazon FBA or other barcode-driven marketplaces.",
    requiredInformation: ["Unit count", "Label format", "SKU/ASIN", "Deadline"],
    requiredDocuments: ["Barcode/FNSKU files", "Product photos", "Packing list"],
    processSteps: ["Validate label files", "Confirm application rules", "Apply labels and prepare stock"],
    questions: relabelingQuestions,
  },
  {
    slug: "product-inspection",
    name: "Product inspection",
    category: "warehouse",
    shortDescription: "Product inspection intake for checking stock condition, labels, packaging, or samples.",
    whoNeedsIt: "Sellers who need a German-side check before forwarding goods to marketplaces or partners.",
    requiredInformation: ["Inspection objective", "Unit/carton count", "Photos required", "Deadline"],
    requiredDocuments: ["Packing list", "Product photos", "Inspection checklist if available"],
    processSteps: ["Define inspection scope", "Inspect sample or stock", "Report findings and next steps"],
    questions: warehouseQuestions,
  },
  {
    slug: "return-handling",
    name: "Return handling",
    category: "warehouse",
    shortDescription: "Handling returned goods in Germany with inspection, relabeling, repacking, or onward shipment.",
    whoNeedsIt: "Sellers needing a German return address or structured return processing support.",
    requiredInformation: ["Return volume", "Product type", "Inspection rules", "Disposal or resale plan"],
    requiredDocuments: ["Return instructions", "Product photos", "Marketplace return documents"],
    processSteps: ["Confirm return flow", "Inspect received goods", "Prepare disposition options"],
    questions: warehouseQuestions,
  },
  {
    slug: "shipment-preparation",
    name: "Shipment preparation",
    category: "warehouse",
    shortDescription: "Preparation for outbound marketplace, customer, or partner shipments from German stock.",
    whoNeedsIt: "Sellers needing cartons, pallets, labels, or documents prepared before outbound forwarding.",
    requiredInformation: ["Destination", "Stock details", "Shipping labels", "Deadline"],
    requiredDocuments: ["Shipping labels", "Packing list", "Commercial documents if available"],
    processSteps: ["Confirm shipment rules", "Prepare goods", "Handover to carrier or partner"],
    questions: warehouseQuestions,
  },
  {
    slug: "amazon-compliance-support",
    name: "Amazon compliance support",
    category: "marketplace",
    shortDescription: "Support for Amazon Germany/EU compliance document requests, ASIN cases, and listing blocks.",
    whoNeedsIt: "Amazon sellers with missing document cases, WEEE/BattG/VerpackG/GPSR requests, or urgent listing issues.",
    requiredInformation: ["ASIN/SKU", "Case ID", "Marketplace notice", "Deadline"],
    requiredDocuments: ["Screenshots/notices", "Product documents", "Registration proof", "Labels"],
    processSteps: ["Review case", "Identify required proof", "Prepare response package"],
    questions: marketplaceQuestions,
  },
  {
    slug: "temu-compliance-support",
    name: "Temu compliance support",
    category: "marketplace",
    shortDescription: "Document and case support for Temu sellers preparing or maintaining German/EU listings.",
    whoNeedsIt: "Temu sellers asked for product, compliance, or seller documentation.",
    requiredInformation: ["Product link", "Case or notice details", "Documents requested"],
    requiredDocuments: ["Screenshots/notices", "Product documents", "Company documents"],
    processSteps: ["Review request", "Map missing documents", "Prepare structured response"],
    questions: marketplaceQuestions,
  },
  {
    slug: "aliexpress-support",
    name: "AliExpress support",
    category: "marketplace",
    shortDescription: "German/EU document preparation support for AliExpress sellers.",
    whoNeedsIt: "AliExpress sellers entering Germany or resolving document gaps.",
    requiredInformation: ["Product link", "Seller account country", "Issue details"],
    requiredDocuments: ["Product documents", "Marketplace screenshots", "Company details"],
    processSteps: ["Review marketplace need", "Collect missing data", "Prepare documentation path"],
    questions: marketplaceQuestions,
  },
  {
    slug: "ebay-support",
    name: "eBay support",
    category: "marketplace",
    shortDescription: "Support for eBay Germany compliance, product document, and seller setup needs.",
    whoNeedsIt: "eBay sellers selling physical products in Germany.",
    requiredInformation: ["Listing link", "Product category", "Document request if any"],
    requiredDocuments: ["Product documents", "Registration proof", "Marketplace messages"],
    processSteps: ["Review listing and request", "Identify obligations", "Prepare response or setup steps"],
    questions: marketplaceQuestions,
  },
  {
    slug: "shopify-support",
    name: "Shopify support",
    category: "marketplace",
    shortDescription: "Support for Shopify sellers preparing compliance, VAT, storage, and Germany-ready operations.",
    whoNeedsIt: "Direct-to-consumer sellers using Shopify to sell packaged physical products in Germany.",
    requiredInformation: ["Store URL", "Product categories", "Fulfillment model", "VAT/compliance status"],
    requiredDocuments: ["Company documents", "Product documents", "Packaging estimates"],
    processSteps: ["Review store model", "Map VAT/compliance triggers", "Prepare launch checklist"],
    questions: marketplaceQuestions,
  },
  {
    slug: "product-listing-document-support",
    name: "Product listing document support",
    category: "marketplace",
    shortDescription: "Prepare product listing documentation for marketplaces before launch or after document requests.",
    whoNeedsIt: "Sellers whose listings need product documents, compliance proof, labels, or manuals.",
    requiredInformation: ["Marketplace", "Product link", "Documents requested", "Deadline"],
    requiredDocuments: ["Product photos", "Labels", "Manuals", "Test reports", "Registration proof"],
    processSteps: ["Review listing need", "Create document checklist", "Prepare upload-ready package"],
    questions: marketplaceQuestions,
  },
  {
    slug: "marketplace-suspension-support",
    name: "Marketplace suspension / missing document support",
    category: "marketplace",
    shortDescription: "Urgent support for suspended listings, missing documents, and compliance-driven marketplace cases.",
    whoNeedsIt: "Sellers facing account, listing, or product restrictions because documents are missing or unclear.",
    requiredInformation: ["Marketplace", "Case ID", "Suspension reason", "Deadline"],
    requiredDocuments: ["Screenshots", "Emails/notices", "Requested documents", "Product compliance files"],
    processSteps: ["Triage urgency", "Review missing evidence", "Prepare structured response plan"],
    questions: marketplaceQuestions,
  },
];

export const featuredServices = [
  "company-formation-germany",
  "vat-registration-germany",
  "packaging-verpackg-lucid",
  "weee-elektrog-registration",
  "battery-battg-registration",
  "gpsr-eu-responsible-person",
  "warehouse-storage-germany",
  "relabeling-umlabeln",
  "amazon-compliance-support",
];

export const knowledgeArticles: KnowledgeArticle[] = [
  {
    slug: "weee-elektrog",
    title: "WEEE / ElektroG",
    summary: "German obligations for electrical and electronic equipment before products are sold.",
    whatItIs: "WEEE / ElektroG is Germany's registration and producer responsibility framework for electrical and electronic equipment.",
    whoNeedsIt: "Foreign sellers that place branded electrical or electronic products on the German market.",
    requiredDocuments: ["Business license", "Brand information", "Device category", "Product photos", "Label photos", "Manual"],
    commonMistakes: ["Using the wrong device category", "Selling before registration evidence is ready", "Missing brand or label consistency"],
    howGlobalflowaHelps: "Globalflowa reviews your product data, prepares the intake, and helps organize documents for registration and marketplace evidence.",
  },
  {
    slug: "battg",
    title: "Battery / BattG",
    summary: "Registration needs for batteries and battery-powered products sold in Germany.",
    whatItIs: "BattG covers battery producer obligations, including batteries sold separately or included in products.",
    whoNeedsIt: "Sellers whose products include, contain, or ship with batteries.",
    requiredDocuments: ["Battery specification", "Battery chemistry", "Battery weight", "Product photos", "Existing registration if any"],
    commonMistakes: ["Forgetting built-in batteries", "Missing chemistry details", "Underestimating yearly battery quantity"],
    howGlobalflowaHelps: "Globalflowa collects the correct battery data and structures the registration request around the product and marketplace context.",
  },
  {
    slug: "verpackg-lucid",
    title: "Packaging / VerpackG / LUCID",
    summary: "German packaging registration and system participation for packaged products.",
    whatItIs: "VerpackG requires many sellers to register packaging in LUCID and participate in a packaging system.",
    whoNeedsIt: "Companies shipping sales or shipping packaging to German end customers.",
    requiredDocuments: ["Company details", "Packaging material estimates", "Marketplace used", "Existing LUCID number if available"],
    commonMistakes: ["Confusing LUCID registration with system participation", "Ignoring shipping packaging", "Using unrealistic annual estimates"],
    howGlobalflowaHelps: "Globalflowa helps estimate packaging data, organize LUCID/system steps, and prepare marketplace proof.",
  },
  {
    slug: "gpsr-responsible-person",
    title: "GPSR / EU Responsible Person",
    summary: "Responsible Person and product document expectations for EU consumer products.",
    whatItIs: "GPSR sets product safety expectations for consumer products, including EU contact and documentation requirements.",
    whoNeedsIt: "Non-EU sellers placing consumer products on EU marketplaces or responding to GPSR requests.",
    requiredDocuments: ["Manufacturer details", "Product photos", "Label photos", "Manual", "DoC and test reports if applicable", "Risk assessment if available"],
    commonMistakes: ["Incomplete manufacturer address", "Manuals not matching the product", "Missing product safety documentation"],
    howGlobalflowaHelps: "Globalflowa checks documents, identifies missing evidence, and prepares a practical Responsible Person support path.",
  },
  {
    slug: "vat-germany",
    title: "German VAT",
    summary: "VAT registration and filing considerations for foreign sellers in Germany.",
    whatItIs: "German VAT obligations can apply when foreign sellers sell taxable products, hold stock, or use German fulfillment flows.",
    whoNeedsIt: "Companies selling physical goods in Germany, especially marketplace and warehouse-based sellers.",
    requiredDocuments: ["Company documents", "Tax certificate if available", "Marketplace details", "Sales estimates"],
    commonMistakes: ["Starting sales before VAT readiness", "No filing process after registration", "Missing marketplace seller data"],
    howGlobalflowaHelps: "Globalflowa maps the VAT trigger, collects intake documents, and coordinates the next registration or filing support steps.",
  },
  {
    slug: "company-formation-germany",
    title: "Opening a company in Germany",
    summary: "German company setup basics for foreign founders entering the market.",
    whatItIs: "Company formation creates a German legal entity such as a GmbH or UG for market-entry operations.",
    whoNeedsIt: "Foreign sellers who need German presence, contracts, marketplace setup, VAT coordination, or local credibility.",
    requiredDocuments: ["Founder ID", "Proof of address", "Shareholder details", "Business activity description"],
    commonMistakes: ["Unclear business activity", "No VAT or bookkeeping plan", "Choosing entity type without operational context"],
    howGlobalflowaHelps: "Globalflowa clarifies the formation path, German address and VAT needs, and the practical launch checklist.",
  },
  {
    slug: "warehouse-preparation-marketplaces",
    title: "Warehouse preparation for marketplaces",
    summary: "Storage, packing, relabeling, inspection, and shipment preparation before marketplace delivery.",
    whatItIs: "Warehouse preparation makes stock ready for marketplace acceptance and German/EU operating expectations.",
    whoNeedsIt: "Sellers who need goods stored, checked, packed, relabeled, or prepared before Amazon, Temu, eBay, or partner delivery.",
    requiredDocuments: ["Packing list", "Product photos", "Label files", "Shipping labels", "Handling instructions"],
    commonMistakes: ["No carton-level data", "Late label files", "Unclear repacking instructions", "Missing shipment deadlines"],
    howGlobalflowaHelps: "Globalflowa reviews stock details, confirms handling requirements, and turns messy preparation needs into a clear warehouse workflow.",
  },
];

export const trustBadges = [
  { label: "Germany-based support", icon: Globe2 },
  { label: "Compliance + logistics", icon: ClipboardCheck },
  { label: "Marketplace-ready", icon: PackageCheck },
  { label: "Multilingual support", icon: BadgeCheck },
];

export const requirementHighlights = [
  { title: "Registrations", icon: FileSearch },
  { title: "Storage", icon: Boxes },
  { title: "Preparation", icon: Truck },
  { title: "Compliance proof", icon: ShieldCheck },
];

export function getServiceBySlug(slug: string) {
  return services.find((service) => service.slug === slug);
}

export function getCategory(key: ServiceCategoryKey) {
  return serviceCategories.find((category) => category.key === key);
}

export function getKnowledgeArticle(slug: string) {
  return knowledgeArticles.find((article) => article.slug === slug);
}
