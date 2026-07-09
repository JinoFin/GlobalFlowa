import { notFound } from "next/navigation";
import { ButtonLink } from "@/components/button-link";
import { getKnowledgeArticle, knowledgeArticles } from "@/lib/catalog";

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
  };
}

export default async function KnowledgeDetailPage({ params }: KnowledgeDetailPageProps) {
  const { slug } = await params;
  const article = getKnowledgeArticle(slug);

  if (!article) {
    notFound();
  }

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
        </div>
      </section>

      <article className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.7fr_0.3fr]">
          <div className="space-y-8">
            <ContentBlock title="What it is" body={article.whatItIs} />
            <ContentBlock title="Who needs it" body={article.whoNeedsIt} />
            <ListBlock title="Required documents" items={article.requiredDocuments} />
            <ListBlock title="Common mistakes" items={article.commonMistakes} />
            <ContentBlock title="How Globalflowa helps" body={article.howGlobalflowaHelps} />
          </div>
          <aside className="h-fit rounded-md border border-navy-100 bg-navy-50 p-6">
            <h2 className="text-xl font-semibold text-navy-950">Need help with this?</h2>
            <p className="mt-3 text-sm leading-6 text-navy-650">
              Submit a structured request so Globalflowa can review your
              company, products, documents, and deadline.
            </p>
            <ButtonLink href="/request" className="mt-6 w-full">
              Start request
            </ButtonLink>
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
