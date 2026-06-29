import { createServerSupabaseClient } from "@/lib/supabaseServer";
import { getProfile } from "@/lib/getProfile";

/* -------------------------------------------------
   TYPES
------------------------------------------------- */

export type MonthlyTicketTrend = {
  month: string; // YYYY-MM
  created: number;
  closed: number;
};

export type CoreReportingSnapshot = {
  tickets: {
    open: number;
    closed: number;
    createdThisMonth: number;
    avgResolutionHours: number | null;
    monthlyTrend: MonthlyTicketTrend[];
  };
};

/* -------------------------------------------------
   CORE REPORTING SNAPSHOT
------------------------------------------------- */

export async function getCoreReportingSnapshot(): Promise<CoreReportingSnapshot> {
  const supabase = await createServerSupabaseClient();

  /* -------------------------------------------------
     🔐 ORG CONTEXT
  ------------------------------------------------- */
  const profile = await getProfile();

  if (!profile?.org_id) {
    return {
      tickets: {
        open: 0,
        closed: 0,
        createdThisMonth: 0,
        avgResolutionHours: null,
        monthlyTrend: [],
      },
    };
  }

  const orgId = profile.org_id;

  /* -------------------------------------------------
     📥 FETCH TICKETS (RLS SAFE)
  ------------------------------------------------- */
  const { data: tickets, error } = await supabase
    .from("tickets")
    .select("status, created_at, closed_at")
    .eq("org_id", orgId);

  if (error || !tickets) {
    return {
      tickets: {
        open: 0,
        closed: 0,
        createdThisMonth: 0,
        avgResolutionHours: null,
        monthlyTrend: [],
      },
    };
  }

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  let open = 0;
  let closed = 0;
  let createdThisMonth = 0;

  let totalResolutionMs = 0;
  let resolvedCount = 0;

  /* -------------------------------------------------
     📈 PRE-SEED LAST 6 MONTHS
  ------------------------------------------------- */
  const trendMap = new Map<string, MonthlyTicketTrend>();

  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

    trendMap.set(key, {
      month: key,
      created: 0,
      closed: 0,
    });
  }

  /* -------------------------------------------------
     🔁 PROCESS TICKETS
  ------------------------------------------------- */
  for (const t of tickets) {
    const createdAt = new Date(t.created_at);

    if (t.status === "open") open++;
    if (t.status === "closed") closed++;

    if (createdAt >= startOfMonth) {
      createdThisMonth++;
    }

    /* ---------- CREATED TREND ---------- */
    const createdKey = `${createdAt.getFullYear()}-${String(
      createdAt.getMonth() + 1
    ).padStart(2, "0")}`;

    const createdBucket = trendMap.get(createdKey);
    if (createdBucket) {
      createdBucket.created++;
    }

    /* ---------- CLOSED + RESOLUTION ---------- */
    if (t.closed_at) {
      const closedAt = new Date(t.closed_at);

      if (closedAt >= createdAt) {
        totalResolutionMs += closedAt.getTime() - createdAt.getTime();
        resolvedCount++;
      }

      const closedKey = `${closedAt.getFullYear()}-${String(
        closedAt.getMonth() + 1
      ).padStart(2, "0")}`;

      const closedBucket = trendMap.get(closedKey);
      if (closedBucket) {
        closedBucket.closed++;
      }
    }
  }

  const avgResolutionHours =
    resolvedCount > 0
      ? Math.round((totalResolutionMs / resolvedCount / 36e5) * 10) / 10
      : null;

  /* -------------------------------------------------
     RETURN SNAPSHOT
  ------------------------------------------------- */
  return {
    tickets: {
      open,
      closed,
      createdThisMonth,
      avgResolutionHours,
      monthlyTrend: Array.from(trendMap.values()),
    },
  };
}
