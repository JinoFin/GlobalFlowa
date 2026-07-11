export default function WorkboardLoading() {
  return (
    <div className="bg-navy-50 px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl animate-pulse">
        <div className="h-4 w-60 rounded bg-navy-100" />
        <div className="mt-5 h-10 w-80 max-w-full rounded bg-navy-100" />
        <div className="mt-8 h-40 rounded-md border border-navy-100 bg-white" />
        <div className="mt-6 grid gap-4 xl:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-80 rounded-md border border-navy-100 bg-white" />)}
        </div>
      </div>
    </div>
  );
}
