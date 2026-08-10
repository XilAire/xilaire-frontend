export type TransactionType =
  | "expense"
  | "income"
  | "transfer";

export type TransactionStatus =
  | "pending"
  | "cleared";

export type TransactionAccountType =
  | "checking"
  | "savings"
  | "credit-card"
  | "cash"
  | "loan"
  | "investment";

export type TransactionCategory = {
  id: string;
  name: string;
  groupName: string;
};

export type TransactionAccount = {
  id: string;
  name: string;
  type: TransactionAccountType;
};

export type TransactionData = {
  id: string;
  date: string;
  merchant: string;
  note?: string;
  amount: number;
  type: TransactionType;
  status: TransactionStatus;
  account: TransactionAccount;
  category?: TransactionCategory;
  transferAccountId?: string;
};

export type CreateTransactionData = {
  date: string;
  merchant: string;
  note?: string;
  amount: number;
  type: TransactionType;
  status: TransactionStatus;
  accountId: string;
  categoryId?: string;
  transferAccountId?: string;
};

export type UpdateTransactionData = {
  id: string;
  date: string;
  merchant: string;
  note?: string;
  amount: number;
  type: TransactionType;
  status: TransactionStatus;
  accountId: string;
  categoryId?: string;
  transferAccountId?: string;
};

export type TransactionFilters = {
  search: string;
  type: TransactionType | "all";
  status: TransactionStatus | "all";
  accountId: string | "all";
  categoryId: string | "all";
  dateFrom?: string;
  dateTo?: string;
};

export type TransactionSummary = {
  totalIncome: number;
  totalExpenses: number;
  netAmount: number;

  clearedIncome: number;
  clearedExpenses: number;
  netClearedAmount: number;

  pendingExpenseAmount: number;
  totalTransferAmount: number;

  pendingCount: number;
  clearedCount: number;
  transferCount: number;
  uncategorizedCount: number;
  totalCount: number;
};