"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Edit3, Save, Sparkles } from "lucide-react";
import { saveJournalNotes } from "@/lib/journal/saveJournalNotes";

type JournalNotesFormProps = {
  tradeId: string;
  initialNotes?: {
    notes?: string | null;
    setup?: string | null;
    mistakes?: string | null;
    tags?: string[] | null;
    emotion?: string | null;
    discipline_score?: number | string | null;
  } | null;
};

function normalizeTagsForInput(tags?: string[] | null) {
  return Array.isArray(tags) ? tags.join(", ") : "";
}

function hasExistingNotes(initialNotes?: JournalNotesFormProps["initialNotes"]) {
  if (!initialNotes) return false;

  return Boolean(
    initialNotes.notes ||
      initialNotes.setup ||
      initialNotes.mistakes ||
      initialNotes.emotion ||
      initialNotes.discipline_score ||
      (Array.isArray(initialNotes.tags) && initialNotes.tags.length > 0)
  );
}

export default function JournalNotesForm({
  tradeId,
  initialNotes,
}: JournalNotesFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const existingNotes = useMemo(
    () => hasExistingNotes(initialNotes),
    [initialNotes]
  );

  const [notes, setNotes] = useState(initialNotes?.notes ?? "");
  const [setup, setSetup] = useState(initialNotes?.setup ?? "");
  const [mistakes, setMistakes] = useState(initialNotes?.mistakes ?? "");
  const [tags, setTags] = useState(normalizeTagsForInput(initialNotes?.tags));
  const [emotion, setEmotion] = useState(initialNotes?.emotion ?? "");
  const [disciplineScore, setDisciplineScore] = useState(
    initialNotes?.discipline_score !== null &&
      initialNotes?.discipline_score !== undefined
      ? String(initialNotes.discipline_score)
      : ""
  );

  const [hasSavedOnce, setHasSavedOnce] = useState(existingNotes);

  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const formMode = hasSavedOnce ? "update" : "create";

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setMessage(null);

    startTransition(async () => {
      const result = await saveJournalNotes({
        tradeId,
        notes,
        setup,
        mistakes,
        tags,
        emotion,
        discipline_score: disciplineScore,
      });

      if (!result.success) {
        setMessage({
          type: "error",
          text: result.error,
        });

        return;
      }

      setHasSavedOnce(true);

      setMessage({
        type: "success",
        text:
          formMode === "update"
            ? "Journal notes updated."
            : "Journal notes saved.",
      });

      router.refresh();
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-5 rounded-xl border border-white/10 bg-slate-900/80 p-6"
    >
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
        <div>
          <div className="flex items-center gap-2 text-emerald-400">
            <Sparkles className="h-5 w-5" />
            <h2 className="text-lg font-semibold text-slate-100">
              {formMode === "update"
                ? "Update Journal Notes"
                : "Journal Notes"}
            </h2>
          </div>

          <p className="mt-1 text-sm text-slate-400">
            {formMode === "update"
              ? "Edit the saved setup, execution notes, mistakes, emotions, and tags for this trade."
              : "Capture the setup, execution notes, mistakes, emotions, and tags for this trade."}
          </p>
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {formMode === "update" ? (
            <Edit3 className="h-4 w-4" />
          ) : (
            <Save className="h-4 w-4" />
          )}

          {isPending
            ? formMode === "update"
              ? "Updating..."
              : "Saving..."
            : formMode === "update"
              ? "Update Notes"
              : "Save Notes"}
        </button>
      </div>

      {message && (
        <div
          className={
            "rounded-lg border px-4 py-3 text-sm " +
            (message.type === "success"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
              : "border-red-500/30 bg-red-500/10 text-red-300")
          }
        >
          {message.text}
        </div>
      )}

      <div className="grid gap-5 md:grid-cols-2">
        <Field
          label="Setup"
          value={setup}
          onChange={setSetup}
          placeholder="Example: Opening range breakout, VWAP reclaim, trend continuation..."
        />

        <Field
          label="Tags"
          value={tags}
          onChange={setTags}
          placeholder="Example: scalp, momentum, breakout, A+ setup"
          hint="Separate tags with commas."
        />

        <Field
          label="Emotion"
          value={emotion}
          onChange={setEmotion}
          placeholder="Example: calm, rushed, patient, frustrated"
        />

        <div>
          <label className="text-sm font-medium text-slate-200">
            Discipline Score
          </label>

          <select
            value={disciplineScore}
            onChange={(e) => setDisciplineScore(e.target.value)}
            className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-emerald-500/50"
          >
            <option value="">Select score</option>
            <option value="10">10 — Perfect execution</option>
            <option value="9">9 — Excellent</option>
            <option value="8">8 — Strong</option>
            <option value="7">7 — Good</option>
            <option value="6">6 — Acceptable</option>
            <option value="5">5 — Mixed</option>
            <option value="4">4 — Poor</option>
            <option value="3">3 — Very poor</option>
            <option value="2">2 — Rule breaking</option>
            <option value="1">1 — Major mistake</option>
          </select>

          <p className="mt-2 text-xs text-slate-500">
            Score your discipline from 1 to 10.
          </p>
        </div>
      </div>

      <TextArea
        label="Trade Notes"
        value={notes}
        onChange={setNotes}
        placeholder="What happened? Why did you enter? How did the trade behave?"
      />

      <TextArea
        label="Mistakes / Lessons"
        value={mistakes}
        onChange={setMistakes}
        placeholder="What could you have done better? Did you follow your plan?"
      />
    </form>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  hint,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  hint?: string;
}) {
  return (
    <div>
      <label className="text-sm font-medium text-slate-200">{label}</label>

      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-emerald-500/50"
      />

      {hint && <p className="mt-2 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

function TextArea({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="text-sm font-medium text-slate-200">{label}</label>

      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={5}
        className="mt-2 w-full resize-y rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-emerald-500/50"
      />
    </div>
  );
}