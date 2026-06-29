"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type BotOption = {
  id: string;
  name: string;
  slug: string | null;
};

type NewAutomationFormProps = {
  bots: BotOption[];
};

// -------------------------
// 🔥 Slugify generator
// -------------------------
function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")  // remove special chars
    .replace(/\s+/g, "-")      // spaces -> dashes
    .replace(/--+/g, "-");     // collapse multiple dashes
}

export function NewAutomationForm({ bots }: NewAutomationFormProps) {
  const router = useRouter();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [botId, setBotId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!name.trim()) {
      setError("Please provide a name for this automation.");
      return;
    }

    setSubmitting(true);

    try {
      // ------------------------------------
      // 🔥 Generate slug from name
      // ------------------------------------
      const slug = slugify(name.trim());

      const res = await fetch("/api/automations/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          bot_id: botId || null,
          slug, // 🔥 include slug
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to create automation.");
      } else {
        setSuccess("Automation created successfully.");
        router.push("/automations");
      }
    } catch (err) {
      console.error(err);
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <div className="grid gap-4 md:grid-cols-2">
        {/* Name */}
        <div>
          <label className="block text-xs font-medium uppercase tracking-wide text-slate-400">
            Automation name
          </label>
          <input
            type="text"
            className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-50 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
            placeholder="Example: Auto-assign P1 Nova alerts"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          {/* 🔥 Slug Preview */}
          {name.trim() !== "" && (
            <p className="mt-1 text-[11px] text-slate-500">
              Slug: <span className="text-slate-300">{slugify(name)}</span>
            </p>
          )}
        </div>

        {/* Bot */}
        <div>
          <label className="block text-xs font-medium uppercase tracking-wide text-slate-400">
            Bot
          </label>
          <select
            className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-50 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
            value={botId}
            onChange={(e) => setBotId(e.target.value)}
          >
            <option value="">No specific bot</option>
            {bots.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
                {b.slug ? ` (${b.slug})` : ""}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Description */}
      <div>
        <label className="block text-xs font-medium uppercase tracking-wide text-slate-400">
          Description
        </label>
        <textarea
          className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-50 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
          rows={4}
          placeholder="Describe what this automation should do. For now this is just documentation; we’ll wire triggers and actions in the next phase."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      {/* Status messages */}
      {error && (
        <p className="text-xs text-red-400 bg-red-950/40 border border-red-900 rounded-md px-3 py-2">
          {error}
        </p>
      )}
      {success && (
        <p className="text-xs text-emerald-300 bg-emerald-950/40 border border-emerald-900 rounded-md px-3 py-2">
          {success}
        </p>
      )}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {submitting ? "Creating…" : "Create automation"}
        </button>

        <span className="text-[11px] text-slate-500">
          We&apos;ll add triggers & actions config in the next phase.
        </span>
      </div>
    </form>
  );
}
