import { RequirementChecker } from "@/components/requirement-checker";

export const metadata = {
  title: "Check Requirements",
};

export default function CheckRequirementsPage() {
  return (
    <div className="bg-navy-50">
      <section className="bg-navy-950 px-4 py-16 text-white sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-teal-300">
            Germany market-entry checker
          </p>
          <h1 className="mt-5 text-4xl font-semibold tracking-tight sm:text-5xl">
            Find the services your Germany launch may require.
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-navy-100">
            Answer a guided set of questions about your company, products,
            marketplaces, registrations, warehouse needs, and urgency.
          </p>
        </div>
      </section>
      <section className="px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <RequirementChecker />
        </div>
      </section>
    </div>
  );
}
