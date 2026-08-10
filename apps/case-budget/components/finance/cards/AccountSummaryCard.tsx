import type { ReactNode } from "react";
import {
  Building2,
  CreditCard,
  Landmark,
  PiggyBank,
  Wallet,
} from "lucide-react";

import MoneyDisplay from "../display/MoneyDisplay";

export type FinancialAccountType =
  | "checking"
  | "savings"
  | "credit-card"
  | "cash"
  | "investment"
  | "loan"
  | "other";

export type FinancialAccountStatus =
  | "connected"
  | "manual"
  | "disconnected"
  | "syncing";

export type FinancialAccountItem = {
  id: string;
  name: string;
  type: FinancialAccountType;
  balance: number;
  institutionName?: string;
  lastFour?: string;
  status?: FinancialAccountStatus;
  availableBalance?: number;
  icon?: ReactNode;
};

export type AccountSummaryCardProps = {
  accounts: FinancialAccountItem[];
  currency?: string;
  locale?: string;
  title?: string;
  description?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  maxAccounts?: number;
  showNegativeBalances?: boolean;
  icon?: ReactNode;
  href?: string;
  className?: string;
};

function joinClassNames(
  ...classes: Array<string | false | null | undefined>
) {
  return classes.filter(Boolean).join(" ");
}

function getAccountIcon(type: FinancialAccountType) {
  if (type === "checking") {
    return (
      <Landmark
        size={17}
        aria-hidden="true"
      />
    );
  }

  if (type === "savings") {
    return (
      <PiggyBank
        size={17}
        aria-hidden="true"
      />
    );
  }

  if (type === "credit-card") {
    return (
      <CreditCard
        size={17}
        aria-hidden="true"
      />
    );
  }

  if (type === "cash") {
    return (
      <Wallet
        size={17}
        aria-hidden="true"
      />
    );
  }

  return (
    <Building2
      size={17}
      aria-hidden="true"
    />
  );
}

function getAccountTypeLabel(
  type: FinancialAccountType
) {
  if (type === "credit-card") {
    return "Credit card";
  }

  if (type === "investment") {
    return "Investment";
  }

  if (type === "checking") {
    return "Checking";
  }

  if (type === "savings") {
    return "Savings";
  }

  if (type === "loan") {
    return "Loan";
  }

  if (type === "cash") {
    return "Cash";
  }

  return "Other";
}

const accountStatusConfig: Record<
  FinancialAccountStatus,
  {
    label: string;
    textClass: string;
    backgroundClass: string;
    borderClass: string;
  }
> = {
  connected: {
    label: "Connected",
    textClass: "text-emerald-400",
    backgroundClass: "bg-emerald-500/10",
    borderClass: "border-emerald-500/20",
  },
  manual: {
    label: "Manual",
    textClass: "text-slate-400",
    backgroundClass: "bg-slate-500/10",
    borderClass: "border-slate-500/20",
  },
  disconnected: {
    label: "Disconnected",
    textClass: "text-rose-400",
    backgroundClass: "bg-rose-500/10",
    borderClass: "border-rose-500/20",
  },
  syncing: {
    label: "Syncing",
    textClass: "text-sky-400",
    backgroundClass: "bg-sky-500/10",
    borderClass: "border-sky-500/20",
  },
};

