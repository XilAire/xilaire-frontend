import { NextResponse } from "next/server";
import { supabasePlatform } from "@/lib/supabasePlatformClient";
import { runAutomation } from "@/lib/automations/runner";

/**
 * POST /api/automations/webhook/[slug]
 *
 * This endpoint is PUBLIC so external systems can fire automations.
 */
export async function POST(req: Request, { params }: any) {
  const { slug } = params;

  let payload: any = {};
  try {
    payload = await req.json();
  } catch {
    // ignore empty body — some systems send empty webhooks
  }

  // 1) Lookup automation by slug
  const { data, error } = await supabasePlatform
    .from("automations")
    .select("*")
    .eq("slug", slug)
    .single();

  if (!data || error) {
    return NextResponse.json(
      { error: "Automation not found" },
      { status: 404 }
    );
  }

  // 2) Run it
  const result = await runAutomation(data, payload);

  return NextResponse.json({
    success: true,
    automation: data.slug,
    result,
  });
}
