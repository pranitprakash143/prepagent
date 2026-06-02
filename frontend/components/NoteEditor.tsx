"use client";

import { useState, useCallback } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { noteSchema } from "../lib/schemas";

interface NoteEditorProps {
  id?: string;
  initialTitle?: string;
  initialContent?: string;
  initialTags?: string[];
  onSave?: (title: string, content: string, tags: string[]) => Promise<void>;
  readOnly?: boolean;
}

function MenuBar({ editor }: { editor: any }) {
  if (!editor) return null;
  const btn = (
    active: boolean,
    onClick: () => void,
    label: string,
  ) => (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${
        active
          ? "bg-rose-500/20 text-rose-300"
          : "text-slate-400 hover:bg-white/10 hover:text-slate-200"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="flex flex-wrap gap-1 border-b border-white/10 px-4 py-2">
      {btn(editor.isActive("bold"), () => editor.chain().focus().toggleBold().run(), "Bold")}
      {btn(editor.isActive("italic"), () => editor.chain().focus().toggleItalic().run(), "Italic")}
      {btn(editor.isActive("strike"), () => editor.chain().focus().toggleStrike().run(), "Strike")}
      {btn(editor.isActive("bulletList"), () => editor.chain().focus().toggleBulletList().run(), "List")}
      {btn(editor.isActive("orderedList"), () => editor.chain().focus().toggleOrderedList().run(), "OL")}
      {btn(editor.isActive("blockquote"), () => editor.chain().focus().toggleBlockquote().run(), "Quote")}
      {btn(editor.isActive("heading", { level: 2 }), () => editor.chain().focus().toggleHeading({ level: 2 }).run(), "H2")}
      {btn(editor.isActive("heading", { level: 3 }), () => editor.chain().focus().toggleHeading({ level: 3 }).run(), "H3")}
    </div>
  );
}

export default function NoteEditor({
  id: _noteId,
  initialTitle = "",
  initialContent = "",
  initialTags = [],
  onSave,
  readOnly = false,
}: NoteEditorProps) {
  const [title, setTitle] = useState(initialTitle);
  const [tags, setTags] = useState(initialTags.join(", "));
  const [isSaving, setIsSaving] = useState(false);
  const [status, setStatus] = useState("");

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: "Write your note here..." }),
    ],
    content: initialContent,
    editable: !readOnly,
    editorProps: {
      attributes: {
        class:
          "prose prose-invert max-w-none px-4 py-4 min-h-[200px] outline-none text-sm leading-7",
      },
    },
  });

  const handleSave = useCallback(async () => {
    const content = editor?.getHTML() || "";
    const parsedTags = tags.split(",").map((t) => t.trim()).filter(Boolean);
    const result = noteSchema.safeParse({ title, content, tags: parsedTags });
    if (!result.success) {
      const firstError = result.error.issues[0];
      setStatus(firstError.message);
      return;
    }

    setIsSaving(true);
    setStatus("Saving note...");

    try {
      if (onSave) {
        await onSave(title, content, parsedTags);
      }
      setStatus("Note saved successfully.");
    } catch {
      setStatus("Failed to save note. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }, [editor, title, tags, onSave]);

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <label className="block">
          <span className="text-sm font-medium text-slate-300">Title</span>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Note title"
            disabled={readOnly}
            className="mt-2 w-full rounded-3xl border border-white/10 bg-slate-900/90 p-4 text-white outline-none focus:border-rose-400/60 focus:ring-2 focus:ring-rose-400/20 disabled:opacity-50"
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-slate-300">Content</span>
          <div className="mt-2 overflow-hidden rounded-3xl border border-white/10 bg-slate-900/90 focus-within:border-rose-400/60 focus-within:ring-2 focus-within:ring-rose-400/20">
            <MenuBar editor={editor} />
            <EditorContent editor={editor} />
          </div>
        </label>

        <label className="block">
          <span className="text-sm font-medium text-slate-300">Tags (comma-separated)</span>
          <input
            type="text"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="subject, concept, formula"
            disabled={readOnly}
            className="mt-2 w-full rounded-3xl border border-white/10 bg-slate-900/90 p-4 text-white outline-none focus:border-rose-400/60 focus:ring-2 focus:ring-rose-400/20 disabled:opacity-50"
          />
        </label>
      </div>

      {status && (
        <p
          className={`text-sm ${
            status.includes("saved")
              ? "text-emerald-300"
              : status.includes("required")
                ? "text-amber-300"
                : "text-rose-300"
          }`}
        >
          {status}
        </p>
      )}

      {!readOnly && (
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="btn-primary w-full"
        >
          {isSaving ? "Saving..." : "Save note"}
        </button>
      )}
    </div>
  );
}
