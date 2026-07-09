import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getCategory, type Service } from "@/lib/catalog";

type ServiceCardProps = {
  service: Service;
  compact?: boolean;
};

export function ServiceCard({ service, compact = false }: ServiceCardProps) {
  const category = getCategory(service.category);

  return (
    <article className="group flex h-full flex-col rounded-md border border-navy-100 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-teal-300 hover:shadow-md">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-700">
        {category?.title}
      </p>
      <h3 className="mt-3 text-lg font-semibold text-navy-950">{service.name}</h3>
      <p className="mt-3 flex-1 text-sm leading-6 text-navy-650">
        {service.shortDescription}
      </p>
      {!compact ? (
        <p className="mt-4 text-sm text-navy-700">
          <span className="font-semibold">Typical documents:</span>{" "}
          {service.requiredDocuments.slice(0, 3).join(", ")}
        </p>
      ) : null}
      <Link
        href={`/services/${service.slug}`}
        className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-teal-700"
      >
        View service <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
      </Link>
    </article>
  );
}
