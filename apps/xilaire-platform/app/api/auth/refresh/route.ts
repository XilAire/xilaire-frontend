import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE = {
  "Cache-Control": "no-store, no-cache, must-revalidate",
};

export async function GET(req: NextRequest) {
  const pendingCookies: Array<{
    name: string;
    value: string;
    options: Parameters<NextResponse["cookies"]["set"]>[2];
  }> = [];

  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL_PLATFORM!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY_PLATFORM!,
      {
        cookies: {
          getAll() {
            return req.cookies.getAll();
          },
          setAll(cookiesToSet) {
            for (const cookie of cookiesToSet) {
              pendingCookies.push({
                name: cookie.name,
                value: cookie.value,
                options: cookie.options,
              });
            }
          },
        },
      }
    );

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    const response = NextResponse.json(
      error || !user
        ? { ok: false, error: "UNAUTHENTICATED" }
        : { ok: true },
      {
        status: error || !user ? 401 : 200,
        headers: NO_STORE,
      }
    );

    for (const cookie of pendingCookies) {
      response.cookies.set(cookie.name, cookie.value, cookie.options);
    }

    return response;
  } catch {
    return NextResponse.json(
      { ok: false, error: "SESSION_REFRESH_FAILED" },
      { status: 500, headers: NO_STORE }
    );
  }
}
