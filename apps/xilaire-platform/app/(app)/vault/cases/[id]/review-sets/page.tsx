"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type ReviewStatus = "not_started" | "in_review" | "completed" | "on_hold";
type ReviewStatusFilter = ReviewStatus | "all";

type ReviewSet = {
  id: string;
  org_id: string | null;
  case_id: string | null;
  name: string;
  description: string;
  status: ReviewStatus;
  itemCount: number;
  reviewedCount: number;
  taggedCount: number;
  assignedTo: string;
  createdAt: string | null;
  updatedAt: string | null;
};

type ReviewSetApiItem = {
  id?: string | null;
  org_id?: string | null;
  case_id?: string | null;
  name?: string | null;
  description?: string | null;
  status?: string | null;
  assigned_to?: string | null;
  assignedTo?: string | null;
  item_count?: number | string | null;
  itemCount?: number | string | null;
  reviewed_count?: number | string | null;
  reviewedCount?: number | string | null;
  tagged_count?: number | string | null;
  taggedCount?: number | string | null;
  created_at?: string | null;
  createdAt?: string | null;
  updated_at?: string | null;
  updatedAt?: string | null;
};

type ReviewSetApiResponse = {
  ok?: boolean;
  error?: string;
  message?: string;
  items?: ReviewSetApiItem[];
  reviewSets?: ReviewSetApiItem[];
  data?: ReviewSetApiItem[];
};

function normalizeParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

function normalizeString(value: unknown, fallback = ""): string {
  if (typeof value !== "string") return fallback;

  const trimmed = value.trim();

  return trimmed.length ? trimmed : fallback;
}

function normalizeNullableString(value: unknown): string | null {
  if (typeof value !== "string") return null;

  const trimmed = value.trim();

  return trimmed.length ? trimmed : null;
}

function normalizeNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);

    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return 0;
}

function normalizeStatus(value: unknown): ReviewStatus {
  if (value === "in_review") return "in_review";
  if (value === "completed") return "completed";
  if (value === "on_hold") return "on_hold";
  return "not_started";
}

function getApiItems(data: ReviewSetApiResponse | null): ReviewSetApiItem[] {
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.reviewSets)) return data.reviewSets;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

function normalizeReviewSet(item: ReviewSetApiItem, index: number): ReviewSet | null {
  const id = normalizeNullableString(item.id);

  if (!id) {
    return null;
  }

  return {
    id,
    org_id: normalizeNullableString(item.org_id),
    case_id: normalizeNullableString(item.case_id),
    name: normalizeString(item.name, `Review Set ${index + 1}`),
    description: normalizeString(item.description),
    status: normalizeStatus(item.status),
    assignedTo: normalizeString(item.assignedTo ?? item.assigned_to, "Unassigned"),
    itemCount: normalizeNumber(item.itemCount ?? item.item_count),
    reviewedCount: normalizeNumber(item.reviewedCount ?? item.reviewed_count),
    taggedCount: normalizeNumber(item.taggedCount ?? item.tagged_count),
    createdAt: normalizeNullableString(item.createdAt ?? item.created_at),
    updatedAt: normalizeNullableString(item.updatedAt ?? item.updated_at),
  };
}

function formatDateTime(value: string | null): string {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleString();
}

function getStatusLabel(status: ReviewStatus): string {
  if (status === "not_started") return "Not Started";
  if (status === "in_review") return "In Review";
  if (status === "completed") return "Completed";
  return "On Hold";
}

function getFilterLabel(status: ReviewStatusFilter): string {
  if (status === "all") return "All";
  return getStatusLabel(status);
}

