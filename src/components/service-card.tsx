import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getCategory, type Service } from "@/lib/catalog";
import { getServiceContent } from "@/lib/service-content";

type ServiceCardProps = {
  service: Service;
  compact?: boolean;
};

export function ServiceCard({ service, compact = false }: ServiceCardProps) {
  const category = getCategory(service.category);
  const content = getServiceContent(service);
  const typeLabel = content.regulated
    ? "Official-source reviewed"
    : service.category === "warehouse"
      ? "Operational service"
      : "Marketplace support";

  return (
    <article className="group flex h-full min-w-0 flex-col rounded-lg border border-navy-100 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-teal-300 hover:shadow-md">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-700">{category?.title}</p>
        <span className="rounded-full bg-navy-50 px-2.5 py-1 text-[0.7rem] font-semibold text-navy-650">{typeLabel}</span>
      </div>
      <h3 className="mt-3 text-lg font-semibold text-navy-950">{service.name}</h3>
      <p className="mt-3 flex-1 text-sm leading-6 text-navy-650">
        {service.shortDescription}
      </p>
      {!compact ? <p className="mt-4 text-sm leading-6 text-navy-700"><span className="font-semibold">Who may need it:</span> {service.whoNeedsIt}</p> : null}
      <Link
        href={`/services/${service.slug}`}
        className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-md text-sm font-semibold text-teal-700 outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
      >
        View service <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
      </Link>
    </article>
  );
}
