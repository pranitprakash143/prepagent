"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";
import { FileText, Upload, Trash2, Loader2, CheckCircle2, XCircle, Clock, AlertCircle } from "lucide-react";
import { getAuthToken } from "@/api";
import type { Document, ProgressEvent } from "@/lib/types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

function authHeaders(): Record<string, string> {
  const token = typeof window !== "undefined" ? getAuthToken() : null;
  return token ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } : { "Content-Type": "application/json" };
}

function authGetHeaders(): Record<string, string> {
  const token = typeof window !== "undefined" ? getAuthToken() : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function formatDate(dateStr: string) {
  try {
    return new Date(dateStr).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  } catch { return dateStr; }
}

function formatSize(sizeStr?: string) {
  if (!sizeStr) return "";
  const bytes = parseInt(sizeStr, 10);
  if (isNaN(bytes)) return sizeStr;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, { icon: React.ReactNode; label: string; classes: string }> = {
    queued: {
      icon: <Clock className="h-3 w-3" />,
      label: "Queued",
      classes: "border-slate-500/30 text-slate-300 bg-slate-500/10",
    },
    processing: {
      icon: <Loader2 className="h-3 w-3 animate-spin" />,
      label: "Processing",
      classes: "border-amber-500/30 text-amber-300 bg-amber-500/10",
    },
    done: {
      icon: <CheckCircle2 className="h-3 w-3" />,
      label: "Done",
      classes: "border-emerald-500/30 text-emerald-300 bg-emerald-500/10",
    },
    failed: {
      icon: <XCircle className="h-3 w-3" />,
      label: "Failed",
      classes: "border-rose-500/30 text-rose-300 bg-rose-500/10",
    },
  };
  const s = styles[status] ?? {
    icon: <AlertCircle className="h-3 w-3" />,
    label: status,
    classes: "border-slate-500/30 text-slate-300 bg-slate-500/10",
  };
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${s.classes}`}>
      {s.icon}
      {s.label}
    </span>
  );
}

function DocumentCard({
  doc,
  onDelete,
  onRefresh,
}: {
  doc: Document;
  onDelete: (id: string) => void;
  onRefresh: () => void;
}) {
  const [progress, setProgress] = useState<ProgressEvent | null>(null);
  const readerRef = useRef<ReadableStreamDefaultReader | null>(null);

  useEffect(() => {
    if (doc.status !== "processing") {
      setProgress(null);
      readerRef.current?.cancel();
      readerRef.current = null;
      return;
    }

    let cancelled = false;
    const token = getAuthToken();
    if (!token) return;

    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/v1/documents/${doc.id}/progress`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok || !res.body) return;
        const reader = res.body.getReader();
        readerRef.current = reader;
        const decoder = new TextDecoder();
        let buffer = "";

        while (!cancelled) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split("\n");
          buffer = parts.pop() || "";
          for (const line of parts) {
            if (line.startsWith("data: ")) {
              try {
                const data = JSON.parse(line.slice(6)) as ProgressEvent;
                if (data.stage === "heartbeat") continue;
                setProgress(data);
              } catch { /* skip */ }
            }
          }
        }
      } catch { /* connection closed */ }
      if (!cancelled) {
        onRefresh();
      }
    })();

    return () => { cancelled = true; readerRef.current?.cancel(); };
  }, [doc.id, doc.status, onRefresh]);

  return (
    <div className="group rounded-2xl border border-white/10 bg-white/5 p-5 transition hover:border-rose-400/20">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-slate-900/80">
            <FileText className="h-5 w-5 text-slate-400" />
          </div>
          <div className="min-w-0">
            <h3 className="truncate font-medium text-white">{doc.file_name}</h3>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <StatusBadge status={doc.status} />
              {doc.file_size && <span className="text-[11px] text-slate-500">{formatSize(doc.file_size)}</span>}
            </div>
          </div>
        </div>
        <button
          onClick={() => onDelete(doc.id)}
          className="shrink-0 rounded-full p-1.5 text-slate-600 opacity-0 transition hover:bg-rose-500/10 hover:text-rose-300 group-hover:opacity-100"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {progress && progress.stage !== "done" && progress.stage !== "failed" && (
        <div className="mt-3">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="truncate">{progress.message}</span>
            <span className="shrink-0 ml-2">{progress.progress}%</span>
          </div>
          <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-rose-500 to-amber-400 transition-all duration-500"
              style={{ width: `${progress.progress}%` }}
            />
          </div>
        </div>
      )}

      {doc.created_at && (
        <p className="mt-3 text-[11px] text-slate-600">
          Uploaded {formatDate(doc.created_at)}
        </p>
      )}
    </div>
  );
}

export default function DocumentsContent() {
  const router = useRouter();
  const [docs, setDocs] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/api/v1/documents`, {
        headers: authGetHeaders(),
      });
      if (!res.ok) {
        if (res.status === 401) { router.push("/login"); return; }
        throw new Error("Failed to load documents");
      }
      const data = await res.json();
      setDocs(data);
    } catch {
      setError("Unable to load documents.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => { fetchDocuments(); }, [fetchDocuments]);

  async function handleDelete(id: string) {
    if (!confirm("Delete this document?")) return;
    try {
      const res = await fetch(`${API_BASE}/api/v1/documents/${id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error("Failed to delete");
      await fetchDocuments();
    } catch {
      setError("Failed to delete document.");
    }
  }

  const hasProcessing = docs.some((d) => d.status === "processing");

  return (
    <AppShell title="Documents" description="Browse and manage your uploaded study materials.">
      <div className="mb-6 flex items-center justify-between">
        <p className="text-sm text-slate-400">{docs.length} document{docs.length !== 1 ? "s" : ""}</p>
        <button
          onClick={() => router.push("/upload")}
          className="btn-primary inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-rose-500/10 transition hover:-translate-y-0.5"
        >
          <Upload className="h-4 w-4" />
          Upload
        </button>
      </div>

      {error && <p className="mb-4 text-sm text-rose-300">{error}</p>}

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 animate-pulse rounded-xl bg-white/10" />
                <div className="flex-1">
                  <div className="h-4 w-36 animate-pulse rounded-full bg-white/10" />
                  <div className="mt-2 h-3 w-20 animate-pulse rounded-full bg-white/10" />
                </div>
              </div>
              <div className="mt-3 h-2 w-full animate-pulse rounded-full bg-white/10" />
            </div>
          ))}
        </div>
      ) : docs.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-6 py-16 text-center">
          <FileText className="mb-4 h-10 w-10 text-slate-500" />
          <h3 className="text-lg font-medium text-white">No documents yet</h3>
          <p className="mt-1 max-w-sm text-sm text-slate-400">
            Upload your first PDF or image to start studying with AI-powered insights.
          </p>
          <button
            onClick={() => router.push("/upload")}
            className="btn-primary mt-6 inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-white"
          >
            <Upload className="h-4 w-4" />
            Upload document
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {docs.map((doc) => (
            <DocumentCard
              key={doc.id}
              doc={doc}
              onDelete={handleDelete}
              onRefresh={fetchDocuments}
            />
          ))}
        </div>
      )}

      {hasProcessing && (
        <div className="mt-4 flex items-center gap-2 rounded-2xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-sm text-amber-200/80">
          <Loader2 className="h-4 w-4 animate-spin" />
          Some documents are still processing. Progress updates automatically.
        </div>
      )}
    </AppShell>
  );
}
