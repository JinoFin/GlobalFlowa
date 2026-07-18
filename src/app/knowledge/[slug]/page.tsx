import { notFound } from "next/navigation";
import { ButtonLink } from "@/components/button-link";
import { OfficialSources } from "@/components/official-sources";
import { getKnowledgeArticle, getServiceBySlug, knowledgeArticles } from "@/lib/catalog";
import { getContentSources } from "@/lib/content-sources";
import { getKnowledgeContent } from "@/lib/knowledge-content";

type KnowledgeDetailPageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return knowledgeArticles.map((article) => ({ slug: article.slug }));
}

export async function generateMetadata({ params }: KnowledgeDetailPageProps) {
  const { slug } = await params;
  const article = getKnowledgeArticle(slug);

  return {
    title: article ? article.title : "Knowledge",
    description: article?.summary,
  };
}

export default async function KnowledgeDetailPage({ params }: KnowledgeDetailPageProps) {
  const { slug } = await params;
  const article = getKnowledgeArticle(slug);

  if (!article) {
    notFound();
  }
  const content = getKnowledgeContent(article.slug);
  const sources = getContentSources(content.sourceIds);

  return (
    <div className="bg-white">
      <section className="bg-navy-950 px-4 py-16 text-white sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-teal-300">
            Compliance knowledge
          </p>
          <h1 className="mt-5 text-4xl font-semibold tracking-tight sm:text-5xl">
            {article.title}
          </h1>
          <p className="mt-6 text-lg leading-8 text-navy-100">{article.summary}</p>
          <p className="mt-4 text-sm leading-6 text-navy-200">Reviewed against the official sources listed below. Requirements can change and depend on the product, business model and sales route.</p>
          <ButtonLink href="/knowledge" variant="secondary" className="mt-7 border-white/20 bg-white/10 text-white hover:bg-white hover:text-navy-950">Back to knowledge</ButtonLink>
        </div>
      </section>

      <article className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.7fr_0.3fr]">
          <div className="space-y-8">
            <ContentBlock title="What it is" body={article.whatItIs} />
            <ContentBlock title="Applicable scope" body={content.applicableScope} />
            <ContentBlock title="Who may need it" body={article.whoNeedsIt} />
            <ListBlock title="Documents commonly requested" items={article.requiredDocuments} />
            <ListBlock title="Common misconceptions" items={content.misconceptions} />
            <ListBlock title="Steps before selling" items={content.stepsBeforeSelling} />
            <ListBlock title="Ongoing obligations" items={content.ongoingObligations} />
            <ListBlock title="Common practical mistakes" items={article.commonMistakes} />
            <ContentBlock title="How Globalflowa helps" body={article.howGlobalflowaHelps} />
            <section className="rounded-md border border-amber-200 bg-amber-50 p-6"><h2 className="text-2xl font-semibold text-amber-950">Important limitation</h2><p className="mt-4 leading-7 text-amber-900">{content.disclaimer}</p></section>
            {sources.length ? <OfficialSources sources={sources} compact /> : <section className="rounded-lg border border-navy-100 bg-navy-50 p-6"><h2 className="text-xl font-semibold text-navy-950">Operational guide</h2><p className="mt-3 text-sm leading-6 text-navy-650">No legal claim is made on this warehouse guide. Product acceptance and platform/carrier instructions are reviewed for each request. Last reviewed: 12 July 2026.</p></section>}
          </div>
          <aside className="h-fit rounded-md border border-navy-100 bg-navy-50 p-6">
            <h2 className="text-xl font-semibold text-navy-950">Need help with this?</h2>
            <p className="mt-3 text-sm leading-6 text-navy-650">
              Submit a structured request so Globalflowa can review your
              company, products, documents, and deadline.
            </p>
            <div className="mt-5 space-y-2">
              {content.relatedServiceSlugs.map((serviceSlug) => {
                const service = getServiceBySlug(serviceSlug);
                return service ? <ButtonLink key={serviceSlug} href={`/services/${service.slug}`} variant="secondary" className="w-full">{service.name}</ButtonLink> : null;
              })}
            </div>
            <ButtonLink href={content.relatedServiceSlugs[0] ? `/request?service=${content.relatedServiceSlugs[0]}` : "/request"} className="mt-6 w-full">Start request</ButtonLink>
          </aside>
        </div>
      </article>
    </div>
  );
}

function ContentBlock({ title, body }: { title: string; body: string }) {
  return (
    <section className="rounded-md border border-navy-100 bg-white p-6 shadow-sm">
      <h2 className="text-2xl font-semibold text-navy-950">{title}</h2>
      <p className="mt-4 leading-7 text-navy-650">{body}</p>
    </section>
  );
}

function ListBlock({ title, items }: { title: string; items: string[] }) {
  return (
    <section className="rounded-md border border-navy-100 bg-white p-6 shadow-sm">
      <h2 className="text-2xl font-semibold text-navy-950">{title}</h2>
      <ul className="mt-4 space-y-3 text-navy-650">
        {items.map((item) => (
          <li key={item} className="flex gap-3">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-teal-600" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
