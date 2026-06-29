"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabasePlatformClient";

type HeldMessageRow = {
  id: string;
  org_id: string;
  hold_id: string;
  message_id: string;
  applied_at: string;
  applied_by: string | null;
  notes: string | null;
  vault_messages?: {
    id: string;
    subject: string | null;
    sender_email: string | null;
    sent_at: string | null;
    received_at: string | null;
    on_hold: boolean;
    disposition_status: string;
    has_attachments: boolean;
    attachment_count: number;
    size_bytes: number;
  } | null;
};

type VaultHoldDetail = {
  id: string;
  org_id: string;
  name: string;
  description: string | null;
  hold_type: "legal" | "investigation" | "regulatory" | "manual";
  scope_type: "org" | "domain" | "custodian" | "mailbox" | "keyword" | "message";
  scope_value: string | null;
  status: "active" | "released" | "expired";
  reason: string | null;
  started_at: string;
  released_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

type VaultHoldDetailResponse = {
  ok: boolean;
  item?: VaultHoldDetail;
  holdMessages?: HeldMessageRow[];
  targetOrgId?: string;
  accessPath?: "org_role" | "support_grant";
  error?: string;
};

type VaultHoldUpdateResponse = {
  ok: boolean;
  item?: VaultHoldDetail;
  targetOrgId?: string;
  accessPath?: "org_role" | "support_grant";
  error?: string;
};

type EditFormState = {
  name: string;
  description: string;
  reason: string;
};

function formatDateTime(value?: string | null) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleString();
}

