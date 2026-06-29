import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

/* =========================================================
   ENV
========================================================= */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL_PLATFORM;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY_PLATFORM;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY_PLATFORM;

if (!SUPABASE_URL) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL_PLATFORM");
}

if (!SUPABASE_ANON_KEY) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_ANON_KEY_PLATFORM");
}

if (!SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY_PLATFORM");
}

/* =========================================================
   CLIENTS
========================================================= */

function getAdminClient() {
  return createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });
}

function getAnonClient() {
  return createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
    auth: { persistSession: false },
  });
}

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
  project_id: string | null;
  vendor_id: string | null;
  site_visit_id: string | null;
  status: string | null;
  notes: string | null;
  labor_cost: number | null;
  material_cost: number | null;
  total_cost: number | null;
  created_by: string | null;
  updated_by: string | null;
  updated_at?: string | null;
  approved_at?: string | null;
  approved_by?: string | null;
  rejected_at?: string | null;
  rejected_by?: string | null;
  review_notes?: string | null;
};

type ProjectRow = {
  id: string;
  org_id: string;
};

type UpdateEstimateBody = {
  id?: string;
  status?: string | null;
  notes?: string | null;
  review_notes?: string | null;
  labor_cost?: number | string | null;
  material_cost?: number | string | null;
  total_cost?: number | string | null;
  site_visit_id?: string | null;
};

/* =========================================================
   HELPERS
========================================================= */

const ALLOWED_STATUSES = ["draft", "submitted", "approved", "rejected"] as const;

const NO_STORE_HEADERS: Record<string, string> = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0",
  "Surrogate-Control": "no-store",
};

function json(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: NO_STORE_HEADERS,
  });
}

function resolveToken(req: Request) {
  const authHeader = req.headers.get("authorization");

  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.replace("Bearer ", "").trim();
  }

  const cookieStore = cookies();
  const allCookies = cookieStore.getAll();

  const splitAuthCookies = allCookies
    .filter((cookie) => /^sb-[a-z0-9]+-auth-token(\.\d+)?$/i.test(cookie.name))
    .sort((a, b) => a.name.localeCompare(b.name));

  if (splitAuthCookies.length > 0) {
    return splitAuthCookies.map((cookie) => cookie.value).join("");
  }

  const direct =
    cookieStore.get("sb-access-token")?.value ||
    cookieStore.get("sb-access-token.0")?.value;
  const second = cookieStore.get("sb-access-token.1")?.value || "";

  if (direct) {
    return `${direct}${second}`;
  }

  return null;
}

function normalizeTextLower(value: string | null | undefined) {
  return String(value || "").trim().toLowerCase();
}

function isAdminRole(role: string | null | undefined) {
  return ["master_admin", "admin", "super_admin", "project_manager"].includes(
    normalizeTextLower(role)
  );
}

function isVendorAccount(accountType: string | null | undefined) {
  return normalizeTextLower(accountType) === "vendor";
}

function isVendorRole(role: string | null | undefined) {
  const normalized = normalizeTextLower(role);
  return normalized === "vendor" || normalized === "vendor_admin";
}

function isVendorUser(profile: Pick<ProfileRow, "role" | "account_type"> | null | undefined) {
  if (!profile) return false;
  return isVendorAccount(profile.account_type) || isVendorRole(profile.role);
}

function normalizeUuid(value: unknown) {
  if (typeof value !== "string") return null;
  const v = value.trim();
  return v.length ? v : null;
}

function normalizeText(value: unknown) {
  if (value === null) return null;
  if (typeof value !== "string") return null;
  const v = value.trim();
  return v.length ? v : null;
}

function normalizeStatus(value: unknown) {
  const v = String(value || "").trim().toLowerCase();
  return ALLOWED_STATUSES.includes(v as (typeof ALLOWED_STATUSES)[number]) ? v : null;
}

