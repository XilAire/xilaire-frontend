import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getProfile } from "@/lib/getProfile";

export async function GET() {
  const profile = await getProfile();

  if (!profile || !["admin", "super_admin", "master_admin"].includes(profile.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { data, error } = await supabaseAdmin
    .from("alerts")
    .select("*")
    .eq("status", "open")
    .order("triggered_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
