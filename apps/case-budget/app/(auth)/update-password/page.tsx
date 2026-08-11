import Link from "next/link";

import UpdatePasswordForm from "@/components/auth/forms/UpdatePasswordForm";

export const dynamic =
  "force-dynamic";

export const revalidate =
  0;

export default function UpdatePasswordPage() {
  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--text-primary)]">
      <div className="grid min-h-screen lg:grid-cols-[minmax(0,1fr)_minmax(460px,0.82fr)]">
        <AuthBrandPanel />

        <section className="flex min-h-screen items-center justify-center px-4 py-8 sm:px-6 lg:px-10 xl:px-14">
          <div className="w-full max-w-md">
            <MobileBrand />

            <div className="rounded-3xl border border-[var(--border-subtle)] bg-[var(--surface-default)] p-5 shadow-xl shadow-black/5 sm:p-8">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--primary)]">
                  Secure recovery
                </p>

                <h1 className="mt-3 text-3xl font-bold tracking-tight text-[var(--text-primary)]">
                  Create a new password
                </h1>

                <p className="mt-3 text-sm leading-6 text-[var(--text-muted)]">
                  Enter a new password for your
                  CASE Budget account. Your new
                  password will replace the
                  password currently associated
                  with your account.
                </p>
              </div>

              <div className="mt-7">
                <UpdatePasswordForm />
              </div>
            </div>

            <AuthFooter />
          </div>
        </section>
      </div>
    </main>
  );
}

function AuthBrandPanel() {
  return (
    <aside className="relative hidden overflow-hidden bg-[var(--primary)] p-10 text-white lg:flex lg:flex-col lg:justify-between xl:p-14">
      <div
        aria-hidden="true"
        className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-white/10 blur-3xl"
      />

      <div
        aria-hidden="true"
        className="absolute -bottom-28 -left-24 h-96 w-96 rounded-full bg-black/10 blur-3xl"
      />

      <div className="relative z-10">
        <BrandMark />

        <div className="mt-16 max-w-xl">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-white/70">
            Secure account recovery
          </p>

          <h2 className="mt-5 text-4xl font-bold leading-tight tracking-tight xl:text-5xl">
            Protect your financial life with a
            strong password.
          </h2>

          <p className="mt-6 max-w-lg text-base leading-7 text-white/80 xl:text-lg">
            CASE Budget uses protected recovery
            sessions, secure authentication, and
            optional multi-factor authentication
            to help keep your financial workspace
            protected.
          </p>
        </div>

        <div className="mt-10 space-y-4">
          <SecurityFeature
            icon={
              <ShieldIcon />
            }
            title="Protected recovery session"
            description="Your password can only be changed through a valid authenticated recovery session."
          />

          <SecurityFeature
            icon={
              <LockIcon />
            }
            title="Strong password protection"
            description="Use a unique password that is difficult to guess and is not shared with other services."
          />

          <SecurityFeature
            icon={
              <CheckCircleIcon />
            }
            title="Immediate account protection"
            description="Your new password becomes active as soon as the update succeeds."
          />
        </div>
      </div>

      <p className="relative z-10 mt-12 text-xs font-medium text-white/60">
        © 2026 XilAire Technologies. All
        rights reserved.
      </p>
    </aside>
  );
}

type SecurityFeatureProps = {
  icon:
    React.ReactNode;

  title:
    string;

  description:
    string;
};

function SecurityFeature({
  icon,
  title,
  description,
}: SecurityFeatureProps) {
  return (
    <div className="flex items-start gap-4 rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15">
        {
          icon
        }
      </div>

      <div className="min-w-0">
        <p className="text-sm font-bold">
          {
            title
          }
        </p>

        <p className="mt-1 text-xs leading-5 text-white/70">
          {
            description
          }
        </p>
      </div>
    </div>
  );
}

function MobileBrand() {
  return (
    <div className="mb-7 lg:hidden">
      <BrandMark
        compact
      />
    </div>
  );
}

function BrandMark({
  compact = false,
}: {
  compact?:
    boolean;
}) {
  return (
    <Link
      href="/"
      aria-label="CASE Budget home"
      className={[
        "inline-flex",
        "items-center",
        "gap-3",
        "rounded-xl",
        "outline-none",
        "focus-visible:ring-2",

        compact
          ? "text-[var(--text-primary)] focus-visible:ring-[var(--primary)]"
          : "text-white focus-visible:ring-white",
      ].join(
        " ",
      )}
    >
      <span
        className={[
          "flex",
          "items-center",
          "justify-center",
          "rounded-xl",
          "font-black",

          compact
            ? "h-11 w-11 bg-[var(--primary)] text-white"
            : "h-12 w-12 bg-white text-[var(--primary)]",
        ].join(
          " ",
        )}
      >
        C
      </span>

      <span>
        <span className="block text-lg font-black tracking-tight">
          CASE Budget
        </span>

        <span
          className={[
            "block",
            "text-[10px]",
            "font-bold",
            "uppercase",
            "tracking-[0.16em]",

            compact
              ? "text-[var(--text-muted)]"
              : "text-white/65",
          ].join(
            " ",
          )}
        >
          XilAire Technologies
        </span>
      </span>
    </Link>
  );
}

function AuthFooter() {
  return (
    <footer className="mt-6 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs text-[var(--text-muted)]">
      <Link
        href="/legal/privacy"
        className="outline-none transition hover:text-[var(--text-primary)] focus-visible:rounded focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
      >
        Privacy
      </Link>

      <Link
        href="/legal/terms"
        className="outline-none transition hover:text-[var(--text-primary)] focus-visible:rounded focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
      >
        Terms
      </Link>

      <Link
        href="/support"
        className="outline-none transition hover:text-[var(--text-primary)] focus-visible:rounded focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
      >
        Support
      </Link>
    </footer>
  );
}

function ShieldIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 3 5 6v5c0 4.5 2.8 8.2 7 10 4.2-1.8 7-5.5 7-10V6Z" />

      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect
        x="4"
        y="10"
        width="16"
        height="11"
        rx="2"
      />

      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

function CheckCircleIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle
        cx="12"
        cy="12"
        r="9"
      />

      <path d="m8 12 2.5 2.5L16 9" />
    </svg>
  );
}