"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";
import {
  AlertTriangle,
  CheckCircle2,
  Target,
  Loader2,
  BookOpen,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { getAuthToken } from "@/api";
import type { GapAnalysis, GapItem } from "@/lib/types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

function authHeaders(): Record<string, string> {
  const token = typeof window !== "undefined" ? getAuthToken() : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function GapCard({ gap, onStudy }: { gap: GapItem; onStudy: (topic: string) => void }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-xl border border-rose-500/10 bg-rose-500/5 p-3 transition hover:border-rose-500/20">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-start justify-between gap-2 text-left"
      >
        <div className="flex-1 min-w-0">
          <p className="text-sm text-slate-200">{gap.question}</p>
          <p className="mt-1 text-xs text-slate-500">
            Score: {gap.coverage_score}
            {gap.year && ` | Year: ${gap.year}`}
            {gap.exam_type && ` | ${gap.exam_type}`}
          </p>
        </div>
        {expanded ? (
          <ChevronUp className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
        ) : (
          <ChevronDown className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
        )}
      </button>

      {expanded && gap.matched_chunks && gap.matched_chunks.length > 0 && (
        <div className="mt-3 border-t border-white/5 pt-3">
          <p className="mb-2 text-xs font-medium text-slate-400">Related chunks from your documents:</p>
          <div className="space-y-2">
            {gap.matched_chunks.map((chunk, ci) => (
              <div key={ci} className="rounded-lg bg-slate-900/50 p-2.5">
                <p className="text-xs text-slate-400 leading-relaxed">{chunk}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {expanded && (
        <button
          onClick={(e) => { e.stopPropagation(); onStudy(gap.topic || gap.question); }}
          className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-rose-500/10 px-3 py-1.5 text-xs font-medium text-rose-300 transition hover:bg-rose-500/20"
        >
          <BookOpen className="h-3 w-3" />
          Study this topic
        </button>
      )}
    </div>
  );
}

export default function GapsPage() {
  const router = useRouter();
  const [analysis, setAnalysis] = useState<GapAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);

  const fetchGaps = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/api/v1/pyq/gap-analysis`, {
        headers: authHeaders(),
      });
      if (res.status === 401) { router.push("/login"); return; }
      if (!res.ok) throw new Error("Failed to load gap analysis");
      const data = await res.json();
      setAnalysis(data);
    } catch {
      setError("Unable to load gap analysis.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => { fetchGaps(); }, [fetchGaps]);

  const gaps = analysis?.gaps.filter((g) => g.is_gap) || [];
  const covered = analysis?.gaps.filter((g) => !g.is_gap) || [];

  const filteredGaps = selectedTopic
    ? gaps.filter((g) =>
        g.topic?.toLowerCase().includes(selectedTopic.toLowerCase()) ||
        g.question.toLowerCase().includes(selectedTopic.toLowerCase())
      )
    : gaps;

  function handleStudyTopic(topic: string) {
    router.push(`/search?q=${encodeURIComponent(topic)}`);
  }

  return (
    <AppShell title="Gap Analysis" description="Identify knowledge gaps in your study materials.">
      {error && (
        <div className="mb-4 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      ) : !analysis || analysis.total_pyqs === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-6 py-16 text-center">
          <BookOpen className="mb-4 h-10 w-10 text-slate-500" />
          <h3 className="text-lg font-medium text-white">No PYQs found</h3>
          <p className="mt-1 text-sm text-slate-400">
            Upload PYQ banks and study documents to see your gap analysis.
          </p>
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5">
              <p className="text-xs uppercase tracking-wider text-emerald-400/70">Coverage</p>
              <p className="mt-1 text-2xl font-bold text-emerald-300">
                {analysis.coverage_percentage}%
              </p>
              <p className="mt-1 text-xs text-emerald-400/60">
                {analysis.covered_pyqs} / {analysis.total_pyqs} PYQs covered
              </p>
            </div>
            <div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-5">
              <p className="text-xs uppercase tracking-wider text-rose-400/70">Gaps</p>
              <p className="mt-1 text-2xl font-bold text-rose-300">{analysis.gap_pyqs}</p>
              <p className="mt-1 text-xs text-rose-400/60">Uncovered PYQs</p>
            </div>
            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5">
              <p className="text-xs uppercase tracking-wider text-amber-400/70">Total PYQs</p>
              <p className="mt-1 text-2xl font-bold text-amber-300">{analysis.total_pyqs}</p>
              <p className="mt-1 text-xs text-amber-400/60">Questions analyzed</p>
            </div>
          </div>

          {analysis.strengths.length > 0 && (
            <div className="mt-6 rounded-2xl border border-emerald-500/10 bg-white/5 p-5">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                <h3 className="font-semibold text-white">Strengths</h3>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {analysis.strengths.map((s, i) => (
                  <span
                    key={i}
                    className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-300"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}

          {analysis.weak_areas.length > 0 && (
            <div className="mt-4 rounded-2xl border border-rose-500/10 bg-white/5 p-5">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-rose-400" />
                <h3 className="font-semibold text-white">Weak Areas</h3>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {analysis.weak_areas.map((w, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedTopic(selectedTopic === w ? null : w)}
                    className={`rounded-full border px-3 py-1 text-xs transition ${
                      selectedTopic === w
                        ? "border-rose-400/50 bg-rose-500/20 text-rose-200"
                        : "border-rose-500/20 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20"
                    }`}
                  >
                    {w}
                    {selectedTopic === w && " ✕"}
                  </button>
                ))}
              </div>
            </div>
          )}

          {analysis.recommendations.length > 0 && (
            <div className="mt-4 rounded-2xl border border-amber-500/10 bg-amber-500/5 p-5">
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5 text-amber-400" />
                <h3 className="font-semibold text-white">Recommendations</h3>
              </div>
              <ul className="mt-3 space-y-2">
                {analysis.recommendations.map((r, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
                    {r}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {gaps.length > 0 && (
            <div className="mt-6">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-semibold text-white">
                  {selectedTopic ? `Uncovered PYQs: "${selectedTopic}"` : `Uncovered PYQs (${gaps.length})`}
                </h3>
                {selectedTopic && (
                  <button
                    onClick={() => handleStudyTopic(selectedTopic)}
                    className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-rose-600 to-amber-500 px-4 py-1.5 text-xs font-semibold text-white shadow-lg shadow-rose-500/20 transition hover:-translate-y-0.5"
                  >
                    <BookOpen className="h-3 w-3" />
                    Study These Topics
                  </button>
                )}
              </div>
              {!selectedTopic && gaps.length > 20 && (
                <p className="mb-3 text-xs text-slate-500">
                  Showing first 20. Click a weak area above to filter.
                </p>
              )}
              <div className="space-y-2">
                {filteredGaps.slice(0, selectedTopic ? filteredGaps.length : 20).map((g) => (
                  <GapCard key={g.pyq_id} gap={g} onStudy={handleStudyTopic} />
                ))}
              </div>
              {!selectedTopic && gaps.length > 20 && (
                <p className="mt-3 text-center text-xs text-slate-500">
                  +{gaps.length - 20} more uncovered PYQs. Click a weak area to see all.
                </p>
              )}
            </div>
          )}

          {covered.length > 0 && (
            <div className="mt-6">
              <h3 className="mb-3 font-semibold text-white">
                Covered PYQs ({covered.length})
              </h3>
              <div className="space-y-2">
                {covered.slice(0, 10).map((g) => (
                  <div
                    key={g.pyq_id}
                    className="rounded-xl border border-emerald-500/10 bg-emerald-500/5 p-3"
                  >
                    <p className="text-sm text-slate-200">{g.question}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      Score: {g.coverage_score}
                      {g.year && ` | Year: ${g.year}`}
                    </p>
                  </div>
                ))}
                {covered.length > 10 && (
                  <p className="text-center text-xs text-slate-500">
                    +{covered.length - 10} more covered PYQs
                  </p>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </AppShell>
  );
}
