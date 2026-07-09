import Link from "next/link";
import { redirect } from "next/navigation";
import { serviceCategories, services as localServices } from "@/lib/catalog";
import { createSupabaseServerClient } from "@/lib/supabase/auth-server";

export const metadata = {
  title: "Admin Services",
};

export const dynamic = "force-dynamic";

type ServiceRow = {
  slug: string;
  name: string;
  category: string;
  short_description: string;
  service_questions?: Array<{ id: string; label: string; question_type: string }>;
};

export default async function AdminServicesPage() {
  let rows: ServiceRow[] = localServices.map((service) => ({
    slug: service.slug,
    name: service.name,
    category: service.category,
    short_description: service.shortDescription,
    service_questions: service.questions.map((question) => ({
      id: `${service.slug}.${question.key}`,
      label: question.label,
      question_type: question.type,
    })),
  }));
  let setupMessage: string | null = null;

  try {
    const supabase = await createSupabaseServerClient();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      redirect("/admin/login");
    }

    const { data, error } = await supabase
      .from("services")
      .select("slug, name, category, short_description, service_questions(id, label, question_type)")
      .order("display_order");

    if (error) {
      setupMessage = error.message;
    } else if (data) {
      rows = data as ServiceRow[];
    }
  } catch (error) {
    setupMessage = error instanceof Error ? error.message : "Using local catalog fallback.";
  }

  return (
    <div className="bg-navy-50 px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <Link href="/admin/requests" className="text-sm font-semibold text-teal-700">
          Back to requests
        </Link>
        <div className="mt-5">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-teal-700">
            Admin
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-navy-950">
            Service catalog
          </h1>
          <p className="mt-3 max-w-3xl text-navy-650">
            Services and questions are seeded in Supabase so they can be edited
            later. If Supabase is not configured, this page shows the local
            catalog used by the website.
          </p>
          {setupMessage ? (
            <div className="mt-5 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              {setupMessage}
            </div>
          ) : null}
        </div>

        <div className="mt-8 space-y-10">
          {serviceCategories.map((category) => {
            const categoryRows = rows.filter((row) => row.category === category.key);
            return (
              <section key={category.key}>
                <h2 className="text-xl font-semibold text-navy-950">{category.title}</h2>
                <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {categoryRows.map((service) => (
                    <article key={service.slug} className="rounded-md border border-navy-100 bg-white p-5 shadow-sm">
                      <h3 className="font-semibold text-navy-950">{service.name}</h3>
                      <p className="mt-2 text-sm leading-6 text-navy-650">{service.short_description}</p>
                      <p className="mt-4 text-xs font-semibold uppercase tracking-[0.14em] text-teal-700">
                        {service.service_questions?.length ?? 0} questions
                      </p>
                    </article>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}