function formatBytes(value?: number | null) {
  const size = Number(value ?? 0);
  if (!Number.isFinite(size) || size <= 0) return "0 B";

  const units = ["B", "KB", "MB", "GB", "TB"];
  let unitIndex = 0;
  let current = size;

  while (current >= 1024 && unitIndex < units.length - 1) {
    current /= 1024;
    unitIndex += 1;
  }

  return `${current.toFixed(current >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

function buildEditState(hold: VaultHoldDetail | null): EditFormState {
  return {
    name: hold?.name ?? "",
    description: hold?.description ?? "",
    reason: hold?.reason ?? "",
  };
}

export default function VaultHoldDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();

  const holdId = useMemo(() => {
    const raw = params?.id;
    return typeof raw === "string" ? raw : Array.isArray(raw) ? raw[0] : "";
  }, [params]);

  const [hold, setHold] = useState<VaultHoldDetail | null>(null);
  const [holdMessages, setHoldMessages] = useState<HeldMessageRow[]>([]);
  const [targetOrgId, setTargetOrgId] = useState<string | null>(null);
  const [accessPath, setAccessPath] = useState<"org_role" | "support_grant" | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editForm, setEditForm] = useState<EditFormState>({
    name: "",
    description: "",
    reason: "",
  });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  const [releasing, setReleasing] = useState(false);
  const [releaseError, setReleaseError] = useState<string | null>(null);
  const [releaseSuccess, setReleaseSuccess] = useState<string | null>(null);

  const fetchHold = useCallback(async () => {
    if (!holdId) {
      setError("A valid hold id is required.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session?.access_token) {
        throw new Error("Unable to resolve authenticated session.");
      }

      const includeMessages = searchParams.get("includeMessages") ?? "true";
      const limit = searchParams.get("limit") ?? "100";
      const offset = searchParams.get("offset") ?? "0";

      const qs = new URLSearchParams({
        includeMessages,
        limit,
        offset,
      });

      const res = await fetch(`/api/vault/holds/${holdId}?${qs.toString()}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      const payload = (await res.json()) as VaultHoldDetailResponse;

      if (!res.ok || !payload.ok || !payload.item) {
        throw new Error(payload.error || "Unable to load hold details.");
      }

      setHold(payload.item);
      setHoldMessages(payload.holdMessages ?? []);
      setTargetOrgId(payload.targetOrgId ?? null);
      setAccessPath(payload.accessPath ?? null);
      setEditForm(buildEditState(payload.item));
    } catch (err) {
      setHold(null);
      setHoldMessages([]);
      setTargetOrgId(null);
      setAccessPath(null);
      setError(err instanceof Error ? err.message : "Unable to load hold details.");
    } finally {
      setLoading(false);
    }
  }, [holdId, searchParams]);

  useEffect(() => {
    fetchHold();
  }, [fetchHold]);

  function handleEditChange<K extends keyof EditFormState>(
    key: K,
    value: EditFormState[K]
  ) {
    setEditForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!hold) return;

    setSaving(true);
    setSaveError(null);
    setSaveSuccess(null);

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session?.access_token) {
        throw new Error("Unable to resolve authenticated session.");
      }

      const payload = {
        name: editForm.name.trim(),
        description: editForm.description.trim() || null,
        reason: editForm.reason.trim() || null,
      };

      const res = await fetch(`/api/vault/holds/${hold.id}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const response = (await res.json()) as VaultHoldUpdateResponse;

      if (!res.ok || !response.ok || !response.item) {
        throw new Error(response.error || "Unable to update hold.");
      }

      setHold(response.item);
      setEditForm(buildEditState(response.item));
      setTargetOrgId(response.targetOrgId ?? targetOrgId);
      setAccessPath(response.accessPath ?? accessPath);
      setSaveSuccess("Hold updated successfully.");
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Unable to update hold.");
    } finally {
      setSaving(false);
    }
  }

  async function handleRelease() {
    if (!hold) return;

    const confirmed = window.confirm(
      "Are you sure you want to release this hold? This action changes preservation state."
    );

    if (!confirmed) return;

    setReleasing(true);
    setReleaseError(null);
    setReleaseSuccess(null);

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session?.access_token) {
        throw new Error("Unable to resolve authenticated session.");
      }

      const payload = {
        action: "release",
        reason: editForm.reason.trim() || hold.reason || null,
      };

      const res = await fetch(`/api/vault/holds/${hold.id}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const response = (await res.json()) as VaultHoldUpdateResponse;

      if (!res.ok || !response.ok || !response.item) {
        throw new Error(response.error || "Unable to release hold.");
      }

      setHold(response.item);
      setEditForm(buildEditState(response.item));
      setTargetOrgId(response.targetOrgId ?? targetOrgId);
      setAccessPath(response.accessPath ?? accessPath);
      setReleaseSuccess("Hold released successfully.");

      fetchHold();
    } catch (err) {
      setReleaseError(err instanceof Error ? err.message : "Unable to release hold.");
    } finally {
      setReleasing(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
              Vault
            </p>
            <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
              Hold Details
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              View hold scope, status, and linked preserved messages.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/vault/holds"
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Back to Holds
            </Link>

            {hold?.status === "active" && (
              <button
                type="button"
                onClick={handleRelease}
                disabled={releasing}
                className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {releasing ? "Releasing..." : "Release Hold"}
              </button>
            )}
          </div>
        </div>
      </section>

      {loading ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
          Loading hold details...
        </section>
      ) : error ? (
        <section className="rounded-2xl border border-red-200 bg-white p-6 text-sm text-red-600 dark:border-red-900 dark:bg-slate-900 dark:text-red-400">
          {error}
        </section>
      ) : !hold ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
          Hold not found.
        </section>
      ) : (
        <>
          <section className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Hold Status
                </p>
                <div className="mt-2">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                      hold.status === "active"
                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300"
                        : hold.status === "released"
                        ? "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                        : "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
                    }`}
                  >
                    {hold.status}
                  </span>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Hold Type
                </p>
                <p className="mt-2 text-sm text-slate-900 dark:text-slate-100">
                  {hold.hold_type}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Scope
                </p>
                <p className="mt-2 text-sm text-slate-900 dark:text-slate-100">
                  {hold.scope_type}
                </p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {hold.scope_value || "—"}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Started
                </p>
                <p className="mt-2 text-sm text-slate-900 dark:text-slate-100">
                  {formatDateTime(hold.started_at)}
                </p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Released: {formatDateTime(hold.released_at)}
                </p>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
              <span>Target Org: {targetOrgId ?? "—"}</span>
              <span>Access Path: {accessPath ?? "—"}</span>
              <span>Hold ID: {hold.id}</span>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                Edit Hold
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Update hold metadata. Scope and type remain immutable.
              </p>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <div className="space-y-2 md:col-span-2 xl:col-span-3">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
                    Hold Name
                  </label>
                  <input
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950"
                    value={editForm.name}
                    onChange={(e) => handleEditChange("name", e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2 md:col-span-2 xl:col-span-3">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
                    Description
                  </label>
                  <textarea
                    className="min-h-[100px] w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950"
                    value={editForm.description}
                    onChange={(e) => handleEditChange("description", e.target.value)}
                    placeholder="Optional hold description"
                  />
                </div>

                <div className="space-y-2 md:col-span-2 xl:col-span-3">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
                    Reason
                  </label>
                  <textarea
                    className="min-h-[80px] w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950"
                    value={editForm.reason}
                    onChange={(e) => handleEditChange("reason", e.target.value)}
                    placeholder="Reason for preservation"
                  />
                </div>
              </div>

              {saveError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
                  {saveError}
                </div>
              )}

              {saveSuccess && (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">
                  {saveSuccess}
                </div>
              )}

              {releaseError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
                  {releaseError}
                </div>
              )}

              {releaseSuccess && (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">
                  {releaseSuccess}
                </div>
              )}

              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-slate-900"
                >
                  {saving ? "Saving..." : "Save Changes"}
                </button>

                <button
                  type="button"
                  onClick={() => setEditForm(buildEditState(hold))}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  Reset
                </button>
              </div>
            </form>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
            <div className="border-b border-slate-200 px-4 py-3 dark:border-slate-800">
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                Linked Held Messages
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Direct message links attached to this hold.
              </p>
            </div>

            {holdMessages.length === 0 ? (
              <div className="p-6 text-sm text-slate-500 dark:text-slate-400">
                No direct message links are attached to this hold.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
                  <thead className="bg-slate-50 dark:bg-slate-950">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                        Message
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                        Sender
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                        Sent
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                        Hold State
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                        Attachments
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                        Size
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {holdMessages.map((row) => (
                      <tr
                        key={row.id}
                        className="align-top transition hover:bg-slate-50 dark:hover:bg-slate-800/40"
                      >
                        <td className="px-4 py-4">
                          <div className="space-y-1">
                            <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                              {row.vault_messages?.subject || "(No Subject)"}
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400">
                              {row.message_id}
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400">
                              Applied: {formatDateTime(row.applied_at)}
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-4 text-sm text-slate-700 dark:text-slate-200">
                          {row.vault_messages?.sender_email || "—"}
                        </td>

                        <td className="px-4 py-4 text-sm text-slate-700 dark:text-slate-200">
                          {formatDateTime(
                            row.vault_messages?.sent_at || row.vault_messages?.received_at
                          )}
                        </td>

                        <td className="px-4 py-4">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                              row.vault_messages?.on_hold
                                ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
                                : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                            }`}
                          >
                            {row.vault_messages?.on_hold ? "On Hold" : "Released"}
                          </span>
                        </td>

                        <td className="px-4 py-4 text-sm text-slate-700 dark:text-slate-200">
                          {row.vault_messages?.has_attachments
                            ? row.vault_messages.attachment_count
                            : 0}
                        </td>

                        <td className="px-4 py-4 text-sm text-slate-700 dark:text-slate-200">
                          {formatBytes(row.vault_messages?.size_bytes)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}