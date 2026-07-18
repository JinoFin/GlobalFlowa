import { ExternalLink } from "lucide-react";
import type { ContentSource } from "@/lib/content-sources";

type OfficialSourcesProps = {
  sources: ContentSource[];
  compact?: boolean;
};

export function OfficialSources({ sources, compact = false }: OfficialSourcesProps) {
  if (!sources.length) return null;

  return (
    <section id="official-sources" aria-labelledby="official-sources-heading" className={compact ? "rounded-lg border border-navy-100 bg-white p-5 shadow-sm sm:p-6" : "border-t border-navy-100 bg-white px-4 py-14 sm:px-6 sm:py-16 lg:px-8"}>
      <div className={compact ? "" : "mx-auto max-w-7xl"}>
        <h2 id="official-sources-heading" className={compact ? "text-2xl font-semibold text-navy-950" : "text-3xl font-semibold text-navy-950"}>
          Official sources
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-navy-650">
          Last reviewed against the official sources listed on this page: 12 July 2026.
        </p>
        <ul className={compact ? "mt-5 space-y-3" : "mt-8 grid gap-4 md:grid-cols-2"}>
          {sources.map((source) => (
            <li key={source.id} className="min-w-0">
              <a
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group block h-full min-w-0 rounded-lg border border-navy-100 bg-navy-50 p-4 outline-none transition hover:border-teal-300 hover:bg-teal-50/40 focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 sm:p-5"
                aria-label={`${source.title}, ${source.issuingAuthority} (opens in a new tab)`}
              >
                <span className="block text-xs font-semibold uppercase tracking-[0.14em] text-teal-700">
                  {source.issuingAuthority}
                </span>
                <span className="mt-2 block break-words font-semibold leading-6 text-navy-950">
                  {source.title}{source.legalIdentifier ? ` — ${source.legalIdentifier}` : ""}
                </span>
                <span className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-teal-700">
                  Open official source
                  <ExternalLink className="h-4 w-4" aria-hidden="true" />
                </span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
