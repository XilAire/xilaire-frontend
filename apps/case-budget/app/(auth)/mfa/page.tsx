import {
  redirect,
} from "next/navigation";

import MfaChallengeForm from "@/components/auth/forms/MfaChallengeForm";
import MfaEnrollmentForm from "@/components/auth/mfa/MfaEnrollmentForm";

import {
  getMfaStatus,
} from "@/lib/auth/mfa-service";

const DEFAULT_AUTHENTICATED_ROUTE =
  "/dashboard";

const SIGN_IN_ROUTE =
  "/sign-in";

type MfaPageProps = {
  searchParams:
    Promise<{
      redirectTo?:
        string;

      next?:
        string;
    }>;
};

export default async function MfaPage({
  searchParams,
}: MfaPageProps) {
  const resolvedSearchParams =
    await searchParams;

  const requestedPath =
    getSafeNextPath(
      resolvedSearchParams.redirectTo ??
        resolvedSearchParams.next ??
        null,
    ) ??
    DEFAULT_AUTHENTICATED_ROUTE;

  const statusResult =
    await getMfaStatus();

  if (
    !statusResult.success
  ) {
    if (
      statusResult.error.code ===
      "not_authenticated"
    ) {
      redirect(
        buildSignInHref(
          requestedPath,
        ),
      );
    }

    return (
      <MfaErrorPage
        message={
          statusResult.error.message
        }
      />
    );
  }

  const status =
    statusResult.data;

  if (
    status.isAal2
  ) {
    redirect(
      requestedPath,
    );
  }

  if (
    !status.hasVerifiedFactor
  ) {
    return (
      <MfaPageShell>
        <MfaEnrollmentForm />
      </MfaPageShell>
    );
  }

  const factor =
    status.verifiedFactors[0];

  if (
    !factor
  ) {
    return (
      <MfaErrorPage
        message="CASE Budget could not determine which authenticator should be used."
      />
    );
  }

  return (
    <MfaPageShell>
      <MfaChallengeForm
        factorId={
          factor.id
        }
        friendlyName={
          factor.friendlyName
        }
        redirectTo={
          requestedPath
        }
      />
    </MfaPageShell>
  );
}

function MfaPageShell({
  children,
}: {
  children:
    React.ReactNode;
}) {
  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--text-primary)]">
      <div className="flex min-h-screen items-center justify-center px-4 py-8 sm:px-6 lg:px-8">
        <div className="w-full max-w-lg">
          <div className="rounded-3xl border border-[var(--border-subtle)] bg-[var(--surface-default)] p-5 shadow-xl shadow-black/5 sm:p-8">
            {children}
          </div>
        </div>
      </div>
    </main>
  );
}

function MfaErrorPage({
  message,
}: {
  message:
    string;
}) {
  return (
    <MfaPageShell>
      <section className="space-y-6">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--danger)]">
            Security verification
          </p>

          <h1 className="mt-3 text-2xl font-bold tracking-tight text-[var(--text-primary)]">
            We could not load MFA
          </h1>

          <p className="mt-3 text-sm leading-6 text-[var(--text-muted)]">
            {message}
          </p>
        </div>

        <a
          href="/dashboard"
          className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-[var(--primary)] px-5 text-sm font-bold text-white outline-none transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2"
        >
          Return to dashboard
        </a>
      </section>
    </MfaPageShell>
  );
}

function buildSignInHref(
  redirectTo:
    string,
) {
  if (
    redirectTo ===
    DEFAULT_AUTHENTICATED_ROUTE
  ) {
    return SIGN_IN_ROUTE;
  }

  const searchParams =
    new URLSearchParams();

  searchParams.set(
    "redirectTo",
    buildMfaHref(
      redirectTo,
    ),
  );

  return `${SIGN_IN_ROUTE}?${searchParams.toString()}`;
}

function buildMfaHref(
  redirectTo:
    string,
) {
  if (
    redirectTo ===
    DEFAULT_AUTHENTICATED_ROUTE
  ) {
    return "/mfa";
  }

  const searchParams =
    new URLSearchParams();

  searchParams.set(
    "redirectTo",
    redirectTo,
  );

  return `/mfa?${searchParams.toString()}`;
}

function getSafeNextPath(
  value:
    string | null,
) {
  if (
    !value
  ) {
    return null;
  }

  const normalizedValue =
    value.trim();

  if (
    !normalizedValue ||
    !normalizedValue.startsWith(
      "/",
    ) ||
    normalizedValue.startsWith(
      "//",
    ) ||
    normalizedValue.includes(
      "\\",
    )
  ) {
    return null;
  }

  try {
    const parsedUrl =
      new URL(
        normalizedValue,
        "http://case-budget.local",
      );

    if (
      parsedUrl.origin !==
      "http://case-budget.local"
    ) {
      return null;
    }

    if (
      parsedUrl.pathname ===
      "/sign-in" ||
      parsedUrl.pathname ===
      "/sign-up" ||
      parsedUrl.pathname ===
      "/mfa"
    ) {
      return DEFAULT_AUTHENTICATED_ROUTE;
    }

    return `${parsedUrl.pathname}${parsedUrl.search}`;
  } catch {
    return null;
  }
}