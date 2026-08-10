"use client";

export type AuthTransitionOverlayProps = {
  open:
    boolean;

  title?:
    string;

  message?:
    string;

  statusText?:
    string;
};

export default function AuthTransitionOverlay({
  open,
  title =
    "CASE Budget",
  message =
    "Preparing your secure financial workspace.",
  statusText =
    "Loading",
}: AuthTransitionOverlayProps) {
  if (
    !open
  ) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[9999] flex min-h-screen items-center justify-center overflow-hidden bg-[var(--background)]"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 overflow-hidden"
      >
        <div className="absolute -left-40 -top-40 h-[30rem] w-[30rem] rounded-full bg-[color-mix(in_srgb,var(--primary)_14%,transparent)] blur-3xl" />

        <div className="absolute -bottom-48 -right-40 h-[34rem] w-[34rem] rounded-full bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] blur-3xl" />

        <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-[color-mix(in_srgb,var(--primary)_4%,transparent)]" />
      </div>

      <div className="relative z-10 flex w-full max-w-md flex-col items-center px-6 text-center">
        <div className="relative">
          <div
            aria-hidden="true"
            className="absolute inset-0 scale-150 rounded-3xl bg-[color-mix(in_srgb,var(--primary)_15%,transparent)] blur-2xl"
          />

          <div className="relative flex h-20 w-20 items-center justify-center rounded-3xl border border-[var(--border-subtle)] bg-[var(--surface-default)] shadow-xl shadow-black/10">
            <span className="text-2xl font-black tracking-tight text-[var(--primary)]">
              CB
            </span>
          </div>

          <span
            aria-hidden="true"
            className="absolute -right-1 -top-1 flex h-5 w-5"
          >
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--primary)] opacity-40" />

            <span className="relative inline-flex h-5 w-5 rounded-full border-4 border-[var(--background)] bg-[var(--primary)]" />
          </span>
        </div>

        <p className="mt-7 text-xs font-bold uppercase tracking-[0.22em] text-[var(--primary)]">
          XilAire Technologies
        </p>

        <h1 className="mt-3 text-2xl font-black tracking-tight text-[var(--text-primary)] sm:text-3xl">
          {title}
        </h1>

        <p className="mt-3 max-w-sm text-sm leading-6 text-[var(--text-muted)]">
          {message}
        </p>

        <div className="mt-8 w-full max-w-xs">
          <div className="relative h-1.5 overflow-hidden rounded-full bg-[var(--surface-muted)]">
            <div className="auth-transition-progress absolute inset-y-0 left-0 rounded-full bg-[var(--primary)]" />
          </div>

          <div className="mt-4 flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-[var(--text-muted)]">
            <LoadingSpinner />

            <span>
              {statusText}
            </span>
          </div>
        </div>
      </div>

      <style jsx>{`
        .auth-transition-progress {
          width: 42%;
          animation:
            auth-progress 1.25s
            cubic-bezier(
              0.4,
              0,
              0.2,
              1
            )
            infinite;
        }

        @keyframes auth-progress {
          0% {
            transform:
              translateX(-120%);
          }

          50% {
            transform:
              translateX(115%);
          }

          100% {
            transform:
              translateX(280%);
          }
        }

        @media (
          prefers-reduced-motion:
            reduce
        ) {
          .auth-transition-progress {
            width: 100%;
            animation: none;
          }
        }
      `}</style>
    </div>
  );
}

function LoadingSpinner() {
  return (
    <svg
      className="h-4 w-4 animate-spin text-[var(--primary)] motion-reduce:animate-none"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        strokeWidth="3"
        className="opacity-20"
      />

      <path
        d="M21 12a9 9 0 0 0-9-9"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        className="opacity-90"
      />
    </svg>
  );
}