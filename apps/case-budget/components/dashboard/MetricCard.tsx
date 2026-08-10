import type { HTMLAttributes, ReactNode } from "react";
import Card from "@/components/ui/card";

export type MetricTrend =
  | "up"
  | "down"
  | "neutral";

export type MetricCardColor =
  | "emerald"
  | "blue"
  | "amber"
  | "rose"
  | "violet"
  | "slate";

type MetricCardProps = HTMLAttributes<HTMLDivElement> & {
  title: string;
  value: ReactNode;
  subtitle?: string;
  trend?: MetricTrend;
  trendLabel?: string;
  icon?: ReactNode;
  color?: MetricCardColor;
};

const accentClasses: Record<
  MetricCardColor,
  {
    background: string;
    icon: string;
    value: string;
    border: string;
  }
> = {
  emerald: {
    background: "bg-emerald-500/10",
    icon: "text-emerald-400",
    value: "text-emerald-300",
    border: "border-emerald-500/20",
  },
  blue: {
    background: "bg-sky-500/10",
    icon: "text-sky-400",
    value: "text-sky-300",
    border: "border-sky-500/20",
  },
  amber: {
    background: "bg-amber-500/10",
    icon: "text-amber-400",
    value: "text-amber-300",
    border: "border-amber-500/20",
  },
  rose: {
    background: "bg-rose-500/10",
    icon: "text-rose-400",
    value: "text-rose-300",
    border: "border-rose-500/20",
  },
  violet: {
    background: "bg-violet-500/10",
    icon: "text-violet-400",
    value: "text-violet-300",
    border: "border-violet-500/20",
  },
  slate: {
    background: "bg-white/5",
    icon: "text-slate-300",
    value: "text-white",
    border: "border-white/10",
  },
};

function TrendArrow({
  trend,
}: {
  trend: MetricTrend;
}) {
  if (trend === "neutral") {
    return (
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M5 12h14" />
      </svg>
    );
  }

  if (trend === "up") {
    return (
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="m6 15 6-6 6 6" />
      </svg>
    );
  }

  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

export default function MetricCard({
  title,
  value,
  subtitle,
  trend,
  trendLabel,
  icon,
  color = "emerald",
  className = "",
  ...props
}: MetricCardProps) {
  const accent = accentClasses[color];

  return (
    <Card
      {...props}
      className={[
        "overflow-hidden",
        "relative",
        accent.border,
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div
        className={[
          "absolute",
          "right-0",
          "top-0",
          "h-24",
          "w-24",
          "rounded-full",
          accent.background,
          "blur-3xl",
        ].join(" ")}
      />

      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
            {title}
          </p>

          <div
            className={[
              "mt-3",
              "text-3xl",
              "font-black",
              "tracking-tight",
              accent.value,
            ].join(" ")}
          >
            {value}
          </div>

          {subtitle ? (
            <p className="mt-2 text-sm text-slate-500">
              {subtitle}
            </p>
          ) : null}
        </div>

        {icon ? (
          <div
            className={[
              "flex",
              "h-12",
              "w-12",
              "items-center",
              "justify-center",
              "rounded-xl",
              accent.background,
              accent.icon,
            ].join(" ")}
          >
            {icon}
          </div>
        ) : null}
      </div>

      {trend && trendLabel ? (
        <div
          className={[
            "mt-6",
            "inline-flex",
            "items-center",
            "gap-2",
            "rounded-full",
            "px-3",
            "py-1.5",
            "text-xs",
            "font-semibold",
            trend === "up"
              ? "bg-emerald-500/10 text-emerald-300"
              : trend === "down"
              ? "bg-rose-500/10 text-rose-300"
              : "bg-white/5 text-slate-300",
          ].join(" ")}
        >
          <TrendArrow trend={trend} />

          <span>{trendLabel}</span>
        </div>
      ) : null}
    </Card>
  );
}