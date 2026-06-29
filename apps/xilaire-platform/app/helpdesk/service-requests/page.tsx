import { createServerSupabaseClient } from "@/lib/supabaseServer";
import ServiceRequestsClient from "./ServiceRequestsClient";

export default async function ServiceRequestsPage() {
  const supabase = await createServerSupabaseClient();

  /* ---------------------------------------------------------
     1️⃣ Load service requests
  --------------------------------------------------------- */
  const { data: requests, error } = await supabase
    .from("service_requests")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to load service requests:", error);
    return <ServiceRequestsClient requests={[]} counts={defaultCounts} />;
  }

  const safeRequests = requests ?? [];

  /* ---------------------------------------------------------
     2️⃣ Compute status counts (RESTORED)
  --------------------------------------------------------- */
  const counts = {
    open: safeRequests.filter(r => r.status === "open").length,
    in_progress: safeRequests.filter(r => r.status === "in_progress").length,
    resolved: safeRequests.filter(r => r.status === "resolved").length,
    closed: safeRequests.filter(r => r.status === "closed").length,
  };

  /* ---------------------------------------------------------
     3️⃣ Render
  --------------------------------------------------------- */
  return (
    <ServiceRequestsClient
      requests={safeRequests}
      counts={counts}
    />
  );
}

const defaultCounts = {
  open: 0,
  in_progress: 0,
  resolved: 0,
  closed: 0,
};