function normalizeMoney(value: unknown) {
  if (value === null || value === undefined || value === "") return null;

  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string"
      ? Number(value.replace(/,/g, "").trim())
      : NaN;

  if (!Number.isFinite(parsed)) return null;

  return Number(parsed.toFixed(2));
}

function buildError(message: string, status = 400, details?: unknown) {
  return json(
    {
      ok: false,
      error: message,
      details: details ?? null,
    },
    status
  );
}

async function resolveEffectiveOrgId(profile: ProfileRow) {
  const cookieStore = cookies();
  const activeOrgId = cookieStore.get("active_org_id")?.value || null;
  return activeOrgId || profile.org_id || null;
}

async function resolveVendorForProfile(
  admin: ReturnType<typeof getAdminClient>,
  profile: ProfileRow,
  effectiveOrgId: string
): Promise<VendorRow | null> {
  if (!profile.email) return null;

  const { data, error } = await admin
    .from("infrastructure_vendors")
    .select("id, org_id, email, company_name")
    .eq("org_id", effectiveOrgId)
    .ilike("email", profile.email)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to resolve vendor record: ${error.message}`);
  }

  return (data as VendorRow | null) || null;
}

async function loadEstimateForOrg(
  admin: ReturnType<typeof getAdminClient>,
  estimateId: string,
  effectiveOrgId: string
): Promise<EstimateRow | null> {
  const { data: directEstimate, error: directEstimateError } = await admin
    .from("infrastructure_estimates")
    .select(`
      id,
      org_id,
      project_id,
      vendor_id,
      site_visit_id,
      status,
      notes,
      labor_cost,
      material_cost,
      total_cost,
      created_by,
      updated_by,
      updated_at,
      approved_at,
      approved_by,
      rejected_at,
      rejected_by,
      review_notes
    `)
    .eq("id", estimateId)
    .eq("org_id", effectiveOrgId)
    .maybeSingle<EstimateRow>();

  if (directEstimateError) {
    throw new Error(`Failed to load estimate: ${directEstimateError.message}`);
  }

  if (directEstimate) {
    return directEstimate;
  }

  const { data: fallbackEstimate, error: fallbackEstimateError } = await admin
    .from("infrastructure_estimates")
    .select(`
      id,
      org_id,
      project_id,
      vendor_id,
      site_visit_id,
      status,
      notes,
      labor_cost,
      material_cost,
      total_cost,
      created_by,
      updated_by,
      updated_at,
      approved_at,
      approved_by,
      rejected_at,
      rejected_by,
      review_notes
    `)
    .eq("id", estimateId)
    .maybeSingle<EstimateRow>();

  if (fallbackEstimateError) {
    throw new Error(`Failed to load estimate: ${fallbackEstimateError.message}`);
  }

  if (!fallbackEstimate) {
    return null;
  }

  if (fallbackEstimate.org_id && fallbackEstimate.org_id === effectiveOrgId) {
    return fallbackEstimate;
  }

  if (!fallbackEstimate.project_id) {
    return null;
  }

  const { data: project, error: projectError } = await admin
    .from("infrastructure_projects")
    .select("id, org_id")
    .eq("id", fallbackEstimate.project_id)
    .eq("org_id", effectiveOrgId)
    .maybeSingle<ProjectRow>();

  if (projectError) {
    throw new Error(`Failed to validate associated project: ${projectError.message}`);
  }

  if (!project) {
    return null;
  }

  return {
    ...fallbackEstimate,
    org_id: project.org_id,
  };
}

async function validateProjectOrg(
  admin: ReturnType<typeof getAdminClient>,
  projectId: string,
  effectiveOrgId: string
): Promise<ProjectRow> {
  const { data: project, error: projectError } = await admin
    .from("infrastructure_projects")
    .select("id, org_id")
    .eq("id", projectId)
    .eq("org_id", effectiveOrgId)
    .single<ProjectRow>();

  if (projectError) {
    throw new Error(`Failed to validate project: ${projectError.message}`);
  }

  if (!project) {
    throw new Error("Associated project not found in your org.");
  }

  return project;
}

function canVendorEditEstimate(currentStatus: string) {
  return currentStatus === "draft" || currentStatus === "rejected";
}

/* =========================================================
   POST
========================================================= */

export async function POST(req: Request) {
  const admin = getAdminClient();
  const anon = getAnonClient();

  try {
    const token = resolveToken(req);

    if (!token) {
      return buildError("Unauthorized", 401);
    }

    const {
      data: { user },
      error: userError,
    } = await anon.auth.getUser(token);

    if (userError || !user) {
      return buildError("Unauthorized", 401, userError?.message || null);
    }

    const body = (await req.json()) as UpdateEstimateBody;

    const estimateId = normalizeUuid(body.id);
    const requestedStatus =
      body.status === undefined ? undefined : normalizeStatus(body.status);
    const notes = body.notes === undefined ? undefined : normalizeText(body.notes);
    const reviewNotes =
      body.review_notes === undefined ? undefined : normalizeText(body.review_notes);
    const siteVisitId =
      body.site_visit_id === undefined ? undefined : normalizeUuid(body.site_visit_id);

    const laborCost =
      body.labor_cost === undefined ? undefined : normalizeMoney(body.labor_cost);

    const materialCost =
      body.material_cost === undefined ? undefined : normalizeMoney(body.material_cost);

    const totalCost =
      body.total_cost === undefined ? undefined : normalizeMoney(body.total_cost);

    if (!estimateId) {
      return buildError("id is required", 400);
    }

    if (body.status !== undefined && !requestedStatus) {
      return buildError(
        "status must be one of: draft, submitted, approved, rejected",
        400
      );
    }

    if (body.labor_cost !== undefined && laborCost === null) {
      return buildError("labor_cost must be a valid number", 400);
    }

    if (body.material_cost !== undefined && materialCost === null) {
      return buildError("material_cost must be a valid number", 400);
    }

    if (body.total_cost !== undefined && totalCost === null) {
      return buildError("total_cost must be a valid number", 400);
    }

    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("id, org_id, role, account_type, email")
      .eq("id", user.id)
      .single<ProfileRow>();

    if (profileError || !profile) {
      return buildError(
        "Profile not found for authenticated user",
        403,
        profileError?.message || null
      );
    }

    const effectiveOrgId = await resolveEffectiveOrgId(profile);

    if (!effectiveOrgId) {
      return buildError("Profile is missing org context", 403);
    }

    const adminRole = isAdminRole(profile.role);
    const vendorAccess = isVendorUser(profile);

    if (!adminRole && !vendorAccess) {
      return buildError("User is not authorized to update estimates", 403);
    }

    const estimate = await loadEstimateForOrg(admin, estimateId, effectiveOrgId);

    if (!estimate) {
      return buildError("Estimate not found in current org", 404);
    }

    if (!estimate.project_id) {
      return buildError("Estimate is missing project_id", 400);
    }

    const projectRow = await validateProjectOrg(admin, estimate.project_id, effectiveOrgId);

    if (projectRow.org_id !== effectiveOrgId) {
      return buildError("Estimate project org mismatch", 403);
    }

    const currentStatus = normalizeStatus(estimate.status) || "draft";

    let actorVendor: VendorRow | null = null;

    if (!adminRole) {
      actorVendor = await resolveVendorForProfile(admin, profile, effectiveOrgId);

      if (!actorVendor?.id) {
        return buildError(
          "No vendor record is linked to this login. Current schema requires infrastructure_vendors.email to match profiles.email for vendor-scoped estimate updates.",
          403
        );
      }

      if (!estimate.vendor_id) {
        return buildError("Estimate is not linked to a vendor", 403);
      }

      if (estimate.vendor_id !== actorVendor.id) {
        return buildError("You can only update your own estimate records", 403);
      }

      if (!canVendorEditEstimate(currentStatus)) {
        return buildError(
          "Only draft or rejected estimates can be edited by vendor users",
          403
        );
      }

      if (requestedStatus === "approved" || requestedStatus === "rejected") {
        return buildError("Only admin users can approve or reject estimates", 403);
      }

      if (reviewNotes !== undefined) {
        return buildError("Only admin users can update review notes", 403);
      }
    }

    const now = new Date().toISOString();

    const updatePayload: Record<string, unknown> = {
      updated_by: user.id,
      updated_at: now,
    };

    if (notes !== undefined) {
      updatePayload.notes = notes;
    }

    if (siteVisitId !== undefined) {
      updatePayload.site_visit_id = siteVisitId;
    }

    if (laborCost !== undefined || materialCost !== undefined || totalCost !== undefined) {
      const nextLabor =
        laborCost !== undefined ? laborCost : Number(estimate.labor_cost || 0);

      const nextMaterial =
        materialCost !== undefined ? materialCost : Number(estimate.material_cost || 0);

      let nextTotal =
        totalCost !== undefined ? totalCost : Number(estimate.total_cost || 0);

      if (totalCost === undefined && (laborCost !== undefined || materialCost !== undefined)) {
        nextTotal = Number((nextLabor + nextMaterial).toFixed(2));
      }

      updatePayload.labor_cost = Number(nextLabor.toFixed(2));
      updatePayload.material_cost = Number(nextMaterial.toFixed(2));
      updatePayload.total_cost = Number(nextTotal.toFixed(2));
    }

    if (reviewNotes !== undefined && adminRole) {
      updatePayload.review_notes = reviewNotes;
    }

    if (requestedStatus !== undefined) {
      if (adminRole) {
        updatePayload.status = requestedStatus;

        if (requestedStatus === "approved") {
          updatePayload.approved_at = now;
          updatePayload.approved_by = user.id;
          updatePayload.rejected_at = null;
          updatePayload.rejected_by = null;
        } else if (requestedStatus === "rejected") {
          updatePayload.rejected_at = now;
          updatePayload.rejected_by = user.id;
          updatePayload.approved_at = null;
          updatePayload.approved_by = null;
        } else if (requestedStatus === "draft" || requestedStatus === "submitted") {
          updatePayload.approved_at = null;
          updatePayload.approved_by = null;
          updatePayload.rejected_at = null;
          updatePayload.rejected_by = null;
        }
      } else {
        if (requestedStatus !== "draft" && requestedStatus !== "submitted") {
          return buildError(
            "Vendor users may only set status to draft or submitted",
            403
          );
        }

        updatePayload.status = requestedStatus;
      }
    }

    const { data: updatedEstimate, error: updateError } = await admin
      .from("infrastructure_estimates")
      .update(updatePayload)
      .eq("id", estimate.id)
      .select(`
        id,
        org_id,
        project_id,
        vendor_id,
        site_visit_id,
        status,
        notes,
        labor_cost,
        material_cost,
        total_cost,
        created_by,
        updated_by,
        updated_at,
        approved_at,
        approved_by,
        rejected_at,
        rejected_by,
        review_notes
      `)
      .single<EstimateRow>();

    if (updateError || !updatedEstimate) {
      return buildError(
        "Failed to update estimate",
        500,
        updateError?.message || null
      );
    }

    return json(
      {
        ok: true,
        message: "Estimate updated successfully",
        estimate: updatedEstimate,
        workflow: {
          actor_role: profile.role,
          actor_vendor_id: actorVendor?.id || null,
          effective_org_id: effectiveOrgId,
          previous_status: currentStatus,
          new_status: requestedStatus ?? estimate.status,
        },
      },
      200
    );
  } catch (error: any) {
    return buildError(
      "Unexpected server error while updating estimate",
      500,
      error?.message || String(error)
    );
  }
}