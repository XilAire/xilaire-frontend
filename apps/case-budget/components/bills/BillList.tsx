import BillMobileCard from "@/components/bills/BillMobileCard";
import BillRow from "@/components/bills/BillRow";

import type {
  BillData,
} from "@/types/bill";

type BillListProps = {
  bills: BillData[];
  onViewDetails: (
    bill: BillData,
  ) => void;
  onEdit: (bill: BillData) => void;
  onMarkPaid: (
    bill: BillData,
  ) => void;
};

export default function BillList({
  bills,
  onViewDetails,
  onEdit,
  onMarkPaid,
}: BillListProps) {
  const sortedBills = [...bills].sort(
    (firstBill, secondBill) => {
      if (
        firstBill.status === "paid" &&
        secondBill.status !== "paid"
      ) {
        return 1;
      }

      if (
        firstBill.status !== "paid" &&
        secondBill.status === "paid"
      ) {
        return -1;
      }

      return (
        new Date(
          firstBill.dueDate,
        ).getTime() -
        new Date(
          secondBill.dueDate,
        ).getTime()
      );
    },
  );

  return (
    <section
      aria-label="Scheduled bills"
      className="overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-default)] shadow-sm"
    >
      <div className="border-b border-[var(--border-subtle)] px-4 py-4 sm:px-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-[var(--text-primary)]">
              Scheduled Bills
            </h2>

            <p className="mt-1 text-sm text-[var(--text-muted)]">
              {formatBillCount(
                sortedBills.length,
              )}{" "}
              shown
            </p>
          </div>

          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] text-[var(--primary)]">
            <ReceiptIcon />
          </div>
        </div>
      </div>

      <div className="md:hidden">
        <div className="divide-y divide-[var(--border-subtle)]">
          {sortedBills.map(
            (bill) => (
              <BillMobileCard
                key={bill.id}
                bill={bill}
                onViewDetails={
                  onViewDetails
                }
                onEdit={onEdit}
                onMarkPaid={
                  onMarkPaid
                }
              />
            ),
          )}
        </div>
      </div>

      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[920px] border-collapse">
          <thead>
            <tr className="border-b border-[var(--border-subtle)] bg-[var(--surface-muted)]">
              <th
                scope="col"
                className="px-5 py-3 text-left text-xs font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]"
              >
                Bill
              </th>

              <th
                scope="col"
                className="px-4 py-3 text-left text-xs font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]"
              >
                Due Date
              </th>

              <th
                scope="col"
                className="px-4 py-3 text-left text-xs font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]"
              >
                Budget Item
              </th>

              <th
                scope="col"
                className="px-4 py-3 text-left text-xs font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]"
              >
                Account
              </th>

              <th
                scope="col"
                className="px-4 py-3 text-left text-xs font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]"
              >
                Payment
              </th>

              <th
                scope="col"
                className="px-4 py-3 text-left text-xs font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]"
              >
                Status
              </th>

              <th
                scope="col"
                className="px-4 py-3 text-right text-xs font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]"
              >
                Amount
              </th>

              <th
                scope="col"
                className="w-16 px-5 py-3"
              >
                <span className="sr-only">
                  Actions
                </span>
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-[var(--border-subtle)]">
            {sortedBills.map(
              (bill) => (
                <BillRow
                  key={bill.id}
                  bill={bill}
                  onViewDetails={
                    onViewDetails
                  }
                  onEdit={onEdit}
                  onMarkPaid={
                    onMarkPaid
                  }
                />
              ),
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function formatBillCount(
  count: number,
) {
  return `${count} ${
    count === 1
      ? "bill"
      : "bills"
  }`;
}

function ReceiptIcon() {
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
      <path d="M6 2v20l3-2 3 2 3-2 3 2V2l-3 2-3-2-3 2-3-2Z" />
      <path d="M9 9h6" />
      <path d="M9 13h6" />
    </svg>
  );
}