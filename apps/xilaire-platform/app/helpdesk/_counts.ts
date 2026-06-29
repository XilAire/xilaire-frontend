import { supabasePlatform } from "@/lib/supabasePlatformClient";

export async function getHelpdeskCounts() {
  const [
    tickets,
    incidents,
    serviceRequests,
    changeRequests,
    approvals,
  ] = await Promise.all([
    supabasePlatform.from("tickets").select("id", { count: "exact", head: true }),
    supabasePlatform.from("incidents").select("id", { count: "exact", head: true }),
    supabasePlatform.from("service_requests").select("id", { count: "exact", head: true }),
    supabasePlatform.from("change_requests").select("id", { count: "exact", head: true }),
    supabasePlatform.from("approvals").select("id", { count: "exact", head: true }),
  ]);

  return {
    tickets: tickets.count ?? 0,
    incidents: incidents.count ?? 0,
    serviceRequests: serviceRequests.count ?? 0,
    changeRequests: changeRequests.count ?? 0,
    approvals: approvals.count ?? 0,
  };
}
