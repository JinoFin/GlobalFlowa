import { notFound } from "next/navigation";
import { ButtonLink } from "@/components/button-link";
import { OfficialSources } from "@/components/official-sources";
import { getCategory, getServiceBySlug, services } from "@/lib/catalog";
import { getContentSources } from "@/lib/content-sources";
import { getServiceContent } from "@/lib/service-content";

type ServiceDetailPageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return services.map((service) => ({ slug: service.slug }));
}

export async function generateMetadata({ params }: ServiceDetailPageProps) {
  const { slug } = await params;
  const service = getServiceBySlug(slug);

  return {
    title: service ? service.name : "Service",
    description: service?.shortDescription,
  };
}

export default async function ServiceDetailPage({ params }: ServiceDetailPageProps) {
  const { slug } = await params;
  const service = getServiceBySlug(slug);

  if (!service) {
    notFound();
  }

  const category = getCategory(service.category);
  const content = getServiceContent(service);
  const sources = getContentSources(content.sourceIds);

  return (
    <div className="bg-white">
      <section className="bg-navy-950 px-4 py-16 text-white sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-teal-300">
            {category?.title}
          </p>
          <h1 className="mt-5 text-4xl font-semibold tracking-tight sm:text-5xl">
            {service.name}
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-navy-100">
            {service.shortDescription}
          </p>
          {content.regulated ? <p className="mt-4 max-w-3xl text-sm leading-6 text-navy-200">Reviewed against the official sources listed below. Requirements can change and depend on the product, business model and sales route.</p> : null}
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <ButtonLink href={`/request?service=${service.slug}`} className="bg-teal-500 text-navy-950 hover:bg-teal-300">
              Request this service
            </ButtonLink>
            <ButtonLink href="/check-requirements" variant="secondary" className="border-white/20 bg-white/10 text-white hover:bg-white hover:text-navy-950">
              Check requirements
            </ButtonLink>
          </div>
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <nav aria-label="On this page" className="mb-8 rounded-lg border border-navy-100 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-700">On this page</p>
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold text-navy-700">
              <a href="#service-overview" className="rounded-sm outline-none hover:text-teal-700 focus-visible:ring-2 focus-visible:ring-teal-500">Overview and scope</a>
              <a href="#process" className="rounded-sm outline-none hover:text-teal-700 focus-visible:ring-2 focus-visible:ring-teal-500">Process</a>
              <a href="#limitations" className="rounded-sm outline-none hover:text-teal-700 focus-visible:ring-2 focus-visible:ring-teal-500">Limitations</a>
              <a href="#request-questions" className="rounded-sm outline-none hover:text-teal-700 focus-visible:ring-2 focus-visible:ring-teal-500">Request questions</a>
              {sources.length ? <a href="#official-sources" className="rounded-sm outline-none hover:text-teal-700 focus-visible:ring-2 focus-visible:ring-teal-500">Official sources</a> : null}
            </div>
          </nav>
        </div>
        <div id="service-overview" className="mx-auto grid max-w-7xl scroll-mt-28 gap-8 lg:grid-cols-2">
          <div className="rounded-md border border-navy-100 bg-navy-50 p-6">
            <h2 className="text-2xl font-semibold text-navy-950">Service overview</h2>
            <p className="mt-4 leading-7 text-navy-650">{content.scope}</p>
            <h3 className="mt-6 text-lg font-semibold text-navy-950">Who may need this</h3>
            <p className="mt-4 leading-7 text-navy-650">{service.whoNeedsIt}</p>
            <h3 className="mt-6 text-lg font-semibold text-navy-950">When it may not apply</h3>
            <p className="mt-3 leading-7 text-navy-650">{content.whoMayNotNeedIt}</p>
          </div>
          <div className="grid gap-6"><InfoList title="What Globalflowa handles" items={content.whatGlobalflowaDoes} /><InfoList title="What the customer remains responsible for" items={content.customerResponsibilities} /></div>
        </div>
      </section>

      <section className="px-4 pb-16 sm:px-6 lg:px-8"><div className="mx-auto grid max-w-7xl gap-6 md:grid-cols-2"><InfoList title="Information needed" items={service.requiredInformation} /><InfoList title="Documents commonly requested" items={service.requiredDocuments} /></div></section>

      <section id="process" className="scroll-mt-28 bg-navy-50 px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <h2 className="text-3xl font-semibold tracking-tight text-navy-950">
            Process steps
          </h2>
          <div className="mt-8 grid gap-4 md:grid-cols-4">
            {service.processSteps.map((step, index) => (
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

      <section id="limitations" className="scroll-mt-28 px-4 py-16 sm:px-6 lg:px-8"><div className="mx-auto grid max-w-7xl gap-6 md:grid-cols-3"><InfoList title="Ongoing obligations" items={content.ongoingObligations} /><InfoList title="Important limitations" items={content.importantLimitations} /><InfoList title="Common mistakes" items={content.commonMistakes} /></div><div className="mx-auto mt-8 max-w-7xl rounded-lg border border-amber-200 bg-amber-50 p-5 sm:p-6"><h2 className="text-xl font-semibold text-amber-950">Legal basis and authority</h2><p className="mt-3 text-sm leading-6 text-amber-900">{content.legalBasis} {content.authority}</p><p className="mt-3 text-sm leading-6 text-amber-900">{content.disclaimer}</p></div></section>

      <section id="request-questions" className="scroll-mt-28 px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <h2 className="text-3xl font-semibold tracking-tight text-navy-950">
            Smart request questions
          </h2>
          <p className="mt-4 max-w-3xl text-navy-650">
            The request form adapts to this service and asks for the following
            information where relevant.
          </p>
          <div className="mt-8 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {[...service.questions]
              .sort((a, b) => a.order - b.order)
              .map((question) => (
                <div key={question.key} className="rounded-md border border-navy-100 bg-white p-4">
                  <p className="font-semibold text-navy-950">{question.label}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.16em] text-teal-700">
                    {question.type.replace("_", " ")}
                    {question.required ? " · required" : ""}
                  </p>
                </div>
              ))}
          </div>
          <div className="mt-10">
            <ButtonLink href={`/request?service=${service.slug}`}>Request this service</ButtonLink>
          </div>
        </div>
      </section>

      <OfficialSources sources={sources} />
    </div>
  );
}

function InfoList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-md border border-navy-100 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-navy-950">{title}</h2>
      <ul className="mt-5 space-y-3 text-sm leading-6 text-navy-650">
        {items.map((item) => (
          <li key={item} className="flex gap-3">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-teal-600" />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
