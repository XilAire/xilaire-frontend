import {
  createServerClient,
  type CookieOptions,
} from "@supabase/ssr";

import {
  NextResponse,
  type NextRequest,
} from "next/server";

const SUPABASE_URL_ENV_NAME =
  "NEXT_PUBLIC_SUPABASE_URL_CASE_BUDGET";

const SUPABASE_PUBLISHABLE_KEY_ENV_NAME =
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY_CASE_BUDGET";

const ACTIVE_WORKSPACE_COOKIE_NAME =
  "case-budget-active-workspace-id";

const SIGN_IN_PATH =
  "/sign-in";

const SIGN_UP_PATH =
  "/sign-up";

const MFA_PATH =
  "/mfa";

const DASHBOARD_PATH =
  "/dashboard";

const AUTHENTICATED_REDIRECT_PATHS =
  new Set([
    SIGN_IN_PATH,
    SIGN_UP_PATH,
  ]);

type CookieToSet = {
  name:
    string;

  value:
    string;

  options:
    CookieOptions;
};

function getSupabaseEnvironment() {
  const supabaseUrl =
    process.env[
      SUPABASE_URL_ENV_NAME
    ]?.trim();

  const supabasePublishableKey =
    process.env[
      SUPABASE_PUBLISHABLE_KEY_ENV_NAME
    ]?.trim();

  if (
    !supabaseUrl
  ) {
    throw new Error(
      `Missing ${SUPABASE_URL_ENV_NAME} environment variable.`,
    );
  }

  if (
    !supabasePublishableKey
  ) {
    throw new Error(
      `Missing ${SUPABASE_PUBLISHABLE_KEY_ENV_NAME} environment variable.`,
    );
  }

  return {
    supabaseUrl,
    supabasePublishableKey,
  };
}

/**
 * Refreshes the CASE Budget Supabase authentication session and protects
 * authenticated application routes.
 *
 * The proxy calls this helper for matched requests. Supabase may refresh the
 * access or refresh token while validating the current session, so refreshed
 * cookies must be copied to both:
 *
 * - the forwarded request, so Server Components and Route Handlers receive the
 *   latest session during the current request;
 * - the response, so the browser stores the refreshed session for later
 *   requests.
 *
 * Route behavior:
 *
 * - Signed-out users requesting /dashboard or any nested dashboard route are
 *   redirected to /sign-in.
 * - The requested dashboard URL is retained in the redirectTo query parameter.
 * - Signed-in users requesting /sign-in or /sign-up are redirected according
 *   to their MFA assurance state.
 * - Signed-in users with a verified MFA factor cannot access /dashboard with
 *   only an AAL1 session.
 * - AAL1 users whose next required assurance level is AAL2 are redirected to
 *   /mfa before accessing protected dashboard routes.
 * - /mfa is explicitly allowed while an AAL2 challenge is required.
 * - Users who no longer need an MFA challenge are redirected away from /mfa.
 * - API routes are not redirected. Their Route Handlers remain responsible for
 *   returning JSON authorization errors.
 * - Redirect-based route protection is applied only to GET/HEAD navigation
 *   requests. POST requests, including Next.js Server Actions, are allowed to
 *   continue so the Next.js Server Action response protocol is not replaced by
 *   an HTML/redirect response from the proxy.
 *
 * The active workspace cookie is not modified by this helper.
 */
