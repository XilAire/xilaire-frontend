"use client";

type BillsHeaderProps = {
  onAddBill: () => void;
};

export default function BillsHeader({
  onAddBill,
}: BillsHeaderProps) {
  return (
    <header className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--primary)]">
          Bills & Payments
        </p>

        <h1 className="mt-2 text-3xl font-bold tracking-tight text-[var(--text-primary)] sm:text-4xl">
          Bills
        </h1>

        <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--text-muted)] sm:text-base">
          Track upcoming payments, avoid late fees,
          and stay ahead of every due date.
        </p>
      </div>

      <button
        type="button"
        onClick={onAddBill}
        className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-5 text-sm font-bold text-white outline-none transition-[filter,box-shadow] hover:brightness-95 focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface-default)]"
      >
        <PlusIcon />

        Add Bill
      </button>
    </header>
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