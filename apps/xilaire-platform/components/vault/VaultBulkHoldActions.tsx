"use client";

import { useEffect, useMemo, useState } from "react";

type HoldOption = {
  id: string;
  name: string | null;
  status: string | null;
};

type Props = {
  selectedMessageIds: string[];
  availableHolds: HoldOption[];
  onClearSelection?: () => void;
  onActionComplete?: () => Promise<void> | void;
};

type BulkAction = "apply" | "remove";

export default function VaultBulkHoldActions({
  selectedMessageIds,
  availableHolds,
  onClearSelection,
  onActionComplete,
}: Props) {
  const activeHolds = useMemo(
    () => availableHolds.filter((hold) => hold.status === "active"),
    [availableHolds]
  );

  const [action, setAction] = useState<BulkAction>("apply");
  const [selectedHoldId, setSelectedHoldId] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (!selectedHoldId && activeHolds.length > 0) {
      setSelectedHoldId(activeHolds[0].id);
    }
  }, [activeHolds, selectedHoldId]);

  const selectedCount = selectedMessageIds.length;
  const canSubmit = selectedCount > 0 && !!selectedHoldId && !isSubmitting;

  async function handleSubmit() {
    if (!selectedHoldId) {
      setError("Select a hold first.");
      setSuccess("");
      return;
    }

    if (selectedMessageIds.length === 0) {
      setError("Select at least one message.");
      setSuccess("");
      return;
    }

    setIsSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/vault/holds/bulk", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action,
          holdId: selectedHoldId,
          messageIds: selectedMessageIds,
          notes: action === "apply" ? notes.trim() || null : null,
        }),
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload?.error || `Failed to ${action} hold in bulk.`);
      }

      if (action === "apply") {
        setSuccess(
          `Hold applied. Inserted ${payload?.summary?.insertedCount ?? 0}, already linked ${payload?.summary?.alreadyLinkedCount ?? 0}.`
        );
      } else {
        setSuccess(
          `Hold removed. Removed ${payload?.summary?.removedCount ?? 0}, not linked ${payload?.summary?.notLinkedCount ?? 0}.`
        );
      }

      setNotes("");

      if (onActionComplete) {
        await onActionComplete();
      }

      onClearSelection?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${action} hold in bulk.`);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-1">
          <div className="text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
            Bulk hold actions
          </div>
          <div className="text-sm text-slate-700 dark:text-slate-200">
            {selectedCount > 0
              ? `${selectedCount} message(s) selected`
              : "Select one or more messages to apply or remove a hold."}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="mb-1 block text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Action
            </label>
            <select
              value={action}
              onChange={(event) => setAction(event.target.value as BulkAction)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              disabled={isSubmitting}
            >
              <option value="apply">Apply hold</option>
              <option value="remove">Remove hold</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Hold
            </label>
            <select
              value={selectedHoldId}
              onChange={(event) => setSelectedHoldId(event.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              disabled={isSubmitting || activeHolds.length === 0}
            >
              <option value="">
                {activeHolds.length > 0 ? "Select a hold" : "No active holds"}
              </option>
              {activeHolds.map((hold) => (
                <option key={hold.id} value={hold.id}>
                  {hold.name || "Unnamed hold"}
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Notes
            </label>
            <input
              type="text"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder={
                action === "apply"
                  ? "Optional note for bulk hold application"
                  : "Notes are not used for remove"
              }
              disabled={isSubmitting || action === "remove"}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-500 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            />
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="inline-flex items-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
        >
          {isSubmitting
            ? action === "apply"
              ? "Applying..."
              : "Removing..."
            : action === "apply"
              ? "Apply hold to selected"
              : "Remove hold from selected"}
        </button>

        <button
          type="button"
          onClick={() => onClearSelection?.()}
          disabled={isSubmitting || selectedCount === 0}
          className="inline-flex items-center rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          Clear selection
        </button>
      </div>

      {error ? (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
          {error}
        </div>
      ) : null}

      {success ? (
        <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300">
          {success}
        </div>
      ) : null}
    </section>
  );
}