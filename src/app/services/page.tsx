import { ButtonLink } from "@/components/button-link";
import { SectionHeader } from "@/components/section-header";
import { ServiceCard } from "@/components/service-card";
import { serviceCategories, services } from "@/lib/catalog";

export const metadata = {
  title: "Services",
  description: "Germany market-entry, compliance coordination, warehouse preparation and marketplace document support reviewed against current official sources.",
};

export default function ServicesPage() {
  return (
    <div className="bg-white">
      <section className="bg-navy-950 px-4 py-16 text-white sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-teal-300">
            Globalflowa services
          </p>
          <h1 className="mt-5 max-w-4xl text-4xl font-semibold tracking-tight sm:text-5xl">
            Germany market-entry services across setup, compliance, warehouse
            and marketplace readiness.
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-navy-100">
            Every service page explains who needs it, what information is
            required, which documents to prepare, and how the request is
            reviewed.
          </p>
          <p className="mt-4 max-w-3xl text-sm leading-6 text-navy-200">Regulated content was last reviewed against the official sources shown on each service page on 12 July 2026.</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <ButtonLink href="/check-requirements" className="bg-teal-500 text-navy-950 hover:bg-teal-300">
              Check What You Need
            </ButtonLink>
            <ButtonLink href="/request" variant="secondary" className="border-white/20 bg-white/10 text-white hover:bg-white hover:text-navy-950">
              Start Service Request
            </ButtonLink>
          </div>
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl space-y-14">
          <nav aria-label="Service categories" className="flex flex-wrap gap-2 rounded-lg border border-navy-100 bg-navy-50 p-3">
            {serviceCategories.map((category) => (
              <a key={category.key} href={`#${category.key}`} className="inline-flex min-h-11 items-center rounded-md bg-white px-4 py-2 text-sm font-semibold text-navy-700 shadow-sm outline-none hover:text-teal-700 focus-visible:ring-2 focus-visible:ring-teal-500">
                {category.title}
              </a>
            ))}
          </nav>
          {serviceCategories.map((category) => {
            const categoryServices = services.filter(
              (service) => service.category === category.key,
            );

            return (
              <section key={category.key} id={category.key} className="scroll-mt-28">
                <SectionHeader
                  eyebrow={category.title}
                  title={category.summary}
                />
                <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                  {categoryServices.map((service) => (
                    <ServiceCard key={service.slug} service={service} />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </section>
    </div>
  );
}
