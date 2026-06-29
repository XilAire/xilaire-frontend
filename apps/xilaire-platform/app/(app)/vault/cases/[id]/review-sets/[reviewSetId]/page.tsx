"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type ReviewStatus = "not_started" | "in_review" | "completed" | "on_hold";
type EvidenceStatus = "unreviewed" | "reviewed" | "needs_attention" | "privileged" | "export_ready";
type EvidenceType = "email" | "attachment" | "document" | "chat" | "manual_upload" | "message";

type ReviewSetDetail = {
  id: string;
  name: string;
  description: string;
  status: ReviewStatus;
  assignedTo: string;
  createdAt: string;
  updatedAt: string;
  itemCount: number;
  reviewedCount: number;
  taggedCount: number;
};

type EvidenceItem = {
  id: string;
  subject: string;
  source: string;
  custodian: string;
  evidenceType: EvidenceType;
  status: EvidenceStatus;
  tags: string[];
  reviewer: string;
  receivedAt: string | null;
  lastReviewedAt: string | null;
};

type ReviewSetApiItem = {
  id: string;
  org_id?: string;
  case_id?: string;
  name: string;
  description?: string | null;
  status?: ReviewStatus | null;
  assigned_to?: string | null;
  assignedTo?: string | null;
  item_count?: number | null;
  itemCount?: number | null;
  reviewed_count?: number | null;
  reviewedCount?: number | null;
  tagged_count?: number | null;
  taggedCount?: number | null;
  created_at?: string | null;
  createdAt?: string | null;
  updated_at?: string | null;
  updatedAt?: string | null;
};

type ReviewSetEvidenceApiItem = {
  id: string;
  message_id?: string | null;
  messageId?: string | null;
  export_item_id?: string | null;
  exportItemId?: string | null;
  evidence_type?: EvidenceType | null;
  evidenceType?: EvidenceType | null;
  review_status?: EvidenceStatus | null;
  reviewStatus?: EvidenceStatus | null;
  reviewer_id?: string | null;
  reviewerId?: string | null;
  reviewed_at?: string | null;
  reviewedAt?: string | null;
  tags?: string[] | null;
  notes?: string | null;
  metadata?: Record<string, unknown> | null;
  created_at?: string | null;
  createdAt?: string | null;
  updated_at?: string | null;
  updatedAt?: string | null;
};

type ReviewSetDetailApiResponse = {
  ok: boolean;
  item?: ReviewSetApiItem;
  items?: ReviewSetEvidenceApiItem[];
  error?: string;
};

function normalizeParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

function normalizeString(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function getMetadataString(
  metadata: Record<string, unknown> | null | undefined,
  keys: string[],
  fallback: string
) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return fallback;
  }

  for (const key of keys) {
    const value = normalizeString(metadata[key]);
    if (value) return value;
  }

  return fallback;
}

function formatDateTime(value?: string | null) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleString();
}

function getReviewStatusLabel(status: ReviewStatus) {
  if (status === "not_started") return "Not Started";
  if (status === "in_review") return "In Review";
  if (status === "completed") return "Completed";
  return "On Hold";
}

function getEvidenceStatusLabel(status: EvidenceStatus) {
  if (status === "unreviewed") return "Unreviewed";
  if (status === "reviewed") return "Reviewed";
  if (status === "needs_attention") return "Needs Attention";
  if (status === "privileged") return "Privileged";
  return "Export Ready";
}

function getEvidenceTypeLabel(type: EvidenceType) {
  if (type === "email") return "Email";
  if (type === "attachment") return "Attachment";
  if (type === "document") return "Document";
  if (type === "chat") return "Chat";
  if (type === "message") return "Message";
  return "Manual Upload";
}

function getReviewStatusClass(status: ReviewStatus) {
  if (status === "completed") {
    return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300";
  }

  if (status === "in_review") {
    return "bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300";
  }

  if (status === "on_hold") {
    return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300";
  }

  return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";
}

function getEvidenceStatusClass(status: EvidenceStatus) {
  if (status === "reviewed") {
    return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300";
  }

  if (status === "export_ready") {
    return "bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300";
  }

  if (status === "needs_attention") {
    return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300";
  }

  if (status === "privileged") {
    return "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300";
  }

  return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";
}

function getProgressPercent(reviewedCount: number, itemCount: number) {
  if (!itemCount) return 0;
  return Math.round((reviewedCount / itemCount) * 100);
}

function normalizeReviewSet(item: ReviewSetApiItem): ReviewSetDetail {
  return {
    id: item.id,
    name: item.name,
    description: item.description ?? "",
    status: (item.status ?? "not_started") as ReviewStatus,
    assignedTo: item.assignedTo ?? item.assigned_to ?? "Unassigned",
    createdAt: item.createdAt ?? item.created_at ?? new Date().toISOString(),
    updatedAt: item.updatedAt ?? item.updated_at ?? new Date().toISOString(),
    itemCount: item.itemCount ?? item.item_count ?? 0,
    reviewedCount: item.reviewedCount ?? item.reviewed_count ?? 0,
    taggedCount: item.taggedCount ?? item.tagged_count ?? 0,
  };
}

