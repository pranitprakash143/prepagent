export default function UploadLoading() {
  return (
    <div className="space-y-6">
      <div className="rounded-[2rem] border border-white/10 bg-slate-950/70 p-8">
        <div className="h-4 w-40 animate-pulse rounded-full bg-white/10" />
        <div className="mt-3 h-8 w-64 animate-pulse rounded-full bg-white/10" />
        <div className="mt-6 space-y-4">
          <div className="h-14 animate-pulse rounded-3xl bg-white/5" />
          <div className="h-32 animate-pulse rounded-3xl bg-white/5" />
        </div>
      </div>
    </div>
  );
}
