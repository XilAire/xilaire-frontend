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
  email?: string | null;
};

type VendorRow = {
  id: string;
  org_id: string;
  email?: string | null;
  company_name?: string | null;
};

type ProjectRow = {
  id: string;
  org_id: string;
};

type SiteVisitRow = {
  id: string;
  org_id: string;
};

type ProjectAssignmentRow = {
  id: string;
  role: string | null;
  vendor_role: string | null;
};

type CreateEstimateBody = {
  project_id?: string;
  site_visit_id?: string | null;
  vendor_id?: string | null;
  labor_cost?: number | string | null;
  material_cost?: number | string | null;
  total_cost?: number | string | null;
  notes?: string | null;
  status?: string | null;
  assigned_task_codes?: string[] | null;
};

/* =========================================================
   HELPERS
========================================================= */

async function resolveToken(req: Request) {
  const authHeader = req.headers.get("authorization");

  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.replace("Bearer ", "").trim();
  }

  const cookieStore = await cookies();

  return (
    cookieStore.get("sb-access-token")?.value ||
    cookieStore.get("sb-access-token.0")?.value ||
    cookieStore.get("sb-access-token.1")?.value ||
    null
  );
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

function isVendorUser(
  profile: Pick<ProfileRow, "role" | "account_type"> | null | undefined
) {
  if (!profile) return false;
  return isVendorAccount(profile.account_type) || isVendorRole(profile.role);
}

function normalizeUuid(value: unknown) {
  if (typeof value !== "string") return null;
  const v = value.trim();
  return v.length ? v : null;
}

function normalizeText(value: unknown) {
  if (typeof value !== "string") return null;
  const v = value.trim();
  return v.length ? v : null;
}

function normalizeEmail(value: unknown) {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  return normalized || null;
}

function normalizeMoney(value: unknown) {
  if (value === null || value === undefined || value === "") return 0;

  const num =
    typeof value === "number"
      ? value
      : typeof value === "string"
      ? Number(value.replace(/,/g, "").trim())
      : NaN;

  if (!Number.isFinite(num)) return null;

  return Number(num.toFixed(2));
}

function normalizeCreateStatus(_value: unknown) {
  return "draft";
}

function normalizeTaskCode(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

function dedupeTaskCodes(values: unknown[]) {
  return Array.from(
    new Set(values.map((value) => normalizeTaskCode(value)).filter(Boolean))
  );
}

function buildAssignedTaskSnapshot(taskCodes: string[]) {
  if (!taskCodes.length) return null;

  return [
    "Assigned Tasks Snapshot:",
    ...taskCodes.map((task) => `- ${task.replace(/_/g, " ")} [${task}]`),
  ].join("\n");
}

function mergeNotesWithTaskSnapshot(params: {
  notes: string | null;
  taskCodes: string[];
}) {
  const baseNotes = params.notes?.trim() || "";
  const snapshot = buildAssignedTaskSnapshot(params.taskCodes);

  if (!snapshot) {
    return baseNotes || null;
  }

  if (!baseNotes) {
    return snapshot;
  }

  return `${baseNotes}\n\n${snapshot}`;
}

function buildError(message: string, status = 400, details?: unknown) {
  return NextResponse.json(
    {
      ok: false,
      error: message,
      details: details ?? null,
    },
    {
      status,
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        Pragma: "no-cache",
        Expires: "0",
        "Surrogate-Control": "no-store",
      },
    }
  );
}

async function resolveVendorForUser(params: {
  admin: ReturnType<typeof getAdminClient>;
  orgId: string;
  authEmail: string | null;
  profileEmail: string | null | undefined;
}) {
  const lookupEmail =
    normalizeEmail(params.authEmail) || normalizeEmail(params.profileEmail);

  if (!lookupEmail) {
    throw new Error("Vendor email is missing from account");
  }

  const { data, error } = await params.admin
    .from("infrastructure_vendors")
    .select("id, org_id, email, company_name")
    .eq("org_id", params.orgId)
    .ilike("email", lookupEmail)
    .limit(2);

  if (error) {
    throw error;
  }

  if (!data || data.length === 0) {
    throw new Error("No infrastructure vendor record found for this vendor account");
  }

  if (data.length > 1) {
    throw new Error(
      "Multiple vendor records match this user. Explicit user-to-vendor mapping is required before vendor estimate creation can continue."
    );
  }

  return data[0] as VendorRow;
}

