import type {
  BillSummary,
} from "@/types/bill";

type BillSummaryCardsProps = {
  summary: BillSummary;
};

type SummaryCardProps = {
  label: string;
  value: string;
  description: string;
  icon: React.ReactNode;
  tone:
    | "primary"
    | "success"
    | "warning"
    | "danger";
};

export default function BillSummaryCards({
  summary,
}: BillSummaryCardsProps) {
  return (
    <section
      aria-label="Bill summary"
      className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
    >
      <SummaryCard
        label="Scheduled"
        value={formatCurrency(
          summary.totalScheduled,
        )}
        description={`${formatBillCount(
          summary.upcomingCount +
            summary.dueSoonCount +
            summary.dueTodayCount +
            summary.pastDueCount,
        )} remaining`}
        icon={<CalendarIcon />}
        tone="primary"
      />

      <SummaryCard
        label="Paid"
        value={formatCurrency(
          summary.totalPaid,
        )}
        description={`${formatBillCount(
          summary.paidCount,
        )} completed`}
        icon={<CheckIcon />}
        tone="success"
      />

      <SummaryCard
        label="Remaining"
        value={formatCurrency(
          summary.remainingAmount,
        )}
        description={`${formatBillCount(
          summary.dueSoonCount +
            summary.dueTodayCount,
        )} due soon`}
        icon={<WalletIcon />}
        tone="warning"
      />

      <SummaryCard
        label="Past Due"
        value={String(
          summary.pastDueCount,
        )}
        description={
          summary.pastDueCount > 0
            ? "Needs your attention"
            : "Everything is current"
        }
        icon={<AlertIcon />}
        tone="danger"
      />
    </section>
  );
}

function SummaryCard({
  label,
  value,
  description,
  icon,
  tone,
}: SummaryCardProps) {
  return (
    <article className="relative overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-default)] p-5 shadow-sm">
      <div
        aria-hidden="true"
        className={[
          "absolute inset-x-0 top-0 h-1",
          getToneBarClassName(tone),
        ].join(" ")}
      />

      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[var(--text-muted)]">
            {label}
          </p>

          <p className="mt-3 truncate text-2xl font-bold tracking-tight text-[var(--text-primary)] sm:text-3xl">
            {value}
          </p>

          <p className="mt-2 text-sm leading-5 text-[var(--text-muted)]">
            {description}
          </p>
        </div>

        <div
          className={[
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl",
            getToneIconClassName(tone),
          ].join(" ")}
        >
          {icon}
        </div>
      </div>
    </article>
  );
}

function getToneBarClassName(
  tone: SummaryCardProps["tone"],
) {
  switch (tone) {
    case "success":
      return "bg-[var(--success)]";

    case "warning":
      return "bg-[var(--warning)]";

    case "danger":
      return "bg-[var(--danger)]";

    case "primary":
    default:
      return "bg-[var(--primary)]";
  }
}

function getToneIconClassName(
  tone: SummaryCardProps["tone"],
) {
  switch (tone) {
    case "success":
      return "bg-[color-mix(in_srgb,var(--success)_12%,transparent)] text-[var(--success)]";

    case "warning":
      return "bg-[color-mix(in_srgb,var(--warning)_14%,transparent)] text-[var(--warning)]";

    case "danger":
      return "bg-[color-mix(in_srgb,var(--danger)_12%,transparent)] text-[var(--danger)]";

    case "primary":
    default:
      return "bg-[color-mix(in_srgb,var(--primary)_12%,transparent)] text-[var(--primary)]";
  }
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

function formatBillCount(
  count: number,
) {
  return `${count} ${
    count === 1 ? "bill" : "bills"
  }`;
}

function CalendarIcon() {
  return (
    <svg
      width="21"
      height="21"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M8 2v4" />
      <path d="M16 2v4" />
      <rect
        width="18"
        height="18"
        x="3"
        y="4"
        rx="2"
      />
      <path d="M3 10h18" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      width="21"
      height="21"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function WalletIcon() {
  return (
    <svg
      width="21"
      height="21"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20 7V6a2 2 0 0 0-2-2H5a3 3 0 0 0 0 6h15v8a2 2 0 0 1-2 2H5a3 3 0 0 1-3-3V7" />
      <path d="M16 14h.01" />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg
      width="21"
      height="21"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m21.73 18-8-14a2 2 0 0 0-3.46 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </svg>
  );
}