export async function updateSession(
  request:
    NextRequest,
) {
  const {
    supabaseUrl,
    supabasePublishableKey,
  } =
    getSupabaseEnvironment();

  let supabaseResponse =
    createNextResponse(
      request,
    );

  const supabase =
    createServerClient(
      supabaseUrl,
      supabasePublishableKey,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },

          setAll(
            cookiesToSet,
          ) {
            const normalizedCookies =
              normalizeCookiesToSet(
                cookiesToSet,
              );

            for (
              const cookie of normalizedCookies
            ) {
              request.cookies.set(
                cookie.name,
                cookie.value,
              );
            }

            supabaseResponse =
              createNextResponse(
                request,
              );

            for (
              const cookie of normalizedCookies
            ) {
              supabaseResponse.cookies.set(
                cookie.name,
                cookie.value,
                normalizeCookieOptions(
                  cookie.options,
                ),
              );
            }
          },
        },
      },
    );

  /**
   * Validate the current access token and allow Supabase to refresh the
   * authentication cookies when required.
   *
   * Keep this call immediately after client creation. Adding unrelated logic
   * between createServerClient() and getClaims() can lead to difficult session
   * refresh problems.
   */
  const {
    data,
    error,
  } =
    await supabase.auth.getClaims();

  const pathname =
    request.nextUrl.pathname;

  const normalizedPathname =
    normalizePathname(
      pathname,
    );

  const isAuthenticated =
    Boolean(
      data?.claims?.sub,
    );

  const isProtectedRoute =
    isDashboardRoute(
      pathname,
    );

  const isMfaRoute =
    isPathOrDescendant(
      pathname,
      MFA_PATH,
    );

  const isApiRoute =
    isPathOrDescendant(
      pathname,
      "/api",
    );

  /**
   * Only GET/HEAD requests represent page navigation that this proxy should
   * redirect.
   *
   * Next.js Server Actions are POST requests. Redirecting those requests from
   * the proxy can replace the special Server Action response with a normal
   * redirect/page response, which causes the browser to throw:
   *
   *   "An unexpected response was received from the server."
   *
   * We still validate/refresh the Supabase session for POST requests; we simply
   * allow the application/Server Action itself to own authorization and
   * redirects for those requests.
   */
  const isNavigationRequest =
    request.method ===
      "GET" ||
    request.method ===
      "HEAD";

  if (
    error &&
    process.env.NODE_ENV !==
      "production"
  ) {
    console.error(
      "[CASE Budget Supabase Proxy] getClaims() failed.",
      {
        name:
          error.name,

        message:
          error.message,

        status:
          error.status,

        code:
          readAuthErrorCode(
            error,
          ),

        projectReference:
          getSupabaseProjectReference(
            supabaseUrl,
          ),

        pathname,

        relevantCookieNames:
          request.cookies
            .getAll()
            .map(
              (
                cookie,
              ) =>
                cookie.name,
            )
            .filter(
              (
                cookieName,
              ) =>
                cookieName.startsWith(
                  "sb-",
                ) ||
                cookieName ===
                  ACTIVE_WORKSPACE_COOKIE_NAME,
            ),
      },
    );
  }

  /**
   * Protect dashboard routes before attempting MFA inspection.
   *
   * An unauthenticated user has no meaningful assurance level to inspect.
   */
  if (
    isNavigationRequest &&
    isProtectedRoute &&
    !isAuthenticated
  ) {
    return redirectToSignIn({
      request,

      sourceResponse:
        supabaseResponse,

      redirectTo:
        getRequestedDestination(
          request,
        ),
    });
  }

  /**
   * /mfa itself requires an authenticated AAL1 session.
   *
   * Without an authenticated session there is no factor/challenge context
   * available to verify.
   */
  if (
    isNavigationRequest &&
    isMfaRoute &&
    !isAuthenticated
  ) {
    const requestedDestination =
      getSafePostAuthenticationDestination(
        request.nextUrl.searchParams.get(
          "redirectTo",
        ),
      );

    return redirectToSignIn({
      request,

      sourceResponse:
        supabaseResponse,

      redirectTo:
        `${requestedDestination.pathname}${requestedDestination.search}`,
    });
  }

  let currentAssuranceLevel:
    string | null =
      null;

  let nextAssuranceLevel:
    string | null =
      null;

  let requiresMfaChallenge =
    false;

  /**
   * Only inspect the assurance level when authentication exists and routing
   * decisions may depend on MFA.
   *
   * Supabase's MFA assurance result tells us both:
   *
   * currentLevel:
   *   The assurance level of the current authenticated session.
   *
   * nextLevel:
   *   The highest assurance level this user can obtain based on their
   *   enrolled/verified factors.
   *
   * Therefore:
   *
   * currentLevel = aal1
   * nextLevel    = aal2
   *
   * means a verified MFA factor exists and the current session still needs
   * an MFA challenge.
   */
  if (
    isNavigationRequest &&
    isAuthenticated &&
    (
      isProtectedRoute ||
      isMfaRoute ||
      AUTHENTICATED_REDIRECT_PATHS.has(
        normalizedPathname,
      )
    )
  ) {
    const {
      data:
        assuranceData,
      error:
        assuranceError,
    } =
      await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

    if (
      assuranceError
    ) {
      if (
        process.env.NODE_ENV !==
        "production"
      ) {
        console.error(
          "[CASE Budget Supabase Proxy] getAuthenticatorAssuranceLevel() failed.",
          {
            name:
              assuranceError.name,

            message:
              assuranceError.message,

            status:
              assuranceError.status,

            code:
              readAuthErrorCode(
                assuranceError,
              ),

            pathname,

            userId:
              data?.claims?.sub ??
              null,
          },
        );
      }

      /**
       * Fail closed for protected application routes.
       *
       * If an authenticated dashboard request cannot determine its MFA state,
       * route the user through the MFA decision page rather than silently
       * allowing an AAL1 session into protected financial pages.
       *
       * Do not redirect /mfa back to itself if the assurance lookup fails.
       */
      if (
        isNavigationRequest &&
        isProtectedRoute &&
        !isApiRoute
      ) {
        return redirectToMfa({
          request,

          sourceResponse:
            supabaseResponse,

          redirectTo:
            getRequestedDestination(
              request,
            ),
        });
      }
    } else {
      currentAssuranceLevel =
        assuranceData?.currentLevel ??
        null;

      nextAssuranceLevel =
        assuranceData?.nextLevel ??
        null;

      requiresMfaChallenge =
        currentAssuranceLevel ===
          "aal1" &&
        nextAssuranceLevel ===
          "aal2";

      if (
        process.env.NODE_ENV !==
        "production"
      ) {
        console.debug(
          "[CASE Budget Supabase Proxy] MFA assurance state.",
          {
            pathname,

            userId:
              data?.claims?.sub ??
              null,

            currentLevel:
              currentAssuranceLevel,

            nextLevel:
              nextAssuranceLevel,

            requiresMfaChallenge,
          },
        );
      }
    }
  }

  /**
   * Enforce MFA on protected dashboard routes.
   *
   * This is the server-side protection that prevents an authenticated user
   * from bypassing the SignInForm MFA redirect by manually navigating to a
   * dashboard URL while their session remains AAL1.
   */
  if (
    isNavigationRequest &&
    isProtectedRoute &&
    isAuthenticated &&
    requiresMfaChallenge &&
    !isApiRoute
  ) {
    return redirectToMfa({
      request,

      sourceResponse:
        supabaseResponse,

      redirectTo:
        getRequestedDestination(
          request,
        ),
    });
  }

  /**
   * Handle the MFA route itself.
   *
   * The route should remain available only while the authenticated user needs
   * to elevate from AAL1 to AAL2.
   *
   * If:
   *
   * - the user has no verified MFA factor, or
   * - the session has already reached AAL2,
   *
   * there is no challenge to complete, so continue to the safe destination.
   */
  if (
    isNavigationRequest &&
    isMfaRoute &&
    isAuthenticated &&
    !requiresMfaChallenge
  ) {
    const redirectTo =
      getSafePostAuthenticationDestination(
        request.nextUrl.searchParams.get(
          "redirectTo",
        ),
      );

    const destinationUrl =
      request.nextUrl.clone();

    destinationUrl.pathname =
      redirectTo.pathname;

    destinationUrl.search =
      redirectTo.search;

    destinationUrl.hash =
      "";

    return createRedirectResponse({
      destination:
        destinationUrl,

      sourceResponse:
        supabaseResponse,
    });
  }

  /**
   * Signed-in users should not remain on sign-in/sign-up.
   *
   * If their account requires MFA and the current session is only AAL1, route
   * them to /mfa first. Otherwise continue to the requested dashboard
   * destination.
   */
  if (
    isNavigationRequest &&
    !isApiRoute &&
    isAuthenticated &&
    AUTHENTICATED_REDIRECT_PATHS.has(
      normalizedPathname,
    )
  ) {
    const redirectTo =
      getSafePostAuthenticationDestination(
        request.nextUrl.searchParams.get(
          "redirectTo",
        ),
      );

    const requestedDestination =
      `${redirectTo.pathname}${redirectTo.search}`;

    if (
      requiresMfaChallenge
    ) {
      return redirectToMfa({
        request,

        sourceResponse:
          supabaseResponse,

        redirectTo:
          requestedDestination,
      });
    }

    const dashboardUrl =
      request.nextUrl.clone();

    dashboardUrl.pathname =
      redirectTo.pathname;

    dashboardUrl.search =
      redirectTo.search;

    dashboardUrl.hash =
      "";

    return createRedirectResponse({
      destination:
        dashboardUrl,

      sourceResponse:
        supabaseResponse,
    });
  }

  /**
   * Always return this response when no navigation redirect was required.
   *
   * This is especially important for POST requests / Next.js Server Actions:
   * NextResponse.next() lets the request continue through Next.js while still
   * preserving any authentication cookies refreshed by Supabase.
   */
  return supabaseResponse;
}

