"use client";

import { useRouter } from "next/navigation";

function BackIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}

function ForwardIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

export default function NavigationControls() {
  const router = useRouter();

  function handleBack() {
    router.back();
  }

  function handleForward() {
    window.history.forward();
  }

  const buttonClassName =
    `
      inline-flex
      h-10
      w-10
      items-center
      justify-center
      rounded-xl
      border
      border-[var(--border-default)]
      bg-[var(--surface-default)]
      text-[var(--text-secondary)]
      outline-none
      transition
      hover:border-[var(--border-strong)]
      hover:bg-[var(--surface-hover)]
      hover:text-[var(--text-primary)]
      active:scale-[0.97]
      focus-visible:ring-2
      focus-visible:ring-[var(--focus-ring)]
      focus-visible:ring-offset-2
      focus-visible:ring-offset-[var(--surface-default)]
    `;

  return (
    <div
      className="
        flex
        shrink-0
        items-center
        gap-1.5
      "
      aria-label="Page navigation"
    >
      <button
        type="button"
        onClick={handleBack}
        aria-label="Go back"
        title="Back"
        className={buttonClassName}
      >
        <BackIcon />
      </button>

      <button
        type="button"
        onClick={handleForward}
        aria-label="Go forward"
        title="Forward"
        className={buttonClassName}
      >
        <ForwardIcon />
      </button>
    </div>
  );
}