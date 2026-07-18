import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-navy-100 bg-navy-950 text-white">
      <div className="mx-auto max-w-7xl px-4 pt-10 sm:px-6 lg:px-8"><p className="border-b border-white/10 pb-8 text-sm leading-6 text-navy-200">Globalflowa provides operational, documentation and coordination support. Information on this website is general and does not replace product-specific legal, tax, technical or authority advice.</p></div>
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[1.4fr_1fr_1fr] lg:px-8">
        <div>
          <p className="text-xl font-semibold">Globalflowa</p>
          <p className="mt-4 max-w-xl text-sm leading-6 text-navy-100">
            Premium Germany market-entry, compliance, and logistics support for
            foreign companies preparing to sell safely and professionally.
          </p>
        </div>
        <div>
          <p className="font-semibold">Phase 1 portal</p>
          <ul className="mt-4 space-y-2 text-sm text-navy-100">
            <li><Link href="/services">Services</Link></li>
            <li><Link href="/check-requirements">Requirement checker</Link></li>
            <li><Link href="/request">Service request</Link></li>
            <li><Link href="/knowledge">Knowledge base</Link></li>
          </ul>
        </div>
        <div>
          <p className="font-semibold">Contact</p>
          <p className="mt-4 text-sm text-navy-100">info@globalflowa.com</p>
          <p className="mt-2 text-sm text-navy-100">
            English first. German and Chinese structure prepared for future
            localization.
          </p>
        </div>
      </div>
    </footer>
  );
}
