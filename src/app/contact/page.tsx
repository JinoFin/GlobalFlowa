import { Mail, MapPin, MessageSquare } from "lucide-react";
import { ButtonLink } from "@/components/button-link";

export const metadata = {
  title: "Contact",
};

export default function ContactPage() {
  return (
    <div className="bg-white">
      <section className="bg-navy-950 px-4 py-16 text-white sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-teal-300">
            Contact Globalflowa
          </p>
          <h1 className="mt-5 text-4xl font-semibold tracking-tight sm:text-5xl">
            Talk to a Germany market-entry and compliance partner.
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-navy-100">
            For the fastest review, use the structured service request. For
            general questions, contact Globalflowa directly.
          </p>
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.85fr_1.15fr]">
          <div className="rounded-md border border-navy-100 bg-navy-50 p-6">
            <h2 className="text-2xl font-semibold text-navy-950">
              Preferred contact path
            </h2>
            <p className="mt-4 leading-7 text-navy-650">
              Submit the request form when your question involves products,
              registrations, warehouse stock, marketplace cases, or document
              review. It gives Globalflowa the structured information needed to
              respond efficiently.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <ButtonLink href="/request">Start request</ButtonLink>
              <ButtonLink href="/check-requirements" variant="secondary">
                Check requirements
              </ButtonLink>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <ContactCard icon={Mail} title="Email" body="info@globalflowa.com" />
            <ContactCard icon={MessageSquare} title="Languages" body="English first. German and Chinese planned." />
            <ContactCard icon={MapPin} title="Focus" body="Germany market entry, compliance, and warehouse preparation." />
          </div>
        </div>
      </section>
    </div>
  );
}

function ContactCard({
  icon: Icon,
  title,
  body,
}: {
  icon: typeof Mail;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-md border border-navy-100 bg-white p-5 shadow-sm">
      <Icon className="h-6 w-6 text-teal-700" />
      <h2 className="mt-5 font-semibold text-navy-950">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-navy-650">{body}</p>
    </div>
  );
}
