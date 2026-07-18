"use client";

import Link from "next/link";
import { Menu, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type PublicNavItem = {
  href: string;
  label: string;
};

export function PublicMobileNavigation({ items }: { items: PublicNavItem[] }) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  function closeMenu({ restoreFocus = true } = {}) {
    setOpen(false);
    if (restoreFocus) {
      window.requestAnimationFrame(() => triggerRef.current?.focus());
    }
  }

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        closeMenu();
        return;
      }

      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      );
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
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div className="lg:hidden">
      <button
        ref={triggerRef}
        type="button"
        aria-label="Open public navigation"
        aria-expanded={open}
        aria-controls="public-mobile-navigation"
        onClick={() => setOpen(true)}
        className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md border border-navy-200 text-navy-950 outline-none transition hover:border-teal-400 focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2"
      >
        <Menu className="h-5 w-5" aria-hidden="true" />
      </button>

      {open ? (
        <div className="fixed inset-0 z-50">
          <button
            type="button"
            aria-label="Close public navigation"
            className="absolute inset-0 bg-navy-950/50"
            onClick={() => closeMenu()}
          />
          <div
            ref={dialogRef}
            id="public-mobile-navigation"
            role="dialog"
            aria-modal="true"
            aria-labelledby="public-navigation-title"
            className="absolute right-0 top-0 flex h-full w-[min(90vw,360px)] flex-col overflow-y-auto bg-white p-5 shadow-2xl"
          >
            <div className="flex items-center justify-between gap-4 border-b border-navy-100 pb-4">
              <div>
                <p id="public-navigation-title" className="font-semibold text-navy-950">
                  Global<span className="text-teal-600">flowa</span>
                </p>
                <p className="text-xs text-navy-650">Public navigation</p>
              </div>
              <button
                ref={closeRef}
                type="button"
                aria-label="Close public navigation"
                onClick={() => closeMenu()}
                className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md text-navy-950 outline-none hover:bg-navy-50 focus-visible:ring-2 focus-visible:ring-teal-500"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            <nav aria-label="Mobile public navigation" className="mt-5 space-y-1">
              {items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => closeMenu({ restoreFocus: false })}
                  className="flex min-h-11 items-center rounded-md px-3 py-2 text-sm font-semibold text-navy-700 outline-none hover:bg-navy-50 hover:text-navy-950 focus-visible:ring-2 focus-visible:ring-teal-500"
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            <div className="mt-6 space-y-3 border-t border-navy-100 pt-5">
              <Link
                href="/request"
                onClick={() => closeMenu({ restoreFocus: false })}
                className="flex min-h-11 items-center justify-center rounded-md bg-teal-500 px-4 py-2 text-sm font-semibold text-navy-950 outline-none hover:bg-teal-300 focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2"
              >
                Start Request
              </Link>
              <Link
                href="/portal/login"
                onClick={() => closeMenu({ restoreFocus: false })}
                className="flex min-h-11 items-center justify-center rounded-md border border-navy-200 px-4 py-2 text-sm font-semibold text-navy-950 outline-none hover:border-teal-400 focus-visible:ring-2 focus-visible:ring-teal-500"
              >
                Customer Portal
              </Link>
              <Link
                href="/admin/login"
                onClick={() => closeMenu({ restoreFocus: false })}
                className="flex min-h-11 items-center justify-center rounded-md px-4 py-2 text-sm font-semibold text-navy-650 outline-none hover:bg-navy-50 focus-visible:ring-2 focus-visible:ring-teal-500"
              >
                Admin Login
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
