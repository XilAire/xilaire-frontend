import Link from "next/link";

import ForgotPasswordForm from "@/components/auth/ForgotPasswordForm";

export default function ForgotPasswordPage() {
  return (
    <main className="relative flex min-h-screen overflow-hidden bg-[var(--background)] text-[var(--foreground)]">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
      >
        <div className="absolute -left-32 -top-32 h-80 w-80 rounded-full bg-[var(--primary-soft)] blur-3xl" />
        <div className="absolute -bottom-40 -right-32 h-96 w-96 rounded-full bg-[var(--primary-soft)] opacity-70 blur-3xl" />
      </div>

      <div className="relative mx-auto grid min-h-screen w-full max-w-[1600px] lg:grid-cols-[minmax(0,1fr)_minmax(440px,0.72fr)]">
        <section className="hidden border-r border-[var(--border-subtle)] px-10 py-10 lg:flex lg:flex-col xl:px-16 xl:py-12">
          <Link
            href="/"
            className="inline-flex w-fit items-center gap-3"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--primary)] text-sm font-bold text-[var(--primary-foreground)] shadow-[var(--shadow-primary)]">
              CU
            </span>

            <span>
              <span className="block text-sm font-bold tracking-tight text-[var(--text-primary)]">
                CASE University
              </span>

              <span className="block text-xs text-[var(--text-muted)]">
                Investing Academy
              </span>
            </span>
          </Link>

          <div className="my-auto max-w-2xl py-16">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--primary)]">
              Account recovery
            </p>

            <h1 className="mt-5 text-4xl font-bold tracking-tight text-[var(--text-primary)] xl:text-5xl xl:leading-[1.08]">
              Get back to your learning without losing your progress.
            </h1>

            <p className="mt-6 max-w-xl text-base leading-7 text-[var(--text-secondary)] xl:text-lg xl:leading-8">
              Request a secure password reset link for your CASE account.
            </p>
          </div>

          <p className="text-xs leading-5 text-[var(--text-muted)]">
            Password recovery links are time-limited and should only be used by the account owner.
          </p>
        </section>

        <section className="flex min-h-screen items-center justify-center px-4 py-8 sm:px-6 lg:px-10 xl:px-16">
          <div className="w-full max-w-md">
            <div className="mb-8 flex justify-center lg:hidden">
              <Link
                href="/"
                className="inline-flex items-center gap-3"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--primary)] text-sm font-bold text-[var(--primary-foreground)] shadow-[var(--shadow-primary)]">
                  CU
                </span>

                <span className="text-left">
                  <span className="block text-sm font-bold text-[var(--text-primary)]">
                    CASE University
                  </span>

                  <span className="block text-xs text-[var(--text-muted)]">
                    Investing Academy
                  </span>
                </span>
              </Link>
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--primary)]">
                Reset password
              </p>

              <h2 className="mt-3 text-3xl font-bold tracking-tight text-[var(--text-primary)] sm:text-4xl">
                Forgot your password?
              </h2>

              <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)] sm:text-base">
                Enter your email address and we&apos;ll send you a secure password reset link.
              </p>
            </div>

            <div className="mt-8 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-default)] p-5 shadow-[var(--shadow-md)] sm:p-6">
              <ForgotPasswordForm />
            </div>

            <p className="mt-6 text-center text-sm text-[var(--text-muted)]">
              Remember your password?{" "}
              <Link
                href="/auth/signin"
                className="font-semibold text-[var(--primary)] transition hover:text-[var(--primary-hover)]"
              >
                Return to sign in
              </Link>
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}