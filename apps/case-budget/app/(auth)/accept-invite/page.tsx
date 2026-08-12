import {
  redirect,
} from "next/navigation";

import AcceptInviteForm from "@/components/household/members/AcceptInviteForm";

import {
  requireCaseBudgetUser,
} from "@/lib/auth/server-auth";

export default async function AcceptInvitePage() {
  /*
   * The Supabase invitation link should establish an authenticated session
   * before the user reaches this page.
   *
   * requireCaseBudgetUser() ensures that only an authenticated invitee can
   * continue to the password creation step.
   */
  try {
    await requireCaseBudgetUser();
  } catch {
    redirect(
      "/sign-in",
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--surface-muted)] px-4 py-10 sm:px-6">
      <div className="w-full max-w-md">
        <div className="rounded-3xl border border-[var(--border-subtle)] bg-[var(--surface-default)] p-6 shadow-sm sm:p-8">
          <div className="mb-8 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[color-mix(in_srgb,var(--primary)_12%,transparent)] text-[var(--primary)]">
              <HouseholdIcon />
            </div>

            <p className="mt-5 text-xs font-bold uppercase tracking-[0.18em] text-[var(--primary)]">
              CASE Budget
            </p>

            <h1 className="mt-3 text-2xl font-bold tracking-tight text-[var(--text-primary)] sm:text-3xl">
              Finish setting up your account
            </h1>

            <p className="mt-3 text-sm leading-6 text-[var(--text-muted)]">
              You&apos;ve been invited to a household workspace. Create a
              password so you can securely sign back in to CASE Budget at any
              time.
            </p>
          </div>

          <AcceptInviteForm />
        </div>

        <p className="mt-6 text-center text-xs leading-5 text-[var(--text-muted)]">
          By continuing, you&apos;ll activate your household membership and
          gain access to the shared financial workspace.
        </p>
      </div>
    </main>
  );
}

function HouseholdIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-7 w-7"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3.75 10.5 12 3.75l8.25 6.75"
      />

      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M5.25 9.75v9a1.5 1.5 0 0 0 1.5 1.5h10.5a1.5 1.5 0 0 0 1.5-1.5v-9"
      />

      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9.75 20.25v-6h4.5v6"
      />
    </svg>
  );
}