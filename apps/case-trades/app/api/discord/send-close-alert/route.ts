import { NextResponse } from "next/server";

import { sendClosedSignalAlert } from "@/lib/discord/sendClosedSignalAlert";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const signalId = body?.signalId;

    if (!signalId || typeof signalId !== "string") {
      return NextResponse.json(
        { error: "Missing signalId." },
        { status: 400 }
      );
    }

    await sendClosedSignalAlert(signalId);

    return NextResponse.json({
      success: true,
    });
  } catch (error: any) {
    console.error("Failed to send Discord close alert", error);

    return NextResponse.json(
      {
        error: error?.message ?? "Failed to send Discord close alert.",
      },
      { status: 500 }
    );
  }
}