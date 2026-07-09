import { ButtonLink } from "@/components/button-link";
import { SectionHeader } from "@/components/section-header";
import { ServiceCard } from "@/components/service-card";
import { services } from "@/lib/catalog";

export const metadata = {
  title: "Warehouse Solutions",
};

export default function WarehousePage() {
  const warehouseServices = services.filter((service) => service.category === "warehouse");

  return (
    <div className="bg-white">
      <section className="bg-navy-950 px-4 py-16 text-white sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-teal-300">
            Warehouse solutions
          </p>
          <h1 className="mt-5 max-w-4xl text-4xl font-semibold tracking-tight sm:text-5xl">
            Storage, packing, relabeling, inspection and marketplace
            preparation in Germany.
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-navy-100">
            Globalflowa helps foreign sellers turn inbound goods into prepared,
            labeled, and shipment-ready stock for German and EU marketplaces.
          </p>
          <div className="mt-8">
            <ButtonLink href="/request?service=warehouse-storage-germany" className="bg-teal-500 text-navy-950 hover:bg-teal-300">
              Request warehouse support
            </ButtonLink>
          </div>
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <SectionHeader
            eyebrow="Warehouse scope"
            title="A practical German handling workflow for marketplace sellers"
            description="Send stock details, cartons, labels, delivery dates, and preparation needs in one structured request."
          />
          <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {["Inbound storage", "Inspection", "Packing and repacking", "Relabeling and shipment prep"].map((item) => (
              <div key={item} className="rounded-md border border-navy-100 bg-navy-50 p-5">
                <h2 className="font-semibold text-navy-950">{item}</h2>
                <p className="mt-2 text-sm leading-6 text-navy-650">
                  Designed for sellers who need clear product handling before
                  stock moves to marketplaces or customers.
                </p>
              </div>
            ))}
          </div>
          <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {warehouseServices.map((service) => (
              <ServiceCard key={service.slug} service={service} />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
