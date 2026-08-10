import Skeleton from "@/components/ui/skeleton/Skeleton";
import SkeletonText from "@/components/ui/skeleton/SkeletonText";

type SkeletonCardProps = {
  showIcon?: boolean;
  showChart?: boolean;
  showFooter?: boolean;
  className?: string;
};

export default function SkeletonCard({
  showIcon = true,
  showChart = false,
  showFooter = false,
  className = "",
}: SkeletonCardProps) {
  return (
    <div
      className={[
        "rounded-3xl border border-white/10 bg-slate-900/70 p-5 sm:p-6",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      aria-hidden="true"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <Skeleton
            width="42%"
            height={14}
            rounded="full"
          />

          <Skeleton
            width="68%"
            height={32}
            rounded="lg"
            className="mt-4"
          />
        </div>

        {showIcon ? (
          <Skeleton
            width={42}
            height={42}
            rounded="xl"
            className="shrink-0"
          />
        ) : null}
      </div>

      <div className="mt-5">
        <SkeletonText
          lines={2}
          lineHeight={12}
          lastLineWidth="48%"
        />
      </div>

      {showChart ? (
        <div className="mt-6">
          <Skeleton
            width="100%"
            height={140}
            rounded="2xl"
          />
        </div>
      ) : null}

      {showFooter ? (
        <div className="mt-6 flex items-center justify-between gap-3 border-t border-white/10 pt-4">
          <Skeleton
            width="32%"
            height={12}
            rounded="full"
          />

          <Skeleton
            width={84}
            height={34}
            rounded="xl"
          />
        </div>
      ) : null}
    </div>
  );
}