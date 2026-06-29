import { notFound } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabaseServer";

import StatusPill from "./components/StatusPill";
import CRHeader from "./components/CRHeader";
import CRTabs from "./components/CRTabs";
import DetailsLeft from "./components/DetailsLeft";
import DetailsRight from "./components/DetailsRight";
import CRAttachments from "./components/CRAttachments";
import CRComments from "./components/CRComments";
import CRTimeline from "./components/CRTimeline";
import ActionPill from "./components/ActionPill";
import ChangeTasksClient from "./components/ChangeTasksClient";

interface ChangeRequestPageProps {
  params: { id: string };
  searchParams: { tab?: string };
}

export default async function ChangeRequestPage({
  params,
  searchParams,
}: ChangeRequestPageProps) {
  const supabase = createServerSupabaseClient();

  const changeId = params.id;
  const activeTab = searchParams.tab || "details";

  /* -------------------------------------------------
     FETCH CHANGE REQUEST (RLS SAFE)
  ------------------------------------------------- */
  const { data: change, error: changeError } = await supabase
    .from("change_requests")
    .select("*")
    .eq("id", changeId)
    .single();

  if (changeError || !change) return notFound();

  /* -------------------------------------------------
     FETCH TASKS (POLYMORPHIC, DETAIL-READY)
  ------------------------------------------------- */
  const { data: tasks } = await supabase
    .from("tasks")
    .select(`
      id,
      title,
      description,
      status,
      priority,
      requires_approval,
      approval_status,
      assigned_to,
      created_by,
      created_at
    `)
    .eq("parent_type", "change_request")
    .eq("parent_id", changeId)
    .order("created_at", { ascending: true });

  /* -------------------------------------------------
     FETCH PROFILES (CHANGE REQUEST CONTEXT)
     ✅ INCLUDE requested_by
  ------------------------------------------------- */
  const profileIds = [
    change.requested_by, // ✅ FIX
    change.assigned_to,
    change.approver_id,
  ].filter(Boolean);

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, email, avatar_url")
    .in("id", profileIds);

  const getProfileName = (id: string | null) =>
    profiles?.find((p) => p.id === id)?.full_name || "Unknown";

  /* -------------------------------------------------
     HYDRATE (CANONICAL MAPPING)
  ------------------------------------------------- */
  const hydrated = {
    ...change,

    // ✅ Requested By now uses requested_by
    requestorName: getProfileName(
      change.requested_by ?? change.created_by
    ),

    assignedToName: getProfileName(change.assigned_to),
    approverName: getProfileName(change.approver_id),
  };

  /* -------------------------------------------------
     RENDER
  ------------------------------------------------- */
  return (
    <div className="p-6 space-y-6">
      <StatusPill status={hydrated.status} />

      <div className="flex items-center justify-between mb-6">
        <CRHeader change={hydrated} />
        <ActionPill id={hydrated.id} change={hydrated} />
      </div>

      <CRTabs activeTab={activeTab} id={changeId} />

      <div className="mt-6 space-y-6">
        {activeTab === "details" && (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <DetailsLeft change={hydrated} />
              <DetailsRight change={hydrated} />
            </div>

            <ChangeTasksClient
              changeId={changeId}
              initialTasks={tasks ?? []}
            />
          </>
        )}

        {activeTab === "attachments" && (
          <CRAttachments changeId={changeId} />
        )}

        {activeTab === "change-info" && (
          <DetailsRight change={hydrated} showAll />
        )}

        {activeTab === "comments" && (
          <CRComments changeId={changeId} />
        )}

        {activeTab === "timeline" && (
          <CRTimeline change={hydrated} />
        )}
      </div>
    </div>
  );
}
