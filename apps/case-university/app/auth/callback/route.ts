import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  createSupabaseServerClient,
} from "@/lib/supabase/server";

function getSafeNextPath(
  value: string | null,
) {
  if (
    !value ||
    !value.startsWith("/") ||
    value.startsWith("//")
  ) {
    return "/dashboard";
  }

  return value;
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

  const next =
    getSafeNextPath(
      requestUrl.searchParams.get(
        "next",
      ),
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

    const redirectUrl =
      new URL(
        "/auth/signin",
        requestUrl.origin,
      );

    redirectUrl.searchParams.set(
      "error",
      "auth_link_invalid",
    );

    return NextResponse.redirect(
      redirectUrl,
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

    const redirectUrl =
      new URL(
        "/auth/signin",
        requestUrl.origin,
      );

    redirectUrl.searchParams.set(
      "error",
      "auth_link_invalid",
    );

    return NextResponse.redirect(
      redirectUrl,
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

      const redirectUrl =
        new URL(
          "/auth/signin",
          requestUrl.origin,
        );

      redirectUrl.searchParams.set(
        "error",
        "auth_link_invalid",
      );

      return NextResponse.redirect(
        redirectUrl,
      );
    }

    /*
     * The session is now established.
     *
     * Password-recovery links should supply:
     *
     * /auth/callback?next=/auth/update-password
     *
     * Other future authentication flows can safely
     * provide another internal application path.
     */
    return NextResponse.redirect(
      new URL(
        next,
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

    const redirectUrl =
      new URL(
        "/auth/signin",
        requestUrl.origin,
      );

    redirectUrl.searchParams.set(
      "error",
      "auth_callback_failed",
    );

    return NextResponse.redirect(
      redirectUrl,
    );
  }
}