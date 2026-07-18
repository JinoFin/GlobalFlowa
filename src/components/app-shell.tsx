"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { LogoutButton } from "@/components/admin/logout-button";
import { PortalLogoutButton } from "@/components/portal/logout-button";

type NavItem = { href: string; label: string; exact?: boolean };

const portalItems: NavItem[] = [
  { href: "/portal", label: "Dashboard", exact: true },
  { href: "/portal/requests", label: "My Requests" },
  { href: "/portal/profile", label: "Profile & Company" },
];

const adminItems: NavItem[] = [
  { href: "/admin/overview", label: "Overview" },
  { href: "/admin/requests", label: "Requests" },
  { href: "/admin/workboard", label: "Workboard" },
  { href: "/admin/document-review", label: "Document Review" },
  { href: "/admin/services", label: "Services" },
];

const portalPublicRoutes = ["/portal/login", "/portal/signup", "/portal/forgot-password", "/portal/update-password"];

function isActive(pathname: string, item: NavItem) {
  return item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
}

function Navigation({ items, pathname, onNavigate }: { items: NavItem[]; pathname: string; onNavigate?: () => void }) {
  return (
    <nav aria-label="Primary application navigation" className="space-y-1">
      {items.map((item) => {
        const active = isActive(pathname, item);
        return <Link key={item.href} href={item.href} onClick={onNavigate} aria-current={active ? "page" : undefined} className={`flex min-h-11 items-center rounded-md px-3 py-2 text-sm font-semibold outline-none transition focus-visible:ring-2 focus-visible:ring-teal-400 ${active ? "bg-teal-50 text-teal-800" : "text-navy-700 hover:bg-navy-50 hover:text-navy-950"}`}>{item.label}</Link>;
      })}
    </nav>
  );
}

export function AppShell({ type, children }: { type: "portal" | "admin"; children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const isPublicAuthPage = type === "portal" ? portalPublicRoutes.includes(pathname) : pathname === "/admin/login";
  const items = type === "portal" ? portalItems : adminItems;

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeMobileNavigation();
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'));
      const first = focusable[0];
      const last = focusable.at(-1);
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  function closeMobileNavigation(restoreFocus = true) {
    setOpen(false);
    if (restoreFocus) window.requestAnimationFrame(() => triggerRef.current?.focus());
  }

  if (isPublicAuthPage) return children;

  const logout = type === "portal"
    ? <PortalLogoutButton className="min-h-11 w-full rounded-md border border-navy-200 bg-white px-3 py-2 text-sm font-semibold text-navy-950 hover:border-teal-400 disabled:opacity-50" />
    : <LogoutButton />;

  return (
    <div className="min-h-screen bg-navy-50 lg:grid lg:grid-cols-[256px_minmax(0,1fr)]">
      <aside className="hidden border-r border-navy-100 bg-white lg:flex lg:min-h-screen lg:flex-col lg:p-5">
        <Link href={type === "portal" ? "/portal" : "/admin/overview"} className="rounded-md px-2 py-2 text-xl font-semibold text-navy-950 outline-none focus-visible:ring-2 focus-visible:ring-teal-400">Global<span className="text-teal-600">flowa</span></Link>
        <p className="mb-6 px-2 text-xs font-semibold uppercase tracking-[0.16em] text-navy-500">{type === "portal" ? "Customer portal" : "Staff workspace"}</p>
        <Navigation items={items} pathname={pathname} />
        <div className="mt-5 border-t border-navy-100 pt-5">
          {type === "portal" ? <div className="space-y-1"><Link href="/request" className="flex min-h-11 items-center rounded-md bg-teal-500 px-3 py-2 text-sm font-semibold text-navy-950">Start New Request</Link><Link href="/contact" className="flex min-h-11 items-center rounded-md px-3 py-2 text-sm font-semibold text-navy-700 hover:bg-navy-50">Help / Contact</Link></div> : <div className="space-y-1"><Link href="/api/admin/export" className="flex min-h-11 items-center rounded-md px-3 py-2 text-sm font-semibold text-navy-700 hover:bg-navy-50">Export CSV</Link><Link href="/portal" className="flex min-h-11 items-center rounded-md px-3 py-2 text-sm font-semibold text-navy-700 hover:bg-navy-50">Open Customer Portal</Link></div>}
        </div>
        <div className="mt-auto border-t border-navy-100 pt-5">
          {type === "admin" ? <div className="mb-3 px-2"><p className="text-sm font-semibold text-navy-950">Globalflowa staff</p><p className="text-xs text-navy-500">Admin or Team</p></div> : null}
          {logout}
        </div>
      </aside>
      <div className="min-w-0">
        <header className="sticky top-0 z-30 flex min-h-16 items-center justify-between border-b border-navy-100 bg-white px-4 lg:hidden">
          <Link href={type === "portal" ? "/portal" : "/admin/overview"} className="text-lg font-semibold text-navy-950">Global<span className="text-teal-600">flowa</span></Link>
          <button ref={triggerRef} type="button" aria-label={`Open ${type} navigation`} aria-expanded={open} aria-controls={`${type}-mobile-navigation`} onClick={() => setOpen(true)} className="min-h-11 rounded-md border border-navy-200 px-4 text-sm font-semibold text-navy-950 outline-none focus-visible:ring-2 focus-visible:ring-teal-400">Menu</button>
        </header>
        {open ? <div className="fixed inset-0 z-50 lg:hidden"><button type="button" aria-label="Close navigation" className="absolute inset-0 bg-navy-950/40" onClick={() => closeMobileNavigation()} /><aside ref={dialogRef} id={`${type}-mobile-navigation`} role="dialog" aria-modal="true" aria-labelledby={`${type}-mobile-navigation-title`} className="absolute right-0 top-0 flex h-full w-[min(88vw,340px)] flex-col overflow-y-auto bg-white p-5 shadow-xl"><div className="mb-5 flex items-center justify-between"><p id={`${type}-mobile-navigation-title`} className="font-semibold text-navy-950">Navigation</p><button ref={closeButtonRef} type="button" onClick={() => closeMobileNavigation()} className="min-h-11 rounded-md px-3 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-teal-400">Close</button></div><Navigation items={items} pathname={pathname} onNavigate={() => closeMobileNavigation(false)} /><div className="mt-5 border-t border-navy-100 pt-5">{type === "portal" ? <div className="space-y-2"><Link href="/request" onClick={() => closeMobileNavigation(false)} className="flex min-h-11 items-center rounded-md bg-teal-500 px-3 py-2 text-sm font-semibold text-navy-950">Start New Request</Link><Link href="/contact" onClick={() => closeMobileNavigation(false)} className="flex min-h-11 items-center rounded-md px-3 py-2 text-sm font-semibold text-navy-700">Help / Contact</Link></div> : <div className="space-y-2"><Link href="/api/admin/export" className="flex min-h-11 items-center rounded-md px-3 py-2 text-sm font-semibold text-navy-700">Export CSV</Link><Link href="/portal" className="flex min-h-11 items-center rounded-md px-3 py-2 text-sm font-semibold text-navy-700">Open Customer Portal</Link></div>}</div><div className="mt-auto border-t border-navy-100 pt-5">{logout}</div></aside></div> : null}
        {children}
      </div>
    </div>
  );
}
