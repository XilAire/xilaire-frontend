// apps/xilaire-platform/lib/getHelpdeskCounts.ts

import { unstable_noStore as noStore } from "next/cache";
import { cookies } from "next/headers";
import { createServerSupabaseClient } from "@/lib/supabaseServer";
import { getProfile } from "@/lib/getProfile";

type HelpdeskCounts = {
  tickets: number;
  incidents: number;
  serviceRequests: number;
  changeRequests: number;
  approvals: number;
};

export async function getHelpdeskCounts(): Promise<HelpdeskCounts> {
  // 🚫 Disable Next.js RSC caching
  noStore();

  const cookieStore = cookies();

  // ⚠️ MUST be awaited
  const supabase = await createServerSupabaseClient();

  // 🔐 Default safe response (NEVER block layout)
  const safeCounts: HelpdeskCounts = {
    tickets: 0,
    incidents: 0,
    serviceRequests: 0,
    changeRequests: 0,
    approvals: 0,
  };

  try {
    /* ----------------------------------------
       🔒 CANONICAL AUTH CONTEXT (PROFILE-BASED)
    ---------------------------------------- */
    let profile;
    try {
      profile = await getProfile();
    } catch {
      // Unauthenticated — layout must still render
      return safeCounts;
    }

    console.log(
      "HELPDESK COUNTS – AUTH USER:",
      profile.email,
      profile.role
    );

    /* ----------------------------------------
       ACTIVE ORG RESOLUTION
       (profile → JWT → cookie)
    ---------------------------------------- */
    const jwtOrgId = profile.org_id ?? null;

    const activeOrgCookie =
      cookieStore.get("active_org_id")?.value ?? null;

    const effectiveOrgId =
      profile.role === "master_admin" && activeOrgCookie
        ? activeOrgCookie
        : jwtOrgId;

    console.log("HELPDESK COUNTS – ORG CONTEXT:", {
      jwtOrgId,
      activeOrgCookie,
      effectiveOrgId,
      canSwitchOrg: profile.role === "master_admin",
    });

    if (!effectiveOrgId) {
      console.warn("⚠️ No effective org ID resolved");
      return safeCounts;
    }

    /* ----------------------------------------
       COUNT QUERIES (NON-BLOCKING)
    ---------------------------------------- */
    const [
      tickets,
      incidents,
      serviceRequests,
      changeRequests,
      approvals,
    ] = await Promise.allSettled([
      supabase
        .from("tickets")
        .select("id", { count: "exact", head: true })
        .eq("org_id", effectiveOrgId),

      supabase
        .from("incidents")
        .select("id", { count: "exact", head: true })
        .eq("org_id", effectiveOrgId),

      supabase
        .from("service_requests")
        .select("id", { count: "exact", head: true })
        .eq("org_id", effectiveOrgId),

      supabase
        .from("change_requests")
        .select("id", { count: "exact", head: true })
        .eq("org_id", effectiveOrgId),

      supabase
        .from("approvals")
        .select("id", { count: "exact", head: true })
        .eq("org_id", effectiveOrgId),
    ]);

    return {
      tickets:
        tickets.status === "fulfilled"
          ? tickets.value.count ?? 0
          : 0,

      incidents:
        incidents.status === "fulfilled"
          ? incidents.value.count ?? 0
          : 0,

      serviceRequests:
        serviceRequests.status === "fulfilled"
          ? serviceRequests.value.count ?? 0
          : 0,

      changeRequests:
        changeRequests.status === "fulfilled"
          ? changeRequests.value.count ?? 0
          : 0,

      approvals:
        approvals.status === "fulfilled"
          ? approvals.value.count ?? 0
          : 0,
    };
  } catch (err) {
    // 🚨 ABSOLUTELY NEVER THROW FROM A GLOBAL LAYOUT DEPENDENCY
    console.error(
      "❌ HELPDESK COUNTS FAILED — FALLING BACK TO SAFE COUNTS",
      err
    );
    return safeCounts;
  }
}
