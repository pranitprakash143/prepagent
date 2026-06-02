export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      <div className="rounded-[2rem] border border-white/10 bg-slate-950/70 p-8">
        <div className="mb-6">
          <div className="h-4 w-32 animate-pulse rounded-full bg-white/10" />
          <div className="mt-3 h-10 w-72 animate-pulse rounded-full bg-white/10" />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-3xl border border-white/10 bg-slate-950/80 p-6">
              <div className="h-3 w-24 animate-pulse rounded-full bg-white/10" />
              <div className="mt-4 h-8 w-16 animate-pulse rounded-full bg-white/10" />
            </div>
          ))}
        </div>
      </div>
      <div className="rounded-[2rem] border border-white/10 bg-slate-950/70 p-8">
        <div className="h-4 w-40 animate-pulse rounded-full bg-white/10" />
        <div className="mt-4 space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-3xl bg-white/5" />
          ))}
        </div>
      </div>
    </div>
  );
}
