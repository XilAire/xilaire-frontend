import Link from "next/link";

import {
  ArrowRight,
  BadgeDollarSign,
  CircleGauge,
  Landmark,
  PiggyBank,
  ReceiptText,
  ShieldCheck,
  WalletCards,
  type LucideIcon,
} from "lucide-react";

import {
  getFinancialHealthFactorStatusLabel,
  type FinancialHealthFactor,
  type FinancialHealthFactorId,
} from "@/lib/financial-health/financial-health-service";

export type FinancialHealthFactorCardProps = {
  factor:
    FinancialHealthFactor;
};

export default function FinancialHealthFactorCard({
  factor,
}: FinancialHealthFactorCardProps) {
  const Icon =
    getFactorIcon(
      factor.id,
    );

  return (
    <section className="overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-sm">
      <div className="flex items-start justify-between gap-4 p-5 sm:p-6">
        <div className="flex min-w-0 items-start gap-3">
          <div
            className={[
              "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl",
              getIconClassName(
                factor.status,
              ),
            ].join(
              " ",
            )}
          >
            <Icon className="h-5 w-5" />
          </div>

          <div className="min-w-0">
            <p className="text-sm font-bold text-slate-950">
              {factor.label}
            </p>

            <p className="mt-1 text-sm leading-6 text-slate-500">
              {factor.title}
            </p>
          </div>
        </div>

        <FactorStatusBadge
          factor={
            factor
          }
        />
      </div>

      <div className="border-t border-slate-100 px-5 py-5 sm:px-6">
        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">
              Current value
            </p>

            <p className="mt-1 text-xl font-bold tracking-tight text-slate-950">
              {factor.valueLabel}
            </p>
          </div>

          {factor.score !==
          null ? (
            <FactorScore
              score={
                factor.score
              }
            />
          ) : (
            <div className="rounded-2xl bg-slate-100 px-4 py-3 text-center">
              <p className="text-xs font-bold uppercase tracking-[0.1em] text-slate-400">
                Score
              </p>

              <p className="mt-1 text-sm font-bold text-slate-600">
                Unavailable
              </p>
            </div>
          )}
        </div>

        {factor.score !==
        null ? (
          <div className="mt-4">
            <div className="h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className={[
                  "h-full rounded-full transition-[width]",
                  getProgressClassName(
                    factor.status,
                  ),
                ].join(
                  " ",
                )}
                style={{
                  width:
                    `${clampScore(
                      factor.score,
                    )}%`,
                }}
              />
            </div>

            <div className="mt-2 flex items-center justify-between gap-3 text-[11px] font-semibold text-slate-400">
              <span>
                Needs attention
              </span>

              <span>
                Strong
              </span>
            </div>
          </div>
        ) : null}

        <p className="mt-5 text-sm leading-6 text-slate-500">
          {factor.description}
        </p>

        <div className="mt-5 flex flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <WeightIndicator
            weight={
              factor.weight
            }
          />

          {factor.actionHref &&
          factor.actionLabel ? (
            <Link
              href={
                factor.actionHref
              }
              className="inline-flex items-center gap-2 text-sm font-bold text-emerald-700 transition hover:text-emerald-800"
            >
              {factor.actionLabel}

              <ArrowRight className="h-4 w-4" />
            </Link>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function FactorStatusBadge({
  factor,
}: {
  factor:
    FinancialHealthFactor;
}) {
  return (
    <span
      className={[
        "shrink-0 rounded-full px-3 py-1.5 text-xs font-bold",
        getStatusBadgeClassName(
          factor.status,
        ),
      ].join(
        " ",
      )}
    >
      {getFinancialHealthFactorStatusLabel(
        factor.status,
      )}
    </span>
  );
}

function FactorScore({
  score,
}: {
  score:
    number;
}) {
  const safeScore =
    clampScore(
      score,
    );

  return (
    <div className="min-w-[92px] rounded-2xl bg-slate-50 px-4 py-3 text-center">
      <p className="text-xs font-bold uppercase tracking-[0.1em] text-slate-400">
        Score
      </p>

      <p className="mt-1 text-xl font-black tracking-tight text-slate-950">
        {safeScore}
        <span className="ml-0.5 text-xs font-bold text-slate-400">
          /100
        </span>
      </p>
    </div>
  );
}

function WeightIndicator({
  weight,
}: {
  weight:
    number;
}) {
  const normalizedWeight =
    Number.isFinite(
      weight,
    )
      ? Math.max(
          0,
          Math.min(
            1,
            weight,
          ),
        )
      : 0;

  const percentage =
    Math.round(
      normalizedWeight *
        100,
    );

  return (
    <div className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400">
      <CircleGauge className="h-4 w-4" />

      <span>
        {percentage}% of health score
      </span>
    </div>
  );
}

function getFactorIcon(
  id:
    FinancialHealthFactorId,
): LucideIcon {
  switch (
    id
  ) {
    case "cash-flow":
      return WalletCards;

    case "savings":
      return PiggyBank;

    case "debt":
      return Landmark;

    case "emergency-fund":
      return ShieldCheck;

    case "bills":
      return ReceiptText;

    default:
      return BadgeDollarSign;
  }
}

function getStatusBadgeClassName(
  status:
    FinancialHealthFactor["status"],
) {
  switch (
    status
  ) {
    case "strong":
      return "bg-emerald-50 text-emerald-700";

    case "stable":
      return "bg-teal-50 text-teal-700";

    case "watch":
      return "bg-amber-50 text-amber-700";

    case "risk":
      return "bg-rose-50 text-rose-700";

    case "not-enough-data":
    default:
      return "bg-slate-100 text-slate-500";
  }
}

function getIconClassName(
  status:
    FinancialHealthFactor["status"],
) {
  switch (
    status
  ) {
    case "strong":
      return "bg-emerald-50 text-emerald-600";

    case "stable":
      return "bg-teal-50 text-teal-600";

    case "watch":
      return "bg-amber-50 text-amber-600";

    case "risk":
      return "bg-rose-50 text-rose-600";

    case "not-enough-data":
    default:
      return "bg-slate-100 text-slate-500";
  }
}

function getProgressClassName(
  status:
    FinancialHealthFactor["status"],
) {
  switch (
    status
  ) {
    case "strong":
      return "bg-emerald-500";

    case "stable":
      return "bg-teal-500";

    case "watch":
      return "bg-amber-400";

    case "risk":
      return "bg-rose-500";

    case "not-enough-data":
    default:
      return "bg-slate-300";
  }
}

function clampScore(
  value: number,
) {
  if (
    !Number.isFinite(
      value,
    )
  ) {
    return 0;
  }

  return Math.min(
    100,
    Math.max(
      0,
      Math.round(
        value,
      ),
    ),
  );
}