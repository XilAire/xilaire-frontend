import { NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

type PendingCookie = {
  name: string;
  value: string;
  options?: CookieOptions;
};

export async function POST() {
  try {
    const cookieStore = await cookies();
    const pendingCookies: PendingCookie[] = [];

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL_PLATFORM!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY_PLATFORM!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll().map((cookie) => ({
              name: cookie.name,
              value: cookie.value,
            }));
          },
          setAll(cookieList) {
            cookieList.forEach((cookie) => {
              pendingCookies.push({
                name: cookie.name,
                value: cookie.value,
                options: cookie.options,
              });
            });
          },
        },
      }
    );

    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("AUTH_LOGOUT_ROUTE_ERROR:", error);

      const errorResponse = NextResponse.json(
        { error: error.message || "Failed to sign out." },
        { status: 500 }
      );

      for (const cookie of pendingCookies) {
        errorResponse.cookies.set(cookie.name, cookie.value, cookie.options);
      }

      return errorResponse;
    }

    const response = NextResponse.json(
      { message: "Signed out" },
      { status: 200 }
    );

    for (const cookie of pendingCookies) {
      response.cookies.set(cookie.name, cookie.value, cookie.options);
    }

    return response;
  } catch (error: any) {
    console.error("AUTH_LOGOUT_ROUTE_FATAL_ERROR:", error);

    return NextResponse.json(
      { error: error?.message || "Unexpected sign-out error." },
      { status: 500 }
    );
  }
}