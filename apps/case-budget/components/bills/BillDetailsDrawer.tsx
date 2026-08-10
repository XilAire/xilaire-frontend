"use client";

import {
  useEffect,
  useId,
} from "react";

import {
  getBillFrequencyLabel,
  getBillStatusLabel,
  type BillData,
} from "@/types/bill";

type BillDetailsDrawerProps = {
  isOpen: boolean;
  bill: BillData | null;
  onClose: () => void;
  onEdit: (bill: BillData) => void;
  onMarkPaid: (bill: BillData) => void;
  onOpenBudgetItem?: (
    budgetItemId: string,
  ) => void;
};

export default function BillDetailsDrawer({
  isOpen,
  bill,
  onClose,
  onEdit,
  onMarkPaid,
  onOpenBudgetItem,
}: BillDetailsDrawerProps) {
  const titleId = useId();

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow =
      "hidden";

    function handleKeyDown(
      event: KeyboardEvent,
    ) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener(
      "keydown",
      handleKeyDown,
    );

    return () => {
      document.body.style.overflow =
        previousOverflow;

      window.removeEventListener(
        "keydown",
        handleKeyDown,
      );
    };
  }, [isOpen, onClose]);

  if (!isOpen || !bill) {
    return null;
  }

  const isPaid =
    bill.status === "paid";

  const budgetItem =
    bill.budgetItem;

  const hasBudgetLink =
    Boolean(budgetItem);

  const isBudgetSyncEnabled =
    hasBudgetLink &&
    Boolean(bill.budgetSync?.enabled);

  return (
    <div
      className="fixed inset-0 z-50"
      role="presentation"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
        onClick={onClose}
        aria-label="Close bill details"
      />

      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="absolute inset-y-0 right-0 flex w-full max-w-xl flex-col bg-[var(--surface-default)] shadow-2xl"
      >
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-[var(--border-subtle)] px-4 py-4 sm:px-6 sm:py-5">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2
                id={titleId}
                className="truncate text-xl font-bold text-[var(--text-primary)] sm:text-2xl"
              >
                {bill.name}
              </h2>

              <span
                className={[
                  "inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-xs font-semibold",
                  getStatusClasses(
                    bill.status,
                  ),
                ].join(" ")}
              >
                {getBillStatusLabel(
                  bill.status,
                )}
              </span>
            </div>

            <p className="mt-1 truncate text-sm text-[var(--text-muted)]">
              {bill.payee ??
                "No payee"}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[var(--text-muted)] outline-none transition hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)] focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
            aria-label="Close bill details"
            title="Close"
          >
            <CloseIcon />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto">
          <div className="space-y-6 px-4 py-5 sm:px-6 sm:py-6">
            <section className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] p-5">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]">
                    Amount
                  </p>

                  <p className="mt-2 text-3xl font-bold tracking-tight text-[var(--text-primary)]">
                    {formatCurrency(
                      bill.amount,
                    )}
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]">
                    Due Date
                  </p>

                  <p className="mt-2 text-base font-bold text-[var(--text-primary)]">
                    {formatDate(
                      bill.dueDate,
                    )}
                  </p>
                </div>
              </div>

              {isPaid &&
              bill.paidDate ? (
                <div className="mt-5 flex items-center gap-3 rounded-xl bg-emerald-500/10 px-4 py-3 text-emerald-700 dark:text-emerald-300">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500/15">
                    <CheckIcon />
                  </div>

                  <div>
                    <p className="text-sm font-bold">
                      Payment completed
                    </p>

                    <p className="mt-0.5 text-xs">
                      Paid on{" "}
                      {formatDate(
                        bill.paidDate,
                      )}
                    </p>
                  </div>
                </div>
              ) : null}
            </section>

            <DetailsSection
              title="Bill Details"
              icon={<ReceiptIcon />}
            >
              <DetailsGrid>
                <DetailItem
                  label="Frequency"
                  value={getBillFrequencyLabel(
                    bill.frequency,
                  )}
                />

                <DetailItem
                  label="Payment Method"
                  value={
                    bill.paymentMethod ===
                    "autopay"
                      ? "Autopay"
                      : "Manual"
                  }
                />

                <DetailItem
                  label="Account"
                  value={
                    bill.account?.name ??
                    "Not selected"
                  }
                />

                <DetailItem
                  label="Status"
                  value={getBillStatusLabel(
                    bill.status,
                  )}
                />
              </DetailsGrid>
            </DetailsSection>

            <DetailsSection
              title="Budget Assignment"
              icon={<BudgetIcon />}
            >
              {hasBudgetLink &&
              budgetItem ? (
                <div className="space-y-4">
                  <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] p-4">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <p className="text-xs font-bold uppercase tracking-[0.1em] text-[var(--text-muted)]">
                          Linked Budget Item
                        </p>

                        <button
                          type="button"
                          onClick={() =>
                            onOpenBudgetItem?.(
                              budgetItem.id,
                            )
                          }
                          className="mt-1 text-left text-base font-bold text-[var(--primary)] outline-none transition hover:underline focus-visible:rounded focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2"
                        >
                          {
                            budgetItem.name
                          }
                        </button>

                        <p className="mt-1 text-sm text-[var(--text-muted)]">
                          {
                            budgetItem.categoryName
                          }
                        </p>
                      </div>

                      <span
                        className={[
                          "inline-flex w-fit shrink-0 items-center rounded-full px-2.5 py-1 text-xs font-bold",
                          isBudgetSyncEnabled
                            ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                            : "bg-[var(--surface-default)] text-[var(--text-muted)]",
                        ].join(" ")}
                      >
                        {isBudgetSyncEnabled
                          ? "Sync Enabled"
                          : "Sync Disabled"}
                      </span>
                    </div>
                  </div>

                  <DetailsGrid>
                    <DetailItem
                      label="Sync Mode"
                      value={
                        bill.budgetSync
                          ? getBudgetSyncModeLabel(
                              bill
                                .budgetSync
                                .mode,
                            )
                          : "Not configured"
                      }
                    />

                    <DetailItem
                      label="Sync Status"
                      value={
                        isBudgetSyncEnabled
                          ? "Enabled"
                          : "Disabled"
                      }
                    />
                  </DetailsGrid>

                  <div
                    className={[
                      "flex items-start gap-3 rounded-xl border p-4",
                      isBudgetSyncEnabled
                        ? "border-emerald-500/20 bg-emerald-500/5"
                        : "border-[var(--border-subtle)] bg-[var(--surface-muted)]",
                    ].join(" ")}
                  >
                    <div
                      className={[
                        "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                        isBudgetSyncEnabled
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300"
                          : "bg-[var(--surface-default)] text-[var(--text-muted)]",
                      ].join(" ")}
                    >
                      {isBudgetSyncEnabled ? (
                        <SyncIcon />
                      ) : (
                        <PauseIcon />
                      )}
                    </div>

                    <div>
                      <p className="text-sm font-bold text-[var(--text-primary)]">
                        {isBudgetSyncEnabled
                          ? getBudgetSyncStatusTitle(
                              bill
                                .budgetSync
                                ?.mode,
                            )
                          : "Budget syncing is turned off"}
                      </p>

                      <p className="mt-1 text-sm leading-6 text-[var(--text-muted)]">
                        {isBudgetSyncEnabled
                          ? getBudgetSyncDescription(
                              bill
                                .budgetSync
                                ?.mode,
                            )
                          : "This bill remains linked to the budget item, but changes will not be synchronized."}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <EmptyDetailMessage>
                  This bill is not linked
                  to a budget item.
                </EmptyDetailMessage>
              )}
            </DetailsSection>

            <DetailsSection
              title="Reminder"
              icon={<BellIcon />}
            >
              {bill.reminder.enabled ? (
                <div className="flex items-start gap-3 rounded-xl bg-[var(--surface-muted)] p-4">
                  <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--primary)]/10 text-[var(--primary)]">
                    <BellIcon />
                  </div>

                  <div>
                    <p className="text-sm font-bold text-[var(--text-primary)]">
                      Reminder enabled
                    </p>

                    <p className="mt-1 text-sm leading-6 text-[var(--text-muted)]">
                      {getReminderText(
                        bill.reminder
                          .timing,
                      )}
                    </p>
                  </div>
                </div>
              ) : (
                <EmptyDetailMessage>
                  No reminder is enabled
                  for this bill.
                </EmptyDetailMessage>
              )}
            </DetailsSection>

            <DetailsSection
              title="Notes"
              icon={<NoteIcon />}
            >
              {bill.note?.trim() ? (
                <p className="whitespace-pre-wrap rounded-xl bg-[var(--surface-muted)] p-4 text-sm leading-6 text-[var(--text-primary)]">
                  {bill.note}
                </p>
              ) : (
                <EmptyDetailMessage>
                  No notes have been added
                  to this bill.
                </EmptyDetailMessage>
              )}
            </DetailsSection>

            <DetailsSection
              title="Activity"
              icon={<HistoryIcon />}
            >
              <div className="space-y-4">
                {bill.createdAt ? (
                  <ActivityItem
                    title="Bill created"
                    date={bill.createdAt}
                  />
                ) : null}

                {bill.updatedAt &&
                bill.updatedAt !==
                  bill.createdAt ? (
                  <ActivityItem
                    title="Bill updated"
                    date={bill.updatedAt}
                  />
                ) : null}

                {bill.paidDate ? (
                  <ActivityItem
                    title="Bill marked as paid"
                    date={bill.paidDate}
                    isComplete
                  />
                ) : null}

                {!bill.createdAt &&
                !bill.updatedAt &&
                !bill.paidDate ? (
                  <EmptyDetailMessage>
                    No bill activity is
                    available yet.
                  </EmptyDetailMessage>
                ) : null}
              </div>
            </DetailsSection>
          </div>
        </div>

        <footer className="shrink-0 border-t border-[var(--border-subtle)] bg-[var(--surface-default)] px-4 py-4 sm:px-6">
          <div className="flex flex-col gap-3 sm:flex-row">
            {!isPaid ? (
              <button
                type="button"
                onClick={() =>
                  onMarkPaid(bill)
                }
                className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-bold text-white outline-none transition hover:bg-emerald-700 focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2"
              >
                <CheckIcon />

                Mark as Paid
              </button>
            ) : null}

            <button
              type="button"
              onClick={() =>
                onEdit(bill)
              }
              className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-default)] px-4 text-sm font-bold text-[var(--text-primary)] outline-none transition hover:bg-[var(--surface-muted)] focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
            >
              <EditIcon />

              Edit Bill
            </button>
          </div>
        </footer>
      </section>
    </div>
  );
}