function redirectToSignIn({
  request,
  sourceResponse,
  redirectTo,
}: {
  request:
    NextRequest;

  sourceResponse:
    NextResponse;

  redirectTo:
    string;
}) {
  const signInUrl =
    request.nextUrl.clone();

  signInUrl.pathname =
    SIGN_IN_PATH;

  signInUrl.search =
    "";

  signInUrl.hash =
    "";

  signInUrl.searchParams.set(
    "redirectTo",
    getSafeRedirectPath(
      redirectTo,
    ),
  );

  return createRedirectResponse({
    destination:
      signInUrl,

    sourceResponse,
  });
}

function redirectToMfa({
  request,
  sourceResponse,
  redirectTo,
}: {
  request:
    NextRequest;

  sourceResponse:
    NextResponse;

  redirectTo:
    string;
}) {
  const mfaUrl =
    request.nextUrl.clone();

  mfaUrl.pathname =
    MFA_PATH;

  mfaUrl.search =
    "";

  mfaUrl.hash =
    "";

  mfaUrl.searchParams.set(
    "redirectTo",
    getSafeRedirectPath(
      redirectTo,
    ),
  );

  return createRedirectResponse({
    destination:
      mfaUrl,

    sourceResponse,
  });
}

function createNextResponse(
  request:
    NextRequest,
) {
  return NextResponse.next({
    request: {
      headers:
        request.headers,
    },
  });
}

