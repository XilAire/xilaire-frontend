import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin) return NextResponse.json({ error: "Invalid origin." }, { status: 403 });
  let body: { password?: unknown };
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }
  const password = body?.password;
  if (typeof password !== "string" || password.length < 12 || password.length > 128) {
    return NextResponse.json({ error: "Password must be between 12 and 128 characters." }, { status: 400 });
  }
  const response = NextResponse.json({ ok: true });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL_PLATFORM!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY_PLATFORM!,
    { cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookies) => { cookies.forEach(({ name, value, options }) => response.cookies.set(name, value, options)); },
    } }
  );
  const { data: { user }, error: sessionError } = await supabase.auth.getUser();
  if (sessionError || !user) return NextResponse.json({ error: "Your recovery link has expired. Request a new one." }, { status: 401 });
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return NextResponse.json({ error: "Could not update password. Please try again." }, { status: 400 });
  await supabase.auth.signOut();
  return response;
}
