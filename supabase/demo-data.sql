-- Optional Phase 1 demo data for QA and sales walkthroughs.
-- Run after schema.sql and seed.sql. Re-running this file refreshes the same
-- three demo requests because the IDs are deterministic.

delete from public.service_requests
where id in (
  '00000000-0000-4000-8000-000000000101',
  '00000000-0000-4000-8000-000000000102',
  '00000000-0000-4000-8000-000000000103'
);

insert into public.service_requests
  (id, created_at, updated_at, status, priority, company_name, contact_person, email, phone, whatsapp, wechat, country, preferred_language, main_service, urgency, deadline, message, source)
values
  (
    '00000000-0000-4000-8000-000000000101',
    now() - interval '2 days',
    now() - interval '2 days',
    'In Review',
    'Authority deadline',
    'Shenzhen LumiTrade Co., Ltd.',
    'Emily Chen',
    'emily.chen@example.com',
    '+86 755 1000 2000',
    '+86 138 0000 1001',
    'lumi-emily',
    'China',
    'English',
    'WEEE / ElektroG registration',
    'Authority deadline',
    current_date + interval '9 days',
    'Amazon Germany requested WEEE evidence and GPSR Responsible Person details for a rechargeable LED desk lamp.',
    'demo'
  ),
  (
    '00000000-0000-4000-8000-000000000102',
    now() - interval '5 days',
    now() - interval '1 day',
    'Missing Documents',
    'Soon',
    'Northstar Outdoor LLC',
    'Daniel Brooks',
    'daniel.brooks@example.com',
    '+1 312 555 0144',
    '+1 312 555 0144',
    null,
    'United States',
    'English',
    'Open a company in Germany',
    'Soon',
    current_date + interval '30 days',
    'The company wants to launch a German UG or GmbH for Amazon and Shopify sales, then register for VAT before stock arrives.',
    'demo'
  ),
  (
    '00000000-0000-4000-8000-000000000103',
    now() - interval '1 day',
    now() - interval '3 hours',
    'New',
    'Urgent',
    'Hangzhou HomeCraft Export Ltd.',
    'Maya Lin',
    'maya.lin@example.com',
    '+86 571 8888 1010',
    '+86 139 0000 3003',
    'homecraft-maya',
    'China',
    'English',
    'Storage / Einlagerung',
    'Urgent',
    current_date + interval '12 days',
    'Two pallets of kitchen organizers are arriving in Hamburg and need German storage, FNSKU labels, and carton relabeling before Amazon FBA handover.',
    'demo'
  );

insert into public.request_services (request_id, service_slug, service_name)
values
  ('00000000-0000-4000-8000-000000000101', 'weee-elektrog-registration', 'WEEE / ElektroG registration'),
  ('00000000-0000-4000-8000-000000000101', 'gpsr-eu-responsible-person', 'EU Responsible Person / GPSR service'),
  ('00000000-0000-4000-8000-000000000101', 'amazon-compliance-support', 'Amazon compliance support'),
  ('00000000-0000-4000-8000-000000000102', 'company-formation-germany', 'Open a company in Germany'),
  ('00000000-0000-4000-8000-000000000102', 'vat-registration-germany', 'VAT registration support'),
  ('00000000-0000-4000-8000-000000000102', 'bookkeeping-tax-coordination', 'Bookkeeping / tax coordination'),
  ('00000000-0000-4000-8000-000000000103', 'warehouse-storage-germany', 'Storage / Einlagerung'),
  ('00000000-0000-4000-8000-000000000103', 'relabeling-umlabeln', 'Relabeling / Umlabeln'),
  ('00000000-0000-4000-8000-000000000103', 'barcode-fnsku-labeling', 'Barcode / FNSKU labeling');

