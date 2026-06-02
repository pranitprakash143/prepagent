export default function NotesLoading() {
  return (
    <div className="space-y-6">
      <div className="rounded-[2rem] border border-white/10 bg-slate-950/70 p-8">
        <div className="flex items-center justify-between">
          <div>
            <div className="h-4 w-36 animate-pulse rounded-full bg-white/10" />
            <div className="mt-3 h-8 w-56 animate-pulse rounded-full bg-white/10" />
          </div>
          <div className="h-10 w-36 animate-pulse rounded-full bg-white/10" />
        </div>
        <div className="mt-6 space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-3xl bg-white/5" />
          ))}
        </div>
      </div>
    </div>
  );
}
