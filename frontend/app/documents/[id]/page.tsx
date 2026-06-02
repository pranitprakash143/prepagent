"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import AppShell from "../../../components/AppShell";
import {
  FileText,
  ArrowLeft,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Trash2,
  Sparkles,
  Brain,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { getAuthToken } from "../../../api";
import { toast } from "sonner";
import type { Document, FlashcardItem, QuizQuestion } from "../../../lib/types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

function authGetHeaders(): Record<string, string> {
  const token = typeof window !== "undefined" ? getAuthToken() : null;
  const h: Record<string, string> = {};
  if (token) h["Authorization"] = `Bearer ${token}`;
  return h;
}

function authHeaders(): Record<string, string> {
  const token = typeof window !== "undefined" ? getAuthToken() : null;
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (token) h["Authorization"] = `Bearer ${token}`;
  return h;
}

function formatDate(dateStr: string) {
  try {
    return new Date(dateStr).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dateStr;
  }
}

function formatSize(sizeStr?: string) {
  if (!sizeStr) return "";
  const bytes = parseInt(sizeStr, 10);
  if (isNaN(bytes)) return sizeStr;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function VerificationBadge({ verification }: { verification?: { verified: boolean; confidence: number; warnings: string[] } }) {
  if (!verification) return null;
  return (
    <div className="mt-2 flex items-center gap-2">
      <span
        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
          verification.verified
            ? "bg-emerald-500/10 text-emerald-400"
            : "bg-amber-500/10 text-amber-400"
        }`}
      >
        {verification.verified ? (
          <ShieldCheck className="h-3 w-3" />
        ) : (
          <ShieldAlert className="h-3 w-3" />
        )}
        {Math.round(verification.confidence * 100)}% confidence
      </span>
      {verification.warnings.map((w, i) => (
        <span
          key={i}
          className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-2 py-0.5 text-xs text-rose-400"
        >
          <AlertTriangle className="h-3 w-3" />
          {w}
        </span>
      ))}
    </div>
  );
}

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case "queued":
      return <Clock className="h-5 w-5 text-slate-400" />;
    case "processing":
      return <Loader2 className="h-5 w-5 animate-spin text-amber-400" />;
    case "done":
      return <CheckCircle2 className="h-5 w-5 text-emerald-400" />;
    case "failed":
      return <XCircle className="h-5 w-5 text-rose-400" />;
    default:
      return <AlertCircle className="h-5 w-5 text-slate-400" />;
  }
}

function SkeletonBlock({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3 animate-pulse">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-4 rounded bg-white/5" style={{ width: `${60 + Math.random() * 40}%` }} />
      ))}
    </div>
  );
}

function ExpandableSource({ chunk }: { chunk?: string }) {
  if (!chunk) return null;
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-2">
      <button
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 transition"
      >
        {open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        Source citation
      </button>
      {open && (
        <div className="mt-1 rounded-lg border border-white/5 bg-slate-900/50 p-2.5">
          <p className="text-xs text-slate-400 leading-relaxed">{chunk}</p>
        </div>
      )}
    </div>
  );
}

export default function DocumentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [doc, setDoc] = useState<Document | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [generatingFlashcards, setGeneratingFlashcards] = useState(false);
  const [generatingQuiz, setGeneratingQuiz] = useState(false);
  const [flashcards, setFlashcards] = useState<FlashcardItem[]>([]);
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [generationMsg, setGenerationMsg] = useState("");

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetch(`${API_BASE}/api/v1/documents/${id}`, {
      headers: authGetHeaders(),
    })
      .then((res) => {
        if (res.status === 401) {
          router.push("/login");
          return null;
        }
        if (!res.ok) throw new Error("Document not found");
        return res.json();
      })
      .then((data) => {
        if (data) setDoc(data);
      })
      .catch(() => setError("Unable to load document."))
      .finally(() => setLoading(false));
  }, [id, router]);

  async function handleDelete() {
    if (!doc || !confirm("Delete this document?")) return;
    try {
      const res = await fetch(`${API_BASE}/api/v1/documents/${id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error("Failed to delete");
      toast.success("Document deleted");
      router.push("/documents");
    } catch {
      setError("Failed to delete document.");
      toast.error("Failed to delete document");
    }
  }

  async function handleGenerateFlashcards() {
    if (!doc || doc.status !== "done") return;
    setGeneratingFlashcards(true);
    setGenerationMsg("");
    setFlashcards([]);
    try {
      const res = await fetch(
        `${API_BASE}/api/v1/documents/${id}/generate-flashcards`,
        {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify({ count: 5 }),
        }
      );
      if (!res.ok) throw new Error("Generation failed");
      const data = await res.json();
      const items = data.flashcards || [];
      setFlashcards(items);
      toast.success(`Generated ${items.length} flashcards`);
    } catch {
      setGenerationMsg("Failed to generate flashcards.");
      toast.error("Failed to generate flashcards");
    } finally {
      setGeneratingFlashcards(false);
    }
  }

  async function handleGenerateQuiz() {
    if (!doc || doc.status !== "done") return;
    setGeneratingQuiz(true);
    setGenerationMsg("");
    setQuizQuestions([]);
    try {
      const res = await fetch(
        `${API_BASE}/api/v1/documents/${id}/generate-quiz`,
        {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify({ count: 10 }),
        }
      );
      if (!res.ok) throw new Error("Generation failed");
      const data = await res.json();
      const items = data.questions || [];
      setQuizQuestions(items);
      toast.success(`Generated ${items.length} quiz questions`);
    } catch {
      setGenerationMsg("Failed to generate quiz.");
      toast.error("Failed to generate quiz");
    } finally {
      setGeneratingQuiz(false);
    }
  }

  return (
    <AppShell title="Document Detail" description="View document information and AI actions.">
      <button
        onClick={() => router.push("/documents")}
        className="mb-6 inline-flex items-center gap-2 text-sm text-slate-400 transition hover:text-slate-200"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Documents
      </button>

      {error && (
        <div className="mb-4 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
          {error}
        </div>
      )}

      {generationMsg && (
        <div className="mb-4 rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
          {generationMsg}
        </div>
      )}

      {loading ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <SkeletonBlock rows={4} />
        </div>
      ) : !doc ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-6 py-16 text-center">
          <FileText className="mb-4 h-10 w-10 text-slate-500" />
          <h3 className="text-lg font-medium text-white">Document not found</h3>
        </div>
      ) : (
        <>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-slate-900/80">
                  <FileText className="h-7 w-7 text-slate-400" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-white">
                    {doc.title || doc.file_name}
                  </h2>
                  {doc.title && doc.title !== doc.file_name && (
                    <p className="mt-0.5 text-sm text-slate-400">{doc.file_name}</p>
                  )}
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-1 text-xs font-medium text-slate-300">
                      <StatusIcon status={doc.status} />
                      {doc.status.charAt(0).toUpperCase() + doc.status.slice(1)}
                    </span>
                    {doc.file_size && (
                      <span className="text-xs text-slate-500">
                        {formatSize(doc.file_size)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <button
                onClick={handleDelete}
                className="rounded-full p-2 text-slate-600 transition hover:bg-rose-500/10 hover:text-rose-300"
              >
                <Trash2 className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-white/5 bg-slate-900/50 p-4">
                <p className="text-xs uppercase tracking-wider text-slate-500">Created</p>
                <p className="mt-1 text-sm text-slate-200">{formatDate(doc.created_at)}</p>
              </div>
              <div className="rounded-xl border border-white/5 bg-slate-900/50 p-4">
                <p className="text-xs uppercase tracking-wider text-slate-500">Updated</p>
                <p className="mt-1 text-sm text-slate-200">{formatDate(doc.updated_at)}</p>
              </div>
            </div>

            {doc.status === "done" && (
              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  onClick={handleGenerateFlashcards}
                  disabled={generatingFlashcards}
                  className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-rose-600 to-amber-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-rose-500/20 transition hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {generatingFlashcards ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  {generatingFlashcards ? "Generating..." : "Generate Flashcards"}
                </button>
                <button
                  onClick={handleGenerateQuiz}
                  disabled={generatingQuiz}
                  className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {generatingQuiz ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Brain className="h-4 w-4" />
                  )}
                  {generatingQuiz ? "Generating..." : "Generate Quiz"}
                </button>
              </div>
            )}

            {doc.status !== "done" && doc.status !== "failed" && (
              <div className="mt-6 flex items-center gap-2 rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-sm text-amber-200/80">
                <Loader2 className="h-4 w-4 animate-spin" />
                AI features available once document processing completes.
              </div>
            )}
          </div>

          {/* Flashcards with loading skeleton */}
          <div className="mt-6">
            {generatingFlashcards && (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Generating Flashcards...</h3>
                <SkeletonBlock rows={5} />
              </div>
            )}
            {flashcards.length > 0 && (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-6 animate-in">
                <h3 className="text-lg font-semibold text-white">
                  Generated Flashcards ({flashcards.length})
                </h3>
                <div className="mt-4 space-y-3">
                  {flashcards.map((fc, i) => (
                    <div
                      key={i}
                      className="rounded-xl border border-white/5 bg-slate-900/50 p-4"
                    >
                      <p className="text-sm font-medium text-rose-300">Q: {fc.question}</p>
                      <p className="mt-1 text-sm text-slate-300">A: {fc.answer}</p>
                      <ExpandableSource chunk={fc.source_chunk} />
                      <VerificationBadge verification={fc.verification} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Quiz with loading skeleton */}
          <div className="mt-6">
            {generatingQuiz && (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Generating Quiz...</h3>
                <SkeletonBlock rows={5} />
              </div>
            )}
            {quizQuestions.length > 0 && (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-6 animate-in">
                <h3 className="text-lg font-semibold text-white">
                  Generated Quiz ({quizQuestions.length} questions)
                </h3>
                <div className="mt-4 space-y-4">
                  {quizQuestions.map((q, i) => (
                    <div
                      key={i}
                      className="rounded-xl border border-white/5 bg-slate-900/50 p-4"
                    >
                      <p className="text-sm font-medium text-white">
                        {i + 1}. {q.question}
                      </p>
                      <div className="mt-2 space-y-1">
                        {q.options.map((opt, j) => (
                          <p
                            key={j}
                            className={`text-sm ${
                              opt === q.correct_answer
                                ? "text-emerald-400 font-medium"
                                : "text-slate-400"
                            }`}
                          >
                            {String.fromCharCode(65 + j)}) {opt}
                          </p>
                        ))}
                      </div>
                      <p className="mt-2 text-xs text-slate-500 italic">
                        {q.explanation}
                      </p>
                      <ExpandableSource chunk={q.source_chunk} />
                      <VerificationBadge verification={q.verification} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </AppShell>
  );
}
