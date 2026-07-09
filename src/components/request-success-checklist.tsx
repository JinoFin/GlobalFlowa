"use client";

import { useState } from "react";
import { checklistCategories } from "@/lib/document-checklist";

type StoredChecklistItem = {
  category: string;
  title: string;
};

export function RequestSuccessChecklist() {
  const [items] = useState<StoredChecklistItem[]>(() => {
    if (typeof window === "undefined") return [];

    const stored = window.sessionStorage.getItem("globalflowa.lastChecklist");
    if (!stored) return [];

    try {
      return JSON.parse(stored) as StoredChecklistItem[];
    } catch {
      window.sessionStorage.removeItem("globalflowa.lastChecklist");
      return [];
    }
  });

  if (!items.length) {
    return null;
  }

  return (
    <section className="mt-6 rounded-md border border-navy-100 bg-navy-50 p-5 text-left">
      <h2 className="font-semibold text-navy-950">Document checklist preview</h2>
      <p className="mt-2 text-sm leading-6 text-navy-650">
        Based on your request, the following documents may be required. Final
        requirements depend on Globalflowa&apos;s review.
      </p>
      <div className="mt-4 space-y-4">
        {checklistCategories.map((category) => {
          const categoryItems = items.filter((item) => item.category === category);
          if (!categoryItems.length) return null;

          return (
            <div key={category}>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-teal-700">
                {category}
              </p>
              <ul className="mt-2 space-y-1 text-sm text-navy-650">
                {categoryItems.map((item) => (
                  <li key={`${category}-${item.title}`}>- {item.title}</li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </section>
  );
}
