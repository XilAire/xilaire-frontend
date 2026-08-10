import Link from "next/link";

import {
  ArrowRight,
  BarChart3,
  CreditCard,
  Landmark,
  LineChart,
  PiggyBank,
  ReceiptText,
  Scale,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";

export type ReportCatalogItem = {
  id: string;
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
};

const REPORT_ITEMS:
  ReportCatalogItem[] =
  [
    {
      id:
        "income",

      title:
        "Income report",

      description:
        "Review income received over time and understand how much money is available to fund your plan.",

      href:
        "/dashboard/budget",

      icon:
        TrendingUp,
    },

    {
      id:
        "spending",

      title:
        "Spending report",

      description:
        "See how expenses are distributed across your budget items and where your money is going.",

      href:
        "/dashboard/transactions",

      icon:
        ReceiptText,
    },

    {
      id:
        "budget-performance",

      title:
        "Budget performance",

      description:
        "Compare planned amounts against actual activity and identify areas that are over or under plan.",

      href:
        "/dashboard/budget",

      icon:
        BarChart3,
    },

    {
      id:
        "cash-flow",

      title:
        "Cash flow",

      description:
        "Track the relationship between money coming in, money going out, and what remains each month.",

      href:
        "/dashboard/transactions",

      icon:
        LineChart,
    },

    {
      id:
        "bills",

      title:
        "Bills report",

      description:
        "Review recurring obligations, upcoming bills, payment patterns, and monthly bill totals.",

      href:
        "/dashboard/bills",

      icon:
        CreditCard,
    },

    {
      id:
        "savings",

      title:
        "Savings progress",

      description:
        "Measure progress toward savings goals and see how consistently you are building reserves.",

      href:
        "/dashboard/goals",

      icon:
        PiggyBank,
    },

    {
      id:
        "debt",

      title:
        "Debt progress",

      description:
        "Track balances, payments, payoff progress, and changes in your total debt over time.",

      href:
        "/dashboard/debt",

      icon:
        Landmark,
    },

    {
      id:
        "net-worth",

      title:
        "Net worth report",

      description:
        "Follow changes in assets, liabilities, and your overall financial position using recorded snapshots.",

      href:
        "/dashboard/net-worth",

      icon:
        Scale,
    },

    {
      id:
        "investments",

      title:
        "Investment report",

      description:
        "Review investment account values, holdings, gains, income, and portfolio activity.",

      href:
        "/dashboard/investments",

      icon:
        LineChart,
    },
  ];

export default function ReportCatalog() {
  return (
    <section>
      <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">
            Reports
          </p>

          <h2 className="mt-1 text-xl font-bold tracking-tight text-slate-950">
            Financial reports
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Analyze the different
            parts of your financial
            plan.
          </p>
        </div>

        <p className="text-xs font-medium text-slate-400">
          Reports use your active
          workspace data
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {REPORT_ITEMS.map(
          (
            item,
          ) => (
            <ReportCatalogCard
              key={
                item.id
              }
              item={
                item
              }
            />
          ),
        )}
      </div>
    </section>
  );
}

function ReportCatalogCard({
  item,
}: {
  item:
    ReportCatalogItem;
}) {
  const Icon =
    item.icon;

  return (
    <div className="group flex min-h-[230px] flex-col rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:p-6">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
        <Icon className="h-5 w-5" />
      </div>

      <h3 className="mt-5 text-base font-bold text-slate-950">
        {item.title}
      </h3>

      <p className="mt-2 flex-1 text-sm leading-6 text-slate-500">
        {item.description}
      </p>

      <Link
        href={
          item.href
        }
        className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-emerald-700 transition group-hover:text-emerald-800"
      >
        Open source data

        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
      </Link>
    </div>
  );
}