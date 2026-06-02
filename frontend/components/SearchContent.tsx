"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import AppShell from "@/components/AppShell";
import { Search as SearchIcon, FileText, BookOpen, Loader2, Hash } from "lucide-react";
import { getAuthToken } from "@/api";
import type { SearchResult } from "@/lib/types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

function authHeaders(): Record<string, string> {
  const token = typeof window !== "undefined" ? getAuthToken() : null;
  if (!token) return {};
  return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
}

function formatResultId(id: string) {
  return id.length > 8 ? `#${id.slice(0, 8)}` : `#${id}`;
}

function SourceBadge({ source }: { source: string }) {
  const isDoc = source === "document";
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${
      isDoc
        ? "border-blue-500/30 text-blue-300 bg-blue-500/10"
        : "border-violet-500/30 text-violet-300 bg-violet-500/10"
    }`}>
      {isDoc ? <FileText className="h-3 w-3" /> : <BookOpen className="h-3 w-3" />}
      {isDoc ? "Document" : "Note"}
    </span>
  );
}

export default function SearchContent() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [hasSearched, setHasSearched] = useState(false);
  const [sourceFilter, setSourceFilter] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const doSearch = useCallback(async (q: string, source: string | null) => {
    const trimmed = q.trim();
    if (!trimmed) return;

    setLoading(true);
    setError("");
    setHasSearched(true);

    try {
      const body: Record<string, unknown> = { query: trimmed, limit: 20 };
      if (source) body.source = source;

      const res = await fetch(`${API_BASE}/api/v1/search`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        if (res.status === 401) { window.location.href = "/login"; return; }
        throw new Error("Search failed");
      }

      const data = await res.json();
      setResults(data.results ?? []);
    } catch {
      setError("Search failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  function handleInputChange(value: string) {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      doSearch(value, sourceFilter);
    }, 300);
  }

  function handleFilterClick(source: string | null) {
    setSourceFilter(source);
    if (query.trim()) {
      doSearch(query, source);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      doSearch(query, sourceFilter);
    }
  }

  const filters = [
    { label: "All", value: null },
    { label: "Documents", value: "document" },
    { label: "Notes", value: "note" },
  ];

  return (
    <AppShell title="Search" description="Find content across your study materials.">
      <div className="mx-auto max-w-3xl">
        <div className="relative">
          <SearchIcon className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search documents, notes, and more..."
            className="w-full rounded-3xl border border-white/10 bg-slate-900/90 py-4 pl-12 pr-4 text-lg text-white outline-none transition placeholder:text-slate-600 focus:border-rose-400/60 focus:ring-2 focus:ring-rose-400/20"
          />
          {loading && (
            <Loader2 className="absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 animate-spin text-slate-500" />
          )}
        </div>

        <div className="mt-4 flex items-center gap-2">
          {filters.map((f) => (
            <button
              key={f.label}
              onClick={() => handleFilterClick(f.value)}
              className={`rounded-full border px-4 py-1.5 text-xs font-medium transition ${
                sourceFilter === f.value
                  ? "border-rose-500/40 bg-rose-500/15 text-rose-200"
                  : "border-white/10 text-slate-400 hover:border-white/20 hover:text-slate-200"
              }`}
            >
              {f.label}
            </button>
          ))}
          {hasSearched && (
            <span className="ml-auto text-xs text-slate-500">
              {results.length} result{results.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        {error && (
          <p className="mt-4 text-sm text-rose-300">{error}</p>
        )}

        <div className="mt-6 space-y-3">
          {!hasSearched && !loading && (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-slate-950/70 px-6 py-16 text-center">
              <SearchIcon className="mb-4 h-10 w-10 text-slate-600" />
              <h3 className="text-lg font-medium text-white">Search your study materials</h3>
              <p className="mt-1 max-w-md text-sm text-slate-400">
                Type a query above to search across your documents and notes.
              </p>
            </div>
          )}

          {hasSearched && !loading && results.length === 0 && query.trim() && (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-slate-950/70 px-6 py-16 text-center">
              <Hash className="mb-4 h-10 w-10 text-slate-600" />
              <h3 className="text-lg font-medium text-white">No results found</h3>
              <p className="mt-1 max-w-md text-sm text-slate-400">
                Try a different search term or adjust your filters.
              </p>
            </div>
          )}

          {results.map((result) => (
            <div
              key={result.id}
              className="rounded-2xl border border-white/10 bg-white/5 p-5 transition hover:border-rose-400/20"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-white">{result.title}</h3>
                    <SourceBadge source={result.source} />
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-slate-400">
                    {result.snippet}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <div className="text-xs text-slate-500">{formatResultId(result.id)}</div>
                  <div className="mt-1 flex items-center justify-end gap-1 text-xs text-slate-500">
                    <div
                      className="h-1.5 w-12 overflow-hidden rounded-full bg-white/10"
                      title={`Score: ${(result.score * 100).toFixed(0)}%`}
                    >
                      <div
                        className="h-full rounded-full bg-rose-500/60"
                        style={{ width: `${Math.min(result.score, 1) * 100}%` }}
                      />
                    </div>
                    <span>{(result.score * 100).toFixed(0)}%</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
