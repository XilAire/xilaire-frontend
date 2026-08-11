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
    <section className="overflow-hidden rounded-[26px] border border-[var(--border-subtle)] bg-[var(--surface-default)] shadow-sm">
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
            <p className="text-sm font-bold text-[var(--text-primary)]">
              {factor.label}
            </p>

            <p className="mt-1 text-sm leading-6 text-[var(--text-muted)]">
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

      <div className="border-t border-[var(--border-subtle)] px-5 py-5 sm:px-6">
        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]">
              Current value
            </p>

            <p className="mt-1 text-xl font-bold tracking-tight text-[var(--text-primary)]">
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
            <div className="rounded-2xl bg-[var(--surface-muted)] px-4 py-3 text-center">
              <p className="text-xs font-bold uppercase tracking-[0.1em] text-[var(--text-muted)]">
                Score
              </p>

              <p className="mt-1 text-sm font-bold text-[var(--text-secondary)]">
                Unavailable
              </p>
            </div>
          )}
        </div>

        {factor.score !==
        null ? (
          <div className="mt-4">
            <div className="h-2 overflow-hidden rounded-full bg-[var(--surface-muted)]">
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

            <div className="mt-2 flex items-center justify-between gap-3 text-[11px] font-semibold text-[var(--text-muted)]">
              <span>
                Needs attention
              </span>

              <span>
                Strong
              </span>
            </div>
          </div>
        ) : null}

        <p className="mt-5 text-sm leading-6 text-[var(--text-muted)]">
          {factor.description}
        </p>

        <div className="mt-5 flex flex-col gap-3 border-t border-[var(--border-subtle)] pt-5 sm:flex-row sm:items-center sm:justify-between">
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
              className="inline-flex items-center gap-2 text-sm font-bold text-[var(--success)] transition hover:opacity-80"
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
    <div className="min-w-[92px] rounded-2xl bg-[var(--surface-muted)] px-4 py-3 text-center">
      <p className="text-xs font-bold uppercase tracking-[0.1em] text-[var(--text-muted)]">
        Score
      </p>

      <p className="mt-1 text-xl font-black tracking-tight text-[var(--text-primary)]">
        {safeScore}

        <span className="ml-0.5 text-xs font-bold text-[var(--text-muted)]">
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
    <div className="inline-flex items-center gap-2 text-xs font-semibold text-[var(--text-muted)]">
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
      return "bg-[color-mix(in_srgb,var(--success)_12%,var(--surface-default))] text-[var(--success)]";

    case "stable":
      return "bg-[color-mix(in_srgb,var(--success)_10%,var(--surface-default))] text-[var(--success)]";

    case "watch":
      return "bg-[color-mix(in_srgb,var(--warning)_12%,var(--surface-default))] text-[var(--warning)]";

    case "risk":
      return "bg-[color-mix(in_srgb,var(--danger)_12%,var(--surface-default))] text-[var(--danger)]";

    case "not-enough-data":
    default:
      return "bg-[var(--surface-muted)] text-[var(--text-muted)]";
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
      return "bg-[color-mix(in_srgb,var(--success)_10%,var(--surface-default))] text-[var(--success)]";

    case "stable":
      return "bg-[color-mix(in_srgb,var(--success)_8%,var(--surface-default))] text-[var(--success)]";

    case "watch":
      return "bg-[color-mix(in_srgb,var(--warning)_10%,var(--surface-default))] text-[var(--warning)]";

    case "risk":
      return "bg-[color-mix(in_srgb,var(--danger)_10%,var(--surface-default))] text-[var(--danger)]";

    case "not-enough-data":
    default:
      return "bg-[var(--surface-muted)] text-[var(--text-muted)]";
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
      return "bg-[var(--success)]";

    case "stable":
      return "bg-[var(--success)]";

    case "watch":
      return "bg-[var(--warning)]";

    case "risk":
      return "bg-[var(--danger)]";

    case "not-enough-data":
    default:
      return "bg-[var(--border-strong)]";
  }
}

function clampScore(
  value:
    number,
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