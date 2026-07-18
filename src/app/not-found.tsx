import Link from "next/link";

export default function NotFound() {
  return (
    <div className="bg-navy-50 px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl rounded-lg border border-navy-100 bg-white p-8 text-center shadow-sm sm:p-10">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-teal-700">404</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-navy-950">Page not found</h1>
        <p className="mt-4 leading-7 text-navy-650">The page may have moved, or the address may be incomplete. Existing service URLs remain available from the service index.</p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link href="/services" className="inline-flex min-h-11 items-center justify-center rounded-md bg-navy-950 px-5 py-3 text-sm font-semibold text-white">View services</Link>
          <Link href="/" className="inline-flex min-h-11 items-center justify-center rounded-md border border-navy-200 px-5 py-3 text-sm font-semibold text-navy-950">Return home</Link>
          <Link href="/contact" className="inline-flex min-h-11 items-center justify-center rounded-md px-5 py-3 text-sm font-semibold text-teal-700">Contact Globalflowa</Link>
        </div>
      </div>
    </div>
  );
}
