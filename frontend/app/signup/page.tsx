"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { setAuthToken } from "../../api";
import { signupSchema } from "../../lib/schemas";
import { signup } from "../../lib/actions/auth";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSignup() {
    setError("");
    setFieldErrors({});

    const result = signupSchema.safeParse({ email, password, full_name: fullName || undefined });
    if (!result.success) {
      const errors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const field = issue.path[0] as string;
        errors[field] = issue.message;
      }
      setFieldErrors(errors);
      return;
    }

    setIsLoading(true);

    try {
      const data = await signup(email, password, fullName || undefined);
      setAuthToken(data.token);
      toast.success("Account created. Signing you in...");
      router.push("/dashboard");
    } catch (err: any) {
      setIsLoading(false);
      setError(err?.message || "Signup failed. Please try again.");
    }
  }

  return (
    <main className="min-h-screen bg-ink-paper text-slate-100">
      <div className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-6 py-12 sm:px-8 lg:px-12">
        <div className="zen-card border border-white/10 bg-slate-950/80 p-10 shadow-2xl shadow-black/40 backdrop-blur-xl">
          <div className="mb-8 space-y-3">
            <p className="text-sm uppercase tracking-[0.35em] text-rose-200/80">Begin your journey</p>
            <h1 className="text-4xl font-semibold text-white">Create your study dojo.</h1>
            <p className="text-slate-400">Set up your account and start training with calm intensity.</p>
          </div>

          <form className="space-y-6" onSubmit={(event) => { event.preventDefault(); handleSignup(); }}>
            <label className="block">
              <span className="text-sm text-slate-300">Full name (optional)</span>
              <input
                type="text"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                placeholder="Miyamoto Musashi"
                className="mt-2 w-full rounded-3xl border border-white/10 bg-slate-900/90 p-4 text-white outline-none transition focus:border-rose-400/60 focus:ring-2 focus:ring-rose-400/20"
              />
            </label>

            <label className="block">
              <span className="text-sm text-slate-300">Email</span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                className="mt-2 w-full rounded-3xl border border-white/10 bg-slate-900/90 p-4 text-white outline-none transition focus:border-rose-400/60 focus:ring-2 focus:ring-rose-400/20"
              />
              {fieldErrors.email && <p className="mt-1 text-sm text-rose-300">{fieldErrors.email}</p>}
            </label>

            <label className="block">
              <span className="text-sm text-slate-300">Password</span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="••••••••"
                className="mt-2 w-full rounded-3xl border border-white/10 bg-slate-900/90 p-4 text-white outline-none transition focus:border-rose-400/60 focus:ring-2 focus:ring-rose-400/20"
              />
              {fieldErrors.password && <p className="mt-1 text-sm text-rose-300">{fieldErrors.password}</p>}
              <p className="mt-1 text-xs text-slate-500">At least 8 characters with an uppercase letter, lowercase letter, and number.</p>
            </label>

            {error ? <p className="text-sm text-rose-300">{error}</p> : null}

            <button type="submit" className="btn-primary w-full" disabled={isLoading}>
              {isLoading ? "Creating account..." : "Begin training"}
            </button>
          </form>

          <p className="mt-8 text-sm text-slate-500">
            Already training?{" "}
            <Link href="/login" className="text-rose-300 hover:text-rose-200">Sign in instead</Link>
          </p>
        </div>
      </div>
    </main>
  );
}
