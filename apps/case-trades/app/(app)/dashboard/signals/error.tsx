"use client";

export default function SignalsError({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-6">
      <h2 className="text-lg font-semibold text-red-400">
        Signals Error
      </h2>

      <p className="mt-2 text-sm text-red-300">
        {error.message}
      </p>

      <button
        onClick={reset}
        className="mt-4 rounded-md bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-500"
      >
        Retry
      </button>
    </div>
  );
}
