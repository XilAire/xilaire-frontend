import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  createSupabaseServerClient,
} from "@/lib/supabase/server";

const DEFAULT_POST_AUTH_PATH =
  "/dashboard";

function getSafeInternalPath(
  value: string | null,
  origin: string,
): string {
  const candidate =
    value?.trim();

  if (
    !candidate ||
    !candidate.startsWith("/") ||
    candidate.startsWith("//") ||
    candidate.includes("\\")
  ) {
    return DEFAULT_POST_AUTH_PATH;
  }

  try {
    const parsed =
      new URL(
        candidate,
        origin,
      );

    if (
      parsed.origin !== origin
    ) {
      return DEFAULT_POST_AUTH_PATH;
    }

    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return DEFAULT_POST_AUTH_PATH;
  }
}

function getRequestedPostAuthPath(
  requestUrl: URL,
): string {
  /*
   * Registration currently uses ?redirect=...
   * while password recovery and older auth flows
   * may use ?next=....
   *
   * Support both so existing links continue to work.
   */
  const requestedPath =
    requestUrl.searchParams.get(
      "redirect",
    ) ??
    requestUrl.searchParams.get(
      "next",
    );

  return getSafeInternalPath(
    requestedPath,
    requestUrl.origin,
  );
}

function buildSignInErrorRedirect(
  requestUrl: URL,
  errorCode: string,
  postAuthPath: string,
) {
  const redirectUrl =
    new URL(
      "/auth/signin",
      requestUrl.origin,
    );

  redirectUrl.searchParams.set(
    "error",
    errorCode,
  );

  /*
   * Preserve the user's original internal destination so a
   * paid-plan selection is not lost if they must sign in again.
   */
  if (
    postAuthPath !==
    DEFAULT_POST_AUTH_PATH
  ) {
    redirectUrl.searchParams.set(
      "redirect",
      postAuthPath,
    );
  }

  return redirectUrl;
}

export async function GET(
  request: NextRequest,
) {
  const requestUrl =
    new URL(
      request.url,
    );

  const code =
    requestUrl.searchParams.get(
      "code",
    );

  const postAuthPath =
    getRequestedPostAuthPath(
      requestUrl,
    );

  const errorCode =
    requestUrl.searchParams.get(
      "error_code",
    );

  const errorDescription =
    requestUrl.searchParams.get(
      "error_description",
    );

  /*
   * Supabase may redirect back with an explicit
   * authentication error when a link is invalid,
   * expired, or has already been used.
   */
  if (
    errorCode ||
    errorDescription
  ) {
    console.error(
      "CASE University authentication callback returned an error",
      {
        errorCode,
        errorDescription,
      },
    );

    return NextResponse.redirect(
      buildSignInErrorRedirect(
        requestUrl,
        "auth_link_invalid",
        postAuthPath,
      ),
    );
  }

  /*
   * A valid PKCE authentication/recovery callback
   * must contain the authorization code generated
   * by Supabase.
   */
  if (
    !code
  ) {
    console.error(
      "CASE University authentication callback is missing a code.",
    );

    return NextResponse.redirect(
      buildSignInErrorRedirect(
        requestUrl,
        "auth_link_invalid",
        postAuthPath,
      ),
    );
  }

  try {
    const supabase =
      await createSupabaseServerClient();

    /*
     * Exchange the one-time PKCE authorization code
     * for the Supabase session.
     *
     * The server client writes the resulting auth
     * cookies during this route-handler request.
     */
    const {
      error,
    } =
      await supabase.auth.exchangeCodeForSession(
        code,
      );

    if (
      error
    ) {
      console.error(
        "CASE University could not exchange authentication code",
        {
          message:
            error.message,

          status:
            error.status,

          code:
            error.code,
        },
      );

      return NextResponse.redirect(
        buildSignInErrorRedirect(
          requestUrl,
          "auth_link_invalid",
          postAuthPath,
        ),
      );
    }

    /*
     * The session is now established.
     *
     * Registration links can use:
     *
     * /auth/callback?redirect=/pricing?checkout_plan=...
     *
     * Password recovery and older auth flows can use:
     *
     * /auth/callback?next=/auth/update-password
     *
     * Only validated same-origin application paths are honored.
     */
    return NextResponse.redirect(
      new URL(
        postAuthPath,
        requestUrl.origin,
      ),
    );
  } catch (
    error
  ) {
    console.error(
      "Unexpected CASE University authentication callback error",
      error,
    );

    return NextResponse.redirect(
      buildSignInErrorRedirect(
        requestUrl,
        "auth_callback_failed",
        postAuthPath,
      ),
    );
  }
}
