import Skeleton from "@/components/ui/skeleton/Skeleton";

type SkeletonTableProps = {
  rows?: number;
  columns?: number;
  showHeader?: boolean;
  className?: string;
};

export default function SkeletonTable({
  rows = 8,
  columns = 5,
  showHeader = true,
  className = "",
}: SkeletonTableProps) {
  return (
    <div
      className={[
        "overflow-hidden rounded-3xl border border-white/10 bg-slate-900/70",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      aria-hidden="true"
    >
      {showHeader ? (
        <div className="grid gap-4 border-b border-white/10 bg-white/[0.02] px-6 py-4">
          <div
            className="grid gap-4"
            style={{
              gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
            }}
          >
            {Array.from({ length: columns }).map((_, index) => (
              <Skeleton
                key={index}
                width="70%"
                height={12}
                rounded="full"
              />
            ))}
          </div>
        </div>
      ) : null}

      <div className="divide-y divide-white/5">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div
            key={rowIndex}
            className="grid gap-4 px-6 py-5"
            style={{
              gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
            }}
          >
            {Array.from({ length: columns }).map((_, columnIndex) => (
              <Skeleton
                key={columnIndex}
                width={
                  columnIndex === 0
                    ? "85%"
                    : columnIndex === columns - 1
                    ? "55%"
                    : "75%"
                }
                height={14}
                rounded="full"
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}