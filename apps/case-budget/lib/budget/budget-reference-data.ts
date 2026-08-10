import type {
  TransactionAccount,
  TransactionType,
} from "@/types/transaction";

export type IncomeSourceReference = {
  id: string;
  name: string;
};

export const transactionAccountReferences:
  TransactionAccount[] = [
    {
      id: "checking",
      name: "Checking",
      type: "checking",
    },
    {
      id: "savings",
      name: "Savings",
      type: "savings",
    },
    {
      id: "visa",
      name: "Visa",
      type: "credit-card",
    },
    {
      id: "cash",
      name: "Cash",
      type: "cash",
    },
  ];

export const incomeSourceReferences:
  IncomeSourceReference[] = [
    {
      id: "paycheck",
      name: "Paycheck",
    },
    {
      id: "bonus",
      name: "Bonus",
    },
    {
      id: "business-income",
      name: "Business Income",
    },
    {
      id: "interest-income",
      name: "Interest Income",
    },
    {
      id: "other-income",
      name: "Other Income",
    },
  ];

export function getTransactionAccountReference(
  accountId: string,
) {
  return (
    transactionAccountReferences.find(
      (
        account,
      ) =>
        account.id ===
        accountId,
    ) ?? null
  );
}

export function getIncomeSourceReference(
  incomeSourceId: string,
) {
  return (
    incomeSourceReferences.find(
      (
        source,
      ) =>
        source.id ===
        incomeSourceId,
    ) ?? null
  );
}

export function getDefaultTransactionReferenceId(
  transactionType: TransactionType,
) {
  if (
    transactionType ===
    "income"
  ) {
    return (
      incomeSourceReferences[0]
        ?.id ?? ""
    );
  }

  /*
   * Expense budget-item defaults now come from
   * BudgetProvider because budget items are live,
   * month-specific data.
   *
   * Transfer destination defaults are selected from
   * transactionAccountReferences by the transaction
   * form so the source and destination accounts can
   * never be the same.
   */
  return "";
}