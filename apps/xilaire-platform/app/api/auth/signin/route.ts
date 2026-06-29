import { NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL_PLATFORM!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY_PLATFORM!;

if (!SUPABASE_URL) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL_PLATFORM");
}

if (!SUPABASE_ANON_KEY) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_ANON_KEY_PLATFORM");
}

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0",
};

type PendingCookie = {
  name: string;
  value: string;
  options?: CookieOptions;
};

type SignInBody = {
  email?: unknown;
  password?: unknown;
};

function parseCookies(cookieHeader: string | null) {
  if (!cookieHeader) return [];

  return cookieHeader
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const eqIndex = part.indexOf("=");

      if (eqIndex === -1) {
        return {
          name: part,
          value: "",
        };
      }

      const name = part.slice(0, eqIndex).trim();
      const value = part.slice(eqIndex + 1).trim();

      return {
        name,
        value: decodeURIComponent(value),
      };
    });
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as SignInBody | null;

    const email = String(body?.email || "").trim().toLowerCase();
    const password = String(body?.password || "");

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required." },
        { status: 400, headers: NO_STORE_HEADERS }
      );
    }

    const pendingCookies: PendingCookie[] = [];

    const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      cookies: {
        getAll() {
          return parseCookies(req.headers.get("cookie"));
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
    });

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return NextResponse.json(
        { error: error.message || "Failed to sign in." },
        { status: 400, headers: NO_STORE_HEADERS }
      );
    }

    if (!data.session) {
      return NextResponse.json(
        { error: "Sign-in succeeded, but no session was returned." },
        { status: 500, headers: NO_STORE_HEADERS }
      );
    }

    const response = NextResponse.json(
      {
        message: "Signed in",
        user: data.user
          ? {
              id: data.user.id,
              email: data.user.email,
              aud: data.user.aud,
              role: data.user.role,
            }
          : null,
        session: {
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
          expires_at: data.session.expires_at,
          expires_in: data.session.expires_in,
          token_type: data.session.token_type,
        },
      },
      {
        status: 200,
        headers: NO_STORE_HEADERS,
      }
    );

    for (const cookie of pendingCookies) {
      response.cookies.set(cookie.name, cookie.value, cookie.options);
    }

    return response;
  } catch (error: any) {
    console.error("AUTH_SIGNIN_ROUTE_ERROR:", error);

    return NextResponse.json(
      { error: error?.message || "Unexpected sign-in error." },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}