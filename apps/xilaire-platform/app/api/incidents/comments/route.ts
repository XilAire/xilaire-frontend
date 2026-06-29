// /api/incidents/comments/route.ts
import { NextResponse } from "next/server";
import { supabasePlatform } from "@/lib/supabasePlatformClient";

export async function POST(req: Request) {
  const body = await req.json();

  const { data, error } = await supabasePlatform
    .from("incident_activity")
    .insert({
      incident_id: body.incidentId,
      type: "comment",
      message: body.message,
      created_by: body.user_id,
    });

  if (error) return NextResponse.json({ error }, { status: 400 });

  return NextResponse.json({ success: true });
}
