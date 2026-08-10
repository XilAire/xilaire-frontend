import LoadingSpinner from "@/components/ui/LoadingSpinner";

type PageLoaderProps = {
  title?: string;
  description?: string;
  compact?: boolean;
};

export default function PageLoader({
  title = "Loading your financial data",
  description = "Please wait while CASE Budget prepares this page.",
  compact = false,
}: PageLoaderProps) {
  if (compact) {
    return (
      <div
        role="status"
        aria-live="polite"
        aria-label={title}
        className="flex min-h-40 w-full items-center justify-center"
      >
        <div className="flex items-center gap-3 text-sm font-medium text-slate-400">
          <LoadingSpinner
            size="sm"
            label={title}
            className="text-emerald-400"
          />

          <span>{title}</span>
        </div>
      </div>
    );
  }

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={title}
      className="flex min-h-[calc(100vh-5rem)] w-full items-center justify-center px-4 py-12 sm:px-6 lg:px-8"
    >
      <div className="flex w-full max-w-sm flex-col items-center text-center">
        <div className="relative flex h-20 w-20 items-center justify-center">
          <span
            aria-hidden="true"
            className="absolute inset-0 animate-ping rounded-3xl bg-emerald-500/10 motion-reduce:animate-none"
          />

          <span
            aria-hidden="true"
            className="absolute inset-2 rounded-2xl border border-emerald-400/20 bg-emerald-500/10"
          />

          <LoadingSpinner
            size="xl"
            label={title}
            className="relative z-10 text-emerald-400"
          />
        </div>

        <h2 className="mt-6 text-base font-bold text-white sm:text-lg">
          {title}
        </h2>

        {description ? (
          <p className="mt-2 max-w-xs text-sm leading-6 text-slate-500">
            {description}
          </p>
        ) : null}

        <div
          aria-hidden="true"
          className="mt-6 h-1.5 w-full max-w-52 overflow-hidden rounded-full bg-white/[0.06]"
        >
          <div className="h-full w-1/2 animate-[case-budget-page-loader_1.2s_ease-in-out_infinite] rounded-full bg-emerald-400 motion-reduce:w-full motion-reduce:animate-none" />
        </div>
      </div>
    </div>
  );
}