"use client";

import { ReactNode } from "react";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export default function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex min-h-[200px] flex-col items-center justify-center rounded-3xl border border-dashed border-white/10 bg-slate-950/70 p-8 text-center">
      {icon && <div className="mb-4 text-slate-500">{icon}</div>}
      <h3 className="text-lg font-semibold text-white">{title}</h3>
      <p className="mt-2 max-w-md text-sm text-slate-400">{description}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="btn-primary mt-6 inline-flex items-center justify-center rounded-full px-6 py-3 text-sm font-semibold"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
