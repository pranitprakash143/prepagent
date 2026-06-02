"use client";

import { useState, useEffect, useCallback } from "react";
import AppShell from "@/components/AppShell";
import { Plus, BookOpen } from "lucide-react";
import { getAuthToken } from "@/api";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

interface Subject {
  id: string;
  name: string;
  description?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

type ModalMode = "create" | "edit";

function authHeaders(): Record<string, string> {
  const token = typeof window !== "undefined" ? getAuthToken() : null;
  return token ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } : { "Content-Type": "application/json" };
}

export default function SubjectContent() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>("create");
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchSubjects = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/api/v1/subjects`, { headers: authHeaders() });
      if (!res.ok) throw new Error("Failed to load subjects");
      const data = await res.json();
      setSubjects(data);
    } catch {
      setError("Unable to load subjects.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSubjects(); }, [fetchSubjects]);

  function openCreate() {
    setModalMode("create");
    setEditingSubject(null);
    setFormName("");
    setFormDescription("");
    setModalOpen(true);
  }

  function openEdit(subject: Subject) {
    setModalMode("edit");
    setEditingSubject(subject);
    setFormName(subject.name);
    setFormDescription(subject.description ?? "");
    setModalOpen(true);
  }

  async function handleSave() {
    if (!formName.trim()) return;
    setSaving(true);
    try {
      if (modalMode === "create") {
        const res = await fetch(`${API_BASE}/api/v1/subjects`, {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify({ name: formName.trim(), description: formDescription.trim() || undefined }),
        });
        if (!res.ok) {
          const data = await res.json();
          setError(data.detail ?? "Failed to create subject");
          setSaving(false);
          return;
        }
      } else if (editingSubject) {
        const res = await fetch(`${API_BASE}/api/v1/subjects/${editingSubject.id}`, {
          method: "PATCH",
          headers: authHeaders(),
          body: JSON.stringify({ name: formName.trim(), description: formDescription.trim() || undefined }),
        });
        if (!res.ok) {
          const data = await res.json();
          setError(data.detail ?? "Failed to update subject");
          setSaving(false);
          return;
        }
      }
      setModalOpen(false);
      await fetchSubjects();
    } catch {
      setError("Failed to save subject.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this subject?")) return;
    try {
      const res = await fetch(`${API_BASE}/api/v1/subjects/${id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error("Failed to delete");
      await fetchSubjects();
    } catch {
      setError("Failed to delete subject.");
    }
  }

  return (
    <AppShell title="Subjects" description="Organize your study materials by subject.">
      <div className="mb-6 flex items-center justify-between">
        <p className="text-sm text-slate-400">{subjects.length} subject{subjects.length !== 1 ? "s" : ""}</p>
        <button onClick={openCreate} className="btn-primary inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-rose-500/10 transition hover:-translate-y-0.5">
          <Plus className="h-4 w-4" />
          New subject
        </button>
      </div>

      {error && <p className="mb-4 text-sm text-rose-300">{error}</p>}

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <div className="h-5 w-32 animate-pulse rounded-full bg-white/10" />
              <div className="mt-3 h-3 w-48 animate-pulse rounded-full bg-white/10" />
            </div>
          ))}
        </div>
      ) : subjects.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-6 py-16 text-center">
          <BookOpen className="mb-4 h-10 w-10 text-slate-500" />
          <h3 className="text-lg font-medium text-white">No subjects yet</h3>
          <p className="mt-1 max-w-sm text-sm text-slate-400">
            Create your first subject to organize your study materials.
          </p>
          <button onClick={openCreate} className="btn-primary mt-6 inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-white">
            <Plus className="h-4 w-4" />
            Create subject
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {subjects.map((subject) => (
            <div key={subject.id} className="group rounded-2xl border border-white/10 bg-white/5 p-6 transition hover:border-rose-400/20">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-white">{subject.name}</h3>
                  {subject.description && <p className="mt-1 text-sm text-slate-400">{subject.description}</p>}
                </div>
              </div>
              <div className="mt-4 flex gap-2 opacity-0 transition group-hover:opacity-100">
                <button onClick={() => openEdit(subject)} className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-400 hover:bg-white/10 hover:text-white transition">
                  Edit
                </button>
                <button onClick={() => handleDelete(subject.id)} className="rounded-full border border-rose-500/20 px-3 py-1 text-xs text-rose-300 hover:bg-rose-500/10 transition">
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setModalOpen(false)}>
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-950 p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-white">{modalMode === "create" ? "Create subject" : "Edit subject"}</h2>

            <div className="mt-4 space-y-4">
              <label className="block">
                <span className="text-sm text-slate-300">Name</span>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Biology, Physics"
                  className="mt-2 w-full rounded-3xl border border-white/10 bg-slate-900/90 p-3 text-white outline-none transition focus:border-rose-400/60 focus:ring-2 focus:ring-rose-400/20"
                />
              </label>
              <label className="block">
                <span className="text-sm text-slate-300">Description (optional)</span>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Brief description of this subject"
                  rows={3}
                  className="mt-2 w-full rounded-3xl border border-white/10 bg-slate-900/90 p-3 text-white outline-none transition focus:border-rose-400/60 focus:ring-2 focus:ring-rose-400/20"
                />
              </label>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setModalOpen(false)} className="rounded-full border border-white/10 px-4 py-2 text-sm text-slate-400 hover:bg-white/5 transition">
                Cancel
              </button>
              <button onClick={handleSave} disabled={saving || !formName.trim()} className="btn-primary rounded-full px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
                {saving ? "Saving..." : modalMode === "create" ? "Create" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