function getStatusClass(status: ReviewStatus): string {
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

function getProgressPercent(reviewedCount: number, itemCount: number): number {
  if (!itemCount) return 0;

  return Math.min(
    100,
    Math.max(0, Math.round((reviewedCount / itemCount) * 100))
  );
}

export default function VaultCaseReviewSetsPage() {
  const params = useParams();
  const caseId = normalizeParam(params?.id);

  const [statusFilter, setStatusFilter] = useState<ReviewStatusFilter>("all");
  const [reviewSets, setReviewSets] = useState<ReviewSet[]>([]);
  const [loading, setLoading] = useState(true);
  const [warning, setWarning] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadReviewSets() {
      if (!caseId) {
        setReviewSets([]);
        setWarning("Missing case ID.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setWarning(null);

        const response = await fetch(`/api/vault/cases/${caseId}/review-sets`, {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        });

        const data = (await response.json().catch(() => null)) as ReviewSetApiResponse | null;

        if (!mounted) {
          return;
        }

        if (response.status === 404 || response.status === 405) {
          setReviewSets([]);
          setWarning(
            "The review sets API route is not available yet. Create app/api/vault/cases/[id]/review-sets/route.ts, then restart the dev server."
          );
          return;
        }

        if (!response.ok || data?.ok === false) {
          setReviewSets([]);
          setWarning(data?.error ?? data?.message ?? "Failed to load case review sets.");
          return;
        }

        const normalizedItems = getApiItems(data)
          .map((item, index) => normalizeReviewSet(item, index))
          .filter((item): item is ReviewSet => Boolean(item));

        setReviewSets(normalizedItems);
      } catch (error) {
        if (!mounted) {
          return;
        }

        setReviewSets([]);
        setWarning(
          error instanceof Error
            ? error.message
            : "Failed to load case review sets."
        );
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadReviewSets();

    return () => {
      mounted = false;
    };
  }, [caseId]);

  const filteredReviewSets = useMemo(() => {
    if (statusFilter === "all") {
      return reviewSets;
    }

    return reviewSets.filter((reviewSet) => reviewSet.status === statusFilter);
  }, [reviewSets, statusFilter]);

  const totals = useMemo(() => {
    return reviewSets.reduce(
      (summary, reviewSet) => {
        summary.reviewSets += 1;
        summary.items += reviewSet.itemCount;
        summary.reviewed += reviewSet.reviewedCount;
        summary.tagged += reviewSet.taggedCount;

        return summary;
      },
      {
        reviewSets: 0,
        items: 0,
        reviewed: 0,
        tagged: 0,
      }
    );
  }, [reviewSets]);

  const filters: ReviewStatusFilter[] = [
    "all",
    "not_started",
    "in_review",
    "on_hold",
    "completed",
  ];

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
              Vault Case Workspace
            </p>

            <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
              Review Sets
            </h1>

            <p className="max-w-3xl text-sm text-slate-500 dark:text-slate-400">
              Organize case evidence into review batches, track review progress,
              prepare tagging, and stage items for export.
            </p>

            <p className="font-mono text-xs text-slate-500 dark:text-slate-400">
              Case ID: {caseId || "—"}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href={`/vault/cases/${caseId}`}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 dark:bg-white dark:text-slate-900"
            >
              Back to Case
            </Link>

            <Link
              href={`/vault/cases/${caseId}/search`}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Search Evidence
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

      {warning ? (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-900/40 dark:bg-amber-950/20">
          <p className="text-sm text-amber-800 dark:text-amber-300">
            {warning}
          </p>
        </section>
      ) : null}

      <section className="grid gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Review Sets
          </p>

          <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">
            {totals.reviewSets}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Total Items
          </p>

          <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">
            {totals.items}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Reviewed
          </p>

          <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">
            {totals.reviewed}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Tagged
          </p>

          <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">
            {totals.tagged}
          </p>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Review Queue
            </h2>

            <p className="text-sm text-slate-500 dark:text-slate-400">
              Filter and monitor review sets assigned to this case.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {filters.map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setStatusFilter(status)}
                className={
                  statusFilter === status
                    ? "rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-slate-900"
                    : "rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                }
              >
                {getFilterLabel(status)}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Review Sets
          </h2>
        </div>

        {loading ? (
          <div className="p-6 text-sm text-slate-500 dark:text-slate-400">
            Loading review sets...
          </div>
        ) : filteredReviewSets.length === 0 ? (
          <div className="p-6 text-sm text-slate-500 dark:text-slate-400">
            No review sets found for this case.
          </div>
        ) : (
          <div className="divide-y divide-slate-200 dark:divide-slate-800">
            {filteredReviewSets.map((reviewSet) => {
              const progress = getProgressPercent(
                reviewSet.reviewedCount,
                reviewSet.itemCount
              );

              return (
                <div key={reviewSet.id} className="p-5">
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-3">
                        <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                          {reviewSet.name}
                        </h3>

                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-medium ${getStatusClass(
                            reviewSet.status
                          )}`}
                        >
                          {getStatusLabel(reviewSet.status)}
                        </span>
                      </div>

                      <p className="max-w-3xl text-sm text-slate-500 dark:text-slate-400">
                        {reviewSet.description || "No description provided."}
                      </p>

                      <div className="flex flex-wrap gap-3 text-xs text-slate-500 dark:text-slate-400">
                        <span>Assigned To: {reviewSet.assignedTo}</span>
                        <span>Created: {formatDateTime(reviewSet.createdAt)}</span>
                        <span>Updated: {formatDateTime(reviewSet.updatedAt)}</span>
                      </div>
                    </div>

                    <div className="grid min-w-full gap-3 sm:grid-cols-3 lg:min-w-[360px]">
                      <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-950">
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Items
                        </p>

                        <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-100">
                          {reviewSet.itemCount}
                        </p>
                      </div>

                      <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-950">
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Reviewed
                        </p>

                        <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-100">
                          {reviewSet.reviewedCount}
                        </p>
                      </div>

                      <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-950">
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Tagged
                        </p>

                        <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-100">
                          {reviewSet.taggedCount}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 space-y-2">
                    <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                      <span>Review Progress</span>
                      <span>{progress}%</span>
                    </div>

                    <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                      <div
                        className="h-full rounded-full bg-slate-900 dark:bg-white"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>

                  <div className="mt-5 flex flex-wrap gap-3">
                    <Link
                      href={`/vault/cases/${caseId}/review-sets/${reviewSet.id}`}
                      className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 dark:bg-white dark:text-slate-900"
                    >
                      Open Review Set
                    </Link>

                    <Link
                      href={`/vault/cases/${caseId}/exports`}
                      className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      Prepare Export
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}