import { NextResponse } from "next/server";
import { supabasePlatform } from "@/lib/supabasePlatformClient";
import { runAutomation } from "@/lib/automations/runner";

export async function POST(req: Request) {
  const { automationId, payload } = await req.json();

  if (!automationId) {
    return NextResponse.json(
      { error: "Missing automationId" },
      { status: 400 }
    );
  }

  const { data, error } = await supabasePlatform
    .from("automations")
    .select("*")
    .eq("id", automationId)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Run the automation
  const result = await runAutomation(data, payload);

  return NextResponse.json({ success: true, result });
}
