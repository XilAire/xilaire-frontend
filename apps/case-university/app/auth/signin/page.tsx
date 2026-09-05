import Link from "next/link";

import SignInForm from "@/components/auth/SignInForm";

type SignInPageProps = {
  searchParams: Promise<{
    redirect?: string | string[];
    status?: string | string[];
    password?: string | string[];
    error?: string | string[];
  }>;
};

export default async function SignInPage({
  searchParams,
}: SignInPageProps) {
  const params =
    await searchParams;

  const requestedRedirect =
    getSingleSearchParam(
      params.redirect,
    );

  const status =
    getSingleSearchParam(
      params.status,
    );

  const passwordStatus =
    getSingleSearchParam(
      params.password,
    );

  const authError =
    getSingleSearchParam(
      params.error,
    );

  const redirectTo =
    isSafeRedirect(
      requestedRedirect,
    )
      ? requestedRedirect
      : "/dashboard";

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
              Learn with purpose
            </p>

            <h1 className="mt-5 text-4xl font-bold tracking-tight text-[var(--text-primary)] xl:text-5xl xl:leading-[1.08]">
              Build the knowledge behind better market decisions.
            </h1>

            <p className="mt-6 max-w-xl text-base leading-7 text-[var(--text-secondary)] xl:text-lg xl:leading-8">
              Continue your CASE University learning path through investing fundamentals, technical analysis, and options education.
            </p>

            <div className="mt-10 grid max-w-xl gap-3 sm:grid-cols-3">
              {[
                {
                  number:
                    "01",
                  title:
                    "Foundation",
                  text:
                    "Understand businesses and markets.",
                },
                {
                  number:
                    "02",
                  title:
                    "Analysis",
                  text:
                    "Learn structured market analysis.",
                },
                {
                  number:
                    "03",
                  title:
                    "Execution",
                  text:
                    "Apply strategy with risk awareness.",
                },
              ].map(
                (
                  item,
                ) => (
                  <div
                    key={
                      item.number
                    }
                    className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-default)] p-4 shadow-[var(--shadow-xs)]"
                  >
                    <span className="text-xs font-bold text-[var(--primary)]">
                      {
                        item.number
                      }
                    </span>

                    <p className="mt-3 text-sm font-bold text-[var(--text-primary)]">
                      {
                        item.title
                      }
                    </p>

                    <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">
                      {
                        item.text
                      }
                    </p>
                  </div>
                ),
              )}
            </div>
          </div>

          <p className="text-xs leading-5 text-[var(--text-muted)]">
            Educational content is provided for informational purposes and does not constitute personalized investment, tax, or legal advice.
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
                Welcome back
              </p>

              <h1 className="mt-3 text-3xl font-bold tracking-tight text-[var(--text-primary)] sm:text-4xl">
                Sign in
              </h1>

              <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)] sm:text-base">
                Sign in with your CASE account to continue your learning.
              </p>
            </div>

            <div className="mt-8 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-default)] p-5 shadow-[var(--shadow-md)] sm:p-6">
              <SignInForm
                redirectTo={
                  redirectTo
                }
                status={
                  status
                }
                passwordStatus={
                  passwordStatus
                }
                authErrorCode={
                  authError
                }
              />
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-center text-sm text-[var(--text-muted)]">
              <span>
                Looking for CASE University?
              </span>

              <Link
                href="/"
                className="font-semibold text-[var(--primary)] transition hover:text-[var(--primary-hover)]"
              >
                Return home
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function getSingleSearchParam(
  value:
    | string
    | string[]
    | undefined,
) {
  if (
    typeof value ===
    "string"
  ) {
    return value;
  }

  if (
    Array.isArray(
      value,
    )
  ) {
    return (
      value[0] ??
      null
    );
  }

  return null;
}

function isSafeRedirect(
  value:
    string | null,
): value is string {
  return Boolean(
    value &&
      value.startsWith(
        "/",
      ) &&
      !value.startsWith(
        "//",
      ),
  );
}