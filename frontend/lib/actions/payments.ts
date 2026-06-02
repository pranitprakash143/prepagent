"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "./auth";

export async function getSubscription() {
  const user = await getCurrentUser();
  if (!user) return null;

  return { plan: user.plan, is_active: user.plan !== "FREE" };
}

export async function getPaymentHistory() {
  const user = await getCurrentUser();
  if (!user) return [];

  return prisma.payment.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });
}

export async function createStripeSession(priceId: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  const res = await fetch(`${API_BASE}/api/v1/payments/create-stripe-session`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      price_id: priceId,
      success_url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/account?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/pricing?canceled=true`,
    }),
  });

  if (!res.ok) throw new Error("Failed to create Stripe session");
  return res.json();
}

export async function createRazorpayOrder(plan: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  const res = await fetch(`${API_BASE}/api/v1/payments/create-razorpay-order`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ plan }),
  });

  if (!res.ok) throw new Error("Failed to create Razorpay order");
  return res.json();
}
