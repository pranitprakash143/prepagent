"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";
import {
  Brain, Loader2, CheckCircle2, XCircle, RefreshCw,
  ShieldCheck, ShieldAlert, AlertTriangle, ChevronRight
} from "lucide-react";
import { getAuthToken } from "@/api";
import { toast } from "sonner";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

function authHeaders(): Record<string, string> {
  const token = typeof window !== "undefined" ? getAuthToken() : null;
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (token) h["Authorization"] = `Bearer ${token}`;
  return h;
}

interface QuizQ {
  question: string;
  options: string[];
  correct_answer: string;
  explanation: string;
  verification?: { verified: boolean; confidence: number; warnings: string[] };
}

function AnimatedScore({ value, total }: { value: number; total: number }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const duration = 1500;
    const start = performance.now();
    const frame = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(eased * value));
      if (progress < 1) requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }, [value]);
  return <>{display} / {total}</>;
}

export default function QuizPage() {
  const router = useRouter();
  const [documents, setDocuments] = useState<any[]>([]);
  const [selectedDoc, setSelectedDoc] = useState("");
  const [questions, setQuestions] = useState<QuizQ[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState("");
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [finished, setFinished] = useState(false);
  const [error, setError] = useState("");
  const [isCorrect, setIsCorrect] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const fetchDocs = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/v1/documents`, {
        headers: authHeaders(),
      });
      if (res.status === 401) { router.push("/login"); return; }
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setDocuments(data.filter((d: any) => d.status === "done"));
    } catch { setError("Failed to load documents"); }
  }, [router]);

  useEffect(() => { fetchDocs(); }, [fetchDocs]);

  async function handleGenerate() {
    if (!selectedDoc) return;
    setGenerating(true); setError(""); setQuestions([]); setFinished(false);
    setCurrentIdx(0); setScore(0); setShowResult(false); setSelectedAnswer("");
    try {
      const res = await fetch(
        `${API_BASE}/api/v1/documents/${selectedDoc}/generate-quiz`,
        { method: "POST", headers: authHeaders(), body: JSON.stringify({ count: 10 }) }
      );
      if (!res.ok) throw new Error("Generation failed");
      const data = await res.json();
      setQuestions(data.questions || []);
      if (data.questions?.length > 0) toast.success("Quiz generated successfully!");
    } catch {
      setError("Failed to generate quiz.");
      toast.error("Failed to generate quiz");
    }
    finally { setGenerating(false); }
  }

  useEffect(() => {
    if (!showResult && questions.length > 0) {
      setSelectedAnswer("");
      setIsCorrect(false);
    }
  }, [currentIdx, showResult, questions.length]);

  useEffect(() => {
    if (!questions.length) return;
    const handler = (e: KeyboardEvent) => {
      const key = parseInt(e.key);
      if (key >= 1 && key <= 4 && questions[currentIdx] && !showResult) {
        handleSelect(questions[currentIdx].options[key - 1]);
        return;
      }
      if (e.key === "Enter") {
        if (showResult) handleNext();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  });

  const current = questions[currentIdx];

  function handleSelect(opt: string) {
    if (showResult || !current) return;
    setSelectedAnswer(opt);
    setShowResult(true);
    const correct = opt === current.correct_answer;
    setIsCorrect(correct);
    if (correct) setScore((s) => s + 1);
  }

  function handleNext() {
    if (currentIdx < questions.length - 1) {
      setCurrentIdx((i) => i + 1);
      setSelectedAnswer("");
      setShowResult(false);
    } else {
      setFinished(true);
    }
  }

  function handleRestart() {
    setQuestions([]); setCurrentIdx(0); setScore(0);
    setShowResult(false); setSelectedAnswer(""); setFinished(false);
  }

  return (
    <AppShell title="Quiz" description="Test your knowledge with AI-generated quizzes.">
      {questions.length > 0 && !finished && current && (
        <div className="mb-6">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="text-slate-400">
              Question {currentIdx + 1} of {questions.length}
            </span>
            <span className="text-slate-500">
              {score} correct
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-rose-500 to-amber-400 transition-all duration-500"
              style={{ width: `${((currentIdx + (showResult ? 1 : 0)) / questions.length) * 100}%` }}
            />
          </div>
        </div>
      )}

      {error && <div className="mb-4 text-sm text-rose-300">{error}</div>}

      {questions.length === 0 && !generating && (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Select a document
            </label>
            <select
              value={selectedDoc}
              onChange={(e) => setSelectedDoc(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-2.5 text-sm text-white outline-none focus:border-rose-400/50"
            >
              <option value="">Choose a processed document...</option>
              {documents.map((d: any) => (
                <option key={d.id} value={d.id}>
                  {d.title || d.file_name}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={handleGenerate}
            disabled={!selectedDoc}
            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-rose-600 to-amber-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-rose-500/20 transition hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Brain className="h-4 w-4" />
            Generate Quiz
          </button>
        </div>
      )}

      {generating && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-rose-400" />
        </div>
      )}

      {finished ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center animate-in fade-in zoom-in-95 duration-500">
          <CheckCircle2 className="mx-auto mb-4 h-12 w-12 text-emerald-400" />
          <h2 className="text-2xl font-bold text-white">Quiz Complete!</h2>
          <p className="mt-4 text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-rose-400 to-amber-400">
            <AnimatedScore value={score} total={questions.length} />
          </p>
          <p className="mt-2 text-sm text-slate-400">
            {score === questions.length
              ? "Perfect score! Outstanding work."
              : score >= questions.length * 0.7
              ? "Great job! Keep it up."
              : score >= questions.length * 0.4
              ? "Good effort. Review the weak areas."
              : "Keep practicing. You'll improve."}
          </p>
          <button
            onClick={handleRestart}
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-white/10 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-white/20"
          >
            <RefreshCw className="h-4 w-4" />
            Try Another Quiz
          </button>
        </div>
      ) : current ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6" ref={containerRef}>
          <div className="mb-2 flex items-center gap-2">
            <span className="text-xs text-slate-500">Question {currentIdx + 1}</span>
          </div>
          <h3 className="text-lg font-medium text-white">{current.question}</h3>

          <div className="mt-6 space-y-2">
            {current.options.map((opt, j) => {
              let classes =
                "w-full rounded-xl border px-4 py-3 text-left text-sm transition cursor-pointer min-h-[48px] flex items-center gap-3 ";
              if (!showResult) {
                classes +=
                  "border-white/10 bg-slate-900/50 text-slate-200 hover:border-rose-400/30 hover:bg-rose-500/5 ";
              } else if (opt === current.correct_answer) {
                classes +=
                  "border-emerald-500/30 bg-emerald-500/10 text-emerald-300 ";
              } else if (opt === selectedAnswer && opt !== current.correct_answer) {
                classes +=
                  "border-rose-500/30 bg-rose-500/10 text-rose-300 ";
              } else {
                classes +=
                  "border-white/5 bg-slate-900/30 text-slate-500 ";
              }
              return (
                <button
                  key={j}
                  onClick={() => handleSelect(opt)}
                  className={classes}
                  disabled={showResult}
                >
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-current text-xs font-medium">
                    {String.fromCharCode(65 + j)}
                  </span>
                  <span className="flex-1">{opt}</span>
                  {showResult && opt === current.correct_answer && (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                  )}
                  {showResult && opt === selectedAnswer && opt !== current.correct_answer && (
                    <XCircle className="h-4 w-4 shrink-0 text-rose-400" />
                  )}
                </button>
              );
            })}
          </div>

          {showResult && (
            <div className="mt-4 animate-in slide-in-from-bottom-2 duration-300">
              <div className={`rounded-xl p-4 ${
                isCorrect
                  ? "bg-emerald-500/10 border border-emerald-500/20"
                  : "bg-rose-500/10 border border-rose-500/20"
              }`}>
                <p className={`text-sm font-medium ${isCorrect ? "text-emerald-300" : "text-rose-300"}`}>
                  {isCorrect ? "Correct!" : "Incorrect"}
                </p>
                <p className="mt-1 text-sm text-slate-400 italic">{current.explanation}</p>
              </div>
              {current.verification && (
                <div className="mt-2 flex items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                      current.verification.verified
                        ? "bg-emerald-500/10 text-emerald-400"
                        : "bg-amber-500/10 text-amber-400"
                    }`}
                  >
                    {current.verification.verified ? (
                      <ShieldCheck className="h-3 w-3" />
                    ) : (
                      <ShieldAlert className="h-3 w-3" />
                    )}
                    {Math.round(current.verification.confidence * 100)}% confidence
                  </span>
                  {current.verification.warnings.map((w, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-2 py-0.5 text-xs text-rose-400"
                    >
                      <AlertTriangle className="h-3 w-3" />
                      {w}
                    </span>
                  ))}
                </div>
              )}
              <button
                onClick={handleNext}
                className="mt-4 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-rose-600 to-amber-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-rose-500/20 transition hover:-translate-y-0.5"
              >
                {currentIdx < questions.length - 1 ? "Next Question" : "See Results"}
                <ChevronRight className="h-4 w-4" />
              </button>
              <p className="mt-2 text-xs text-slate-500">
                Press <kbd className="rounded border border-white/10 bg-white/5 px-1.5 py-0.5 font-mono text-[10px]">Enter</kbd> for next
              </p>
            </div>
          )}

          {!showResult && (
            <p className="mt-3 text-xs text-slate-500">
              Press <kbd className="rounded border border-white/10 bg-white/5 px-1.5 py-0.5 font-mono text-[10px]">1</kbd>{" "}
              <kbd className="rounded border border-white/10 bg-white/5 px-1.5 py-0.5 font-mono text-[10px]">2</kbd>{" "}
              <kbd className="rounded border border-white/10 bg-white/5 px-1.5 py-0.5 font-mono text-[10px]">3</kbd>{" "}
              <kbd className="rounded border border-white/10 bg-white/5 px-1.5 py-0.5 font-mono text-[10px]">4</kbd> to select
            </p>
          )}
        </div>
      ) : null}
    </AppShell>
  );
}
