import Skeleton from "@/components/ui/skeleton/Skeleton";

type SkeletonTextProps = {
  lines?: number;
  lineHeight?: string | number;
  gap?: string;
  lastLineWidth?: string | number;
  widths?: Array<string | number>;
  className?: string;
};

export default function SkeletonText({
  lines = 3,
  lineHeight = 14,
  gap = "space-y-2",
  lastLineWidth = "70%",
  widths,
  className = "",
}: SkeletonTextProps) {
  const safeLineCount = Math.max(1, lines);

  return (
    <div
      className={[gap, className].filter(Boolean).join(" ")}
      aria-hidden="true"
    >
      {Array.from({ length: safeLineCount }).map((_, index) => {
        const isLastLine = index === safeLineCount - 1;

        const width =
          widths?.[index] ??
          (isLastLine ? lastLineWidth : "100%");

        return (
          <Skeleton
            key={index}
            width={width}
            height={lineHeight}
            rounded="full"
          />
        );
      })}
    </div>
  );
}