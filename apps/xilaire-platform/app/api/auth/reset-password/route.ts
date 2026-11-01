import { NextResponse } from "next/server";
import { requestPasswordReset } from "@/lib/auth/password-recovery";

export const runtime = "nodejs";

const PRODUCTION_ORIGIN = "https://xilairetechnologies.com";
const VERCEL_PRODUCTION_ORIGIN = "https://xilaire-platform.vercel.app";
const DEVELOPMENT_ORIGIN = "http://localhost:3002";

function isAllowedOrigin(originHeader: string | null): boolean {
  if (!originHeader) return true;

  try {
    const parsed = new URL(originHeader);

    if (parsed.href !== `${parsed.origin}/`) {
      return false;
    }

    if (
      parsed.origin === PRODUCTION_ORIGIN ||
      parsed.origin === VERCEL_PRODUCTION_ORIGIN
    ) {
      return true;
    }

    if (
      process.env.NODE_ENV === "development" &&
      parsed.origin === DEVELOPMENT_ORIGIN
    ) {
      return true;
    }

    return false;
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  if (!isAllowedOrigin(request.headers.get("origin"))) {
    return NextResponse.json(
      { error: "Invalid origin." },
      { status: 403 }
    );
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON." },
      { status: 400 }
    );
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json(
      { error: "Invalid request." },
      { status: 400 }
    );
  }

  const result = await requestPasswordReset(
    (body as { email?: unknown }).email
  );

  return NextResponse.json(
    { message: result.message },
    { status: result.status }
  );
}
