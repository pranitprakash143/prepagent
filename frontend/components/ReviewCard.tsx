import React from "react";

interface ReviewCardProps {
  title: string;
  excerpt: string;
  tags?: string[];
  difficulty?: "easy" | "medium" | "hard";
  onStudy?: () => void;
}

export default function ReviewCard({
  title,
  excerpt,
  tags = [],
  difficulty = "medium",
  onStudy,
}: ReviewCardProps) {
  const difficultyColors = {
    easy: "bg-emerald-500/10 text-emerald-300 border-emerald-500/30",
    medium: "bg-amber-500/10 text-amber-300 border-amber-500/30",
    hard: "bg-rose-500/10 text-rose-300 border-rose-500/30",
  };

  return (
    <article className="rounded-3xl border border-white/10 bg-slate-900/80 p-6 shadow-xl shadow-black/10 transition hover:border-rose-400/30 hover:bg-slate-900/95">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex-1">
          <h3 className="text-xl font-semibold text-white">{title}</h3>
          <p className="mt-2 text-sm leading-7 text-slate-400">{excerpt}</p>
        </div>
        <span className={`rounded-full border px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] whitespace-nowrap ${difficultyColors[difficulty]}`}>
          {difficulty}
        </span>
      </div>

      {tags?.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {tags.map((tag) => (
            <span key={tag} className="rounded-full bg-white/5 px-2 py-1 text-xs text-slate-400">
              {tag}
            </span>
          ))}
        </div>
      )}

      {onStudy && (
        <button
          onClick={onStudy}
          className="mt-4 w-full rounded-full border border-rose-400/50 bg-rose-500/10 px-4 py-2 text-sm font-medium text-rose-300 transition hover:bg-rose-500/20"
        >
          Begin review
        </button>
      )}
    </article>
  );
}
