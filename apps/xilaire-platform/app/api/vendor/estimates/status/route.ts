import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL_PLATFORM;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY_PLATFORM;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY_PLATFORM;

if (!SUPABASE_URL) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL_PLATFORM");
if (!SUPABASE_ANON_KEY) throw new Error("Missing NEXT_PUBLIC_SUPABASE_ANON_KEY_PLATFORM");
if (!SUPABASE_SERVICE_ROLE_KEY) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY_PLATFORM");

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

/* =========================================================
   TYPES
========================================================= */

type ProfileRow = {
  id: string;
  org_id: string | null;
  role: string | null;
  account_type: string | null;
  email: string | null;
};

type VendorRow = {
  id: string;
  org_id: string;
  email: string | null;
  company_name: string | null;
};

type EstimateRow = {
  id: string;
  org_id: string | null;
  project_id: string;
  vendor_id: string | null;
  status: string | null;
  review_notes: string | null;
  approved_at: string | null;
  approved_by: string | null;
  rejected_at: string | null;
  rejected_by: string | null;
  created_by: string | null;
  updated_by: string | null;
  updated_at?: string | null;
};

type ProjectRow = {
  id: string;
  org_id: string;
};

type StatusRequestBody = {
  estimate_id?: string;
  status?: string;
  review_notes?: string | null;
};

/* =========================================================
   CONSTANTS
========================================================= */

const ADMIN_ROLES = new Set([
  "master_admin",
  "super_admin",
  "admin",
  "project_manager",
]);

const NO_STORE_HEADERS: Record<string, string> = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0",
  "Surrogate-Control": "no-store",
};

/* =========================================================
   HELPERS
========================================================= */

function json(body: Record<string, any>, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: NO_STORE_HEADERS,
  });
}

function normalizeTextLower(value: string | null | undefined) {
  return String(value || "").trim().toLowerCase();
}

function normalizeStatus(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

function normalizeOptionalText(value: unknown) {
  const text = String(value ?? "").trim();
  return text.length ? text : null;
}

function normalizeEmail(value: unknown) {
  if (typeof value !== "string") return null;
  const v = value.trim().toLowerCase();
  return v.length ? v : null;
}

function isAdminRole(role: string | null | undefined) {
  return ADMIN_ROLES.has(normalizeTextLower(role));
}

function isVendorAccount(accountType: string | null | undefined) {
  return normalizeTextLower(accountType) === "vendor";
}

function isVendorRole(role: string | null | undefined) {
  const r = normalizeTextLower(role);
  return r === "vendor" || r === "vendor_admin";
}

function isVendorUser(profile: ProfileRow) {
  return isVendorAccount(profile.account_type) || isVendorRole(profile.role);
}

/* =========================================================
   TRANSITIONS (ALIGNED WITH UI)
========================================================= */

function canVendorTransition(current: string, next: string) {
  if (current === next) return true;

  if (current === "draft" && next === "submitted") return true;
  if (current === "rejected" && next === "submitted") return true;
  if (current === "submitted" && next === "draft") return true;

  return false;
}

function canAdminTransition(current: string, next: string) {
  if (current === next) return true;

  if (current === "draft" && next === "submitted") return true;
  if (current === "submitted" && next === "approved") return true;
  if (current === "submitted" && next === "rejected") return true;
  if (current === "submitted" && next === "draft") return true;
  if (current === "rejected" && next === "draft") return true;
  if (current === "rejected" && next === "submitted") return true;
  if (current === "approved" && next === "draft") return true;

  return false;
}

/* =========================================================
   AUTH CLIENT
========================================================= */

async function createAuthClient(staging: NextResponse) {
  const cookieStore = await cookies();

  return createServerClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookieList) {
        cookieList.forEach((c) => {
          staging.cookies.set(c.name, c.value, c.options);
        });
      },
    },
  });
}

/* =========================================================
   RESOLVERS
========================================================= */

async function resolveProfile(authClient: any): Promise<ProfileRow> {
  const { data, error } = await authClient.auth.getUser();

  if (error || !data?.user) {
    throw new Error("Unauthorized");
  }

  const { data: profile, error: pErr } = await admin
    .from("profiles")
    .select("id, org_id, role, account_type, email")
    .eq("id", data.user.id)
    .single();

  if (pErr || !profile) {
    throw new Error("Profile not found");
  }

  return profile;
}

