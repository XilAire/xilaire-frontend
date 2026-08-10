import Skeleton from "@/components/ui/skeleton/Skeleton";
import SkeletonText from "@/components/ui/skeleton/SkeletonText";

type SkeletonMetricProps = {
  showTrend?: boolean;
  showFooter?: boolean;
  className?: string;
};

export default function SkeletonMetric({
  showTrend = true,
  showFooter = true,
  className = "",
}: SkeletonMetricProps) {
  return (
    <div
      className={[
        "rounded-3xl border border-white/10 bg-slate-900/70 p-6",
        "animate-case-budget-card-enter",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      aria-hidden="true"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <Skeleton
          width="42%"
          height={14}
          rounded="full"
        />

        <Skeleton
          width={42}
          height={42}
          rounded="2xl"
        />
      </div>

      {/* Main Value */}
      <div className="mt-6">
        <Skeleton
          width="62%"
          height={34}
          rounded="xl"
        />
      </div>

      {/* Secondary Text */}
      <div className="mt-4">
        <SkeletonText
          lines={2}
          lineHeight={12}
          lastLineWidth="45%"
        />
      </div>

      {/* Trend */}
      {showTrend ? (
        <div className="mt-6 flex items-center gap-3">
          <Skeleton
            width={78}
            height={28}
            rounded="full"
          />

          <Skeleton
            width="34%"
            height={12}
            rounded="full"
          />
        </div>
      ) : null}

      {/* Footer */}
      {showFooter ? (
        <div className="mt-6 border-t border-white/10 pt-4">
          <div className="flex items-center justify-between">
            <Skeleton
              width="28%"
              height={12}
              rounded="full"
            />

            <Skeleton
              width="22%"
              height={12}
              rounded="full"
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}