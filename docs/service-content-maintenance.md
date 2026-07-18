# Service-content maintenance

## Source hierarchy

Use EUR-Lex legal acts first, then consolidated German law, European Commission guidance, German authorities/registers, government portals and—only for platform procedures—official marketplace seller documentation. Never use competitors, affiliate pages, generic blogs, AI summaries, forums or marketplace community posts as legal authority.

## Updating content

1. Identify the exact claim and affected service, knowledge, checker, request-form and admin surfaces.
2. Open the current official source and record the access date and consolidated/version date.
3. Check the underlying law when official guidance explains a legal obligation.
4. Update `src/lib/content-sources.ts` metadata without copying legal text.
5. Update `src/lib/service-content.ts`, the catalog/question wording and the matching knowledge summary.
6. Preserve slugs; use a permanent redirect only if a URL must change.
7. Run lint, build (which executes content validation), audit and link/visual QA.
8. Record uncertainty rather than guessing. Route tax, legal and technical conclusions to qualified professionals.

## Review triggers

- Legislative amendment or new EUR-Lex consolidated version
- New Commission product-safety guidance
- stiftung ear registration/process change
- ZSVR/LUCID process change
- BZSt tax-process change
- Marketplace seller-policy change
- Authority feedback showing that current content is incomplete
- Product, supply-chain, fulfilment or sales-route change affecting a published example

Marketplace documentation is dated independently of legislation. Recheck the current seller-account notice before describing a platform procedure. AliExpress currently has no accessible public seller source in the registry, so do not add AliExpress-specific process claims without verifying an official in-account source.

## Validation rules

The content validator rejects duplicate source IDs or service slugs, non-HTTPS source URLs, missing sources/review dates for regulated services, unknown source references, empty required content sections and prohibited outcome/authority marketing phrases. Fixed government fees or processing times must not be added unless the current official source, scope and review date are recorded.

## Presentation and conversion rules

- Use the shared official-source component so legal titles wrap, authority names remain visible, external-link purpose is announced and raw registry IDs never render.
- Keep the review date next to the source list and important limitations before the final request action.
- Map knowledge articles to related services explicitly in `src/lib/knowledge-content.ts`; do not infer or generate relationships.
- Preserve service selection with `/request?service=<stable-slug>` and do not rename legacy slugs for presentation-only terminology changes.
- Re-run `npm run validate:phase7c` after changing titles, relationships, links, navigation or source presentation.
- Test long German titles at 320, 375, 768, 1024, 1280 and 1440 px before production acceptance.
