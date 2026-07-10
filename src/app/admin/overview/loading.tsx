export default function AdminOverviewLoading() {
  return (
    <div className="bg-navy-50 px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl animate-pulse">
        <div className="h-4 w-36 rounded bg-navy-100" />
        <div className="mt-4 h-10 w-80 max-w-full rounded bg-navy-100" />
        <div className="mt-3 h-5 max-w-2xl rounded bg-navy-100" />
        <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="h-36 rounded-md border border-navy-100 bg-white" />
          ))}
        </div>
        <div className="mt-8 h-24 rounded-md border border-navy-100 bg-white" />
        <div className="mt-8 grid gap-6 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="h-72 rounded-md border border-navy-100 bg-white" />
          ))}
        </div>
      </div>
    </div>
  );
}
