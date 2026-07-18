"use client";

import { usePathname } from "next/navigation";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export function ApplicationChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isApplicationRoute = pathname === "/portal" || pathname.startsWith("/portal/") || pathname === "/admin" || pathname.startsWith("/admin/");

  const skipLink = <a href="#main-content" className="fixed left-4 top-3 z-[100] -translate-y-24 rounded-md bg-navy-950 px-4 py-3 text-sm font-semibold text-white shadow-lg transition focus:translate-y-0 focus:outline-none focus:ring-2 focus:ring-teal-300">Skip to main content</a>;

  if (isApplicationRoute) return <>{skipLink}<main id="main-content" tabIndex={-1} className="flex min-h-full flex-1 flex-col outline-none">{children}</main></>;

  return (
    <>
      {skipLink}
      <SiteHeader />
      <main id="main-content" tabIndex={-1} className="flex-1 outline-none">{children}</main>
      <SiteFooter />
    </>
  );
}
