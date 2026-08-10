"use client";

import {
  useEffect,
  useState,
} from "react";

import {
  AlertTriangle,
  Loader2,
  Trash2,
  X,
} from "lucide-react";

import {
  type NetWorthHistoryPoint,
  useNetWorth,
} from "@/components/providers/NetWorthProvider";

type DeleteNetWorthSnapshotModalProps = {
  open: boolean;
  snapshot: NetWorthHistoryPoint | null;
  onClose: () => void;
};

export default function DeleteNetWorthSnapshotModal({
  open,
  snapshot,
  onClose,
}: DeleteNetWorthSnapshotModalProps) {
  const {
    deleteSnapshot,
    clearHistoryError,
  } =
    useNetWorth();

  const [
    isDeleting,
    setIsDeleting,
  ] =
    useState(
      false,
    );

  const [
    deleteError,
    setDeleteError,
  ] =
    useState<
      string | null
    >(
      null,
    );

  useEffect(
    () => {
      if (
        !open
      ) {
        return;
      }

      setIsDeleting(
        false,
      );

      setDeleteError(
        null,
      );

      clearHistoryError();
    },
    [
      clearHistoryError,
      open,
    ],
  );

  useEffect(
    () => {
      if (
        !open
      ) {
        return;
      }

      function handleKeyDown(
        event: KeyboardEvent,
      ) {
        if (
          event.key ===
            "Escape" &&
          !isDeleting
        ) {
          onClose();
        }
      }

      window.addEventListener(
        "keydown",
        handleKeyDown,
      );

      return () => {
        window.removeEventListener(
          "keydown",
          handleKeyDown,
        );
      };
    },
    [
      isDeleting,
      onClose,
      open,
    ],
  );

  if (
    !open ||
    !snapshot
  ) {
    return null;
  }

  const resolvedSnapshot =
    snapshot;

  async function handleDelete() {
    if (
      isDeleting
    ) {
      return;
    }

    setDeleteError(
      null,
    );

    setIsDeleting(
      true,
    );

    try {
      const success =
        await deleteSnapshot(
          resolvedSnapshot.id,
        );

      if (
        !success
      ) {
        setDeleteError(
          "The net worth snapshot could not be deleted.",
        );

        return;
      }

      onClose();
    } catch (
      error
    ) {
      setDeleteError(
        getUnknownErrorMessage(
          error,
        ),
      );
    } finally {
      setIsDeleting(
        false,
      );
    }
  }

  return (
    <div className="fixed inset-0 z-[1600]">
      <button
        type="button"
        aria-label="Close delete snapshot dialog"
        onClick={() => {
          if (
            !isDeleting
          ) {
            onClose();
          }
        }}
        className="absolute inset-0 cursor-default bg-slate-950/45 backdrop-blur-sm"
      />

      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-net-worth-snapshot-title"
        className="absolute inset-x-0 bottom-0 overflow-hidden rounded-t-[30px] border-t border-slate-200 bg-white shadow-2xl sm:left-1/2 sm:right-auto sm:top-1/2 sm:bottom-auto sm:w-[calc(100%-2rem)] sm:max-w-lg sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-[30px] sm:border"
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-5 sm:px-6">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
              <Trash2 className="h-5 w-5" />
            </div>

            <div>
              <h2
                id="delete-net-worth-snapshot-title"
                className="text-xl font-bold tracking-tight text-slate-950"
              >
                Delete snapshot?
              </h2>

              <p className="mt-1 text-sm leading-5 text-slate-500">
                Remove this point from
                your net worth history.
              </p>
            </div>
          </div>

          <button
            type="button"
            disabled={
              isDeleting
            }
            onClick={
              onClose
            }
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Close delete snapshot dialog"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-5 py-5 sm:px-6 sm:py-6">
          <div className="flex items-start gap-3 rounded-[22px] border border-amber-200 bg-amber-50 p-4">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
              <AlertTriangle className="h-4.5 w-4.5" />
            </div>

            <div>
              <p className="text-sm font-bold text-amber-900">
                This cannot be undone
              </p>

              <p className="mt-1 text-sm leading-6 text-amber-700">
                Deleting this snapshot
                removes it from your
                historical net worth
                trend. Your current
                account balances will
                not be changed.
              </p>
            </div>
          </div>

          <div className="mt-5 rounded-[22px] border border-slate-200 bg-slate-50 p-4">
            <SnapshotValue
              label="Snapshot date"
              value={formatDate(
                resolvedSnapshot.date,
              )}
            />

            <SnapshotValue
              label="Assets"
              value={formatCurrency(
                resolvedSnapshot.totalAssets,
              )}
            />

            <SnapshotValue
              label="Liabilities"
              value={formatCurrency(
                resolvedSnapshot.totalLiabilities,
              )}
            />

            <SnapshotValue
              label="Net worth"
              value={formatCurrency(
                resolvedSnapshot.netWorth,
              )}
              highlight
            />
          </div>

          {deleteError ? (
            <div
              role="alert"
              className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700"
            >
              {deleteError}
            </div>
          ) : null}
        </div>

        <div className="flex flex-col-reverse gap-3 border-t border-slate-200 bg-white px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
          <button
            type="button"
            disabled={
              isDeleting
            }
            onClick={
              onClose
            }
            className="min-h-11 rounded-full border border-slate-200 bg-white px-5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Keep snapshot
          </button>

          <button
            type="button"
            disabled={
              isDeleting
            }
            onClick={
              handleDelete
            }
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-rose-600 px-5 text-sm font-bold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isDeleting ? (
              <>
                <Loader2 className="h-4.5 w-4.5 animate-spin" />

                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="h-4.5 w-4.5" />

                Delete snapshot
              </>
            )}
          </button>
        </div>
      </section>
    </div>
  );
}

function SnapshotValue({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-slate-200 py-3 first:pt-0 last:border-b-0 last:pb-0">
      <span className="text-sm font-medium text-slate-500">
        {label}
      </span>

      <span
        className={[
          "text-sm font-bold",
          highlight
            ? "text-emerald-700"
            : "text-slate-950",
        ].join(
          " ",
        )}
      >
        {value}
      </span>
    </div>
  );
}

function formatCurrency(
  value: number,
) {
  return new Intl.NumberFormat(
    "en-US",
    {
      style:
        "currency",
      currency:
        "USD",
      minimumFractionDigits:
        2,
      maximumFractionDigits:
        2,
    },
  ).format(
    value,
  );
}

function formatDate(
  value: string,
) {
  const date =
    new Date(
      `${value}T00:00:00`,
    );

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return value;
  }

  return new Intl.DateTimeFormat(
    "en-US",
    {
      month:
        "long",
      day:
        "numeric",
      year:
        "numeric",
    },
  ).format(
    date,
  );
}

function getUnknownErrorMessage(
  error: unknown,
) {
  if (
    error instanceof
    Error
  ) {
    const message =
      error.message.trim();

    if (
      message
    ) {
      return message;
    }
  }

  return "The net worth snapshot could not be deleted.";
}