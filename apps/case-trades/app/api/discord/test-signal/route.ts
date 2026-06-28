import { NextResponse } from "next/server";
import { sendSignalToDiscord } from "@/lib/discord/sendSignalToDiscord";

export async function GET() {
  await sendSignalToDiscord({
    signal_id: "TEST-001",
    action: "BUY",
    instrument_type: "OPTION",
    underlying: "SPY",
    entry_price: 2.35,
    underlying_entry_price: 612.45,
    option_type: "CALL",
    strike_price: 615,
    expiration_date: "2026-06-20",
    confidence: 92,
    trade_style: "scalp",
  });

  return NextResponse.json({ success: true });
}