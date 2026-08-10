import type { ReactNode } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  HeartPulse,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";

export type FinancialHealthStatus =
  | "excellent"
  | "good"
  | "fair"
  | "needs-attention";

export type FinancialHealthMetric = {
  id: string;
  label: string;
  value: string;
  description?: string;
  score?: number;
};

export type FinancialHealthCardProps = {
  score: number;
  metrics?: FinancialHealthMetric[];
  title?: string;
  description?: string;
  comparisonScore?: number;
  comparisonLabel?: string;
  icon?: ReactNode;
  href?: string;
  className?: string;
};

function joinClassNames(
  ...classes: Array<string | false | null | undefined>
) {
  return classes.filter(Boolean).join(" ");
}

function normalizeScore(score: number) {
  return Math.min(Math.max(score, 0), 100);
}

function getFinancialHealthStatus(
  score: number
): FinancialHealthStatus {
  if (score >= 85) {
    return "excellent";
  }

  if (score >= 70) {
    return "good";
  }

  if (score >= 50) {
    return "fair";
  }

  return "needs-attention";
}

const statusConfig: Record<
  FinancialHealthStatus,
  {
    label: string;
    description: string;
    textClass: string;
    backgroundClass: string;
    borderClass: string;
    progressClass: string;
    icon: ReactNode;
  }
> = {
  excellent: {
    label: "Excellent",
    description:
      "Your finances are showing strong overall stability.",
    textClass: "text-emerald-400",
    backgroundClass: "bg-emerald-500/10",
    borderClass: "border-emerald-500/20",
    progressClass: "bg-emerald-500",
    icon: (
      <ShieldCheck
        size={14}
        aria-hidden="true"
      />
    ),
  },
  good: {
    label: "Good",
    description:
      "Your financial foundation is healthy with room to improve.",
    textClass: "text-sky-400",
    backgroundClass: "bg-sky-500/10",
    borderClass: "border-sky-500/20",
    progressClass: "bg-sky-500",
    icon: (
      <CheckCircle2
        size={14}
        aria-hidden="true"
      />
    ),
  },
  fair: {
    label: "Fair",
    description:
      "A few focused improvements could strengthen your finances.",
    textClass: "text-amber-400",
    backgroundClass: "bg-amber-500/10",
    borderClass: "border-amber-500/20",
    progressClass: "bg-amber-500",
    icon: (
      <TrendingUp
        size={14}
        aria-hidden="true"
      />
    ),
  },
  "needs-attention": {
    label: "Needs attention",
    description:
      "Review your budget, debt, savings, and upcoming obligations.",
    textClass: "text-rose-400",
    backgroundClass: "bg-rose-500/10",
    borderClass: "border-rose-500/20",
    progressClass: "bg-rose-500",
    icon: (
      <AlertTriangle
        size={14}
        aria-hidden="true"
      />
    ),
  },
};

export default function FinancialHealthCard({
  score,
  metrics = [],
  title = "Financial Health",
  description = "A snapshot of your overall financial position",
  comparisonScore,
  comparisonLabel = "from previous period",
  icon,
  href,
  className,
}: FinancialHealthCardProps) {
  const normalizedScore = normalizeScore(score);

  const status = getFinancialHealthStatus(
    normalizedScore
  );

  const currentStatus = statusConfig[status];

  const scoreDifference =
    typeof comparisonScore === "number"
      ? normalizedScore -
        normalizeScore(comparisonScore)
      : null;

  const content = (
    <>
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.05] text-rose-400">
            {icon ?? (
              <HeartPulse
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

        <span
          className={joinClassNames(
            "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold",
            currentStatus.textClass,
            currentStatus.backgroundClass,
            currentStatus.borderClass
          )}
        >
          {currentStatus.icon}
          {currentStatus.label}
        </span>
      </div>

      <div className="mt-6 flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-slate-500">
            Health score
          </p>

          <div className="mt-1 flex items-end gap-2">
            <span
              className={joinClassNames(
                "text-4xl font-bold tracking-tight tabular-nums",
                currentStatus.textClass
              )}
            >
              {Math.round(normalizedScore)}
            </span>

            <span className="pb-1 text-sm font-medium text-slate-500">
              / 100
            </span>
          </div>
        </div>

        {scoreDifference !== null ? (
          <div
            className={joinClassNames(
              "text-right text-xs font-semibold",
              scoreDifference > 0
                ? "text-emerald-400"
                : scoreDifference < 0
                  ? "text-rose-400"
                  : "text-slate-400"
            )}
          >
            <p>
              {scoreDifference > 0 ? "+" : ""}
              {Math.round(scoreDifference)} points
            </p>

            <p className="mt-1 font-normal text-slate-500">
              {comparisonLabel}
            </p>
          </div>
        ) : null}
      </div>

      <div className="mt-5">
        <div className="h-2.5 overflow-hidden rounded-full bg-white/[0.06]">
          <div
            className={joinClassNames(
              "h-full rounded-full transition-[width] duration-300",
              currentStatus.progressClass
            )}
            style={{
              width: `${normalizedScore}%`,
            }}
          />
        </div>

        <div className="mt-2 flex justify-between text-[11px] font-medium text-slate-600">
          <span>0</span>
          <span>25</span>
          <span>50</span>
          <span>75</span>
          <span>100</span>
        </div>
      </div>

      <div
        className={joinClassNames(
          "mt-5 rounded-xl border p-4",
          currentStatus.backgroundClass,
          currentStatus.borderClass
        )}
      >
        <div className="flex items-start gap-3">
          <HeartPulse
            size={18}
            className={joinClassNames(
              "mt-0.5 shrink-0",
              currentStatus.textClass
            )}
            aria-hidden="true"
          />

          <div>
            <p
              className={joinClassNames(
                "text-sm font-semibold",
                currentStatus.textClass
              )}
            >
              {currentStatus.label}
            </p>

            <p className="mt-1 text-xs leading-5 text-slate-400">
              {currentStatus.description}
            </p>
          </div>
        </div>
      </div>

      {metrics.length > 0 ? (
        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {metrics.map((metric) => {
            const metricScore =
              typeof metric.score === "number"
                ? normalizeScore(metric.score)
                : null;

            return (
              <div
                key={metric.id}
                className="rounded-xl border border-white/10 bg-white/[0.025] p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium text-slate-500">
                      {metric.label}
                    </p>

                    <p className="mt-2 truncate text-sm font-semibold text-slate-200">
                      {metric.value}
                    </p>
                  </div>

                  {metricScore !== null ? (
                    <span className="shrink-0 text-xs font-semibold tabular-nums text-slate-400">
                      {Math.round(metricScore)}
                    </span>
                  ) : null}
                </div>

                {metric.description ? (
                  <p className="mt-2 text-xs leading-5 text-slate-500">
                    {metric.description}
                  </p>
                ) : null}

                {metricScore !== null ? (
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                    <div
                      className={joinClassNames(
                        "h-full rounded-full transition-[width] duration-300",
                        metricScore >= 75
                          ? "bg-emerald-500"
                          : metricScore >= 50
                            ? "bg-amber-500"
                            : "bg-rose-500"
                      )}
                      style={{
                        width: `${metricScore}%`,
                      }}
                    />
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : null}
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
        status === "needs-attention" &&
          "border-rose-500/20",
        status === "fair" &&
          "border-amber-500/20",
        "hover:border-white/15 hover:bg-white/[0.04]",
        className
      )}
    >
      {content}
    </article>
  );
}