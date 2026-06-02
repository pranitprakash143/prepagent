import type { Meta, StoryObj } from "@storybook/react";

function DashboardSkeleton() {
  return (
    <div className="mx-auto max-w-7xl space-y-8 p-6">
      <div className="space-y-2">
        <div className="h-4 w-32 animate-pulse rounded-full bg-white/10" />
        <div className="h-8 w-64 animate-pulse rounded-full bg-white/10" />
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
  );
}

function NotesSkeleton() {
  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <div className="space-y-2">
        <div className="h-4 w-32 animate-pulse rounded-full bg-white/10" />
        <div className="h-8 w-48 animate-pulse rounded-full bg-white/10" />
      </div>
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-3xl border border-white/10 bg-slate-900/80 p-6">
            <div className="h-5 w-48 animate-pulse rounded-full bg-white/10" />
            <div className="mt-3 h-3 w-full animate-pulse rounded-full bg-white/10" />
            <div className="mt-2 h-3 w-3/4 animate-pulse rounded-full bg-white/10" />
          </div>
        ))}
      </div>
    </div>
  );
}

function UploadSkeleton() {
  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <div className="space-y-2">
        <div className="h-4 w-32 animate-pulse rounded-full bg-white/10" />
        <div className="h-8 w-56 animate-pulse rounded-full bg-white/10" />
      </div>
      <div className="rounded-[2rem] border border-white/10 bg-slate-950/80 p-8">
        <div className="h-4 w-24 animate-pulse rounded-full bg-white/10" />
        <div className="mt-4 h-6 w-72 animate-pulse rounded-full bg-white/10" />
        <div className="mt-6 space-y-4">
          <div className="h-14 w-full animate-pulse rounded-3xl bg-white/10" />
          <div className="h-14 w-full animate-pulse rounded-3xl bg-white/10" />
          <div className="mt-4 h-12 w-48 animate-pulse rounded-full bg-white/10" />
        </div>
      </div>
    </div>
  );
}

const meta: Meta = {
  title: "Components/Loading States",
  parameters: {
    layout: "fullscreen",
  },
};

export default meta;

export const Dashboard: StoryObj = {
  render: () => <DashboardSkeleton />,
};

export const Notes: StoryObj = {
  render: () => <NotesSkeleton />,
};

export const Upload: StoryObj = {
  render: () => <UploadSkeleton />,
};
