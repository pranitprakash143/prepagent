"use client";

import { useState, useEffect } from "react";
import AppShell from "@/components/AppShell";
import ErrorBoundary from "@/components/ErrorBoundary";
import NoteEditor from "@/components/NoteEditor";
import apiClient from "@/api";

interface NoteItem {
  id: string;
  title: string;
  content: string;
  excerpt: string;
  tags?: string[];
}

function NotesContentInner() {
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showEditor, setShowEditor] = useState(false);
  const [editingNote, setEditingNote] = useState<NoteItem | null>(null);

  useEffect(() => {
    loadNotes();
  }, []);

  async function loadNotes() {
    try {
      const response = await apiClient.get("/notes");
      const fetchedNotes = (response.data || []).map((note: any) => ({
        ...note,
        excerpt: (note.content || "").substring(0, 150),
      }));
      setNotes(fetchedNotes);
    } catch {
      setError("Unable to fetch notes. Create your first note to get started.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveNote(title: string, content: string, tags: string[]) {
    try {
      if (editingNote) {
        await apiClient.patch(`/notes/${editingNote.id}`, { title, content, tags });
      } else {
        const response = await apiClient.post("/notes", { title, content, tags });
        const newNote = response.data;
        setNotes((prev) => [{ ...newNote, excerpt: content.substring(0, 150) }, ...prev]);
      }
      setShowEditor(false);
      setEditingNote(null);
      await loadNotes();
    } catch {
      console.error("Failed to save note");
    }
  }

  function handleEdit(note: NoteItem) {
    setEditingNote(note);
    setShowEditor(true);
  }

  function handleCreateNew() {
    setEditingNote(null);
    setShowEditor(true);
  }

  return (
    <AppShell title="Study Notes" description="Capture your key ideas in a quiet, well-organized notes workspace.">
      {showEditor ? (
        <section className="zen-card p-8">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-3xl font-semibold text-white">{editingNote ? "Edit note" : "Create new note"}</h2>
            <button
              onClick={() => {
                setShowEditor(false);
                setEditingNote(null);
              }}
              className="text-sm font-medium text-rose-300 hover:text-rose-200"
            >
              Back to notes
            </button>
          </div>

          <NoteEditor
            id={editingNote?.id}
            initialTitle={editingNote?.title}
            initialContent={editingNote?.content}
            initialTags={editingNote?.tags}
            onSave={handleSaveNote}
          />
        </section>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <section className="space-y-6">
            <div className="zen-card p-8">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm uppercase tracking-[0.35em] text-rose-200/80">Notes library</p>
                  <h2 className="mt-3 text-3xl font-semibold text-white">Focused notes for every session.</h2>
                </div>
                <button onClick={handleCreateNew} className="btn-primary">
                  Create new note
                </button>
              </div>

              {loading ? (
                <p className="mt-6 text-slate-400">Loading your notes…</p>
              ) : error ? (
                <p className="mt-6 text-rose-300">{error}</p>
              ) : notes.length === 0 ? (
                <div className="mt-6 rounded-3xl border border-dashed border-white/10 bg-slate-950/80 p-8 text-slate-400">
                  <p className="text-sm">No notes yet. Create your first study note to start building a revision library.</p>
                </div>
              ) : (
                <div className="mt-6 grid gap-4">
                  {notes.map((note) => (
                    <article key={note.id} className="rounded-3xl border border-white/10 bg-slate-900/80 p-6 text-slate-200 shadow-xl shadow-black/10 transition hover:border-rose-400/30">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <h3 className="text-xl font-semibold text-white">{note.title}</h3>
                          <p className="mt-2 text-sm leading-7 text-slate-400">{note.excerpt}</p>
                        </div>
                      </div>
                      {note.tags?.length ? (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {note.tags.map((tag) => (
                            <span key={tag} className="rounded-full bg-white/5 px-2 py-1 text-xs text-slate-400">
                              {tag}
                            </span>
                          ))}
                        </div>
                      ) : null}
                      <button
                        onClick={() => handleEdit(note)}
                        className="mt-4 rounded-full border border-rose-400/50 bg-rose-500/10 px-4 py-2 text-sm font-medium text-rose-300 transition hover:bg-rose-500/20"
                      >
                        Edit note
                      </button>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </section>

          <aside className="space-y-6">
            <div className="rounded-[2rem] border border-white/10 bg-slate-950/80 p-8 shadow-xl shadow-black/20">
              <p className="text-sm uppercase tracking-[0.35em] text-rose-200/80">Study design</p>
              <p className="mt-4 text-slate-400">Keep notes short and intentional. Capture the key idea, why it matters, and a follow-up action.</p>
            </div>

            <div className="rounded-[2rem] border border-white/10 bg-slate-950/80 p-8 shadow-xl shadow-black/20">
              <p className="text-sm uppercase tracking-[0.35em] text-rose-200/80">Organize by tag</p>
              <p className="mt-4 text-slate-400">Use subject tags to separate concept notes, formula checklists, and review summaries.</p>
            </div>
          </aside>
        </div>
      )}
    </AppShell>
  );
}

export default function NotesContent() {
  return (
    <ErrorBoundary>
      <NotesContentInner />
    </ErrorBoundary>
  );
}
