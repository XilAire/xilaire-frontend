import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  return NextResponse.json(
    { error: "Legacy administrator endpoint disabled." },
    {
      status: 403,
      headers: { "Cache-Control": "no-store" },
    }
  );
}
