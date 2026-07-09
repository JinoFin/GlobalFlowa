import Link from "next/link";
import { ButtonLink } from "@/components/button-link";

const navItems = [
  { href: "/", label: "Home" },
  { href: "/services", label: "Services" },
  { href: "/check-requirements", label: "Check Requirements" },
  { href: "/knowledge", label: "Compliance Knowledge" },
  { href: "/warehouse", label: "Warehouse Solutions" },
  { href: "/contact", label: "Contact" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-navy-100 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-md bg-navy-950 text-lg font-bold text-white">
            G
          </span>
          <span>
            <span className="block text-lg font-semibold tracking-tight text-navy-950">
              Globalflowa
            </span>
            <span className="hidden text-xs font-medium uppercase tracking-[0.18em] text-teal-700 sm:block">
              Germany market entry
            </span>
          </span>
        </Link>
        <nav className="hidden items-center gap-6 text-sm font-medium text-navy-700 lg:flex">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} className="hover:text-teal-700">
              {item.label}
            </Link>
          ))}
          <Link href="/admin/login" className="hover:text-teal-700">
            Admin Login
          </Link>
        </nav>
        <div className="hidden sm:block">
          <ButtonLink href="/request">Start Request</ButtonLink>
        </div>
      </div>
      <nav className="flex gap-4 overflow-x-auto border-t border-navy-100 px-4 py-3 text-sm font-medium text-navy-700 lg:hidden">
        {navItems.map((item) => (
          <Link key={item.href} href={item.href} className="shrink-0">
            {item.label}
          </Link>
        ))}
        <Link href="/admin/login" className="shrink-0">
          Admin Login
        </Link>
      </nav>
    </header>
  );
}
