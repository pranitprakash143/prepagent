"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2 } from "lucide-react";
import apiClient from "@/api";

const plans = [
  {
    name: "Free",
    price: 0,
    interval: "forever",
    description: "Get started with basic study tools.",
    features: [
      "Up to 10 documents",
      "Basic notes",
      "20 flashcards",
      "Search documents",
    ],
    cta: "Current plan",
    popular: false,
  },
  {
    name: "Pro Monthly",
    price: 999,
    interval: "month",
    description: "Unlock everything for serious study sessions.",
    features: [
      "Unlimited documents",
      "Rich text notes with TipTap",
      "Unlimited flashcards with SM-2 SRS",
      "AI-powered search",
      "Priority support",
    ],
    cta: "Subscribe monthly",
    popular: true,
    provider: "stripe" as const,
    priceId: "monthly",
  },
  {
    name: "Pro Yearly",
    price: 9999,
    interval: "year",
    description: "Best value — save 17% vs monthly.",
    features: [
      "Everything in Pro Monthly",
      "2 months free",
      "Early access to new features",
    ],
    cta: "Subscribe yearly",
    popular: false,
    provider: "stripe" as const,
    priceId: "yearly",
  },
];

const razorpayPlans = [
  {
    name: "Pro Monthly (Razorpay)",
    price: 999,
    interval: "month",
    description: "Pay via UPI, card, or net banking.",
    features: [
      "Unlimited documents",
      "Rich text notes with TipTap",
      "Unlimited flashcards with SM-2 SRS",
      "AI-powered search",
      "Priority support",
    ],
    cta: "Pay ₹999/month",
    popular: false,
    provider: "razorpay" as const,
    priceId: "monthly",
  },
  {
    name: "Pro Yearly (Razorpay)",
    price: 9999,
    interval: "year",
    description: "Best value with Razorpay.",
    features: [
      "Everything in Pro Monthly",
      "2 months free",
      "Early access to new features",
    ],
    cta: "Pay ₹9,999/year",
    popular: false,
    provider: "razorpay" as const,
    priceId: "yearly",
  },
];

export default function PricingCards() {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function handleSubscribe(provider: "stripe" | "razorpay", priceId: string) {
    setLoading(`${provider}-${priceId}`);
    setError("");

    try {
      if (provider === "stripe") {
        const res = await apiClient.post("/payments/create-stripe-session", {
          price_id: priceId,
          success_url: `${window.location.origin}/account?success=true`,
          cancel_url: `${window.location.origin}/pricing?canceled=true`,
        });
        if (res.data.url) {
          window.location.href = res.data.url;
        }
      } else {
        const res = await apiClient.post("/payments/create-razorpay-order", {
          plan: priceId,
        });
        const order = res.data;
        const options = {
          key: order.key_id,
          amount: order.amount,
          currency: order.currency,
          name: "PrepAgent",
          description: "Pro Plan",
          order_id: order.order_id,
          handler: () => {
            router.push("/account?success=true");
          },
          modal: {
            ondismiss: () => setLoading(null),
          },
        };
        const rzp = new (window as any).Razorpay(options);
        rzp.open();
      }
    } catch {
      setError("Failed to start payment. Please try again.");
    } finally {
      setLoading(null);
    }
  }

  return (
    <>
      {error && (
        <div className="mb-6 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
          {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {plans.map((plan) => (
          <div
            key={plan.name}
            className={`relative rounded-2xl border p-6 transition ${
              plan.popular
                ? "border-rose-400/40 bg-rose-500/5 shadow-lg shadow-rose-500/5"
                : "border-white/10 bg-white/5 hover:border-white/20"
            }`}
          >
            {plan.popular && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-rose-500 px-4 py-1 text-[11px] font-semibold uppercase tracking-wider text-white">
                Most popular
              </div>
            )}
            <div className="mt-2">
              <h3 className="text-lg font-semibold text-white">{plan.name}</h3>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="text-3xl font-bold text-white">
                  {plan.price === 0 ? "Free" : `₹${plan.price.toLocaleString()}`}
                </span>
                {plan.price > 0 && (
                  <span className="text-sm text-slate-400">/{plan.interval}</span>
                )}
              </div>
              <p className="mt-2 text-sm text-slate-400">{plan.description}</p>
            </div>

            <ul className="mt-6 space-y-3">
              {plan.features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-slate-300">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                  {f}
                </li>
              ))}
            </ul>

            <button
              onClick={() => {
                if (plan.price === 0) return;
                handleSubscribe(plan.provider!, plan.priceId!);
              }}
              disabled={plan.price === 0 || loading?.startsWith(plan.provider!)}
              className={`mt-8 w-full rounded-xl py-3 text-sm font-semibold transition ${
                plan.price === 0
                  ? "border border-white/10 bg-white/5 text-slate-400"
                  : plan.popular
                    ? "bg-rose-500 text-white shadow-lg shadow-rose-500/20 hover:bg-rose-400"
                    : "border border-white/10 bg-white/5 text-white hover:bg-white/10"
              }`}
            >
              {loading?.startsWith(plan.provider!) ? (
                <Loader2 className="mx-auto h-5 w-5 animate-spin" />
              ) : (
                plan.cta
              )}
            </button>
          </div>
        ))}
      </div>

      <div className="mt-12">
        <h2 className="mb-4 text-lg font-semibold text-white">Pay with Razorpay (India)</h2>
        <div className="grid gap-6 lg:grid-cols-2">
          {razorpayPlans.map((plan) => (
            <div
              key={plan.name}
              className="rounded-2xl border border-white/10 bg-white/5 p-6 transition hover:border-white/20"
            >
              <h3 className="text-lg font-semibold text-white">{plan.name}</h3>
              <p className="mt-1 text-sm text-slate-400">{plan.description}</p>
              <ul className="mt-4 space-y-2">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-slate-300">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                    {f}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => handleSubscribe(plan.provider, plan.priceId)}
                disabled={loading?.startsWith(plan.provider)}
                className="mt-6 w-full rounded-xl border border-white/10 bg-white/5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                {loading?.startsWith(plan.provider) ? (
                  <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                ) : (
                  plan.cta
                )}
              </button>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
