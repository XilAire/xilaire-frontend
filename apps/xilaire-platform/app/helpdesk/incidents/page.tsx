// apps/xilaire-platform/app/helpdesk/incidents/page.tsx

import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabaseServer";
import IncidentsClient from "@/components/helpdesk/IncidentsClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Incidents | XilAire Platform",
  description: "Live tracking for outages, anomalies, and system issues.",
};

/* ============================================================================
   TYPES — SERVER → CLIENT CONTRACT (LOCKED)
============================================================================ */
export type IncidentRow = {
  id: string;
  title: string;
  severity: string;
  status: string;
  affected_system: string | null;
  created_at: string;
};

/* ============================================================================
   PAGE — SERVER
============================================================================ */
export default async function IncidentsPage() {
  const supabase = await createServerSupabaseClient();

  /* -------------------------------------------------
     AUTH — REQUIRE SESSION
  ------------------------------------------------- */
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    console.error("[INCIDENTS_AUTH] missing session", authError);
    redirect("/auth/signin");
  }

  /* -------------------------------------------------
     JWT CONTEXT (OPTION B — CORRECT FUNCTION)
  ------------------------------------------------- */
  const {
    data: jwt,
    error: jwtError,
  } = await supabase.rpc("get_jwt_claims");

  if (jwtError || !jwt?.org_id) {
    console.error("[INCIDENTS_JWT] invalid context", jwtError, jwt);
    return (
      <div className="p-6 text-sm text-red-500">
        Invalid organization context.
      </div>
    );
  }

  const orgId = jwt.org_id;
  const role = jwt.role;

  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("[INCIDENTS_SERVER]");
  console.log("user:", user.email);
  console.log("org_id:", orgId);
  console.log("role:", role);

  /* -------------------------------------------------
     DATA — INCIDENTS (RLS ENFORCED)
  ------------------------------------------------- */
  const { data, error } = await supabase
    .from("incidents")
    .select(
      `
        id,
        title,
        severity,
        status,
        affected_system,
        created_at
      `
    )
    .order("created_at", { ascending: false });

  console.log("[INCIDENTS_RAW] error:", error);
  console.log("[INCIDENTS_RAW] row count:", data?.length ?? 0);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  if (error) {
    return (
      <div className="p-6 text-sm text-red-500">
        Failed to load incidents.
      </div>
    );
  }

  const incidents: IncidentRow[] = (data ?? []).map((i) => ({
    id: i.id,
    title: i.title,
    severity: i.severity,
    status: i.status,
    affected_system: i.affected_system,
    created_at: i.created_at,
  }));

  /* -------------------------------------------------
     RENDER
  ------------------------------------------------- */
  return (
    <IncidentsClient
      incidents={incidents}
      userEmail={user.email ?? null}
    />
  );
}
