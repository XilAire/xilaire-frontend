import Skeleton from "@/components/ui/skeleton/Skeleton";
import SkeletonText from "@/components/ui/skeleton/SkeletonText";

type SkeletonListProps = {
  items?: number;
  showAvatar?: boolean;
  showTrailing?: boolean;
  className?: string;
};

export default function SkeletonList({
  items = 6,
  showAvatar = true,
  showTrailing = true,
  className = "",
}: SkeletonListProps) {
  return (
    <div
      className={[
        "rounded-3xl border border-white/10 bg-slate-900/70 divide-y divide-white/5",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      aria-hidden="true"
    >
      {Array.from({ length: items }).map((_, index) => (
        <div
          key={index}
          className="flex items-center gap-4 px-5 py-4 sm:px-6"
        >
          {showAvatar ? (
            <Skeleton
              width={48}
              height={48}
              rounded="full"
              className="shrink-0"
            />
          ) : null}

          <div className="min-w-0 flex-1">
            <Skeleton
              width="45%"
              height={14}
              rounded="full"
            />

            <div className="mt-3">
              <SkeletonText
                lines={2}
                lineHeight={11}
                lastLineWidth="60%"
              />
            </div>
          </div>

          {showTrailing ? (
            <div className="flex flex-col items-end gap-3">
              <Skeleton
                width={70}
                height={14}
                rounded="full"
              />

              <Skeleton
                width={42}
                height={10}
                rounded="full"
              />
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}