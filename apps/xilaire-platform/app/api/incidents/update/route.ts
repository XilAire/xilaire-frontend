// /api/incidents/update/route.ts
import { NextResponse } from "next/server";
import { supabasePlatform } from "@/lib/supabasePlatformClient";

export async function POST(req: Request) {
  const body = await req.json();

  const { data, error } = await supabasePlatform
    .from("incidents")
    .update(body.fields)
    .eq("id", body.id);

  if (error) return NextResponse.json({ error }, { status: 400 });

  return NextResponse.json({ success: true });
}
