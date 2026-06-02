"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import AppShell from "../../../components/AppShell";
import {
  ChevronLeft,
  ChevronRight,
  RotateCw,
  Loader2,
  Sparkles,
  Clock,
  BarChart3,
} from "lucide-react";
import apiClient from "../../../api";
import type { Flashcard } from "../../../lib/types";

const qualityLabels = [
  { value: 0, label: "Blackout", emoji: "😵" },
  { value: 1, label: "Wrong", emoji: "😅" },
  { value: 2, label: "Hard", emoji: "🤔" },
  { value: 3, label: "Okay", emoji: "😌" },
  { value: 4, label: "Good", emoji: "👍" },
  { value: 5, label: "Perfect", emoji: "🔥" },
];

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function StudyContent() {
  const router = useRouter();
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sessionComplete, setSessionComplete] = useState(false);
  const [stats, setStats] = useState({ correct: 0, incorrect: 0 });
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const fetchDueCards = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get("/flashcards/due", { params: { limit: 50 } });
      const data = res.data || [];
      setCards(data);
      if (data.length === 0) setSessionComplete(true);
    } catch {
      setError("Failed to load flashcards for study.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDueCards();
  }, [fetchDueCards]);

  useEffect(() => {
    if (cards.length > 0 && !sessionComplete) {
      timerRef.current = setInterval(() => {
        setElapsed((s) => s + 1);
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [cards.length, sessionComplete]);

  async function handleReview(quality: number) {
    if (!cards[currentIndex]) return;
    const card = cards[currentIndex];
    try {
      await apiClient.post(`/flashcards/${card.id}/review`, { quality });
    } catch {
      // Continue even if review fails
    }

    if (quality >= 3) {
      setStats((s) => ({ ...s, correct: s.correct + 1 }));
    } else {
      setStats((s) => ({ ...s, incorrect: s.incorrect + 1 }));
    }

    if (currentIndex < cards.length - 1) {
      setCurrentIndex((i) => i + 1);
      setFlipped(false);
    } else {
      setSessionComplete(true);
    }
  }

  function handleRestart() {
    setCurrentIndex(0);
    setFlipped(false);
    setSessionComplete(false);
    setStats({ correct: 0, incorrect: 0 });
    setElapsed(0);
    fetchDueCards();
  }

  if (loading) {
    return (
      <AppShell title="Study Session" description="Review your flashcards.">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      </AppShell>
    );
  }

  if (error) {
    return (
      <AppShell title="Study Session" description="Review your flashcards.">
        <p className="text-rose-300">{error}</p>
      </AppShell>
    );
  }

  if (sessionComplete) {
    const total = stats.correct + stats.incorrect;
    const accuracy = total > 0 ? Math.round((stats.correct / total) * 100) : 0;
    return (
      <AppShell title="Study Session" description="Review complete!">
        <div className="flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-6 py-16 text-center">
          <Sparkles className="mb-4 h-12 w-12 text-amber-400" />
          <h3 className="text-2xl font-semibold text-white">
            {cards.length === 0 ? "All caught up!" : "Session complete!"}
          </h3>
          {cards.length > 0 && (
            <>
              <div className="mt-6 grid grid-cols-3 gap-6">
                <div className="text-center">
                  <p className="text-2xl font-bold text-emerald-400">{stats.correct}</p>
                  <p className="text-xs text-slate-500">Correct</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-rose-400">{stats.incorrect}</p>
                  <p className="text-xs text-slate-500">Incorrect</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-amber-400">{accuracy}%</p>
                  <p className="text-xs text-slate-500">Accuracy</p>
                </div>
              </div>
              <p className="mt-4 text-sm text-slate-500">
                <Clock className="mr-1 inline h-3 w-3" />
                Duration: {formatTime(elapsed)}
              </p>
            </>
          )}
          <p className="mt-1 text-sm text-slate-500">
            {cards.length === 0
              ? "No flashcards due for review. Great work!"
              : "Come back later for more review."}
          </p>
          <div className="mt-8 flex gap-4">
            <button
              onClick={() => router.push("/flashcards")}
              className="rounded-full border border-white/10 px-6 py-3 text-sm text-slate-300 transition hover:bg-white/5"
            >
              Back to flashcards
            </button>
            {cards.length > 0 && (
              <button
                onClick={handleRestart}
                className="rounded-full bg-gradient-to-r from-rose-600 to-amber-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-rose-500/20 transition hover:-translate-y-0.5"
              >
                Study again
              </button>
            )}
          </div>
        </div>
      </AppShell>
    );
  }

  const current = cards[currentIndex];
  const progress = ((currentIndex + 1) / cards.length) * 100;
  const total = stats.correct + stats.incorrect;
  const accuracy = total > 0 ? Math.round((stats.correct / total) * 100) : 100;

  return (
    <AppShell
      title={`Card ${currentIndex + 1} of ${cards.length}`}
      description="Review your flashcard and rate your recall."
    >
      <div className="mb-4 flex items-center justify-between text-xs text-slate-500">
        <span className="flex items-center gap-1">
          <BarChart3 className="h-3 w-3" />
          {stats.correct}/{total} correct ({accuracy}%)
        </span>
        <span className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {formatTime(elapsed)}
        </span>
      </div>
      <div className="mb-4 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-gradient-to-r from-rose-500 to-amber-400 transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* 3D Card Flip */}
      <div
        className="group perspective cursor-pointer"
        onClick={() => setFlipped(!flipped)}
      >
        <div
          className={`relative min-h-[300px] transition-transform duration-500 preserve-3d sm:min-h-[350px] ${
            flipped ? "rotate-y-180" : ""
          }`}
        >
          {/* Front */}
          <div className="absolute inset-0 rounded-2xl border border-white/10 bg-gradient-to-b from-slate-900/80 to-slate-950/80 p-8 backface-hidden">
            <div className="flex h-full flex-col items-center justify-center text-center">
              <p className="text-xs uppercase tracking-widest text-rose-300/60">Question</p>
              <p className="mt-4 text-lg leading-relaxed text-white sm:text-xl">
                {current?.front}
              </p>
              <p className="mt-6 text-xs text-slate-500">Tap to reveal answer</p>
            </div>
          </div>

          {/* Back */}
          <div className="absolute inset-0 rounded-2xl border border-emerald-500/20 bg-gradient-to-b from-slate-900/80 to-slate-950/80 p-8 backface-hidden rotate-y-180">
            <div className="flex h-full flex-col items-center justify-center text-center">
              <p className="text-xs uppercase tracking-widest text-emerald-300/60">Answer</p>
              <p className="mt-4 text-lg leading-relaxed text-white sm:text-xl">
                {current?.back}
              </p>
              <p className="mt-6 text-xs text-slate-500">Tap to hide answer</p>
            </div>
          </div>
        </div>
      </div>

      {flipped && (
        <div className="mt-6 animate-in slide-in-from-bottom-2 duration-300">
          <p className="mb-3 text-center text-sm text-slate-400">
            How well did you remember?
          </p>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
            {qualityLabels.map((q) => (
              <button
                key={q.value}
                onClick={() => handleReview(q.value)}
                className="flex flex-col items-center gap-1 rounded-xl border border-white/10 bg-white/5 px-2 py-3 text-center transition hover:border-rose-400/30 hover:bg-rose-500/10 active:scale-95"
              >
                <span className="text-lg">{q.emoji}</span>
                <span className="text-[10px] font-medium text-slate-300">
                  {q.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="mt-6 flex items-center justify-between">
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (currentIndex > 0) {
              setCurrentIndex((i) => i - 1);
              setFlipped(false);
            }
          }}
          disabled={currentIndex === 0}
          className="flex items-center gap-1 text-sm text-slate-400 transition hover:text-slate-200 disabled:opacity-30"
        >
          <ChevronLeft className="h-4 w-4" />
          Previous
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            setFlipped(!flipped);
          }}
          className="flex items-center gap-2 text-sm text-slate-400 transition hover:text-slate-200"
        >
          <RotateCw className={`h-4 w-4 transition-transform duration-300 ${flipped ? "rotate-180" : ""}`} />
          {flipped ? "Hide" : "Reveal"}
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            if (currentIndex < cards.length - 1) {
              setCurrentIndex((i) => i + 1);
              setFlipped(false);
            }
          }}
          disabled={currentIndex === cards.length - 1}
          className="flex items-center gap-1 text-sm text-slate-400 transition hover:text-slate-200 disabled:opacity-30"
        >
          Skip
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </AppShell>
  );
}

export default function StudyPage() {
  return <StudyContent />;
}
