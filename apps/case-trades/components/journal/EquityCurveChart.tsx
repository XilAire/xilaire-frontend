"use client";

type EquityCurvePoint = {
  label: string;
  date: string;
  pnl: number;
  cumulativePnl: number;
};

type EquityCurveChartProps = {
  points: EquityCurvePoint[];
};

function formatMoney(value: number | null | undefined) {
  const amount = Number(value ?? 0);
  const prefix = amount > 0 ? "+" : amount < 0 ? "-" : "";
  return `${prefix}$${Math.abs(amount).toFixed(2)}`;
}

function getPolylinePoints(points: EquityCurvePoint[]) {
  if (points.length === 0) {
    return "";
  }

  if (points.length === 1) {
    return "0,50 100,50";
  }

  const values = points.map((point) => point.cumulativePnl);
  const minValue = Math.min(...values, 0);
  const maxValue = Math.max(...values, 0);
  const range = maxValue - minValue || 1;

  return points
    .map((point, index) => {
      const x = (index / (points.length - 1)) * 100;
      const y = 100 - ((point.cumulativePnl - minValue) / range) * 100;

      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");
}

export default function EquityCurveChart({ points }: EquityCurveChartProps) {
  const polylinePoints = getPolylinePoints(points);
  const lastPoint = points[points.length - 1] ?? null;
  const endingPnl = Number(lastPoint?.cumulativePnl ?? 0);

  if (points.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-white/10 bg-slate-950 text-sm text-slate-500">
        No closed trades available for the equity curve.
      </div>
    );
  }

  return (
    <div>
      <div className="rounded-xl border border-white/10 bg-slate-950 p-4">
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="h-64 w-full overflow-visible"
          role="img"
          aria-label="Equity curve"
        >
          <line
            x1="0"
            y1="50"
            x2="100"
            y2="50"
            vectorEffect="non-scaling-stroke"
            className="stroke-white/10"
          />

          <polyline
            points={polylinePoints}
            fill="none"
            vectorEffect="non-scaling-stroke"
            className={endingPnl >= 0 ? "stroke-emerald-400" : "stroke-red-400"}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-white/10 bg-slate-950 px-4 py-3">
          <p className="text-xs text-slate-500">First Trade</p>
          <p className="mt-1 font-medium text-slate-100">
            {points[0]?.label ?? "—"}
          </p>
        </div>

        <div className="rounded-lg border border-white/10 bg-slate-950 px-4 py-3">
          <p className="text-xs text-slate-500">Last Trade</p>
          <p className="mt-1 font-medium text-slate-100">
            {lastPoint?.label ?? "—"}
          </p>
        </div>

        <div className="rounded-lg border border-white/10 bg-slate-950 px-4 py-3">
          <p className="text-xs text-slate-500">Ending P/L</p>
          <p
            className={
              "mt-1 font-medium " +
              (endingPnl > 0
                ? "text-emerald-400"
                : endingPnl < 0
                  ? "text-red-400"
                  : "text-slate-100")
            }
          >
            {formatMoney(endingPnl)}
          </p>
        </div>
      </div>
    </div>
  );
}