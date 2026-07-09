import { notFound } from "next/navigation";
import { ButtonLink } from "@/components/button-link";
import { getCategory, getServiceBySlug, services } from "@/lib/catalog";

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
  };
}

export default async function ServiceDetailPage({ params }: ServiceDetailPageProps) {
  const { slug } = await params;
  const service = getServiceBySlug(slug);

  if (!service) {
    notFound();
  }

  const category = getCategory(service.category);

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
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-md border border-navy-100 bg-navy-50 p-6">
            <h2 className="text-2xl font-semibold text-navy-950">
              Who needs this service
            </h2>
            <p className="mt-4 leading-7 text-navy-650">{service.whoNeedsIt}</p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <InfoList title="Required information" items={service.requiredInformation} />
            <InfoList title="Required documents" items={service.requiredDocuments} />
          </div>
        </div>
      </section>

      <section className="bg-navy-50 px-4 py-16 sm:px-6 lg:px-8">
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

      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <h2 className="text-3xl font-semibold tracking-tight text-navy-950">
            Smart request questions
          </h2>
          <p className="mt-4 max-w-3xl text-navy-650">
            The request form adapts to this service and asks for the following
            information where relevant.
          </p>
          <div className="mt-8 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {service.questions
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
