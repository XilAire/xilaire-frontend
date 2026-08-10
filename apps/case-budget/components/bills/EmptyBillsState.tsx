type EmptyBillsStateProps = {
  onAddBill: () => void;
};

export default function EmptyBillsState({
  onAddBill,
}: EmptyBillsStateProps) {
  return (
    <section className="rounded-3xl border border-dashed border-[var(--border-subtle)] bg-[var(--surface-default)] px-6 py-14 text-center shadow-sm sm:px-10 sm:py-20">
      <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] text-[var(--primary)]">
        <ReceiptIcon />
      </div>

      <h2 className="mt-8 text-2xl font-bold tracking-tight text-[var(--text-primary)]">
        No Bills Found
      </h2>

      <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-[var(--text-muted)] sm:text-base">
        You haven't added any bills yet, or your
        current filters don't match any scheduled
        payments.
      </p>

      <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
        <button
          type="button"
          onClick={onAddBill}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-6 text-sm font-bold text-white outline-none transition hover:brightness-95 focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2"
        >
          <PlusIcon />

          Add Your First Bill
        </button>

        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] px-4 py-2.5 text-sm text-[var(--text-muted)]">
          Stay on top of every payment and avoid
          late fees.
        </div>
      </div>

      <div className="mt-12 grid gap-4 text-left sm:grid-cols-3">
        <FeatureCard
          icon={<ReminderIcon />}
          title="Bill Reminders"
          description="Receive reminders before bills become due."
        />

        <FeatureCard
          icon={<RepeatIcon />}
          title="Recurring Bills"
          description="Track monthly, quarterly, annual, and one-time bills."
        />

        <FeatureCard
          icon={<BudgetIcon />}
          title="Budget Tracking"
          description="Connect every bill to a budget item and account."
        />
      </div>
    </section>
  );
}

type FeatureCardProps = {
  icon: React.ReactNode;
  title: string;
  description: string;
};

function FeatureCard({
  icon,
  title,
  description,
}: FeatureCardProps) {
  return (
    <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] p-5">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] text-[var(--primary)]">
        {icon}
      </div>

      <h3 className="mt-4 text-base font-bold text-[var(--text-primary)]">
        {title}
      </h3>

      <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
        {description}
      </p>
    </div>
  );
}

function ReceiptIcon() {
  return (
    <svg
      width="34"
      height="34"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M6 2v20l3-2 3 2 3-2 3 2V2l-3 2-3-2-3 2-3-2Z" />
      <path d="M9 8h6" />
      <path d="M9 12h6" />
      <path d="M9 16h4" />
    </svg>
  );
}

function ReminderIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M10.3 21a2 2 0 0 0 3.4 0" />
      <path d="M4 17h16" />
      <path d="M6 17V10a6 6 0 0 1 12 0v7" />
    </svg>
  );
}

function RepeatIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M17 2l4 4-4 4" />
      <path d="M3 11V9a4 4 0 0 1 4-4h14" />
      <path d="M7 22l-4-4 4-4" />
      <path d="M21 13v2a4 4 0 0 1-4 4H3" />
    </svg>
  );
}

function BudgetIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect
        x="3"
        y="4"
        width="18"
        height="16"
        rx="2"
      />
      <path d="M16 12h.01" />
      <path d="M3 9h18" />
    </svg>
  );
}

function PlusIcon() {
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
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  );
}