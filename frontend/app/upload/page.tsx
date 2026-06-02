"use client";

import { useState } from "react";
import { toast } from "sonner";
import AppShell from "../../components/AppShell";
import ErrorBoundary from "../../components/ErrorBoundary";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const AUTH_TOKEN_KEY = "prepagent_access_token";

function UploadContent() {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [status, setStatus] = useState<string>("");
  const [uploads, setUploads] = useState<Array<{ id: string; title: string; fileName: string; status: string }>>([]);

  async function handleUpload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("");

    if (!file) {
      setStatus("Please choose a file to upload.");
      return;
    }

    const token = typeof window !== "undefined" ? window.localStorage.getItem(AUTH_TOKEN_KEY) : null;
    if (!token) {
      setStatus("Please sign in before uploading documents.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("title", title || file.name);

    setStatus("Uploading document...");

    try {
      const response = await fetch(`${API_BASE}/api/v1/documents/upload`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const result = await response.json();
      if (!response.ok) {
        setStatus(result.detail ?? "Upload failed. Please try again.");
        return;
      }

      setUploads((current) => [
        {
          id: result.id,
          title: result.title || title || file.name,
          fileName: result.file_name || file.name,
          status: result.status || "queued",
        },
        ...current,
      ]);
      toast.success("Upload queued successfully.");
      setStatus("Upload queued successfully.");
      setFile(null);
      setTitle("");
    } catch (error) {
      toast.error("Unable to reach the upload service.");
      setStatus("Unable to reach the upload service. Please try again later.");
    }
  }

  return (
    <AppShell title="Upload Study Materials" description="Add PDFs and documents to your library for ingestion and review.">
      <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-6">
          <div className="zen-card p-8">
            <p className="text-sm uppercase tracking-[0.35em] text-rose-200/80">Upload materials</p>
            <h2 className="mt-4 text-3xl font-semibold text-white">Send your document to the prep pipeline.</h2>
            <p className="mt-3 text-slate-400">Choose a PDF or text file and let the system ingest it into your study library.</p>

            <form className="mt-8 space-y-6" onSubmit={handleUpload}>
              <label className="block text-slate-200">
                <span className="text-sm text-slate-400">Document title</span>
                <input
                  type="text"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Optional title for this upload"
                  className="mt-2 w-full rounded-3xl border border-white/10 bg-slate-900/90 p-4 text-white outline-none focus:border-rose-400/60 focus:ring-2 focus:ring-rose-400/20"
                />
              </label>

              <label className="block text-slate-200">
                <span className="text-sm text-slate-400">Select file</span>
                <input
                  type="file"
                  onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                  className="mt-2 w-full rounded-3xl border border-white/10 bg-slate-900/90 p-4 text-white outline-none"
                />
              </label>

              {status ? <p className="text-sm text-rose-300">{status}</p> : null}

              <button type="submit" className="btn-primary">
                Queue document for ingestion
              </button>
            </form>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-slate-950/80 p-8 shadow-xl shadow-black/20">
            <p className="text-sm uppercase tracking-[0.35em] text-rose-200/80">Upload hints</p>
            <ul className="mt-4 space-y-3 text-slate-300">
              <li>• Use clean PDFs or text exports for best ingestion results.</li>
              <li>• The document will be processed asynchronously and show status in your library.</li>
              <li>• You can upload multiple files and continue studying.</li>
            </ul>
          </div>
        </div>

        <aside className="space-y-6">
          <div className="zen-card p-6">
            <p className="text-sm uppercase tracking-[0.35em] text-rose-200/80">Upload queue</p>
            <div className="mt-6 space-y-4">
              {uploads.length === 0 ? (
                <p className="text-slate-400">Uploaded documents will appear here with their current processing status.</p>
              ) : (
                uploads.map((item) => (
                  <div key={item.id} className="rounded-3xl border border-white/10 bg-slate-900/80 p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="font-semibold text-white">{item.title}</p>
                        <p className="text-sm text-slate-400">{item.fileName}</p>
                      </div>
                      <span className="rounded-full bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.2em] text-slate-300">{item.status}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </aside>
      </section>
    </AppShell>
  );
}

export default function UploadPage() {
  return (
    <ErrorBoundary>
      <UploadContent />
    </ErrorBoundary>
  );
}
