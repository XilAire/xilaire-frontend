import { notFound } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

import UserTabs from "./components/UserTabs";
import UserDetails from "./components/UserDetails";
import AdminActivityTimeline from "../components/activity/AdminActivityTimeline";

export default async function UserPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { tab?: string };
}) {
  const tab = searchParams.tab ?? "details";
  const userId = params.id;

  /* ----------------------------------------
     VERIFY USER EXISTS
  ---------------------------------------- */
  const { data: user } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .eq("id", userId)
    .single();

  if (!user) notFound();

  /* ----------------------------------------
     LOAD ACTIVITY LOGS
  ---------------------------------------- */
  const { data: logs } = await supabaseAdmin
    .from("profile_audit_logs")
    .select("*")
    .or(`target_id.eq.${userId},actor_id.eq.${userId}`)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <UserTabs userId={userId} />

      {tab === "details" && (
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
          <UserDetails userId={userId} />
        </div>
      )}

      {(tab === "activity" || tab === "timeline") && (
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
          <AdminActivityTimeline activities={logs ?? []} />
        </div>
      )}
    </div>
  );
}