type DetailsSectionProps = {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
};

function DetailsSection({
  title,
  icon,
  children,
}: DetailsSectionProps) {
  return (
    <section>
      <div className="mb-3 flex items-center gap-2">
        <div className="text-[var(--primary)]">
          {icon}
        </div>

        <h3 className="text-base font-bold text-[var(--text-primary)]">
          {title}
        </h3>
      </div>

      {children}
    </section>
  );
}

type DetailsGridProps = {
  children: React.ReactNode;
};

function DetailsGrid({
  children,
}: DetailsGridProps) {
  return (
    <dl className="grid grid-cols-1 gap-4 rounded-xl bg-[var(--surface-muted)] p-4 sm:grid-cols-2">
      {children}
    </dl>
  );
}

type DetailItemProps = {
  label: string;
  value: string;
};

function DetailItem({
  label,
  value,
}: DetailItemProps) {
  return (
    <div>
      <dt className="text-xs font-bold uppercase tracking-[0.1em] text-[var(--text-muted)]">
        {label}
      </dt>

      <dd className="mt-1 text-sm font-semibold text-[var(--text-primary)]">
        {value}
      </dd>
    </div>
  );
}

type EmptyDetailMessageProps = {
  children: React.ReactNode;
};

function EmptyDetailMessage({
  children,
}: EmptyDetailMessageProps) {
  return (
    <div className="rounded-xl border border-dashed border-[var(--border-subtle)] px-4 py-5 text-center text-sm text-[var(--text-muted)]">
      {children}
    </div>
  );
}

