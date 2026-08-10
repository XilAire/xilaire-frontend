import {
  SkeletonCard,
  SkeletonList,
  SkeletonMetric,
} from "@/components/ui/skeleton";

function SkeletonBlock({
  className = "",
}: {
  className?: string;
}) {
  return (
    <div
      aria-hidden="true"
      className={[
        "animate-pulse",
        "bg-[var(--surface-muted)]",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    />
  );
}

export default function DashboardLoading() {
  return (
    <div
      className="space-y-8"
      aria-label="Loading dashboard"
      aria-busy="true"
      role="status"
    >
      <section className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-3">
          <SkeletonBlock className="h-3 w-24 rounded-md" />

          <SkeletonBlock className="h-9 w-72 max-w-full rounded-lg" />

          <SkeletonBlock className="h-4 w-[32rem] max-w-full rounded-md" />
        </div>

        <SkeletonBlock className="h-11 w-32 rounded-xl" />
      </section>

      <section
        aria-label="Loading financial overview"
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        {Array.from({
          length: 4,
        }).map((_, index) => (
          <SkeletonMetric
            key={`dashboard-metric-${index}`}
          />
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.75fr)]">
        <div className="overflow-hidden rounded-2xl border border-[var(--border-default)] bg-[var(--surface-default)] shadow-[var(--shadow-sm)]">
          <div className="flex items-start justify-between gap-4 border-b border-[var(--border-subtle)] p-5 sm:p-6">
            <div className="min-w-0 flex-1">
              <SkeletonBlock className="h-5 w-40 rounded-md" />

              <SkeletonBlock className="mt-3 h-3.5 w-64 max-w-full rounded-md" />
            </div>

            <SkeletonBlock className="h-4 w-24 rounded-md" />
          </div>

          <div className="space-y-7 p-5 sm:p-6">
            {Array.from({
              length: 4,
            }).map((_, index) => (
              <div
                key={`budget-category-${index}`}
              >
                <div className="mb-3 flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <SkeletonBlock className="h-4 w-28 rounded-md" />

                    <SkeletonBlock className="mt-2 h-3 w-36 rounded-md" />
                  </div>

                  <SkeletonBlock className="h-4 w-20 rounded-md" />
                </div>

                <SkeletonBlock className="h-2 w-full rounded-full" />
              </div>
            ))}
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-[var(--border-default)] bg-[var(--surface-default)] shadow-[var(--shadow-sm)]">
          <div className="border-b border-[var(--border-subtle)] p-5 sm:p-6">
            <SkeletonBlock className="h-5 w-36 rounded-md" />

            <SkeletonBlock className="mt-3 h-3.5 w-56 max-w-full rounded-md" />
          </div>

          <SkeletonList
            items={4}
            className="rounded-none border-0 bg-transparent"
          />
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.95fr)]">
        <div className="overflow-hidden rounded-2xl border border-[var(--border-default)] bg-[var(--surface-default)] shadow-[var(--shadow-sm)]">
          <div className="flex items-start justify-between gap-4 border-b border-[var(--border-subtle)] p-5 sm:p-6">
            <div className="min-w-0 flex-1">
              <SkeletonBlock className="h-5 w-44 rounded-md" />

              <SkeletonBlock className="mt-3 h-3.5 w-52 max-w-full rounded-md" />
            </div>

            <SkeletonBlock className="h-4 w-16 rounded-md" />
          </div>

          <SkeletonList
            items={4}
            className="rounded-none border-0 bg-transparent"
          />
        </div>

        <div className="overflow-hidden rounded-2xl border border-[var(--border-default)] bg-[var(--surface-default)] shadow-[var(--shadow-sm)]">
          <div className="flex items-start justify-between gap-4 border-b border-[var(--border-subtle)] p-5 sm:p-6">
            <div className="min-w-0 flex-1">
              <SkeletonBlock className="h-5 w-36 rounded-md" />

              <SkeletonBlock className="mt-3 h-3.5 w-64 max-w-full rounded-md" />
            </div>

            <SkeletonBlock className="h-4 w-20 rounded-md" />
          </div>

          <div className="space-y-4 p-5 sm:p-6">
            {Array.from({
              length: 2,
            }).map((_, index) => (
              <SkeletonCard
                key={`savings-goal-${index}`}
                showIcon={false}
                className="border-[var(--border-subtle)] bg-[var(--surface-muted)]"
              />
            ))}
          </div>
        </div>
      </section>

      <span className="sr-only">
        Loading dashboard content
      </span>
    </div>
  );
}