async function resolveVendor(profile: ProfileRow, orgId: string) {
  const email = normalizeEmail(profile.email);

  if (!email) return null;

  const { data, error } = await admin
    .from("infrastructure_vendors")
    .select("id, org_id, email, company_name")
    .eq("org_id", orgId)
    .ilike("email", email)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data as VendorRow | null;
}

async function loadEstimate(estimateId: string, orgId: string) {
  const { data, error } = await admin
    .from("infrastructure_estimates")
    .select("*")
    .eq("id", estimateId)
    .eq("org_id", orgId)
    .maybeSingle();

  if (error) throw new Error(error.message);

  return data as EstimateRow | null;
}

async function validateProject(projectId: string, orgId: string) {
  const { data, error } = await admin
    .from("infrastructure_projects")
    .select("id, org_id")
    .eq("id", projectId)
    .eq("org_id", orgId)
    .single();

  if (error) throw new Error(error.message);

  return data as ProjectRow;
}

/* =========================================================
   ROUTE
========================================================= */

export async function POST(req: Request) {
  const staging = json({}, 200);

  try {
    const body = (await req.json()) as StatusRequestBody;

    const estimateId = String(body?.estimate_id || "").trim();
    const nextStatus = normalizeStatus(body?.status);
    const reviewNotes = normalizeOptionalText(body?.review_notes);

    if (!estimateId) return json({ error: "estimate_id required" }, 400);
    if (!nextStatus) return json({ error: "status required" }, 400);

    const authClient = await createAuthClient(staging);
    const profile = await resolveProfile(authClient);

    const effectiveOrgId = profile.org_id;
    if (!effectiveOrgId) return json({ error: "No org context" }, 403);

    const isAdmin = isAdminRole(profile.role);
    const isVendor = isVendorUser(profile);

    if (!isAdmin && !isVendor) {
      return json({ error: "Unauthorized" }, 403);
    }

    const estimate = await loadEstimate(estimateId, effectiveOrgId);
    if (!estimate) return json({ error: "Estimate not found" }, 404);

    await validateProject(estimate.project_id, effectiveOrgId);

    const currentStatus = normalizeStatus(estimate.status || "draft");

    let actorVendor: VendorRow | null = null;

    if (!isAdmin) {
      actorVendor = await resolveVendor(profile, effectiveOrgId);

      if (!actorVendor?.id) {
        return json({ error: "Vendor not linked to account" }, 403);
      }

      if (estimate.vendor_id !== actorVendor.id) {
        return json({ error: "Cannot modify another vendor estimate" }, 403);
      }

      if (!canVendorTransition(currentStatus, nextStatus)) {
        return json(
          { error: `Invalid vendor transition ${currentStatus} → ${nextStatus}` },
          400
        );
      }
    } else {
      if (!canAdminTransition(currentStatus, nextStatus)) {
        return json(
          { error: `Invalid admin transition ${currentStatus} → ${nextStatus}` },
          400
        );
      }
    }

    const now = new Date().toISOString();

    const update: any = {
      status: nextStatus,
      updated_by: profile.id,
      updated_at: now,
    };

    if (isAdmin) {
      if (nextStatus === "approved") {
        update.approved_at = now;
        update.approved_by = profile.id;
        update.rejected_at = null;
        update.rejected_by = null;
      }

      if (nextStatus === "rejected") {
        update.rejected_at = now;
        update.rejected_by = profile.id;
        update.approved_at = null;
        update.approved_by = null;
      }

      if (reviewNotes !== null) {
        update.review_notes = reviewNotes;
      }
    }

    const { data: updated, error } = await admin
      .from("infrastructure_estimates")
      .update(update)
      .eq("id", estimate.id)
      .select("*")
      .single();

    if (error) {
      return json({ error: error.message }, 500);
    }

    return json({
      ok: true,
      estimate: updated,
      workflow: {
        previous: currentStatus,
        next: nextStatus,
        actor_role: profile.role,
        vendor_id: actorVendor?.id || null,
      },
    });
  } catch (err: any) {
    console.error("STATUS ROUTE ERROR:", err);
    return json({ error: err.message || "Server error" }, 500);
  }
}