async function loadVendorAssignments(params: {
  admin: ReturnType<typeof getAdminClient>;
  orgId: string;
  projectId: string;
  vendorId: string;
}) {
  const { data, error } = await params.admin
    .from("infrastructure_project_vendors")
    .select("id, role, vendor_role")
    .eq("org_id", params.orgId)
    .eq("project_id", params.projectId)
    .eq("vendor_id", params.vendorId)
    .order("created_at", { ascending: true });

  if (error) {
    throw error;
  }

  const rows = (data || []) as ProjectAssignmentRow[];

  return {
    rows,
    taskCodes: dedupeTaskCodes(
      rows.flatMap((row) => [row.vendor_role, row.role])
    ),
  };
}

/* =========================================================
   POST
========================================================= */

export async function POST(req: Request) {
  const admin = getAdminClient();
  const anon = getAnonClient();

  try {
    const token = await resolveToken(req);

    if (!token) {
      console.error("ESTIMATE_CREATE_UNAUTHORIZED: missing token");
      return buildError("Unauthorized", 401);
    }

    const {
      data: { user },
      error: userError,
    } = await anon.auth.getUser(token);

    if (userError || !user) {
      console.error("ESTIMATE_CREATE_AUTH_USER_ERROR:", {
        message: userError?.message || null,
      });
      return buildError("Unauthorized", 401, userError?.message || null);
    }

    const body = (await req.json()) as CreateEstimateBody;

    console.log("ESTIMATE_CREATE_REQUEST_BODY:", body);

    const projectId = normalizeUuid(body.project_id);
    const requestedSiteVisitId = normalizeUuid(body.site_visit_id);
    const requestedVendorId = normalizeUuid(body.vendor_id);
    const baseNotes = normalizeText(body.notes);
    const requestedStatus = normalizeCreateStatus(body.status);
    const requestedTaskCodes = dedupeTaskCodes(body.assigned_task_codes || []);

    const laborCost = normalizeMoney(body.labor_cost);
    const materialCost = normalizeMoney(body.material_cost);
    const requestedTotalCost = normalizeMoney(body.total_cost);

    if (!projectId) {
      return buildError("project_id is required", 400);
    }

    if (laborCost === null) {
      return buildError("labor_cost must be a valid number", 400);
    }

    if (materialCost === null) {
      return buildError("material_cost must be a valid number", 400);
    }

    if (requestedTotalCost === null) {
      return buildError("total_cost must be a valid number", 400);
    }

    const computedTotalCost = Number((laborCost + materialCost).toFixed(2));

    if (
      requestedTotalCost !== null &&
      Math.abs(requestedTotalCost - computedTotalCost) > 0.01
    ) {
      return buildError(
        "total_cost must equal labor_cost + material_cost",
        400,
        { expected_total_cost: computedTotalCost }
      );
    }

    const totalCost = computedTotalCost;

    const {
      data: profile,
      error: profileError,
    } = await admin
      .from("profiles")
      .select("id, org_id, role, account_type, email")
      .eq("id", user.id)
      .single<ProfileRow>();

    if (profileError || !profile) {
      console.error("ESTIMATE_CREATE_PROFILE_ERROR:", {
        message: profileError?.message || null,
        code: (profileError as any)?.code || null,
        details: (profileError as any)?.details || null,
        hint: (profileError as any)?.hint || null,
        user_id: user.id,
      });

      return buildError(
        "Profile not found for authenticated user",
        403,
        profileError?.message || null
      );
    }

    if (!profile.org_id) {
      console.error("ESTIMATE_CREATE_PROFILE_MISSING_ORG:", {
        user_id: user.id,
        profile_id: profile.id,
      });
      return buildError("Profile is missing org_id", 403);
    }

    const effectiveOrgId = profile.org_id;
    const adminRole = isAdminRole(profile.role);
    const vendorAccess = isVendorUser(profile);

    console.log("ESTIMATE_CREATE_PROFILE_CONTEXT:", {
      user_id: user.id,
      profile_id: profile.id,
      org_id: effectiveOrgId,
      role: profile.role,
      account_type: profile.account_type,
      adminRole,
      vendorAccess,
    });

    if (!adminRole && !vendorAccess) {
      console.error("ESTIMATE_CREATE_UNAUTHORIZED_ROLE:", {
        user_id: user.id,
        role: profile.role,
        account_type: profile.account_type,
      });

      return buildError(
        "User is not authorized to create vendor estimates",
        403
      );
    }

    const {
      data: project,
      error: projectError,
    } = await admin
      .from("infrastructure_projects")
      .select("id, org_id")
      .eq("id", projectId)
      .eq("org_id", effectiveOrgId)
      .single<ProjectRow>();

    if (projectError || !project) {
      console.error("ESTIMATE_CREATE_PROJECT_ERROR:", {
        message: projectError?.message || null,
        code: (projectError as any)?.code || null,
        details: (projectError as any)?.details || null,
        hint: (projectError as any)?.hint || null,
        project_id: projectId,
        org_id: effectiveOrgId,
      });

      return buildError(
        "Project not found in current org",
        404,
        projectError?.message || null
      );
    }

    let siteVisitId: string | null = null;

    if (requestedSiteVisitId) {
      const {
        data: siteVisit,
        error: siteVisitError,
      } = await admin
        .from("infrastructure_site_visits")
        .select("id, org_id")
        .eq("id", requestedSiteVisitId)
        .eq("org_id", effectiveOrgId)
        .single<SiteVisitRow>();

      if (siteVisitError || !siteVisit) {
        console.error("ESTIMATE_CREATE_SITE_VISIT_ERROR:", {
          message: siteVisitError?.message || null,
          code: (siteVisitError as any)?.code || null,
          details: (siteVisitError as any)?.details || null,
          hint: (siteVisitError as any)?.hint || null,
          site_visit_id: requestedSiteVisitId,
          org_id: effectiveOrgId,
        });

        return buildError(
          "Site visit not found in current org",
          404,
          siteVisitError?.message || null
        );
      }

      siteVisitId = siteVisit.id;
    }

    let resolvedVendorId: string | null = null;

    if (adminRole) {
      if (!requestedVendorId) {
        return buildError("vendor_id is required for admin", 400);
      }

      const {
        data: adminSelectedVendor,
        error: adminVendorError,
      } = await admin
        .from("infrastructure_vendors")
        .select("id, org_id")
        .eq("id", requestedVendorId)
        .eq("org_id", effectiveOrgId)
        .single<VendorRow>();

      if (adminVendorError || !adminSelectedVendor) {
        console.error("ESTIMATE_CREATE_ADMIN_VENDOR_ERROR:", {
          message: adminVendorError?.message || null,
          code: (adminVendorError as any)?.code || null,
          details: (adminVendorError as any)?.details || null,
          hint: (adminVendorError as any)?.hint || null,
          vendor_id: requestedVendorId,
          org_id: effectiveOrgId,
        });

        return buildError(
          "Selected vendor was not found in current org",
          404,
          adminVendorError?.message || null
        );
      }

      resolvedVendorId = adminSelectedVendor.id;
    } else {
      try {
        const resolvedVendor = await resolveVendorForUser({
          admin,
          orgId: effectiveOrgId,
          authEmail: user.email || null,
          profileEmail: profile.email,
        });

        resolvedVendorId = resolvedVendor.id;
      } catch (vendorResolutionError: any) {
        console.error("ESTIMATE_CREATE_VENDOR_LOOKUP_ERROR:", {
          message: vendorResolutionError?.message || null,
          org_id: effectiveOrgId,
          user_id: user.id,
          email: user.email || null,
          profile_email: profile.email || null,
        });

        return buildError(
          vendorResolutionError?.message || "Failed to resolve vendor account",
          403
        );
      }
    }

    if (!resolvedVendorId) {
      return buildError("Unable to resolve vendor for estimate creation", 403);
    }

    let assignmentPayload: { rows: ProjectAssignmentRow[]; taskCodes: string[] };

    try {
      assignmentPayload = await loadVendorAssignments({
        admin,
        orgId: effectiveOrgId,
        projectId: project.id,
        vendorId: resolvedVendorId,
      });
    } catch (assignmentError: any) {
      console.error("ESTIMATE_CREATE_ASSIGNMENT_ERROR:", {
        message: assignmentError?.message || null,
        project_id: project.id,
        vendor_id: resolvedVendorId,
        org_id: effectiveOrgId,
      });

      return buildError(
        "Failed to validate vendor assignment",
        500,
        assignmentError?.message || null
      );
    }

    if (!assignmentPayload.rows.length) {
      console.error("ESTIMATE_CREATE_VENDOR_NOT_ASSIGNED:", {
        org_id: effectiveOrgId,
        project_id: project.id,
        vendor_id: resolvedVendorId,
        user_id: user.id,
      });

      return buildError("Vendor is not assigned to this project", 403);
    }

    if (!assignmentPayload.taskCodes.length) {
      return buildError(
        "No task assignments were found for this vendor on the selected project",
        403
      );
    }

    if (requestedTaskCodes.length) {
      const invalidRequestedTask = requestedTaskCodes.find(
        (task) => !assignmentPayload.taskCodes.includes(task)
      );

      if (invalidRequestedTask) {
        return buildError(
          "assigned_task_codes contains a task not assigned to this vendor on this project",
          400,
          {
            invalid_task: invalidRequestedTask,
            allowed_tasks: assignmentPayload.taskCodes,
          }
        );
      }
    }

    const finalTaskCodes = requestedTaskCodes.length
      ? requestedTaskCodes
      : assignmentPayload.taskCodes;

    const finalNotes = mergeNotesWithTaskSnapshot({
      notes: baseNotes,
      taskCodes: finalTaskCodes,
    });

    const insertPayload = {
      org_id: effectiveOrgId,
      project_id: project.id,
      vendor_id: resolvedVendorId,
      site_visit_id: siteVisitId,
      status: requestedStatus,
      notes: finalNotes,
      labor_cost: laborCost,
      material_cost: materialCost,
      total_cost: totalCost,
      created_by: user.id,
      updated_by: user.id,
    };

    console.log("ESTIMATE_CREATE_INSERT_PAYLOAD:", insertPayload);

    const {
      data: createdEstimate,
      error: insertError,
    } = await admin
      .from("infrastructure_estimates")
      .insert(insertPayload)
      .select("*")
      .single();

    if (insertError || !createdEstimate) {
      const insertDebug = {
        message: insertError?.message || null,
        code: (insertError as any)?.code || null,
        details: (insertError as any)?.details || null,
        hint: (insertError as any)?.hint || null,
        payload: insertPayload,
      };

      console.error("ESTIMATE_CREATE_INSERT_ERROR:", insertDebug);

      return buildError(
        "Failed to create estimate",
        500,
        insertDebug
      );
    }

    console.log("ESTIMATE_CREATE_SUCCESS:", {
      estimate_id: createdEstimate.id,
      project_id: createdEstimate.project_id,
      vendor_id: createdEstimate.vendor_id,
      org_id: createdEstimate.org_id,
      status: createdEstimate.status,
      assigned_task_codes: finalTaskCodes,
    });

    return NextResponse.json(
      {
        ok: true,
        message: "Estimate created successfully",
        estimate: createdEstimate,
        assigned_task_codes: finalTaskCodes,
      },
      {
        status: 201,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
          Pragma: "no-cache",
          Expires: "0",
          "Surrogate-Control": "no-store",
        },
      }
    );
  } catch (error: any) {
    console.error("ESTIMATE_CREATE_UNEXPECTED_ERROR:", {
      message: error?.message || String(error),
      stack: error?.stack || null,
    });

    return buildError(
      "Unexpected server error while creating estimate",
      500,
      error?.message || String(error)
    );
  }
}