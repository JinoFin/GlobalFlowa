import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { ButtonLink } from "@/components/button-link";
import { SectionHeader } from "@/components/section-header";
import { ServiceCard } from "@/components/service-card";
import {
  featuredServices,
  knowledgeArticles,
  requirementHighlights,
  serviceCategories,
  services,
  trustBadges,
} from "@/lib/catalog";

export default function Home() {
  const featured = services.filter((service) => featuredServices.includes(service.slug));

  return (
    <>
      <section className="relative overflow-hidden bg-navy-950">
        <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(20,184,166,0.18),transparent_40%),radial-gradient(circle_at_80%_20%,rgba(204,251,241,0.14),transparent_24%)]" />
        <div className="relative mx-auto grid max-w-7xl gap-12 px-4 py-20 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:px-8 lg:py-28">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-teal-300">
              Globalflowa Germany market-entry portal
            </p>
            <h1 className="mt-6 max-w-4xl text-4xl font-semibold tracking-tight text-white sm:text-6xl">
              Launch, Comply, Store & Sell in Germany with Globalflowa
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-navy-100">
              One partner for German company setup, VAT, EPR compliance, EU
              Responsible Person, warehousing, labeling, packing and marketplace
              preparation.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <ButtonLink href="/check-requirements" className="bg-teal-500 text-navy-950 hover:bg-teal-300">
                Check What You Need
              </ButtonLink>
              <ButtonLink href="/request" variant="secondary" className="border-white/20 bg-white/10 text-white hover:bg-white hover:text-navy-950">
                Start Service Request
              </ButtonLink>
            </div>
            <div className="mt-10 grid gap-3 sm:grid-cols-2">
              {trustBadges.map((badge) => {
                const Icon = badge.icon;
                return (
                  <div key={badge.label} className="flex items-center gap-3 rounded-md border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-white">
                    <Icon className="h-4 w-4 text-teal-300" />
                    {badge.label}
                  </div>
                );
              })}
            </div>
          </div>
          <div className="rounded-md border border-white/10 bg-white p-6 shadow-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-teal-700">
              Smart intake
            </p>
            <h2 className="mt-3 text-2xl font-semibold text-navy-950">
              From market-entry questions to a structured request file.
            </h2>
            <div className="mt-6 grid gap-4">
              {requirementHighlights.map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.title} className="flex items-start gap-4 rounded-md bg-navy-50 p-4">
                    <span className="rounded-md bg-white p-2 text-teal-700 shadow-sm">
                      <Icon className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="font-semibold text-navy-950">{item.title}</p>
                      <p className="mt-1 text-sm leading-6 text-navy-650">
                        Collect the right evidence before you submit.
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <SectionHeader
            eyebrow="The problem"
            title="Germany rewards prepared sellers and quickly exposes missing registrations."
            description="Foreign sellers often need company formation decisions, VAT readiness, EPR registrations, product documentation, storage, labeling, and marketplace preparation before products can sell safely. Globalflowa turns that fragmented launch path into one structured intake."
          />
        </div>
      </section>

      <section className="bg-navy-50 px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <SectionHeader
            eyebrow="Service categories"
            title="One operating partner across compliance and logistics"
            description="Select the category that matches your current goal, or use the checker if the obligations are not clear yet."
          />
          <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {serviceCategories.map((category) => {
              const Icon = category.icon;
              return (
                <Link key={category.key} href="/services" className="rounded-md border border-navy-100 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-teal-300 hover:shadow-md">
                  <Icon className="h-8 w-8 text-teal-700" />
                  <h3 className="mt-5 text-lg font-semibold text-navy-950">{category.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-navy-650">{category.summary}</p>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bg-white px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <SectionHeader
            eyebrow="How it works"
            title="A structured path from uncertainty to next steps"
          />
          <div className="mt-10 grid gap-4 md:grid-cols-5">
            {[
              "Select your goal",
              "Answer smart questions",
              "Upload documents",
              "Globalflowa reviews your case",
              "We prepare the next steps",
            ].map((step, index) => (
              <div key={step} className="rounded-md border border-navy-100 bg-white p-5 shadow-sm">
                <span className="flex h-9 w-9 items-center justify-center rounded-md bg-teal-100 text-sm font-semibold text-teal-800">
                  {index + 1}
                </span>
                <p className="mt-5 font-semibold text-navy-950">{step}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-teal-50 px-4 py-14 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 rounded-md border border-teal-100 bg-white p-8 shadow-sm lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-navy-950">
              Not sure what you need? Use our Germany Market Entry Checker.
            </h2>
            <p className="mt-2 text-navy-650">
              Answer a guided set of questions and receive service recommendations.
            </p>
          </div>
          <ButtonLink href="/check-requirements">Open checker</ButtonLink>
        </div>
      </section>

      <section className="bg-white px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <SectionHeader
              eyebrow="Featured services"
              title="High-impact support for Germany launch readiness"
            />
            <ButtonLink href="/services" variant="ghost">View all services</ButtonLink>
          </div>
          <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {featured.map((service) => (
              <ServiceCard key={service.slug} service={service} />
            ))}
          </div>
        </div>
      </section>

      <section className="bg-navy-50 px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <SectionHeader
            eyebrow="Compliance knowledge"
            title="Clear explanations before you commit"
            description="Short English guides for the common German market-entry topics foreign sellers face."
          />
          <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {knowledgeArticles.slice(0, 6).map((article) => (
              <Link key={article.slug} href={`/knowledge/${article.slug}`} className="rounded-md border border-navy-100 bg-white p-5 shadow-sm transition hover:border-teal-300 hover:shadow-md">
                <CheckCircle2 className="h-5 w-5 text-teal-700" />
                <h3 className="mt-4 font-semibold text-navy-950">{article.title}</h3>
                <p className="mt-2 text-sm leading-6 text-navy-650">{article.summary}</p>
                <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-teal-700">
                  Read guide <ArrowRight className="h-4 w-4" />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-navy-950 sm:text-4xl">
            Start your Germany market-entry request today.
          </h2>
          <p className="mt-4 text-lg leading-8 text-navy-650">
            Send one structured request and give Globalflowa the context needed
            to review your launch, compliance, and warehouse needs.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <ButtonLink href="/request">Start Service Request</ButtonLink>
            <ButtonLink href="/contact" variant="secondary">Contact Globalflowa</ButtonLink>
          </div>
        </div>
      </section>
    </>
  );
}
