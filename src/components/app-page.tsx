import Link from "next/link";

export type BreadcrumbItem = { label: string; href?: string };

export function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  return <nav aria-label="Breadcrumb"><ol className="flex flex-wrap items-center gap-2 text-sm text-navy-600">{items.map((item, index) => <li key={`${item.label}-${index}`} className="flex items-center gap-2">{index ? <span aria-hidden="true">/</span> : null}{item.href ? <Link href={item.href} className="font-semibold text-teal-700 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400">{item.label}</Link> : <span aria-current="page">{item.label}</span>}</li>)}</ol></nav>;
}

export function AppPageHeader({ eyebrow, title, description, breadcrumbs, actions }: { eyebrow?: string; title: string; description?: string; breadcrumbs?: BreadcrumbItem[]; actions?: React.ReactNode }) {
  return <header className="space-y-4">{breadcrumbs ? <Breadcrumbs items={breadcrumbs} /> : null}<div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div>{eyebrow ? <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-700">{eyebrow}</p> : null}<h1 className="mt-1 text-3xl font-semibold tracking-tight text-navy-950">{title}</h1>{description ? <p className="mt-2 max-w-3xl text-sm leading-6 text-navy-650">{description}</p> : null}</div>{actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}</div></header>;
}

export function LoadingState({ label = "Loading application…" }: { label?: string }) {
  return <div role="status" className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8"><div className="animate-pulse rounded-lg border border-navy-100 bg-white p-8 shadow-sm"><div className="h-3 w-32 rounded bg-teal-100" /><div className="mt-4 h-8 w-64 max-w-full rounded bg-navy-100" /><p className="sr-only">{label}</p></div></div>;
}