type ActivityItemProps = {
  title: string;
  date: string;
  isComplete?: boolean;
};

function ActivityItem({
  title,
  date,
  isComplete = false,
}: ActivityItemProps) {
  return (
    <div className="flex items-start gap-3">
      <div
        className={[
          "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
          isComplete
            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
            : "bg-[var(--surface-muted)] text-[var(--text-muted)]",
        ].join(" ")}
      >
        {isComplete ? (
          <CheckIcon />
        ) : (
          <HistoryIcon />
        )}
      </div>

      <div>
        <p className="text-sm font-semibold text-[var(--text-primary)]">
          {title}
        </p>

        <p className="mt-0.5 text-xs text-[var(--text-muted)]">
          {formatDateTime(date)}
        </p>
      </div>
    </div>
  );
}

function formatCurrency(
  amount: number,
) {
  return new Intl.NumberFormat(
    "en-US",
    {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    },
  ).format(amount);
}

function formatDate(
  value: string,
) {
  return new Date(
    `${value.slice(0, 10)}T00:00:00`,
  ).toLocaleDateString(
    "en-US",
    {
      month: "short",
      day: "numeric",
      year: "numeric",
    },
  );
}

function formatDateTime(
  value: string,
) {
  const date = new Date(value);

  if (
    Number.isNaN(date.getTime())
  ) {
    return formatDate(value);
  }

  return date.toLocaleDateString(
    "en-US",
    {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    },
  );
}

