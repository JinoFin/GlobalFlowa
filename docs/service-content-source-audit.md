# Phase 7B service-content source audit

Review date: **12 July 2026**

All regulated content was reviewed against primary law and official operational guidance. The review is general, not a legal opinion. Requirements can change and depend on the product, business model, supply chain and sales route.

## Inventory

### Market entry (5)

1. `/services/company-formation-germany`
2. `/services/german-business-address`
3. `/services/vat-registration-germany`
4. `/services/bookkeeping-tax-coordination`
5. `/services/marketplace-seller-setup`

### Compliance and registrations (9)

1. `/services/weee-elektrog-registration`
2. `/services/battery-battg-registration` (stable legacy slug; current title uses EU Batteries Regulation / BattDG)
3. `/services/packaging-verpackg-lucid`
4. `/services/gpsr-eu-responsible-person`
5. `/services/product-compliance-review`
6. `/services/declaration-of-conformity-review`
7. `/services/test-report-review`
8. `/services/marketplace-compliance-support`
9. `/services/authority-case-support`

### Warehouse and product preparation (8)

1. `/services/warehouse-storage-germany`
2. `/services/packing-service`
3. `/services/repacking-umverpackung`
4. `/services/relabeling-umlabeln`
5. `/services/barcode-fnsku-labeling`
6. `/services/product-inspection`
7. `/services/return-handling`
8. `/services/shipment-preparation`

### Marketplace support (7)

1. `/services/amazon-compliance-support`
2. `/services/temu-compliance-support`
3. `/services/aliexpress-support`
4. `/services/ebay-support`
5. `/services/shopify-support`
6. `/services/product-listing-document-support`
7. `/services/marketplace-suspension-support`
Related cross-functional services are `/services/marketplace-seller-setup` under Market Entry and `/services/marketplace-compliance-support` under Compliance.

Unique service records: **29**.

### Knowledge articles (7)

- `/knowledge/weee-elektrog`
- `/knowledge/battg`
- `/knowledge/verpackg-lucid`
- `/knowledge/gpsr-responsible-person`
- `/knowledge/vat-germany`
- `/knowledge/company-formation-germany`
- `/knowledge/warehouse-preparation-marketplaces`

## Claim audit and corrections

| Topic/pages | Claims reviewed | Official sources | Correction | Remaining uncertainty / next trigger |
| --- | --- | --- | --- | --- |
| WEEE / ElektroG | Producer definition, registration, authorised representative, brand/equipment type, B2B/B2C, guarantee, reporting, marketplace evidence | Directive 2012/19/EU; ElektroG; stiftung ear | Clarified that registration is German, role- and equipment-specific, is not certification or recycling service, and may require an authorised representative for a foreign producer. stiftung ear is described as the entrusted authority/register. | Classification, B2C guarantee and take-back arrangements require case facts. Review on ElektroG or stiftung ear process change. |
| Batteries | BattG/BattDG name, categories, registration, producer responsibility, authorised representative, reporting, labelling, passport | Regulation (EU) 2023/1542; BattDG; stiftung ear | Replaced public “Battery / BattG” terminology with “EU Batteries Regulation / BattDG”; retained slug. Recorded that most BattG provisions were repealed on 7 October 2025, obligations have different dates, and the 2027 passport is limited to LMT, EV and industrial batteries over 2 kWh. | Existing registrations and transition provisions need individual review. Review on EU delegated/implementing acts, BattDG amendment or stiftung ear change. |
| Packaging | LUCID, system participation, volume reporting, packaging types, marketplace checks, non-transferable duties and incoming PPWR | VerpackG; Regulation (EU) 2025/40; ZSVR/LUCID | Clearly separated registration, system participation and reporting; removed the implication that LUCID alone completes compliance; flags the PPWR's general application from 12 August 2026 for reassessment. | Packaging classification and producer identity remain factual. Mandatory review before 12 August 2026 and on VerpackG/ZSVR change. |
| GPSR / product safety | Consumer-product scope, harmonised products, manufacturer/importer/authorised representative/fulfilment roles, online offers, documentation | Regulations (EU) 2023/988 and 2019/1020; Commission Notice C/2025/6233; Commission product-safety guidance | Replaced universal “non-EU seller needs a Responsible Person” wording with product-scope and responsible-economic-operator analysis. Clarified that importer and authorised representative differ, product-specific law remains applicable, and CE/DoC are not universal. | Exact product-specific harmonisation legislation must be identified per product. Review on consolidated act or Commission guidance change. |
| Document / DoC / test-report review | Certification language, product identity, legislation and standards, authority outcomes | Regulations (EU) 2023/988 and 2019/1020; Commission product-safety guidance | Stated that review is not certification, a test report does not prove full compliance, DoC is only applicable under relevant legislation, and the manufacturer remains responsible. | Applicable act, standards and laboratory evidence depend on product. |
| VAT / bookkeeping | Registration trigger, stock, customer type, transaction chain, OSS/IOSS, ongoing returns, tax-advice scope | Directive 2006/112/EC; UStG; BZSt | Removed the suggestion that every seller or stock holder has the same trigger. Separated registration and filings and limited Globalflowa to fact collection/coordination. | Tax treatment requires a qualified adviser and complete facts. Review on VAT law, BZSt process or supply-chain change. |
| Company formation / address | Entity choice, notarial/register steps, capital/director/banking/residence/address claims | GmbHG; Existenzgründungsportal; Handelsregister | Limited Globalflowa to project coordination, stated notarial/register outcomes are external, and avoided universal online-formation, capital or address claims. | Entity choice, permitted address use, banking and tax substance need professional review. |
| Marketplaces | Legal versus policy requirements, evidence submission, reinstatement/acceptance | GPSR and platform-owned Amazon, Temu, eBay and Shopify documentation | Added dated marketplace sources, separated policy from law, and stated the platform makes the final decision. No reinstatement or evidence-acceptance promise remains. | AliExpress public seller guidance was not accessible without seller context; the page makes no AliExpress-specific procedure claim and requires the current in-account notice. Review every marketplace policy change. |
| Warehouse | Storage, packing, repacking, relabelling, barcode/FNSKU, inspection, returns, shipping preparation | Operational content only | Added pricing variables, customer instruction/label responsibility, restricted-product acceptance review, and clear boundaries between inspection/relabeling and certification/compliance. | Confirm actual product acceptance and handling capability per request. |

## Unsupported/outdated content identified

- “Battery / BattG” treated an obsolete framework name as current and complete.
- VAT wording implied a broadly automatic registration trigger.
- GPSR wording implied a single Responsible Person route for non-EU sellers.
- “Required documents” presentation implied universal legal requirements rather than case-dependent intake.
- Product review wording did not clearly distinguish test reports, declarations and certification.
- Company formation/address pages did not adequately separate coordination from professional and authority functions.
- Marketplace support did not visibly separate platform policy decisions from legislation.
- Warehouse inspection and relabelling lacked explicit certification/compliance limitations.

No fixed government-fee claim or fixed authority-processing-time claim was found in the static catalog. Deadlines in the request flow are customer-provided authority/marketplace case deadlines, not Globalflowa promises.

## Source registry

`src/lib/content-sources.ts` stores concise metadata only: authority, source type, jurisdiction, official HTTPS URL, legal identifier, topics, access date, version date where available, notes, language and status. Full legal text is not copied. `src/lib/service-content.ts` maps service claims to registry IDs and validates references.