function createRedirectResponse({
  destination,
  sourceResponse,
}: {
  destination:
    URL;

  sourceResponse:
    NextResponse;
}) {
  const redirectResponse =
    NextResponse.redirect(
      destination,
    );

  for (
    const cookie of
    sourceResponse.cookies.getAll()
  ) {
    redirectResponse.cookies.set(
      cookie,
    );
  }

  copyResponseHeaders({
    source:
      sourceResponse,

    destination:
      redirectResponse,
  });

  return redirectResponse;
}

function copyResponseHeaders({
  source,
  destination,
}: {
  source:
    NextResponse;

  destination:
    NextResponse;
}) {
  for (
    const [
      headerName,
      headerValue,
    ] of source.headers.entries()
  ) {
    const normalizedHeaderName =
      headerName.toLowerCase();

    if (
      normalizedHeaderName ===
        "location" ||
      normalizedHeaderName ===
        "set-cookie"
    ) {
      continue;
    }

    destination.headers.set(
      headerName,
      headerValue,
    );
  }
}

function isDashboardRoute(
  pathname:
    string,
) {
  return isPathOrDescendant(
    pathname,
    DASHBOARD_PATH,
  );
}

function isPathOrDescendant(
  pathname:
    string,
  basePath:
    string,
) {
  const normalizedPathname =
    normalizePathname(
      pathname,
    );

  const normalizedBasePath =
    normalizePathname(
      basePath,
    );

  return (
    normalizedPathname ===
      normalizedBasePath ||
    normalizedPathname.startsWith(
      `${normalizedBasePath}/`,
    )
  );
}

