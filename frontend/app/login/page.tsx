"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { setAuthToken } from "../../api";
import { loginSchema } from "../../lib/schemas";
import { login } from "../../lib/actions/auth";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleLogin() {
    setError("");
    setFieldErrors({});

    const result = loginSchema.safeParse({ email, password });
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
      const data = await login(email, password);
      setAuthToken(data.token);
      toast.success("Signed in successfully");
      router.push("/dashboard");
    } catch (err: any) {
      setError(err?.message || "Login failed. Please check your credentials.");
      setIsLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-ink-paper text-slate-100">
      <div className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-6 py-12 sm:px-8 lg:px-12">
        <div className="zen-card border border-white/10 bg-slate-950/80 p-10 shadow-2xl shadow-black/40 backdrop-blur-xl">
          <div className="mb-8 space-y-3">
            <p className="text-sm uppercase tracking-[0.35em] text-rose-200/80">Zen focus login</p>
            <h1 className="text-4xl font-semibold text-white">Sign in and continue your disciplined study flow.</h1>
            <p className="text-slate-400">Your account unlocks notes, review sessions, and adaptive exam practice.</p>
          </div>

          <form className="space-y-6" onSubmit={(event) => {
            event.preventDefault();
            handleLogin();
          }}>
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
            </label>

            {error ? <p className="text-sm text-rose-300">{error}</p> : null}

            <button
              type="submit"
              className="btn-primary w-full"
              disabled={isLoading}
            >
              {isLoading ? "Signing in..." : "Continue to the Dojo"}
            </button>
          </form>

          <p className="mt-8 text-sm text-slate-500">
            New here? <Link href="/signup" className="text-rose-300 hover:text-rose-200">Create an account</Link>
          </p>
        </div>
      </div>
    </main>
  );
}