insert into public.request_answers (request_id, scope, service_slug, question_key, answer)
values
  ('00000000-0000-4000-8000-000000000101', 'product', null, 'product_name', '"Rechargeable LED desk lamp"'::jsonb),
  ('00000000-0000-4000-8000-000000000101', 'product', null, 'brand_name', '"LumiTrade"'::jsonb),
  ('00000000-0000-4000-8000-000000000101', 'product', null, 'product_category', '"Electronics / lighting"'::jsonb),
  ('00000000-0000-4000-8000-000000000101', 'service', 'weee-elektrog-registration', 'electrical_category', '"Small equipment / lighting product"'::jsonb),
  ('00000000-0000-4000-8000-000000000101', 'service', 'weee-elektrog-registration', 'battery_included', '"Yes"'::jsonb),
  ('00000000-0000-4000-8000-000000000101', 'service', 'gpsr-eu-responsible-person', 'manufacturer_name', '"Shenzhen LumiTrade Co., Ltd."'::jsonb),
  ('00000000-0000-4000-8000-000000000101', 'service', 'amazon-compliance-support', 'case_id', '"DE-WEEE-CASE-8841"'::jsonb),
  ('00000000-0000-4000-8000-000000000102', 'service', 'company-formation-germany', 'founder_name', '"Daniel Brooks"'::jsonb),
  ('00000000-0000-4000-8000-000000000102', 'service', 'company-formation-germany', 'company_type', '"Not sure"'::jsonb),
  ('00000000-0000-4000-8000-000000000102', 'service', 'company-formation-germany', 'business_activity', '"Import and online sale of outdoor accessories in Germany and the EU."'::jsonb),
  ('00000000-0000-4000-8000-000000000102', 'service', 'vat-registration-germany', 'need_german_vat', '"Yes"'::jsonb),
  ('00000000-0000-4000-8000-000000000102', 'service', 'vat-registration-germany', 'sales_channels', '["Amazon","Shopify"]'::jsonb),
  ('00000000-0000-4000-8000-000000000103', 'product', null, 'product_name', '"Kitchen drawer organizer set"'::jsonb),
  ('00000000-0000-4000-8000-000000000103', 'service', 'warehouse-storage-germany', 'cartons', '96'::jsonb),
  ('00000000-0000-4000-8000-000000000103', 'service', 'warehouse-storage-germany', 'pallets', '2'::jsonb),
  ('00000000-0000-4000-8000-000000000103', 'service', 'warehouse-storage-germany', 'delivery_date', to_jsonb((current_date + interval '8 days')::date::text)),
  ('00000000-0000-4000-8000-000000000103', 'service', 'relabeling-umlabeln', 'units', '2400'::jsonb),
  ('00000000-0000-4000-8000-000000000103', 'service', 'relabeling-umlabeln', 'label_type', '"FNSKU"'::jsonb);

insert into public.request_files (request_id, field_key, file_name, storage_bucket, storage_path)
values
  ('00000000-0000-4000-8000-000000000101', 'test_reports', 'lumi-led-lamp-test-report.pdf', 'request-documents', 'demo/weee-gpsr/lumi-led-lamp-test-report.pdf'),
  ('00000000-0000-4000-8000-000000000101', 'label_photos', 'lumi-label-photos.zip', 'request-documents', 'demo/weee-gpsr/lumi-label-photos.zip'),
  ('00000000-0000-4000-8000-000000000102', 'other_files', 'northstar-founder-passports.pdf', 'request-documents', 'demo/company-vat/northstar-founder-passports.pdf'),
  ('00000000-0000-4000-8000-000000000103', 'label_file', 'homecraft-fnsku-labels.pdf', 'request-documents', 'demo/warehouse-relabeling/homecraft-fnsku-labels.pdf'),
  ('00000000-0000-4000-8000-000000000103', 'other_files', 'homecraft-packing-list.xlsx', 'request-documents', 'demo/warehouse-relabeling/homecraft-packing-list.xlsx');

insert into public.admin_notes (request_id, note, missing_documents)
values
  ('00000000-0000-4000-8000-000000000101', 'Need the product manual and clearer manufacturer address before preparing the GPSR review.', '["User manual","Manufacturer address confirmation"]'::jsonb),
  ('00000000-0000-4000-8000-000000000102', 'Founder passport received. Waiting for proof of address and preferred company name options.', '["Proof of address","Three preferred company names"]'::jsonb),
  ('00000000-0000-4000-8000-000000000103', 'Inbound date is close. Ask customer to confirm final FNSKU file and carton-level dimensions.', '["Final FNSKU label PDF","Carton dimensions"]'::jsonb);

insert into public.request_activity_log (request_id, actor_type, action, details)
values
  ('00000000-0000-4000-8000-000000000101', 'customer', 'submitted', '{"selected_services":["weee-elektrog-registration","gpsr-eu-responsible-person","amazon-compliance-support"]}'::jsonb),
  ('00000000-0000-4000-8000-000000000101', 'admin', 'status_changed', '{"status":"In Review"}'::jsonb),
  ('00000000-0000-4000-8000-000000000102', 'customer', 'submitted', '{"selected_services":["company-formation-germany","vat-registration-germany","bookkeeping-tax-coordination"]}'::jsonb),
  ('00000000-0000-4000-8000-000000000102', 'admin', 'status_changed', '{"status":"Missing Documents"}'::jsonb),
  ('00000000-0000-4000-8000-000000000103', 'customer', 'submitted', '{"selected_services":["warehouse-storage-germany","relabeling-umlabeln","barcode-fnsku-labeling"]}'::jsonb);
