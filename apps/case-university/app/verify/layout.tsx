import Link from "next/link";

import type {
  ReactNode,
} from "react";

type VerifyLayoutProps = {
  children: ReactNode;
};

function ShieldCheckIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20 13c0 5-3.5 7.5-8 9-4.5-1.5-8-4-8-9V5l8-3 8 3v8Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

export default function VerifyLayout({
  children,
}: VerifyLayoutProps) {
  return (
    <div
      className="
        flex
        min-h-screen
        flex-col
        bg-[var(--background)]
        text-[var(--text-primary)]
      "
    >
      <header
        className="
          border-b
          border-[var(--border-subtle)]
          bg-[var(--surface-default)]
        "
      >
        <div
          className="
            mx-auto
            flex
            min-h-20
            w-full
            max-w-[1600px]
            items-center
            justify-between
            gap-4
            px-4
            sm:px-6
            lg:px-8
          "
        >
          <Link
            href="/"
            className="
              flex
              min-w-0
              items-center
              gap-3
              rounded-xl
              outline-none
              focus-visible:ring-2
              focus-visible:ring-[var(--focus-ring)]
            "
          >
            <div
              className="
                flex
                h-11
                w-11
                shrink-0
                items-center
                justify-center
                rounded-xl
                bg-[var(--primary)]
                text-sm
                font-black
                tracking-tight
                text-[var(--primary-foreground)]
                shadow-[var(--shadow-primary)]
              "
            >
              CU
            </div>

            <div
              className="
                min-w-0
              "
            >
              <p
                className="
                  truncate
                  text-base
                  font-black
                  tracking-tight
                  text-[var(--text-primary)]
                "
              >
                CASE University
              </p>

              <p
                className="
                  truncate
                  text-[10px]
                  font-bold
                  uppercase
                  tracking-[0.18em]
                  text-[var(--text-muted)]
                "
              >
                Investing Academy
              </p>
            </div>
          </Link>

          <div
            className="
              inline-flex
              items-center
              gap-2
              rounded-full
              border
              border-[var(--achievement-border)]
              bg-[var(--achievement-soft)]
              px-3
              py-1.5
              text-xs
              font-bold
              text-[var(--achievement)]
            "
          >
            <ShieldCheckIcon />

            <span
              className="
                hidden
                sm:inline
              "
            >
              Credential Verification
            </span>

            <span
              className="
                sm:hidden
              "
            >
              Verify
            </span>
          </div>
        </div>
      </header>

      <main
        className="
          flex-1
        "
      >
        {children}
      </main>

      <footer
        className="
          border-t
          border-[var(--border-subtle)]
          bg-[var(--surface-default)]
        "
      >
        <div
          className="
            mx-auto
            flex
            w-full
            max-w-[1600px]
            flex-col
            gap-3
            px-4
            py-6
            text-sm
            text-[var(--text-muted)]
            sm:flex-row
            sm:items-center
            sm:justify-between
            sm:px-6
            lg:px-8
          "
        >
          <div>
            <p
              className="
                font-bold
                text-[var(--text-primary)]
              "
            >
              CASE University
            </p>

            <p
              className="
                mt-1
                text-xs
              "
            >
              Investing education built for practical learning.
            </p>
          </div>

          <div
            className="
              flex
              items-center
              gap-2
              text-xs
              font-semibold
            "
          >
            <ShieldCheckIcon />

            Secure credential verification
          </div>
        </div>
      </footer>
    </div>
  );
}