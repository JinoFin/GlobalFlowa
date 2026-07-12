"use client";

import { usePathname } from "next/navigation";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export function ApplicationChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isApplicationRoute = pathname === "/portal" || pathname.startsWith("/portal/") || pathname === "/admin" || pathname.startsWith("/admin/");

  if (isApplicationRoute) return <main className="flex min-h-full flex-1 flex-col">{children}</main>;

  return (
    <>
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </>
  );
}