export default function AccountSummaryCard({
  accounts,
  currency = "USD",
  locale = "en-US",
  title = "Accounts",
  description = "Balances across your financial accounts",
  emptyTitle = "No accounts added",
  emptyDescription =
    "Add a manual account or connect a financial institution.",
  maxAccounts = 6,
  showNegativeBalances = true,
  icon,
  href,
  className,
}: AccountSummaryCardProps) {
  const resolvedAccounts = accounts
    .map((account) => {
      return {
        ...account,
        status: account.status ?? "manual",
      };
    })
    .filter((account) => {
      return showNegativeBalances
        ? true
        : account.balance >= 0;
    })
    .sort((firstAccount, secondAccount) => {
      return (
        Math.abs(secondAccount.balance) -
        Math.abs(firstAccount.balance)
      );
    })
    .slice(0, Math.max(maxAccounts, 0));

  const assetAccountTypes: FinancialAccountType[] = [
    "checking",
    "savings",
    "cash",
    "investment",
    "other",
  ];

  const liabilityAccountTypes: FinancialAccountType[] = [
    "credit-card",
    "loan",
  ];

  const totalAssets = resolvedAccounts
    .filter((account) => {
      return assetAccountTypes.includes(
        account.type
      );
    })
    .reduce((total, account) => {
      return total + account.balance;
    }, 0);

  const totalLiabilities = resolvedAccounts
    .filter((account) => {
      return liabilityAccountTypes.includes(
        account.type
      );
    })
    .reduce((total, account) => {
      return total + Math.abs(account.balance);
    }, 0);

  const netAccountBalance =
    totalAssets - totalLiabilities;

  const connectedAccountCount =
    resolvedAccounts.filter((account) => {
      return account.status === "connected";
    }).length;

  const disconnectedAccountCount =
    resolvedAccounts.filter((account) => {
      return account.status === "disconnected";
    }).length;

  const content = (
    <>
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.05] text-sky-400">
            {icon ?? (
              <Landmark
                size={21}
                aria-hidden="true"
              />
            )}
          </div>

          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold text-slate-200">
              {title}
            </h3>

            {description ? (
              <p className="mt-1 truncate text-xs text-slate-500">
                {description}
              </p>
            ) : null}
          </div>
        </div>

        <span className="shrink-0 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs font-semibold text-slate-400">
          {resolvedAccounts.length}{" "}
          {resolvedAccounts.length === 1
            ? "account"
            : "accounts"}
        </span>
      </div>

      {resolvedAccounts.length > 0 ? (
        <>
          <div className="mt-6">
            <p className="text-xs font-medium text-slate-500">
              Net account balance
            </p>

            <MoneyDisplay
              amount={netAccountBalance}
              currency={currency}
              locale={locale}
              showColor={false}
              size="xl"
              className={joinClassNames(
                "mt-1",
                netAccountBalance > 0
                  ? "text-emerald-400"
                  : netAccountBalance < 0
                    ? "text-rose-400"
                    : "text-white"
              )}
            />
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-white/10 bg-white/[0.025] p-4">
              <p className="text-xs font-medium text-slate-500">
                Assets
              </p>

              <MoneyDisplay
                amount={totalAssets}
                currency={currency}
                locale={locale}
                showColor={false}
                size="md"
                className="mt-2 text-emerald-400"
              />
            </div>

            <div className="rounded-xl border border-white/10 bg-white/[0.025] p-4">
              <p className="text-xs font-medium text-slate-500">
                Liabilities
              </p>

              <MoneyDisplay
                amount={totalLiabilities}
                currency={currency}
                locale={locale}
                showColor={false}
                size="md"
                className="mt-2 text-rose-400"
              />
            </div>
          </div>

          {connectedAccountCount > 0 ||
          disconnectedAccountCount > 0 ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {connectedAccountCount > 0 ? (
                <span className="inline-flex items-center rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-400">
                  {connectedAccountCount} connected
                </span>
              ) : null}

              {disconnectedAccountCount > 0 ? (
                <span className="inline-flex items-center rounded-full border border-rose-500/20 bg-rose-500/10 px-2.5 py-1 text-xs font-semibold text-rose-400">
                  {disconnectedAccountCount} disconnected
                </span>
              ) : null}
            </div>
          ) : null}

          <div className="mt-5 divide-y divide-white/10">
            {resolvedAccounts.map((account) => {
              const statusConfig =
                accountStatusConfig[account.status];

              const accountTypeLabel =
                getAccountTypeLabel(account.type);

              const isLiability =
                liabilityAccountTypes.includes(
                  account.type
                );

              const displayBalance = isLiability
                ? Math.abs(account.balance)
                : account.balance;

              return (
                <div
                  key={account.id}
                  className="flex items-start justify-between gap-4 py-4 first:pt-0 last:pb-0"
                >
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-slate-400">
                      {account.icon ??
                        getAccountIcon(account.type)}
                    </div>

                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-200">
                        {account.name}
                      </p>

                      <p className="mt-1 truncate text-xs text-slate-500">
                        {[
                          account.institutionName,
                          accountTypeLabel,
                          account.lastFour
                            ? `•••• ${account.lastFour}`
                            : null,
                        ]
                          .filter(Boolean)
                          .join(" • ")}
                      </p>

                      <span
                        className={joinClassNames(
                          "mt-2 inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold",
                          statusConfig.textClass,
                          statusConfig.backgroundClass,
                          statusConfig.borderClass
                        )}
                      >
                        {statusConfig.label}
                      </span>
                    </div>
                  </div>

                  <div className="shrink-0 text-right">
                    <MoneyDisplay
                      amount={displayBalance}
                      currency={currency}
                      locale={locale}
                      showColor={false}
                      size="sm"
                      className={
                        isLiability
                          ? "text-rose-400"
                          : account.balance > 0
                            ? "text-slate-200"
                            : "text-slate-400"
                      }
                    />

                    {typeof account.availableBalance ===
                    "number" ? (
                      <p className="mt-1 text-xs text-slate-500">
                        Available{" "}
                        <MoneyDisplay
                          amount={
                            account.availableBalance
                          }
                          currency={currency}
                          locale={locale}
                          showColor={false}
                          size="sm"
                          className="text-slate-400"
                        />
                      </p>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <div className="mt-5 rounded-xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-8 text-center">
          <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-sky-500/10 text-sky-400">
            <Landmark
              size={21}
              aria-hidden="true"
            />
          </div>

          <p className="mt-3 text-sm font-semibold text-slate-300">
            {emptyTitle}
          </p>

          <p className="mt-1 text-xs leading-5 text-slate-500">
            {emptyDescription}
          </p>
        </div>
      )}
    </>
  );

  if (href) {
    return (
      <a
        href={href}
        aria-label={`View ${title}`}
        className={joinClassNames(
          "group block rounded-2xl border border-white/10 bg-white/[0.03] p-5 shadow-sm transition duration-200",
          "hover:-translate-y-0.5 hover:border-white/15 hover:bg-white/[0.05] hover:shadow-lg",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30",
          disconnectedAccountCount > 0 &&
            "border-rose-500/20",
          className
        )}
      >
        {content}
      </a>
    );
  }

  return (
    <article
      className={joinClassNames(
        "rounded-2xl border border-white/10 bg-white/[0.03] p-5 shadow-sm transition duration-200",
        disconnectedAccountCount > 0 &&
          "border-rose-500/20",
        "hover:border-white/15 hover:bg-white/[0.04]",
        className
      )}
    >
      {content}
    </article>
  );
}