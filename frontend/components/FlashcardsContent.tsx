"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";
import {
  Plus,
  Trash2,
  Loader2,
  GraduationCap,
  BookOpen,
} from "lucide-react";
import apiClient from "@/api";
import type { Flashcard } from "@/lib/types";

export default function FlashcardsContent() {
  const router = useRouter();
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [front, setFront] = useState("");
  const [back, setBack] = useState("");

  const fetchFlashcards = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get("/flashcards");
      setFlashcards(res.data || []);
    } catch {
      setError("Failed to load flashcards.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFlashcards();
  }, [fetchFlashcards]);

  async function handleCreate() {
    if (!front.trim() || !back.trim()) return;
    try {
      await apiClient.post("/flashcards", { front, back });
      setFront("");
      setBack("");
      setShowForm(false);
      await fetchFlashcards();
    } catch {
      setError("Failed to create flashcard.");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this flashcard?")) return;
    try {
      await apiClient.delete(`/flashcards/${id}`);
      await fetchFlashcards();
    } catch {
      setError("Failed to delete flashcard.");
    }
  }

  const dueCount = flashcards.filter(
    (f) => !f.next_review || new Date(f.next_review) <= new Date(),
  ).length;

  return (
    <AppShell title="Flashcards" description="Create and review flashcards with spaced repetition.">
      <div className="mb-6 flex items-center justify-between">
        <p className="text-sm text-slate-400">
          {flashcards.length} card{flashcards.length !== 1 ? "s" : ""}
          {dueCount > 0 && (
            <span className="ml-2 text-amber-400">({dueCount} due for review)</span>
          )}
        </p>
        <div className="flex gap-3">
          {dueCount > 0 && (
            <button
              onClick={() => router.push("/flashcards/study")}
              className="inline-flex items-center gap-2 rounded-full border border-rose-400/50 bg-rose-500/10 px-5 py-2.5 text-sm font-semibold text-rose-300 transition hover:bg-rose-500/20"
            >
              <GraduationCap className="h-4 w-4" />
              Study now
            </button>
          )}
          <button
            onClick={() => setShowForm(true)}
            className="btn-primary inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-rose-500/10"
          >
            <Plus className="h-4 w-4" />
            New card
          </button>
        </div>
      </div>

      {error && <p className="mb-4 text-sm text-rose-300">{error}</p>}

      {showForm && (
        <div className="mb-6 rounded-2xl border border-white/10 bg-white/5 p-6">
          <h3 className="mb-4 text-lg font-medium text-white">Create flashcard</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300">Front (question)</label>
              <textarea
                value={front}
                onChange={(e) => setFront(e.target.value)}
                rows={3}
                className="mt-1 w-full rounded-xl border border-white/10 bg-slate-900/90 p-3 text-white outline-none focus:border-rose-400/60"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300">Back (answer)</label>
              <textarea
                value={back}
                onChange={(e) => setBack(e.target.value)}
                rows={3}
                className="mt-1 w-full rounded-xl border border-white/10 bg-slate-900/90 p-3 text-white outline-none focus:border-rose-400/60"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleCreate}
                className="btn-primary rounded-xl px-5 py-2.5 text-sm font-semibold text-white"
              >
                Create
              </button>
              <button
                onClick={() => setShowForm(false)}
                className="rounded-xl border border-white/10 px-5 py-2.5 text-sm text-slate-400 transition hover:bg-white/5"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      ) : flashcards.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-6 py-16 text-center">
          <BookOpen className="mb-4 h-10 w-10 text-slate-500" />
          <h3 className="text-lg font-medium text-white">No flashcards yet</h3>
          <p className="mt-1 max-w-sm text-sm text-slate-400">
            Create your first flashcard to start studying with spaced repetition.
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="btn-primary mt-6 inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-white"
          >
            <Plus className="h-4 w-4" />
            Create flashcard
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {flashcards.map((card) => (
            <div
              key={card.id}
              className="group rounded-2xl border border-white/10 bg-white/5 p-5 transition hover:border-rose-400/20"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white line-clamp-2">
                    {card.front}
                  </p>
                  <p className="mt-2 text-xs text-slate-400 line-clamp-2">
                    {card.back}
                  </p>
                  <div className="mt-3 flex items-center gap-2">
                    <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-slate-500">
                      EF: {card.ease_factor}
                    </span>
                    <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-slate-500">
                      I: {card.interval_days}d
                    </span>
                    {card.next_review && new Date(card.next_review) <= new Date() && (
                      <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] text-amber-400">
                        Due
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(card.id)}
                  className="shrink-0 rounded-full p-1.5 text-slate-600 opacity-0 transition hover:bg-rose-500/10 hover:text-rose-300 group-hover:opacity-100"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {flashcards.length > 0 && (
        <div className="mt-6 text-center">
          <button
            onClick={() => router.push("/flashcards/study")}
            className="btn-primary inline-flex items-center gap-2 rounded-full px-8 py-3 text-sm font-semibold text-white shadow-lg shadow-rose-500/10"
          >
            <GraduationCap className="h-5 w-5" />
            Start study session
          </button>
        </div>
      )}
    </AppShell>
  );
}
