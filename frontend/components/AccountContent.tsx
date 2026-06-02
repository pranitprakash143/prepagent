"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import AppShell from "@/components/AppShell";
import {
  CreditCard,
  CheckCircle2,
  Loader2,
  Sparkles,
} from "lucide-react";
import apiClient from "@/api";
import type { SubscriptionStatus, PaymentRecord } from "@/lib/types";

function AccountContentInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [subRes, historyRes] = await Promise.all([
          apiClient.get("/payments/subscription"),
          apiClient.get("/payments/history"),
        ]);
        setSubscription(subRes.data);
        setPayments(historyRes.data || []);
      } catch {
        // Not logged in or error
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const justUpgraded = searchParams.get("success") === "true";

  if (loading) {
    return (
      <AppShell title="Account" description="Manage your subscription.">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell
      title="Account"
      description="Manage your subscription and payment history."
    >
      {justUpgraded && (
        <div className="mb-6 flex items-center gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-5 py-4 text-sm text-emerald-300">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          Payment successful! Your account has been upgraded to Pro.
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
            <CreditCard className="h-5 w-5 text-rose-400" />
            Subscription
          </h2>

          {subscription ? (
            <div className="mt-4 space-y-4">
              <div className="flex items-center justify-between rounded-xl border border-white/5 bg-slate-900/50 px-4 py-3">
                <span className="text-sm text-slate-400">Plan</span>
                <span className="text-sm font-medium text-white">
                  {subscription.plan}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-white/5 bg-slate-900/50 px-4 py-3">
                <span className="text-sm text-slate-400">Status</span>
                <span
                  className={`inline-flex items-center gap-1.5 text-sm font-medium ${
                    subscription.is_active
                      ? "text-emerald-400"
                      : "text-slate-400"
                  }`}
                >
                  {subscription.is_active ? (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      Active
                    </>
                  ) : (
                    "Inactive"
                  )}
                </span>
              </div>

              {!subscription.is_active && (
                <button
                  onClick={() => router.push("/pricing")}
                  className="mt-4 w-full rounded-xl bg-rose-500 py-3 text-sm font-semibold text-white shadow-lg shadow-rose-500/20 transition hover:bg-rose-400"
                >
                  <Sparkles className="mr-2 inline h-4 w-4" />
                  Upgrade to Pro
                </button>
              )}
            </div>
          ) : (
            <p className="mt-4 text-sm text-slate-400">
              Not signed in.{" "}
              <button
                onClick={() => router.push("/login")}
                className="text-rose-300 hover:underline"
              >
                Log in
              </button>{" "}
              to view subscription.
            </p>
          )}
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
            <CreditCard className="h-5 w-5 text-rose-400" />
            Payment History
          </h2>

          {payments.length === 0 ? (
            <p className="mt-4 text-sm text-slate-400">No payments yet.</p>
          ) : (
            <div className="mt-4 space-y-2">
              {payments.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between rounded-xl border border-white/5 bg-slate-900/50 px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-medium text-white capitalize">
                      {p.provider} &middot; {p.plan}
                    </p>
                    <p className="text-xs text-slate-500">
                      {p.created_at
                        ? new Date(p.created_at).toLocaleDateString()
                        : ""}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-white">
                      ₹{p.amount.toLocaleString()}
                    </p>
                    <span
                      className={`text-xs capitalize ${
                        p.status === "completed" || p.status === "captured"
                          ? "text-emerald-400"
                          : "text-slate-500"
                      }`}
                    >
                      {p.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}

export default function AccountContent() {
  return (
    <Suspense fallback={
      <AppShell title="Account" description="Manage your subscription.">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      </AppShell>
    }>
      <AccountContentInner />
    </Suspense>
  );
}
