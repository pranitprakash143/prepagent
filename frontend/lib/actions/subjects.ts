"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "./auth";

export async function getSubjects() {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");

  return prisma.subject.findMany({
    where: { userId: user.id },
    orderBy: { name: "asc" },
  });
}

export async function createSubject(data: { name: string; color?: string }) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");

  return prisma.subject.create({
    data: {
      userId: user.id,
      tenantId: user.tenantId,
      name: data.name,
      color: data.color || "#8b5cf6",
    },
  });
}

export async function updateSubject(id: string, data: { name?: string; color?: string }) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");

  return prisma.subject.updateMany({
    where: { id, userId: user.id },
    data,
  });
}

export async function deleteSubject(id: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");

  await prisma.subject.deleteMany({
    where: { id, userId: user.id },
  });
}
