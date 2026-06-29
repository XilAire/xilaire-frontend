// /api/incidents/new/route.ts
import { NextResponse } from "next/server";
import { supabasePlatform } from "@/lib/supabasePlatformClient";

export async function POST(req: Request) {
  const body = await req.json();

  const { data, error } = await supabasePlatform
    .from("incidents")
    .insert({
      title: body.title,
      description: body.description,
      severity: body.severity,
      status: "open",
      affected_system: body.affected_system,
      created_by: body.user_id,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error }, { status: 400 });

  return NextResponse.json({ success: true, incident: data });
}
