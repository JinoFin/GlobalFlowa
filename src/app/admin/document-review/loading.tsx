export default function DocumentReviewLoading() {
  return (
    <div className="bg-navy-50 px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl animate-pulse">
        <div className="h-4 w-32 rounded bg-navy-100" />
        <div className="mt-5 h-9 w-72 rounded bg-navy-100" />
        <div className="mt-3 h-5 max-w-2xl rounded bg-navy-100" />
        <div className="mt-8 h-28 rounded-md border border-navy-100 bg-white" />
        <div className="mt-6 h-56 rounded-md border border-navy-100 bg-white" />
      </div>
    </div>
  );
}
