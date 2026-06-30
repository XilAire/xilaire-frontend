import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function normalizeNextPath(value: string | null) {
  if (!value) return "/dashboard";

  if (!value.startsWith("/")) return "/dashboard";

  if (value.startsWith("//")) return "/dashboard";

  return value;
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);

  const code = requestUrl.searchParams.get("code");
  const next = normalizeNextPath(requestUrl.searchParams.get("next"));

  if (!code) {
    return NextResponse.redirect(
      new URL(
        `/auth/signin?next=${encodeURIComponent(next)}`,
        requestUrl.origin
      )
    );
  }

  const supabase = await createSupabaseServerClient();

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error("Supabase auth callback failed:", error);

    return NextResponse.redirect(
      new URL(
        `/auth/signin?error=auth_callback_failed&next=${encodeURIComponent(
          next
        )}`,
        requestUrl.origin
      )
    );
  }

  return NextResponse.redirect(new URL(next, requestUrl.origin));
}
