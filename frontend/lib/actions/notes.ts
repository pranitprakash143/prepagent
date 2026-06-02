"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "./auth";

export async function getNotes(subjectId?: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");

  const where: any = { userId: user.id };
  if (subjectId) where.subjectId = subjectId;

  return prisma.note.findMany({
    where,
    orderBy: { updatedAt: "desc" },
  });
}

export async function getNote(id: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");

  return prisma.note.findFirst({
    where: { id, userId: user.id },
  });
}

export async function createNote(data: {
  title: string;
  content?: string;
  tags?: string[];
  subjectId?: string;
}) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");

  return prisma.note.create({
    data: {
      userId: user.id,
      tenantId: user.tenantId,
      title: data.title,
      content: data.content || "",
      tags: JSON.stringify(data.tags || []),
      subjectId: data.subjectId,
    },
  });
}

export async function updateNote(
  id: string,
  data: { title?: string; content?: string; tags?: string[]; subjectId?: string }
) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");

  const updateData: any = {};
  if (data.title !== undefined) updateData.title = data.title;
  if (data.content !== undefined) updateData.content = data.content;
  if (data.tags !== undefined) updateData.tags = JSON.stringify(data.tags);
  if (data.subjectId !== undefined) updateData.subjectId = data.subjectId;

  return prisma.note.updateMany({
    where: { id, userId: user.id },
    data: updateData,
  });
}

export async function deleteNote(id: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");

  await prisma.note.deleteMany({
    where: { id, userId: user.id },
  });
}
