import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SectionHeader } from "@/components/section-header";
import { knowledgeArticles } from "@/lib/catalog";

export const metadata = {
  title: "Compliance Knowledge",
};

export default function KnowledgePage() {
  return (
    <div className="bg-white">
      <section className="bg-navy-950 px-4 py-16 text-white sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-teal-300">
            Compliance knowledge
          </p>
          <h1 className="mt-5 max-w-4xl text-4xl font-semibold tracking-tight sm:text-5xl">
            Clear English guides for Germany market-entry obligations.
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-navy-100">
            Learn what each requirement means, who needs it, which documents are
            usually requested, and how Globalflowa can help.
          </p>
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <SectionHeader
            eyebrow="Guides"
            title="Common launch, compliance, and warehouse topics"
          />
          <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {knowledgeArticles.map((article) => (
              <Link key={article.slug} href={`/knowledge/${article.slug}`} className="rounded-md border border-navy-100 bg-white p-6 shadow-sm transition hover:border-teal-300 hover:shadow-md">
                <h2 className="text-xl font-semibold text-navy-950">{article.title}</h2>
                <p className="mt-3 text-sm leading-6 text-navy-650">{article.summary}</p>
                <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-teal-700">
                  Read guide <ArrowRight className="h-4 w-4" />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
