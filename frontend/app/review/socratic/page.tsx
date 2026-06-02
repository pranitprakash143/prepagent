"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";
import { Send, Loader2, Lightbulb, Bot, User, ArrowLeft, MessageSquare, X } from "lucide-react";
import { getAuthToken } from "@/api";
import type { SocraticMessage, SocraticResponse } from "@/lib/types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

function TypingIndicator() {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-300">
        <Bot className="h-4 w-4" />
      </div>
      <div className="rounded-2xl bg-slate-800/50 px-4 py-3">
        <div className="flex items-center gap-1">
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400" style={{ animationDelay: "0ms" }} />
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400" style={{ animationDelay: "150ms" }} />
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400" style={{ animationDelay: "300ms" }} />
        </div>
      </div>
    </div>
  );
}

function SocraticReviewContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const questionParam = searchParams.get("question") || "";
  const answerParam = searchParams.get("answer") || "";
  const contextParam = searchParams.get("context") || "";

  const [question] = useState(questionParam);
  const [correctAnswer] = useState(answerParam);
  const [context] = useState(contextParam);
  const [messages, setMessages] = useState<SocraticMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [showSidebar, setShowSidebar] = useState(false);
  const [error, setError] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    if (!loading) inputRef.current?.focus();
  }, [loading]);

  async function startSession() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/api/v1/socratic/tutor`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getAuthToken()}`,
        },
        body: JSON.stringify({
          question,
          correct_answer: correctAnswer || undefined,
          context: context || undefined,
          history: [],
        }),
      });
      if (!res.ok) throw new Error("Failed to start session");
      const data: SocraticResponse = await res.json();
      setMessages([
        { role: "assistant", content: data.reply },
      ]);
      if (data.reveal_answer) setRevealed(true);
      if (data.hints_used) setHintsUsed(data.hints_used);
    } catch {
      setError("Failed to connect to Socratic tutor.");
    } finally {
      setLoading(false);
    }
  }

  async function sendMessage() {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput("");

    const newMessages: SocraticMessage[] = [...messages, { role: "user", content: userMsg }];
    setMessages(newMessages);
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/v1/socratic/tutor`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getAuthToken()}`,
        },
        body: JSON.stringify({
          question,
          correct_answer: correctAnswer || undefined,
          context: context || undefined,
          history: newMessages.map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      if (!res.ok) throw new Error("Failed");
      const data: SocraticResponse = await res.json();
      setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
      if (data.reveal_answer) setRevealed(true);
      if (data.hints_used) setHintsUsed(data.hints_used);
    } catch {
      setError("Failed to get response.");
    } finally {
      setLoading(false);
    }
  }

  if (!question) {
    return (
      <Suspense fallback={<div>Loading content...</div>}>
      <AppShell title="Socratic Review" description="AI-guided study session.">
        <div className="flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-6 py-16 text-center">
          <Lightbulb className="mb-4 h-10 w-10 text-slate-500" />
          <h3 className="text-lg font-medium text-white">No question selected</h3>
          <p className="mt-1 text-sm text-slate-400">
            Select a flashcard or question to start a Socratic review session.
          </p>
          <button
            onClick={() => router.push("/flashcards")}
            className="mt-4 rounded-full bg-white/10 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-white/20"
          >
            Go to Flashcards
          </button>
        </div>
      </AppShell>
      </Suspense>
    );
  }

  return (
    <Suspense fallback={<div>Loading content...</div>}>
    <AppShell title="Socratic Review" description="AI guides you to the answer.">
      <div className="flex h-screen-dynamic flex-col">
        <div className="flex items-center justify-between shrink-0">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 text-sm text-slate-400 transition hover:text-slate-200 min-h-[44px]"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
          {messages.length > 0 && (
            <button
              onClick={() => setShowSidebar(!showSidebar)}
              className="inline-flex items-center gap-1.5 text-sm text-slate-400 transition hover:text-slate-200 min-h-[44px]"
            >
              <MessageSquare className="h-4 w-4" />
              History
            </button>
          )}
        </div>

        <div className="flex flex-1 gap-4 overflow-hidden">
          <div className="flex flex-1 flex-col min-w-0">
            <div className="shrink-0 rounded-2xl border border-white/10 bg-white/5 p-4">
              <h3 className="text-sm font-medium text-slate-400">Question</h3>
              <p className="mt-1 text-white">{question}</p>
            </div>

            {revealed && correctAnswer && (
              <div className="mt-3 shrink-0 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3">
                <p className="text-sm text-emerald-300">
                  <span className="font-medium">Answer: </span>
                  {correctAnswer}
                </p>
              </div>
            )}

            {error && (
              <div className="mt-3 shrink-0 text-sm text-rose-300">{error}</div>
            )}

            {/* Session info bar */}
            {messages.length > 0 && (
              <div className="mt-3 flex shrink-0 items-center gap-3 text-xs text-slate-500">
                <span>{messages.filter(m => m.role === "user").length} responses</span>
                <span className="text-slate-600">|</span>
                <span className={hintsUsed >= 5 ? "text-amber-400" : ""}>
                  Hints used: {hintsUsed}/5
                </span>
                {revealed && (
                  <>
                    <span className="text-slate-600">|</span>
                    <span className="text-emerald-400">Answer revealed</span>
                  </>
                )}
              </div>
            )}

            <div className="mt-4 flex-1 space-y-3 overflow-y-auto">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex items-start gap-3 ${
                    msg.role === "user" ? "flex-row-reverse" : ""
                  }`}
                >
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                      msg.role === "user"
                        ? "bg-rose-500/20 text-rose-300"
                        : "bg-emerald-500/20 text-emerald-300"
                    }`}
                  >
                    {msg.role === "user" ? (
                      <User className="h-4 w-4" />
                    ) : (
                      <Bot className="h-4 w-4" />
                    )}
                  </div>
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                      msg.role === "user"
                        ? "bg-rose-500/10 text-slate-200"
                        : "bg-slate-800/50 text-slate-200"
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}
              {loading && <TypingIndicator />}
              <div ref={chatEndRef} />
            </div>

            {messages.length === 0 && !loading && (
              <button
                onClick={startSession}
                className="mt-4 shrink-0 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-rose-600 to-amber-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-rose-500/20 transition hover:-translate-y-0.5"
              >
                <Lightbulb className="h-4 w-4" />
                Start Socratic Session
              </button>
            )}

            <div className="sticky bottom-0 z-10 mt-4 flex gap-2 bg-slate-950 pt-2 shrink-0">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                placeholder="Type your answer..."
                disabled={loading || messages.length === 0}
                className="flex-1 rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-rose-400/50 disabled:opacity-50 min-h-[44px]"
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim() || loading}
                className="rounded-xl bg-rose-500/20 p-3 text-rose-300 transition hover:bg-rose-500/30 disabled:opacity-50 min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Send className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>

        {/* Session history sidebar */}
        {showSidebar && messages.length > 0 && (
          <div className="hidden w-72 shrink-0 lg:block">
            <div className="sticky top-4 rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white">Session History</h3>
                <button
                  onClick={() => setShowSidebar(false)}
                  className="text-slate-500 hover:text-slate-300"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                {messages.map((msg, i) => (
                  <div key={i} className="rounded-lg bg-slate-900/50 p-2.5">
                    <p className="text-[10px] font-medium uppercase tracking-wider text-slate-500 mb-1">
                      {msg.role === "user" ? "You" : "AI Tutor"}
                    </p>
                    <p className="text-xs text-slate-300 line-clamp-2">
                      {msg.content}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
          </div>
      </div>
    </AppShell>
</Suspense>
  );
}

export default function SocraticReviewPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen text-slate-400">Loading Socratic review...</div>}>
      <SocraticReviewContent />
    </Suspense>
  );
}
