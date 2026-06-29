import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabaseServer";

export async function GET() {
  const supabase = createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const [
    tickets,
    incidents,
    serviceRequests,
    changeRequests,
    approvals,
  ] = await Promise.all([
    supabase.from("tickets").select("id", { count: "exact", head: true }),
    supabase.from("incidents").select("id", { count: "exact", head: true }),
    supabase.from("service_requests").select("id", { count: "exact", head: true }),
    supabase.from("change_requests").select("id", { count: "exact", head: true }),
    supabase.from("approvals").select("id", { count: "exact", head: true }),
  ]);

  return NextResponse.json({
    tickets: tickets.count ?? 0,
    incidents: incidents.count ?? 0,
    serviceRequests: serviceRequests.count ?? 0,
    changeRequests: changeRequests.count ?? 0,
    approvals: approvals.count ?? 0,
  });
}
