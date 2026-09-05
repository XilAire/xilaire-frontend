import Link from "next/link";
import { redirect } from "next/navigation";

import RecoveryContinueButton from "@/components/auth/RecoveryContinueButton";

type RecoveryConfirmPageProps = {
  searchParams:
    Promise<{
      token_hash?: string | string[];
    }>;
};

export default async function RecoveryConfirmPage({
  searchParams,
}: RecoveryConfirmPageProps) {
  const params =
    await searchParams;

  const tokenHash =
    getSingleValue(
      params.token_hash,
    );

  if (!tokenHash) {
    redirect(
      "/auth/signin?error=auth_link_invalid",
    );
  }

  return (
    <main
      className="
        min-h-screen
        bg-[var(--background)]
        px-4
        py-10
        sm:px-6
        lg:px-8
      "
    >
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-xl items-center">
        <section
          className="
            w-full
            rounded-3xl
            border
            border-[var(--border-subtle)]
            bg-[var(--surface-default)]
            p-6
            shadow-[var(--shadow-lg)]
            sm:p-8
          "
        >
          <div
            className="
              flex
              h-14
              w-14
              items-center
              justify-center
              rounded-2xl
              bg-[var(--primary-soft)]
              text-[var(--primary)]
            "
          >
            <ShieldIcon />
          </div>

          <p
            className="
              mt-6
              text-xs
              font-bold
              uppercase
              tracking-[0.16em]
              text-[var(--primary)]
            "
          >
            Secure account recovery
          </p>

          <h1
            className="
              mt-2
              text-3xl
              font-bold
              tracking-tight
              text-[var(--text-primary)]
            "
          >
            Continue your password reset
          </h1>

          <p
            className="
              mt-3
              text-sm
              leading-6
              text-[var(--text-secondary)]
              sm:text-base
            "
          >
            Your reset request is ready. Continue below to verify the secure recovery token and choose a new password.
          </p>

          <div
            className="
              mt-6
              rounded-2xl
              border
              border-[var(--border-subtle)]
              bg-[var(--surface-muted)]
              p-4
            "
          >
            <div className="flex items-start gap-3">
              <span className="mt-0.5 shrink-0 text-[var(--text-muted)]">
                <LockIcon />
              </span>

              <p
                className="
                  text-sm
                  leading-6
                  text-[var(--text-secondary)]
                "
              >
                For your security, the recovery token is not used until you explicitly continue from this page.
              </p>
            </div>
          </div>

          <div className="mt-7">
            <RecoveryContinueButton
              tokenHash={
                tokenHash
              }
            />
          </div>

          <div
            className="
              mt-6
              border-t
              border-[var(--border-subtle)]
              pt-5
            "
          >
            <p
              className="
                text-center
                text-sm
                text-[var(--text-muted)]
              "
            >
              Didn&apos;t request this reset?{" "}
              <Link
                href="/auth/signin"
                className="
                  font-semibold
                  text-[var(--primary)]
                  transition
                  hover:text-[var(--primary-hover)]
                "
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

function getSingleValue(
  value:
    string |
    string[] |
    undefined,
) {
  if (
    typeof value ===
    "string"
  ) {
    return value.trim() || null;
  }

  if (
    Array.isArray(
      value,
    )
  ) {
    const first =
      value[0];

    return first?.trim() || null;
  }

  return null;
}

function ShieldIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-7 w-7"
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

function LockIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <rect
        x="5"
        y="10"
        width="14"
        height="10"
        rx="2"
      />

      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8 10V7a4 4 0 018 0v3"
      />
    </svg>
  );
}