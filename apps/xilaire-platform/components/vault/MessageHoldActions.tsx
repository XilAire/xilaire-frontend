"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type HoldOption = {
  id: string;
  name: string | null;
  status: string | null;
};

type Props = {
  messageId: string;
  messageSubject: string | null;
  currentHoldIds: string[];
  availableHolds: HoldOption[];
  hasMessageHoldFlag: boolean;
};

export default function MessageHoldActions({
  messageId,
  messageSubject,
  currentHoldIds,
  availableHolds,
  hasMessageHoldFlag,
}: Props) {
  const router = useRouter();

  const activeHolds = useMemo(
    () => availableHolds.filter((hold) => hold.status === "active"),
    [availableHolds]
  );

  const linkedHoldSet = useMemo(() => new Set(currentHoldIds), [currentHoldIds]);

  const [selectedApplyHoldId, setSelectedApplyHoldId] = useState<string>(
    activeHolds.find((hold) => !linkedHoldSet.has(hold.id))?.id ?? ""
  );
  const [selectedRemoveHoldId, setSelectedRemoveHoldId] = useState<string>(
    currentHoldIds[0] ?? ""
  );
  const [isApplying, setIsApplying] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");

  const linkedHolds = activeHolds.filter((hold) => linkedHoldSet.has(hold.id));
  const applyCandidates = activeHolds.filter((hold) => !linkedHoldSet.has(hold.id));

  async function handleApplyHold() {
    if (!selectedApplyHoldId) {
      setError("Select a hold to apply.");
      setSuccess("");
      return;
    }

    setIsApplying(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/vault/holds/apply", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          holdId: selectedApplyHoldId,
          messageId,
          notes: `Applied from message details page for ${messageSubject || "Untitled message"}`,
        }),
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload?.error || "Failed to apply hold.");
      }

      setSuccess("Hold applied successfully.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to apply hold.");
    } finally {
      setIsApplying(false);
    }
  }

  async function handleRemoveHold() {
    if (!selectedRemoveHoldId) {
      setError("Select a hold to remove.");
      setSuccess("");
      return;
    }

    setIsRemoving(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/vault/holds/remove", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          holdId: selectedRemoveHoldId,
          messageId,
        }),
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload?.error || "Failed to remove hold.");
      }

      setSuccess("Hold removed successfully.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove hold.");
    } finally {
      setIsRemoving(false);
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <h2 className="text-base font-semibold text-slate-900 dark:text-white">
        Hold actions
      </h2>

      <div className="mt-2 text-sm text-slate-600 dark:text-slate-300">
        {linkedHolds.length > 0
          ? `This message is currently linked to ${linkedHolds.length} hold(s).`
          : hasMessageHoldFlag
            ? "This message has a hold flag, but no linked hold is currently selected here."
            : "This message is not currently linked to any hold."}
      </div>

      <div className="mt-4 grid gap-4">
        <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
          <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Apply hold
          </div>

          <select
            value={selectedApplyHoldId}
            onChange={(event) => setSelectedApplyHoldId(event.target.value)}
            className="mt-3 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-0 transition focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            disabled={isApplying || applyCandidates.length === 0}
          >
            <option value="">
              {applyCandidates.length > 0 ? "Select an active hold" : "No available active holds"}
            </option>
            {applyCandidates.map((hold) => (
              <option key={hold.id} value={hold.id}>
                {hold.name || "Unnamed hold"}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={handleApplyHold}
            disabled={isApplying || !selectedApplyHoldId}
            className="mt-3 inline-flex items-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
          >
            {isApplying ? "Applying..." : "Apply hold"}
          </button>
        </div>

        <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
          <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Remove hold
          </div>

          <select
            value={selectedRemoveHoldId}
            onChange={(event) => setSelectedRemoveHoldId(event.target.value)}
            className="mt-3 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-0 transition focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            disabled={isRemoving || linkedHolds.length === 0}
          >
            <option value="">
              {linkedHolds.length > 0 ? "Select a linked hold" : "No linked holds"}
            </option>
            {linkedHolds.map((hold) => (
              <option key={hold.id} value={hold.id}>
                {hold.name || "Unnamed hold"}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={handleRemoveHold}
            disabled={isRemoving || !selectedRemoveHoldId}
            className="mt-3 inline-flex items-center rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            {isRemoving ? "Removing..." : "Remove hold"}
          </button>
        </div>
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