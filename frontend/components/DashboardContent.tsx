"use client";

import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import ErrorBoundary from "@/components/ErrorBoundary";
import EmptyState from "@/components/EmptyState";
import apiClient from "@/api";

interface DashboardSummary {
  studyStreak: number;
  cardsReviewed: number;
  documentsProcessed: number;
  recentDocuments: Array<{ id: string; title: string; status: string }>;
  recentNotes: Array<{ id: string; title: string; excerpt: string }>;
}

function DashboardContentInner() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadSummary() {
      try {
        const response = await apiClient.get("/dashboard/summary");
        setSummary(response.data);
      } catch {
        setError("Unable to load dashboard summary.");
      } finally {
        setLoading(false);
      }
    }
    loadSummary();
  }, []);

  return (
    <AppShell title="Study Dashboard" description="Your dojo overview and progress summary.">
      <div className="grid gap-6 lg:grid-cols-[1.4fr_0.8fr]">
        <section className="space-y-6">
          <div className="zen-card p-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.35em] text-rose-200/80">Dojo overview</p>
                <h1 className="mt-3 text-4xl font-semibold text-white">A calm place for focused study.</h1>
              </div>
              <div className="rounded-full border border-white/10 bg-slate-900/80 px-4 py-2 text-sm text-slate-200">Zen mode enabled</div>
            </div>

            {loading ? (
              <div className="mt-8 grid gap-4 sm:grid-cols-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="rounded-3xl border border-white/10 bg-slate-950/80 p-6">
                    <div className="h-3 w-24 animate-pulse rounded-full bg-white/10" />
                    <div className="mt-4 h-8 w-16 animate-pulse rounded-full bg-white/10" />
                  </div>
                ))}
              </div>
            ) : error ? (
              <p className="mt-6 text-rose-300">{error}</p>
            ) : summary ? (
              <div className="mt-8 grid gap-4 sm:grid-cols-3">
                <div className="rounded-3xl border border-white/10 bg-slate-950/80 p-6 text-white">
                  <p className="text-sm text-slate-400">Study streak</p>
                  <p className="mt-4 text-3xl font-semibold">{summary.studyStreak}d</p>
                </div>
                <div className="rounded-3xl border border-white/10 bg-slate-950/80 p-6 text-white">
                  <p className="text-sm text-slate-400">Cards reviewed</p>
                  <p className="mt-4 text-3xl font-semibold">{summary.cardsReviewed}</p>
                </div>
                <div className="rounded-3xl border border-white/10 bg-slate-950/80 p-6 text-white">
                  <p className="text-sm text-slate-400">Documents processed</p>
                  <p className="mt-4 text-3xl font-semibold">{summary.documentsProcessed}</p>
                </div>
              </div>
            ) : null}
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm uppercase tracking-[0.35em] text-rose-200/80">Recent documents</p>
                <h2 className="text-2xl font-semibold text-white">Study resources</h2>
              </div>
              <a href="/upload" className="text-sm font-semibold text-rose-300 hover:text-rose-200">Upload new file</a>
            </div>

            <div className="grid gap-4">
              {(summary?.recentDocuments?.length ?? 0) > 0 ? (
                summary?.recentDocuments?.map((doc) => (
                  <div key={doc.id} className="rounded-3xl border border-white/10 bg-slate-950/80 p-5 text-slate-200 shadow-xl shadow-black/10">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold text-white">{doc.title}</p>
                        <p className="mt-1 text-sm text-slate-400">Status: {doc.status}</p>
                      </div>
                      <span className="rounded-full bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.2em] text-slate-300">{doc.status}</span>
                    </div>
                  </div>
                ))
              ) : (
                <EmptyState
                  title="No documents yet"
                  description="Upload a document to see it appear here with status and processing details."
                />
              )}
            </div>
          </div>
        </section>

        <aside className="space-y-6">
          <div className="zen-card rounded-[2rem] p-8">
            <p className="text-sm uppercase tracking-[0.35em] text-rose-200/80">Your next action</p>
            <h2 className="mt-4 text-2xl font-semibold text-white">Keep your practice calm and consistent.</h2>
            <ul className="mt-6 space-y-3 text-slate-300">
              <li>• Upload your notes for instant ingestion.</li>
              <li>• Review recent documents from the library.</li>
              <li>• Search with intent and retrieve focused passages.</li>
            </ul>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-slate-950/80 p-8 shadow-xl shadow-black/10">
            <p className="text-sm uppercase tracking-[0.35em] text-rose-200/80">Study highlights</p>
            <div className="mt-5 grid gap-4">
              <div className="rounded-3xl bg-slate-900/90 p-4 text-slate-200">
                <p className="text-sm text-slate-400">Timeline</p>
                <p className="mt-2 text-lg font-semibold">Deep focus session ahead</p>
              </div>
              <div className="rounded-3xl bg-slate-900/90 p-4 text-slate-200">
                <p className="text-sm text-slate-400">Tip</p>
                <p className="mt-2 text-lg font-semibold">Use small review bursts for better retention.</p>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </AppShell>
  );
}

export default function DashboardContent() {
  return (
    <ErrorBoundary>
      <DashboardContentInner />
    </ErrorBoundary>
  );
}
