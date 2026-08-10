import {
  determineBillStatus,
  getNextDueDate,
} from "@/lib/bills/bill-utils";

import type {
  BillData,
} from "@/types/bill";

/**
 * Returns true if a bill should generate
 * its next occurrence.
 */
export function shouldGenerateNextBill(
  bill: BillData,
) {
  if (bill.status !== "paid") {
    return false;
  }

  if (bill.frequency === "one-time") {
    return false;
  }

  return getNextDueDate(
    bill.dueDate,
    bill.frequency,
  ) !== null;
}

/**
 * Creates the next recurring bill.
 *
 * Current bill stays in history as PAID.
 * A new bill is generated for the next cycle.
 */
export function generateNextBill(
  bill: BillData,
): BillData | null {
  const nextDueDate =
    getNextDueDate(
      bill.dueDate,
      bill.frequency,
    );

  if (!nextDueDate) {
    return null;
  }

  const timestamp =
    new Date().toISOString();

  return {
    ...bill,

    id:
      typeof crypto !==
        "undefined" &&
      crypto.randomUUID
        ? crypto.randomUUID()
        : `bill-${Date.now()}`,

    dueDate: nextDueDate,

    status:
      determineBillStatus(
        nextDueDate,
      ),

    paidDate: undefined,

    createdAt: timestamp,

    updatedAt: timestamp,
  };
}

/**
 * Processes every bill.
 *
 * Paid recurring bills automatically
 * receive their next scheduled bill.
 */
export function processRecurringBills(
  bills: BillData[],
) {
  const results: BillData[] = [];

  for (const bill of bills) {
    results.push(bill);

    if (
      !shouldGenerateNextBill(
        bill,
      )
    ) {
      continue;
    }

    const nextBill =
      generateNextBill(
        bill,
      );

    if (nextBill) {
      results.push(nextBill);
    }
  }

  return results.sort(
    (a, b) =>
      new Date(
        a.dueDate,
      ).getTime() -
      new Date(
        b.dueDate,
      ).getTime(),
  );
}