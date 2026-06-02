export default function DocumentsLoading() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-center justify-between">
        <div className="h-4 w-24 animate-pulse rounded-full bg-white/10" />
        <div className="h-10 w-28 animate-pulse rounded-full bg-white/10" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 animate-pulse rounded-xl bg-white/10" />
              <div className="flex-1">
                <div className="h-4 w-36 animate-pulse rounded-full bg-white/10" />
                <div className="mt-2 h-3 w-20 animate-pulse rounded-full bg-white/10" />
              </div>
            </div>
            <div className="mt-3 h-2 w-full animate-pulse rounded-full bg-white/10" />
          </div>
        ))}
      </div>
    </div>
  );
}
