import { redirect } from "next/navigation";
import { serviceCategories, services as localServices } from "@/lib/catalog";
import { createSupabaseServerClient } from "@/lib/supabase/auth-server";
import { isAdminUser } from "@/lib/supabase/roles";
import { getServiceContent } from "@/lib/service-content";
import { AppPageHeader } from "@/components/app-page";

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
  let supabase;

  try {
    supabase = await createSupabaseServerClient();
  } catch (error) {
    console.error("Admin services configuration unavailable", { reason: error instanceof Error ? error.message : "unknown error" });
    setupMessage = "Live catalog data is temporarily unavailable. Showing the validated website catalog.";
  }

  if (supabase) {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      redirect("/admin/login");
    }
    if (!(await isAdminUser(supabase, userData.user))) {
      redirect("/portal/requests");
    }

    const { data, error } = await supabase
      .from("services")
      .select("slug, name, category, short_description, service_questions(id, label, question_type)")
      .order("display_order");

    if (error) {
      console.error("Admin services live catalog load failed", { reason: error.message });
      setupMessage = "Live catalog data could not be loaded. Showing the validated website catalog.";
    } else if (data) {
      rows = (data as ServiceRow[]).map((row) => {
        const local = localServices.find((service) => service.slug === row.slug);
        return local ? { ...row, name: local.name, short_description: local.shortDescription, service_questions: local.questions.map((question) => ({ id: `${local.slug}.${question.key}`, label: question.label, question_type: question.type })) } : row;
      });
    }
  }

  return (
    <div className="bg-navy-50 px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div>
          <AppPageHeader eyebrow="Admin" title="Service catalog" description="Read-only visibility into the validated public catalog. Legal content remains source-controlled and cannot be edited in the browser." />
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
                    <AdminServiceCard key={service.slug} service={service} categoryTitle={category.title} />
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

function AdminServiceCard({ service, categoryTitle }: { service: ServiceRow; categoryTitle: string }) {
  const local = localServices.find((item) => item.slug === service.slug);
  const content = local ? getServiceContent(local) : null;

  return (
    <article className="rounded-lg border border-navy-100 bg-white p-5 shadow-sm">
      <h3 className="font-semibold text-navy-950">{service.name}</h3>
      <p className="mt-2 text-sm leading-6 text-navy-650">{service.short_description}</p>
      <dl className="mt-5 grid gap-3 border-t border-navy-100 pt-4 text-sm sm:grid-cols-2">
        <div><dt className="font-semibold text-navy-950">Slug</dt><dd className="mt-1 break-all font-mono text-xs text-navy-650">{service.slug}</dd></div>
        <div><dt className="font-semibold text-navy-950">Category</dt><dd className="mt-1 text-navy-650">{categoryTitle}</dd></div>
        <div><dt className="font-semibold text-navy-950">Content type</dt><dd className="mt-1 text-navy-650">{content?.regulated ? "Regulated" : "Operational"}</dd></div>
        <div><dt className="font-semibold text-navy-950">Last reviewed</dt><dd className="mt-1 text-navy-650">{content?.lastReviewed ?? "Not available"}</dd></div>
        <div><dt className="font-semibold text-navy-950">Official sources</dt><dd className="mt-1 text-navy-650">{content?.sourceIds.length ?? 0}</dd></div>
        <div><dt className="font-semibold text-navy-950">Validation</dt><dd className="mt-1 font-semibold text-teal-700">{content ? "Passed" : "Needs review"}</dd></div>
        <div><dt className="font-semibold text-navy-950">Intake questions</dt><dd className="mt-1 text-navy-650">{service.service_questions?.length ?? 0}</dd></div>
      </dl>
    </article>
  );
}