function normalizeEvidenceItem(item: ReviewSetEvidenceApiItem): EvidenceItem {
  const metadata = item.metadata ?? {};

  return {
    id: item.id,
    subject: getMetadataString(
      metadata,
      ["subject", "message_subject", "title", "name", "filename"],
      item.messageId ??
        item.message_id ??
        item.exportItemId ??
        item.export_item_id ??
        item.id
    ),
    source: getMetadataString(
      metadata,
      ["source", "source_name", "mailbox", "mailbox_address", "provider"],
      "Vault Evidence"
    ),
    custodian: getMetadataString(
      metadata,
      ["custodian", "custodian_name", "custodian_email", "owner"],
      "Unknown"
    ),
    evidenceType: (item.evidenceType ?? item.evidence_type ?? "document") as EvidenceType,
    status: (item.reviewStatus ?? item.review_status ?? "unreviewed") as EvidenceStatus,
    tags: Array.isArray(item.tags) ? item.tags : [],
    reviewer: item.reviewerId ?? item.reviewer_id ?? "Unassigned",
    receivedAt: item.createdAt ?? item.created_at ?? null,
    lastReviewedAt: item.reviewedAt ?? item.reviewed_at ?? null,
  };
}

export default function VaultCaseReviewSetDetailPage() {
  const params = useParams();

  const caseId = normalizeParam(params?.id);
  const reviewSetId = normalizeParam(params?.reviewSetId);

  const [statusFilter, setStatusFilter] = useState<EvidenceStatus | "all">("all");
  const [reviewSet, setReviewSet] = useState<ReviewSetDetail | null>(null);
  const [evidenceItems, setEvidenceItems] = useState<EvidenceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadReviewSet() {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(
          `/api/vault/cases/${caseId}/review-sets/${reviewSetId}`,
          {
            method: "GET",
            credentials: "include",
            cache: "no-store",
          }
        );

        const data =
          (await response.json().catch(() => null)) as ReviewSetDetailApiResponse | null;

        if (!response.ok || !data?.ok || !data.item) {
          throw new Error(data?.error ?? "Failed to load review set.");
        }

        if (!mounted) {
          return;
        }

        setReviewSet(normalizeReviewSet(data.item));
        setEvidenceItems((data.items ?? []).map(normalizeEvidenceItem));
      } catch (err) {
        if (!mounted) {
          return;
        }

        setError(err instanceof Error ? err.message : "Failed to load review set.");
        setReviewSet(null);
        setEvidenceItems([]);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    if (caseId && reviewSetId) {
      loadReviewSet();
    }
  }, [caseId, reviewSetId]);

  const filteredEvidence = useMemo(() => {
    if (statusFilter === "all") return evidenceItems;
    return evidenceItems.filter((item) => item.status === statusFilter);
  }, [statusFilter, evidenceItems]);

  const summary = useMemo(() => {
    return evidenceItems.reduce(
      (totals, item) => {
        totals.total += 1;

        if (item.status !== "unreviewed") totals.reviewed += 1;
        if (item.status === "needs_attention") totals.needsAttention += 1;
        if (item.status === "privileged") totals.privileged += 1;
        if (item.status === "export_ready") totals.exportReady += 1;

        totals.tags += item.tags.length;

        return totals;
      },
      {
        total: 0,
        reviewed: 0,
        needsAttention: 0,
        privileged: 0,
        exportReady: 0,
        tags: 0,
      }
    );
  }, [evidenceItems]);

  const progress = getProgressPercent(summary.reviewed, summary.total);

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
              Vault Case Review Set
            </p>

            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
                {reviewSet?.name ?? "Loading Review Set"}
              </h1>

              <span
                className={`rounded-full px-2.5 py-1 text-xs font-medium ${getReviewStatusClass(
                  reviewSet?.status ?? "not_started"
                )}`}
              >
                {getReviewStatusLabel(reviewSet?.status ?? "not_started")}
              </span>
            </div>

            <p className="max-w-3xl text-sm text-slate-500 dark:text-slate-400">
              {reviewSet?.description || "Loading review set details."}
            </p>

            <div className="flex flex-wrap gap-3 text-xs text-slate-500 dark:text-slate-400">
              <span>Case ID: {caseId || "—"}</span>
              <span>Review Set ID: {reviewSetId || reviewSet?.id || "—"}</span>
              <span>Assigned To: {reviewSet?.assignedTo ?? "Unassigned"}</span>
              <span>Updated: {formatDateTime(reviewSet?.updatedAt)}</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href={`/vault/cases/${caseId}/review-sets`}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 dark:bg-white dark:text-slate-900"
            >
              Back to Review Sets
            </Link>

            <Link
              href={`/vault/cases/${caseId}`}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Case Workspace
            </Link>

            <Link
              href={`/vault/cases/${caseId}/exports`}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Exports
            </Link>
          </div>
        </div>
      </section>

      {error ? (
        <section className="rounded-2xl border border-red-200 bg-red-50 p-5 dark:border-red-900/40 dark:bg-red-950/20">
          <p className="text-sm text-red-700 dark:text-red-300">
            {error}
          </p>
        </section>
      ) : null}

      <section className="grid gap-4 md:grid-cols-5">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Items
          </p>
          <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">
            {loading ? "…" : summary.total}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Reviewed
          </p>
          <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">
            {loading ? "…" : summary.reviewed}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Needs Attention
          </p>
          <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">
            {loading ? "…" : summary.needsAttention}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Privileged
          </p>
          <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">
            {loading ? "…" : summary.privileged}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Export Ready
          </p>
          <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">
            {loading ? "…" : summary.exportReady}
          </p>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Review Progress
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {loading ? "Loading review progress..." : `${progress}% reviewed across this review set.`}
            </p>
          </div>

          <div className="w-full lg:max-w-md">
            <div className="mb-2 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>{summary.reviewed} reviewed</span>
              <span>{summary.total} total</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <div
                className="h-full rounded-full bg-slate-900 dark:bg-white"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Evidence Items
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Review, tag, assign, and prepare evidence for export.
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
              Status Filter
            </label>
            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value as EvidenceStatus | "all")
              }
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950"
            >
              <option value="all">All Items</option>
              <option value="unreviewed">Unreviewed</option>
              <option value="reviewed">Reviewed</option>
              <option value="needs_attention">Needs Attention</option>
              <option value="privileged">Privileged</option>
              <option value="export_ready">Export Ready</option>
            </select>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Review Evidence
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {loading ? "Loading evidence items..." : `${filteredEvidence.length} item(s) displayed.`}
          </p>
        </div>

        {loading ? (
          <div className="p-6 text-sm text-slate-500 dark:text-slate-400">
            Loading review set evidence...
          </div>
        ) : filteredEvidence.length === 0 ? (
          <div className="p-6 text-sm text-slate-500 dark:text-slate-400">
            No evidence items matched your filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
              <thead className="bg-slate-50 dark:bg-slate-950">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                    Evidence
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                    Type
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                    Custodian
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                    Status
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                    Tags
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                    Reviewer
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                    Last Reviewed
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {filteredEvidence.map((item) => (
                  <tr
                    key={item.id}
                    className="align-top transition hover:bg-slate-50 dark:hover:bg-slate-800/40"
                  >
                    <td className="px-5 py-4">
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                          {item.subject}
                        </p>
                        <p className="font-mono text-xs text-slate-500 dark:text-slate-400">
                          {item.id}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Source: {item.source}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Received: {formatDateTime(item.receivedAt)}
                        </p>
                      </div>
                    </td>

                    <td className="px-5 py-4 text-sm text-slate-700 dark:text-slate-200">
                      {getEvidenceTypeLabel(item.evidenceType)}
                    </td>

                    <td className="px-5 py-4 text-sm text-slate-700 dark:text-slate-200">
                      {item.custodian}
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${getEvidenceStatusClass(
                          item.status
                        )}`}
                      >
                        {getEvidenceStatusLabel(item.status)}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      {item.tags.length === 0 ? (
                        <span className="text-sm text-slate-500 dark:text-slate-400">
                          —
                        </span>
                      ) : (
                        <div className="flex max-w-xs flex-wrap gap-2">
                          {item.tags.map((tag) => (
                            <span
                              key={`${item.id}-${tag}`}
                              className="rounded-full border border-slate-300 px-2.5 py-1 text-xs text-slate-700 dark:border-slate-700 dark:text-slate-200"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>

                    <td className="px-5 py-4 text-sm text-slate-700 dark:text-slate-200">
                      {item.reviewer}
                    </td>

                    <td className="px-5 py-4 text-sm text-slate-700 dark:text-slate-200">
                      {formatDateTime(item.lastReviewedAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            Reviewer Assignment
          </h3>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Next step: connect reviewer assignment to Vault users and case admins.
          </p>
          <button
            type="button"
            className="mt-4 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Assign Reviewer
          </button>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            Tagging Workflow
          </h3>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Next step: add saved tags such as Responsive, Privileged, Exclude, and Export Ready.
          </p>
          <button
            type="button"
            className="mt-4 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Manage Tags
          </button>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            Prepare Export
          </h3>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Next step: send export-ready evidence into the case export workflow.
          </p>
          <Link
            href={`/vault/cases/${caseId}/exports`}
            className="mt-4 inline-flex rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 dark:bg-white dark:text-slate-900"
          >
            Prepare Export
          </Link>
        </div>
      </section>
    </div>
  );
}