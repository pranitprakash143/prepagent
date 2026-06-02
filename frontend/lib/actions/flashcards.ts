"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "./auth";

export async function getFlashcards(subjectId?: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");

  const where: any = { userId: user.id };
  if (subjectId) where.subjectId = subjectId;

  return prisma.flashcard.findMany({
    where,
    orderBy: { updatedAt: "desc" },
  });
}

export async function getDueFlashcards() {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");

  return prisma.flashcard.findMany({
    where: {
      userId: user.id,
      nextReview: { lte: new Date() },
    },
    orderBy: { nextReview: "asc" },
  });
}

export async function createFlashcard(data: {
  question: string;
  answer: string;
  subjectId?: string;
  noteId?: string;
  documentId?: string;
}) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");

  return prisma.flashcard.create({
    data: {
      userId: user.id,
      tenantId: user.tenantId,
      question: data.question,
      answer: data.answer,
      subjectId: data.subjectId,
      noteId: data.noteId,
      documentId: data.documentId,
    },
  });
}

export async function updateFlashcard(
  id: string,
  data: { question?: string; answer?: string; subjectId?: string }
) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");

  return prisma.flashcard.updateMany({
    where: { id, userId: user.id },
    data,
  });
}

export async function deleteFlashcard(id: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");

  await prisma.flashcard.deleteMany({
    where: { id, userId: user.id },
  });
}
