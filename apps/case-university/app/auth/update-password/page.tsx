import Link from "next/link";
import { redirect } from "next/navigation";

import UpdatePasswordForm from "@/components/auth/UpdatePasswordForm";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function UpdatePasswordPage() {
  const supabase =
    await createSupabaseServerClient();

  const {
    data: {
      user,
    },
  } =
    await supabase.auth.getUser();

  /*
   * A valid password-recovery link must first pass
   * through /auth/callback so Supabase can establish
   * the recovery session.
   *
   * If no user session exists here, the recovery
   * link was not completed correctly, expired, or
   * the session is otherwise unavailable.
   */
  if (!user) {
    redirect(
      "/auth/forgot-password?error=recovery_session_required",
    );
  }

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
              Account security
            </p>

            <h1 className="mt-5 text-4xl font-bold tracking-tight text-[var(--text-primary)] xl:text-5xl xl:leading-[1.08]">
              Create a new password for your CASE account.
            </h1>

            <p className="mt-6 max-w-xl text-base leading-7 text-[var(--text-secondary)] xl:text-lg xl:leading-8">
              Choose a strong password you have not used before. Your new
              password will be used with your shared CASE account.
            </p>

            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              <SecurityItem
                number="01"
                title="Unique"
                description="Use a password you do not use elsewhere."
              />

              <SecurityItem
                number="02"
                title="Strong"
                description="Use a longer password with varied characters."
              />

              <SecurityItem
                number="03"
                title="Private"
                description="Never share your CASE account password."
              />
            </div>
          </div>

          <div className="max-w-xl">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 text-[var(--primary)]">
                <ShieldIcon />
              </div>

              <p className="text-xs leading-5 text-[var(--text-muted)]">
                CASE University will never ask you to send your password by
                email, chat, or support message.
              </p>
            </div>
          </div>
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
                Secure your account
              </p>

              <h2 className="mt-3 text-3xl font-bold tracking-tight text-[var(--text-primary)] sm:text-4xl">
                Set a new password
              </h2>

              <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)] sm:text-base">
                Enter and confirm your new CASE account password.
              </p>
            </div>

            <div className="mt-8 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-default)] p-5 shadow-[var(--shadow-md)] sm:p-6">
              <UpdatePasswordForm />
            </div>

            <p className="mt-6 text-center text-sm text-[var(--text-muted)]">
              Need to start over?{" "}
              <Link
                href="/auth/forgot-password"
                className="font-semibold text-[var(--primary)] transition hover:text-[var(--primary-hover)]"
              >
                Request another reset link
              </Link>
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}

function SecurityItem({
  number,
  title,
  description,
}: {
  number:
    string;

  title:
    string;

  description:
    string;
}) {
  return (
    <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-default)] p-5 shadow-[var(--shadow-xs)]">
      <p className="text-xs font-bold text-[var(--primary)]">
        {number}
      </p>

      <h2 className="mt-4 text-sm font-bold text-[var(--text-primary)]">
        {title}
      </h2>

      <p className="mt-2 text-xs leading-5 text-[var(--text-muted)]">
        {description}
      </p>
    </div>
  );
}

function ShieldIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 3l7 3v5c0 4.8-2.8 8.1-7 10-4.2-1.9-7-5.2-7-10V6l7-3z"
      />

      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9.5 12l1.6 1.6L14.8 10"
      />
    </svg>
  );
}