function getBudgetSyncModeLabel(
  mode: NonNullable<
    BillData["budgetSync"]
  >["mode"],
) {
  switch (mode) {
    case "automatic":
      return "Automatic";

    case "suggest":
      return "Suggest changes";

    case "manual":
    default:
      return "Manual";
  }
}

function getBudgetSyncStatusTitle(
  mode:
    | NonNullable<
        BillData["budgetSync"]
      >["mode"]
    | undefined,
) {
  switch (mode) {
    case "automatic":
      return "Automatic budget sync is active";

    case "suggest":
      return "Budget suggestions are active";

    case "manual":
    default:
      return "Manual budget sync is active";
  }
}

function getBudgetSyncDescription(
  mode:
    | NonNullable<
        BillData["budgetSync"]
      >["mode"]
    | undefined,
) {
  switch (mode) {
    case "automatic":
      return "Changes to this bill can automatically update the linked budget item.";

    case "suggest":
      return "Changes to this bill can generate a suggested update for the linked budget item.";

    case "manual":
    default:
      return "This bill is linked to the budget item, but budget changes must be applied manually.";
  }
}

function getReminderText(
  timing: BillData["reminder"]["timing"],
) {
  switch (timing) {
    case "same-day":
      return "You will be reminded on the due date.";

    case "1-day":
      return "You will be reminded 1 day before the due date.";

    case "3-days":
      return "You will be reminded 3 days before the due date.";

    case "5-days":
      return "You will be reminded 5 days before the due date.";

    case "7-days":
      return "You will be reminded 7 days before the due date.";

    case "14-days":
      return "You will be reminded 14 days before the due date.";

    default:
      return "A reminder is enabled for this bill.";
  }
}

function getStatusClasses(
  status: BillData["status"],
) {
  switch (status) {
    case "paid":
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300";

    case "past-due":
      return "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300";

    case "due-today":
      return "bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300";

    case "due-soon":
      return "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300";

    case "upcoming":
    default:
      return "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300";
  }
}

function CloseIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m5 12 4 4L19 6" />
    </svg>
  );
}

function EditIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 20h9" />
      <path d="m16.5 3.5 4 4L7 21l-4 1 1-4 12.5-14.5Z" />
    </svg>
  );
}

function ReceiptIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M6 2v20l3-2 3 2 3-2 3 2V2l-3 2-3-2-3 2-3-2Z" />
      <path d="M9 9h6" />
      <path d="M9 13h6" />
    </svg>
  );
}

function BudgetIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect
        width="18"
        height="14"
        x="3"
        y="5"
        rx="2"
      />
      <path d="M3 10h18" />
      <path d="M7 15h2" />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M10.3 21a2 2 0 0 0 3.4 0" />
      <path d="M4 17h16" />
      <path d="M6 17V10a6 6 0 0 1 12 0v7" />
    </svg>
  );
}

function NoteIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
      <path d="M14 2v6h6" />
      <path d="M8 13h8" />
      <path d="M8 17h5" />
    </svg>
  );
}

function HistoryIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
      <path d="M3 3v5h5" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

function SyncIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20 7h-5V2" />
      <path d="M4 17h5v5" />
      <path d="M5.5 9a7 7 0 0 1 11.8-3L20 7" />
      <path d="M18.5 15a7 7 0 0 1-11.8 3L4 17" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M8 5v14" />
      <path d="M16 5v14" />
    </svg>
  );
}