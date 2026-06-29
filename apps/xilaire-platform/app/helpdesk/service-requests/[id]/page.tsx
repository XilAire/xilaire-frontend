import { notFound } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabaseServer";

/* Shared UI (safe to reuse) */
import StatusPill from "../../change-requests/[id]/components/StatusPill";

/* Service Request–specific components */
import SRHeader from "./components/SRHeader";
import SRTabs from "./components/SRTabs";
import DetailsLeft from "./components/DetailsLeft";
import DetailsRight from "./components/DetailsRight";
import SRComments from "./components/SRComments";
import SRTimeline from "./components/SRTimeline";
import ServiceRequestActionPill from "./components/ServiceRequestActionPill";

interface ServiceRequestPageProps {
  params: { id: string };
  searchParams: { tab?: string };
}

export default async function ServiceRequestPage({
  params,
  searchParams,
}: ServiceRequestPageProps) {
  const supabase = createServerSupabaseClient();

  const requestId = params.id;
  const activeTab = searchParams.tab ?? "details";

  /* -------------------------------------------------
     1️⃣ FETCH SERVICE REQUEST (RLS SAFE)
  ------------------------------------------------- */
  const { data: request, error } = await supabase
    .from("service_requests")
    .select("*")
    .eq("id", requestId)
    .single();

  if (error || !request) {
    console.error("Failed to load service request:", error);
    return notFound();
  }

  /* -------------------------------------------------
     2️⃣ FETCH RELATED PROFILES
  ------------------------------------------------- */
  const profileIds = [
    request.requester_id,
    request.assigned_to,
  ].filter(Boolean) as string[];

  let profileMap: Record<string, any> = {};

  if (profileIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, avatar_url")
      .in("id", profileIds);

    profileMap = Object.fromEntries(
      (profiles ?? []).map((p) => [p.id, p])
    );
  }

  /* -------------------------------------------------
     3️⃣ HYDRATE REQUEST (DISPLAY SAFE)
  ------------------------------------------------- */
  const hydrated = {
    ...request,
    requesterName:
      profileMap[request.requester_id]?.full_name ?? "Unknown",
    assignedToName:
      profileMap[request.assigned_to]?.full_name ?? "Unassigned",
  };

  /* -------------------------------------------------
     4️⃣ RENDER
  ------------------------------------------------- */
  return (
    <div className="p-6 space-y-6">
      {/* STATUS */}
      <StatusPill status={hydrated.status} />

      {/* HEADER + ACTIONS */}
      <div className="flex items-center justify-between mb-6">
        <SRHeader request={hydrated} />

        {/* ✅ SERVICE REQUEST ACTIONS ONLY */}
        <ServiceRequestActionPill
          id={hydrated.id}
          request={hydrated}
        />
      </div>

      {/* TABS */}
      <SRTabs activeTab={activeTab} id={requestId} />

      {/* TAB CONTENT */}
      <div className="mt-6 space-y-6">
        {activeTab === "details" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <DetailsLeft request={hydrated} />
            <DetailsRight request={hydrated} />
          </div>
        )}

        {activeTab === "comments" && (
          <SRComments requestId={requestId} />
        )}

        {activeTab === "timeline" && (
          <SRTimeline request={hydrated} />
        )}
      </div>
    </div>
  );
}
