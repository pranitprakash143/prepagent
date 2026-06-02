import Link from "next/link";

const features = [
  {
    title: "Focused Study Path",
    description:
      "A clean interface that removes noise and keeps your attention on high-value exam preparation.",
  },
  {
    title: "Zen Review Mode",
    description:
      "Minimal distractions, elegant typography, and calm prompts inspired by samurai discipline.",
  },
  {
    title: "Ink & Insight",
    description:
      "Capture notes, questions, and flashcards in a layout designed for thoughtful reflection.",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-ink-paper text-slate-100">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col justify-center px-6 py-12 sm:px-8 lg:px-12">
        <div className="grid gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
          <section className="space-y-8">
            <div className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-200 backdrop-blur-sm">
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-300" />
              Miyamoto Musashi inspired focus studio
            </div>
            <div className="space-y-6">
              <h1 className="max-w-3xl text-5xl font-semibold leading-tight text-white sm:text-6xl calligraphy-heading">
                Train your mind like a samurai. Study with calm intensity.
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-slate-300">
                A study environment built for deep concentration, thoughtful reflection, and disciplined progress.
                Quiet interface, elegant design, and adaptive sessions to support exam mastery.
              </p>
            </div>
            <div className="flex flex-wrap gap-4">
              <Link
                href="/signup"
                className="btn-primary inline-flex items-center justify-center rounded-full px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-rose-500/10 transition hover:-translate-y-0.5 hover:bg-rose-500/90"
              >
                Begin the path
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center justify-center rounded-full border border-white/15 bg-white/5 px-6 py-3 text-sm font-semibold text-slate-200 transition hover:border-white/30"
              >
                Sign in
              </Link>
            </div>
          </section>

          <aside className="zen-card border border-white/10 bg-slate-950/70 p-8 shadow-2xl shadow-black/30 backdrop-blur-xl">
            <p className="text-sm uppercase tracking-[0.35em] text-rose-200/80">The Way of Study</p>
            <div className="mt-6 space-y-4 text-slate-300">
              <p className="text-base leading-7">
                Practice with intention. Build habits with guided review sessions, composable notes, and curated exam drills.
              </p>
              <p className="text-sm text-slate-400">
                Inspired by Zen simplicity and the precision of calligraphy, every detail is designed to keep your focus sharp.
              </p>
            </div>
          </aside>
        </div>

        <section id="features" className="mt-20 grid gap-6 md:grid-cols-3">
          {features.map((feature) => (
            <article
              key={feature.title}
              className="rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-xl shadow-black/20 transition hover:-translate-y-1 hover:border-rose-400/20"
            >
              <h2 className="mb-3 text-xl font-semibold text-white">{feature.title}</h2>
              <p className="text-sm leading-7 text-slate-300">{feature.description}</p>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
