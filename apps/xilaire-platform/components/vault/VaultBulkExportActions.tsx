"use client";

import { useState } from "react";

type Props = {
  selectedMessageIds: string[];
  onClearSelection?: () => void;
  onActionComplete?: () => Promise<void> | void;
};

type ExportFormat = "zip" | "eml" | "pst" | "json" | "csv";

export default function VaultBulkExportActions({
  selectedMessageIds,
  onClearSelection,
  onActionComplete,
}: Props) {
  const [format, setFormat] = useState<ExportFormat>("zip");
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const selectedCount = selectedMessageIds.length;
  const canSubmit = selectedCount > 0 && !isSubmitting;

  async function handleExport() {
    if (selectedMessageIds.length === 0) {
      setError("Select at least one message.");
      setSuccess("");
      return;
    }

    setIsSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/vault/exports/bulk", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: name.trim() || null,
          format,
          exportType: "manual",
          messageIds: selectedMessageIds,
        }),
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload?.error || "Failed to create export.");
      }

      setSuccess(
        `Export created (${payload.export?.name}). ${payload.summary?.linkedCount} messages linked.`
      );

      setName("");

      if (onActionComplete) {
        await onActionComplete();
      }

      onClearSelection?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create export.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-1">
          <div className="text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
            Bulk export
          </div>
          <div className="text-sm text-slate-700 dark:text-slate-200">
            {selectedCount > 0
              ? `${selectedCount} message(s) selected`
              : "Select messages to export."}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Format
            </label>
            <select
              value={format}
              onChange={(e) => setFormat(e.target.value as ExportFormat)}
              disabled={isSubmitting}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            >
              <option value="zip">ZIP</option>
              <option value="eml">EML</option>
              <option value="pst">PST</option>
              <option value="json">JSON</option>
              <option value="csv">CSV</option>
            </select>
          </div>

          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Export Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Optional export name"
              disabled={isSubmitting}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            />
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleExport}
          disabled={!canSubmit}
          className="inline-flex items-center rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
        >
          {isSubmitting ? "Exporting..." : "Export selected"}
        </button>

        <button
          type="button"
          onClick={() => onClearSelection?.()}
          disabled={isSubmitting || selectedCount === 0}
          className="inline-flex items-center rounded-xl border border-slate-300 px-4 py-2 text-sm dark:border-slate-700"
        >
          Clear selection
        </button>
      </div>

      {error && (
        <div className="mt-4 text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {success && (
        <div className="mt-4 text-sm text-emerald-600 dark:text-emerald-400">
          {success}
        </div>
      )}
    </section>
  );
}