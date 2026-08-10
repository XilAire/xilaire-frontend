import Link from "next/link";

import {
  ArrowRight,
  HeartPulse,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
  TrendingDown,
  TrendingUp,
} from "lucide-react";

import {
  getFinancialHealthFactorStatusLabel,
  getFinancialHealthStatusLabel,
  type FinancialHealthFactor,
  type FinancialHealthStatus,
} from "@/lib/financial-health/financial-health-service";

export type FinancialHealthScoreCardProps = {
  score: number | null;

  status:
    FinancialHealthStatus;

  strongestFactor:
    FinancialHealthFactor | null;

  weakestFactor:
    FinancialHealthFactor | null;

  hasEnoughData:
    boolean;
};

export default function FinancialHealthScoreCard({
  score,
  status,
  strongestFactor,
  weakestFactor,
  hasEnoughData,
}: FinancialHealthScoreCardProps) {
  if (
    !hasEnoughData ||
    score ===
      null
  ) {
    return (
      <FinancialHealthEmptyState />
    );
  }

  return (
    <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
      <div className="grid gap-6 p-5 sm:p-6 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:p-7">
        <div className="flex flex-col items-center justify-center rounded-[24px] bg-slate-50 p-6 text-center">
          <ScoreRing
            score={
              score
            }
            status={
              status
            }
          />

          <p className="mt-5 text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
            CASE Financial Health Score
          </p>

          <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">
            {getFinancialHealthStatusLabel(
              status,
            )}
          </h2>

          <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">
            Your score combines cash
            flow, savings, debt,
            emergency reserves, and
            bill status using your
            current workspace data.
          </p>
        </div>

        <div className="flex flex-col">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
              <HeartPulse className="h-5 w-5" />
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">
                Financial health
              </p>

              <h3 className="mt-1 text-xl font-bold tracking-tight text-slate-950">
                Your financial picture at a glance
              </h3>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                Use the score as a
                guide, then review the
                underlying factors to
                see what is helping or
                hurting your overall
                position.
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <FactorHighlightCard
              type="strongest"
              factor={
                strongestFactor
              }
            />

            <FactorHighlightCard
              type="weakest"
              factor={
                weakestFactor
              }
            />
          </div>

          <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <ShieldCheck className="h-4.5 w-4.5" />
              </div>

              <div>
                <p className="text-sm font-bold text-slate-950">
                  Based on tracked data
                </p>

                <p className="mt-1 text-sm leading-6 text-slate-500">
                  Missing categories are
                  excluded from scoring
                  instead of being
                  treated as failures,
                  so the score improves
                  in reliability as more
                  financial data is
                  added.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function ScoreRing({
  score,
  status,
}: {
  score:
    number;

  status:
    FinancialHealthStatus;
}) {
  const normalizedScore =
    Math.min(
      100,
      Math.max(
        0,
        Math.round(
          score,
        ),
      ),
    );

  const circumference =
    2 *
    Math.PI *
    54;

  const dashOffset =
    circumference *
    (
      1 -
      normalizedScore /
        100
    );

  return (
    <div className="relative flex h-40 w-40 items-center justify-center">
      <svg
        viewBox="0 0 128 128"
        className="h-full w-full -rotate-90"
        role="img"
        aria-label={`Financial health score ${normalizedScore} out of 100`}
      >
        <circle
          cx="64"
          cy="64"
          r="54"
          fill="none"
          stroke="currentColor"
          strokeWidth="10"
          className="text-slate-200"
        />

        <circle
          cx="64"
          cy="64"
          r="54"
          fill="none"
          stroke="currentColor"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={
            circumference
          }
          strokeDashoffset={
            dashOffset
          }
          className={
            getScoreStrokeClassName(
              status,
            )
          }
        />
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-black tracking-tight text-slate-950">
          {normalizedScore}
        </span>

        <span className="mt-1 text-xs font-bold uppercase tracking-[0.12em] text-slate-400">
          out of 100
        </span>
      </div>
    </div>
  );
}

function FactorHighlightCard({
  type,
  factor,
}: {
  type:
    | "strongest"
    | "weakest";

  factor:
    FinancialHealthFactor | null;
}) {
  const isStrongest =
    type ===
    "strongest";

  const Icon =
    isStrongest
      ? TrendingUp
      : TrendingDown;

  if (
    !factor
  ) {
    return (
      <div className="rounded-[22px] border border-slate-200 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
            <Icon className="h-4 w-4" />
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">
              {isStrongest
                ? "Strongest area"
                : "Focus area"}
            </p>

            <p className="mt-1 text-sm font-bold text-slate-800">
              Not enough data yet
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-[22px] border border-slate-200 p-4">
      <div className="flex items-start gap-3">
        <div
          className={[
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
            isStrongest
              ? "bg-emerald-50 text-emerald-600"
              : "bg-amber-50 text-amber-600",
          ].join(
            " ",
          )}
        >
          <Icon className="h-4 w-4" />
        </div>

        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">
            {isStrongest
              ? "Strongest area"
              : "Focus area"}
          </p>

          <p className="mt-1 truncate text-sm font-bold text-slate-950">
            {factor.label}
          </p>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            {factor.score !==
            null ? (
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">
                {factor.score}/100
              </span>
            ) : null}

            <span className="rounded-full bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-500">
              {getFinancialHealthFactorStatusLabel(
                factor.status,
              )}
            </span>
          </div>

          <p className="mt-3 text-sm leading-6 text-slate-500">
            {factor.title}
          </p>

          {factor.actionHref &&
          factor.actionLabel ? (
            <Link
              href={
                factor.actionHref
              }
              className="mt-3 inline-flex items-center gap-2 text-sm font-bold text-emerald-700 transition hover:text-emerald-800"
            >
              {factor.actionLabel}

              <ArrowRight className="h-4 w-4" />
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function FinancialHealthEmptyState() {
  return (
    <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
      <div className="flex min-h-[430px] flex-col items-center justify-center px-5 py-12 text-center sm:px-8">
        <div className="flex h-16 w-16 items-center justify-center rounded-[22px] bg-emerald-50 text-emerald-600">
          <Sparkles className="h-7 w-7" />
        </div>

        <p className="mt-5 text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">
          Financial health
        </p>

        <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">
          Build your financial health score
        </h2>

        <p className="mt-3 max-w-xl text-sm leading-6 text-slate-500 sm:text-base">
          CASE Budget needs at least two
          measurable financial factors
          before it can calculate a
          meaningful score. Add real
          income, spending, accounts,
          debt, savings goals, or bills
          and the score will build
          automatically.
        </p>

        <div className="mt-7 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/dashboard/transactions"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-emerald-600 px-5 text-sm font-bold text-white transition hover:bg-emerald-700"
          >
            Add financial activity

            <ArrowRight className="h-4 w-4" />
          </Link>

          <Link
            href="/dashboard/accounts"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-5 text-sm font-bold text-slate-800 transition hover:bg-slate-50"
          >
            Manage accounts
          </Link>
        </div>

        <div className="mt-8 flex max-w-2xl items-start gap-3 rounded-2xl bg-slate-50 p-4 text-left">
          <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 text-slate-400" />

          <p className="text-sm leading-6 text-slate-500">
            CASE Budget does not assign
            a placeholder score to a new
            workspace. Missing data is
            shown as unavailable until
            enough real financial
            information exists.
          </p>
        </div>
      </div>
    </section>
  );
}

function getScoreStrokeClassName(
  status:
    FinancialHealthStatus,
) {
  switch (
    status
  ) {
    case "excellent":
      return "text-emerald-600";

    case "good":
      return "text-teal-500";

    case "fair":
      return "text-amber-500";

    case "needs-attention":
      return "text-rose-500";

    case "not-enough-data":
    default:
      return "text-slate-300";
  }
}