function normalizePathname(
  pathname:
    string,
) {
  if (
    pathname.length >
      1 &&
    pathname.endsWith(
      "/",
    )
  ) {
    return pathname.replace(
      /\/+$/,
      "",
    );
  }

  return pathname ||
    "/";
}

function getRequestedDestination(
  request:
    NextRequest,
) {
  const pathname =
    normalizePathname(
      request.nextUrl.pathname,
    );

  const search =
    request.nextUrl.search;

  return `${pathname}${search}`;
}

function getSafeRedirectPath(
  redirectTo:
    string | null,
) {
  const destination =
    getSafePostAuthenticationDestination(
      redirectTo,
    );

  return `${destination.pathname}${destination.search}`;
}

function getSafePostAuthenticationDestination(
  redirectTo:
    string | null,
) {
  const fallback = {
    pathname:
      DASHBOARD_PATH,

    search:
      "",
  };

  if (
    !redirectTo
  ) {
    return fallback;
  }

  const normalizedRedirectTo =
    redirectTo.trim();

  if (
    !normalizedRedirectTo.startsWith(
      "/",
    ) ||
    normalizedRedirectTo.startsWith(
      "//",
    )
  ) {
    return fallback;
  }

  try {
    const parsedUrl =
      new URL(
        normalizedRedirectTo,
        "http://case-budget.local",
      );

    if (
      !isDashboardRoute(
        parsedUrl.pathname,
      )
    ) {
      return fallback;
    }

    return {
      pathname:
        normalizePathname(
          parsedUrl.pathname,
        ),

      search:
        parsedUrl.search,
    };
  } catch {
    return fallback;
  }
}

function normalizeCookiesToSet(
  cookiesToSet:
    {
      name:
        string;

      value:
        string;

      options:
        CookieOptions;
    }[],
): CookieToSet[] {
  return cookiesToSet.map(
    (
      cookie,
    ) => ({
      name:
        cookie.name,

      value:
        cookie.value,

      options:
        cookie.options,
    }),
  );
}

function normalizeCookieOptions(
  options:
    CookieOptions,
) {
  return {
    ...options,

    sameSite:
      normalizeSameSite(
        options.sameSite,
      ),
  };
}

function normalizeSameSite(
  sameSite:
    CookieOptions["sameSite"],
):
  | "lax"
  | "strict"
  | "none"
  | boolean
  | undefined {
  if (
    sameSite ===
      "lax" ||
    sameSite ===
      "strict" ||
    sameSite ===
      "none" ||
    typeof sameSite ===
      "boolean"
  ) {
    return sameSite;
  }

  return undefined;
}

function readAuthErrorCode(
  error:
    {
      code?:
        unknown;
    },
) {
  return typeof error.code ===
    "string"
    ? error.code
    : null;
}

function getSupabaseProjectReference(
  supabaseUrl:
    string,
) {
  try {
    const parsedUrl =
      new URL(
        supabaseUrl,
      );

    return parsedUrl.hostname.split(
      ".",
    )[0] ??
      null;
  } catch {
    return null;
  }
}