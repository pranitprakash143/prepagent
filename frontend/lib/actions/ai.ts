"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "./auth";
import { getAuthToken } from "@/lib/auth";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

function authHeaders(): Record<string, string> {
  const token = getAuthToken() || "";
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

export async function generateAndSaveFlashcards(
  documentId: string,
  count: number = 5
) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");

  const headers = await authHeaders();
  const res = await fetch(
    `${API_BASE}/api/v1/documents/${documentId}/generate-flashcards`,
    {
      method: "POST",
      headers,
      body: JSON.stringify({ count }),
    }
  );

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Failed to generate flashcards: ${res.status} ${body}`);
  }

  const data = await res.json();
  const flashcards = data.flashcards || [];

  const saved = [];
  for (const fc of flashcards) {
    const created = await prisma.flashcard.create({
      data: {
        userId: user.id,
        tenantId: user.tenantId,
        question: fc.question,
        answer: fc.answer,
        documentId,
        source: "ai",
      },
    });
    saved.push(created);
  }

  return saved;
}

export async function generateAndSaveQuiz(
  documentId: string,
  count: number = 10
) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");

  const headers = await authHeaders();
  const res = await fetch(
    `${API_BASE}/api/v1/documents/${documentId}/generate-quiz`,
    {
      method: "POST",
      headers,
      body: JSON.stringify({ count }),
    }
  );

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Failed to generate quiz: ${res.status} ${body}`);
  }

  const data = await res.json();
  return data.questions || [];
}

export async function getGapAnalysis(subjectId?: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");

  const params = subjectId ? `?subject_id=${subjectId}` : "";
  const res = await fetch(
    `${API_BASE}/api/v1/pyq/gap-analysis${params}`,
    {
      headers: { Authorization: `Bearer ${getAuthToken() || ""}` },
    }
  );

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Failed to get gap analysis: ${res.status} ${body}`);
  }

  return res.json();
}

export async function socraticTutor(params: {
  question: string;
  correct_answer?: string;
  context?: string;
  history: { role: string; content: string }[];
}) {
  const user = await getCurrentUser();
  if (!user) return null;

  try {
    const token = getAuthToken() || "";
    const res = await fetch(`${API_BASE}/api/v1/socratic/tutor`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(params),
    });

    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}
