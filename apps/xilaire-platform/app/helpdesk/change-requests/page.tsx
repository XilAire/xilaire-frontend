import { createServerSupabaseClient } from "@/lib/supabaseServer";
import ChangeRequestsClient from "./ChangeRequestsClient";

export default async function ChangeRequestsPage() {
  const supabase = await createServerSupabaseClient();

  /* ---------------------------------------------------------
     1️⃣ Load change requests (RLS enforced — NO JOINS)
  --------------------------------------------------------- */
  const { data: changes, error } = await supabase
    .from("change_requests")
    .select("*")
    .order("created_at", { ascending: false });

  if (error || !changes) {
    console.error("Failed to load change requests:", error);
    return <ChangeRequestsClient requests={[]} />;
  }

  /* ---------------------------------------------------------
     2️⃣ Load tasks (COUNT IN MEMORY — SAFE)
  --------------------------------------------------------- */
  const changeIds = changes.map((c) => c.id);

  let taskCountMap: Record<string, number> = {};

  if (changeIds.length > 0) {
    const { data: tasks } = await supabase
      .from("tasks")
      .select("parent_id")
      .eq("parent_type", "change_request")
      .in("parent_id", changeIds);

    taskCountMap = (tasks ?? []).reduce<Record<string, number>>(
      (acc, task) => {
        acc[task.parent_id] = (acc[task.parent_id] ?? 0) + 1;
        return acc;
      },
      {}
    );
  }

  /* ---------------------------------------------------------
     3️⃣ Load approvals (UNCHANGED)
  --------------------------------------------------------- */
  let approvalMap: Record<
    string,
    { currentStage: string | null; outcome: string | null }
  > = {};

  if (changeIds.length > 0) {
    const { data: approvals } = await supabase
      .from("approvals")
      .select("request_id, outcome, notes, created_at")
      .eq("request_type", "change_request")
      .in("request_id", changeIds)
      .order("created_at", { ascending: true });

    for (const changeId of changeIds) {
      const rows = (approvals ?? []).filter(
        (a) => a.request_id === changeId
      );

      const current =
        rows.find((a) => a.outcome === "pending" || a.outcome === null) ??
        null;

      approvalMap[changeId] = {
        currentStage: current?.notes ?? null,
        outcome: current?.outcome ?? null,
      };
    }
  }

  /* ---------------------------------------------------------
     4️⃣ Collect profile IDs (USE requested_by — NOT created_by)
  --------------------------------------------------------- */
  const profileIds = Array.from(
    new Set(
      changes
        .flatMap((c) => [
          c.requested_by, // ✅ CANONICAL
          c.assigned_to,
          c.approver_id,
        ])
        .filter(Boolean)
    )
  );

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url")
    .in("id", profileIds);

  const profileMap = Object.fromEntries(
    (profiles ?? []).map((p) => [p.id, p])
  );

  /* ---------------------------------------------------------
     5️⃣ Hydrate rows (SAFE + CANONICAL)
  --------------------------------------------------------- */
  const hydrated = changes.map((c) => ({
    ...c,

    // ✅ CANONICAL OWNERSHIP
    requestedBy: profileMap[c.requested_by] ?? null,
    assignedTo: profileMap[c.assigned_to] ?? null,
    approver: profileMap[c.approver_id] ?? null,

    taskCount: taskCountMap[c.id] ?? 0,

    approvalStage: approvalMap[c.id]?.currentStage ?? null,
    approvalOutcome: approvalMap[c.id]?.outcome ?? null,
  }));

  return <ChangeRequestsClient requests={hydrated} />;
}
