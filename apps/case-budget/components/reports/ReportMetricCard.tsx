import type {
  LucideIcon,
} from "lucide-react";

import ReportComparisonBadge from "@/components/reports/ReportComparisonBadge";

export type ReportMetricComparison = {
  amount: number;
  percentage: number | null;
  positiveIsGood?: boolean;
  comparisonLabel?: string;
};

export type ReportMetricCardProps = {
  label: string;
  value: string;
  description: string;
  icon: LucideIcon;
  accent?: boolean;
  comparison?: ReportMetricComparison;
};

export default function ReportMetricCard({
  label,
  value,
  description,
  icon: Icon,
  accent = false,
  comparison,
}: ReportMetricCardProps) {
  return (
    <div
      className={[
        "rounded-[24px] border bg-white p-5 shadow-sm",
        accent
          ? "border-emerald-200"
          : "border-slate-200",
      ].join(
        " ",
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-500">
            {label}
          </p>

          <p
            className={[
              "mt-2 truncate text-2xl font-bold tracking-tight",
              accent
                ? "text-emerald-700"
                : "text-slate-950",
            ].join(
              " ",
            )}
          >
            {value}
          </p>

          <p className="mt-2 text-xs leading-5 text-slate-500">
            {description}
          </p>

          {comparison ? (
            <ReportComparisonBadge
              amount={
                comparison.amount
              }
              percentage={
                comparison.percentage
              }
              positiveIsGood={
                comparison.positiveIsGood
              }
              comparisonLabel={
                comparison.comparisonLabel
              }
            />
          ) : null}
        </div>

        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}