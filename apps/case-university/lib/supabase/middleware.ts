import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  createServerClient,
} from "@supabase/ssr";

type SupabaseCookieOptions = {
  domain?: string;
  encode?: (
    value: string,
  ) => string;
  expires?: Date;
  httpOnly?: boolean;
  maxAge?: number;
  partitioned?: boolean;
  path?: string;
  priority?:
    | "low"
    | "medium"
    | "high";
  sameSite?:
    | boolean
    | "lax"
    | "strict"
    | "none";
  secure?: boolean;
};

type SupabaseCookie = {
  name: string;
  value: string;
  options?: SupabaseCookieOptions;
};

export async function updateSession(
  request: NextRequest,
) {
  let response =
    NextResponse.next({
      request,
    });

  const supabase =
    createServerClient(
      process.env
        .NEXT_PUBLIC_SUPABASE_URL_CASE_UNIVERSITY!,
      process.env
        .NEXT_PUBLIC_SUPABASE_ANON_KEY_CASE_UNIVERSITY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },

          setAll(
            cookiesToSet: SupabaseCookie[],
          ) {
            cookiesToSet.forEach(
              ({
                name,
                value,
              }) => {
                request.cookies.set(
                  name,
                  value,
                );
              },
            );

            response =
              NextResponse.next({
                request,
              });

            cookiesToSet.forEach(
              ({
                name,
                value,
                options,
              }) => {
                response.cookies.set(
                  name,
                  value,
                  options,
                );
              },
            );
          },
        },
      },
    );

  const {
    data: {
      user,
    },
  } =
    await supabase.auth.getUser();

  const pathname =
    request.nextUrl.pathname;

  const isPublicRoute =
    pathname === "/" ||
    pathname.startsWith(
      "/auth",
    ) ||
    pathname.startsWith(
      "/about",
    ) ||
    pathname.startsWith(
      "/pricing",
    ) ||
    pathname.startsWith(
      "/courses",
    ) ||
    pathname.startsWith(
      "/verify",
    ) ||
    pathname.startsWith(
      "/legal",
    ) ||
    pathname.startsWith(
      "/api",
    ) ||
    pathname.startsWith(
      "/_next",
    ) ||
    pathname ===
      "/favicon.ico";

  if (
    !user &&
    !isPublicRoute
  ) {
    const redirectUrl =
      request.nextUrl.clone();

    redirectUrl.pathname =
      "/auth/signin";

    redirectUrl.searchParams.set(
      "redirect",
      `${pathname}${request.nextUrl.search}`,
    );

    return NextResponse.redirect(
      redirectUrl,
    );
  }

  return response;
}