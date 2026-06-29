import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
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

if (!SUPABASE_URL) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL_PLATFORM");
if (!SUPABASE_ANON_KEY) throw new Error("Missing NEXT_PUBLIC_SUPABASE_ANON_KEY_PLATFORM");
if (!SUPABASE_SERVICE_ROLE_KEY) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY_PLATFORM");

/* =========================================================
   CLIENTS
========================================================= */

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
};

type ProjectRow = {
  id: string;
  org_id: string;
};

type InsertedAttachmentRow = {
  id: string;
  org_id: string | null;
  estimate_id: string | null;
  vendor_id: string | null;
  file_name?: string | null;
  file_url?: string | null;
  storage_path?: string | null;
  file_path?: string | null;
  content_type?: string | null;
  file_size_bytes?: number | null;
  created_at?: string | null;
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

const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024;

const DEFAULT_BUCKET_CANDIDATES = [
  process.env.SUPABASE_STORAGE_BUCKET_ESTIMATE_ATTACHMENTS,
  process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET_ESTIMATE_ATTACHMENTS,
  "infrastructure-estimate-attachments",
  "estimate-attachments",
  "vendor-estimate-attachments",
].filter(Boolean) as string[];

/* =========================================================
   HELPERS
========================================================= */

function json(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: NO_STORE_HEADERS,
  });
}

function applySupabaseCookies(source: NextResponse, target: NextResponse) {
  for (const cookie of source.cookies.getAll()) {
    target.cookies.set(cookie);
  }
  return target;
}

function jsonWithCookies(
  source: NextResponse,
  body: Record<string, unknown>,
  status = 200
) {
  return applySupabaseCookies(source, json(body, status));
}

function normalizeTextLower(value: string | null | undefined) {
  return String(value || "").trim().toLowerCase();
}

function normalizeEmail(value: unknown) {
  if (typeof value !== "string") return null;
  const v = value.trim().toLowerCase();
  return v.length ? v : null;
}

function normalizeStatus(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

function normalizeUuid(value: unknown) {
  if (typeof value !== "string") return null;
  const v = value.trim();
  return v.length ? v : null;
}

function isAdminRole(role: string | null | undefined) {
  return ADMIN_ROLES.has(normalizeTextLower(role));
}

function isVendorAccount(accountType: string | null | undefined) {
  return normalizeTextLower(accountType) === "vendor";
}

function isVendorRole(role: string | null | undefined) {
  const normalized = normalizeTextLower(role);
  return normalized === "vendor" || normalized === "vendor_admin";
}

function isVendorUser(profile: ProfileRow | null | undefined) {
  if (!profile) return false;
  return isVendorAccount(profile.account_type) || isVendorRole(profile.role);
}

function sanitizeFilename(name: string) {
  const trimmed = String(name || "attachment").trim();
  const cleaned = trimmed
    .replace(/[^\w.\-() ]+/g, "_")
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_");

  return cleaned || "attachment";
}

function buildStoragePath(params: {
  orgId: string;
  estimateId: string;
  vendorId: string | null;
  originalName: string;
}) {
  const timestamp = Date.now();
  const safeName = sanitizeFilename(params.originalName);
  const vendorPart = params.vendorId || "unassigned";
  return `orgs/${params.orgId}/estimates/${params.estimateId}/${vendorPart}/${timestamp}-${safeName}`;
}

function canVendorUpload(status: string | null | undefined) {
  const normalized = normalizeStatus(status || "draft");
  return normalized === "draft" || normalized === "submitted" || normalized === "rejected";
}

async function createAuthClient(stagingResponse: NextResponse) {
  const cookieStore = await cookies();

  return createServerClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
    cookies: {
      getAll() {
        return cookieStore.getAll().map((cookie) => ({
          name: cookie.name,
          value: cookie.value,
        }));
      },
      setAll(cookieList) {
        cookieList.forEach((cookie) => {
          stagingResponse.cookies.set(cookie.name, cookie.value, cookie.options);
        });
      },
    },
  });
}

async function resolveUserProfile(
  supabaseAuth: Awaited<ReturnType<typeof createAuthClient>>
): Promise<ProfileRow> {
  const {
    data: { user },
    error: authError,
  } = await supabaseAuth.auth.getUser();

  if (authError) {
    throw new Error(`Unable to resolve authenticated user: ${authError.message}`);
  }

  if (!user?.id) {
    throw new Error("Authenticated user not found.");
  }

  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("id, org_id, role, account_type, email")
    .eq("id", user.id)
    .single();

  if (profileError) {
    throw new Error(`Unable to load user profile: ${profileError.message}`);
  }

  if (!profile) {
    throw new Error("User profile not found.");
  }

  return profile as ProfileRow;
}

async function resolveEffectiveOrgId(profile: ProfileRow): Promise<string | null> {
  const cookieStore = await cookies();
  const activeOrgId = cookieStore.get("active_org_id")?.value || null;
  return activeOrgId || profile.org_id || null;
}

async function resolveVendorForProfile(
  profile: ProfileRow,
  effectiveOrgId: string
): Promise<VendorRow | null> {
  const email = normalizeEmail(profile.email);

  if (!email) return null;

  const { data, error } = await admin
    .from("infrastructure_vendors")
    .select("id, org_id, email, company_name")
    .eq("org_id", effectiveOrgId)
    .ilike("email", email)
    .maybeSingle();

  if (error) {
    throw new Error(`Unable to resolve vendor record: ${error.message}`);
  }

  return (data as VendorRow | null) || null;
}

async function loadEstimateForOrg(
  estimateId: string,
  effectiveOrgId: string
): Promise<EstimateRow | null> {
  const { data: directEstimate, error: directEstimateError } = await admin
    .from("infrastructure_estimates")
    .select("id, org_id, project_id, vendor_id, status")
    .eq("id", estimateId)
    .eq("org_id", effectiveOrgId)
    .maybeSingle();

  if (directEstimateError) {
    throw new Error(`Failed to load estimate: ${directEstimateError.message}`);
  }

  if (directEstimate) {
    return directEstimate as EstimateRow;
  }

  const { data: fallbackEstimate, error: fallbackEstimateError } = await admin
    .from("infrastructure_estimates")
    .select("id, org_id, project_id, vendor_id, status")
    .eq("id", estimateId)
    .maybeSingle();

  if (fallbackEstimateError) {
    throw new Error(`Failed to load estimate: ${fallbackEstimateError.message}`);
  }

  if (!fallbackEstimate) {
    return null;
  }

  const estimateRow = fallbackEstimate as EstimateRow;

  const { data: project, error: projectError } = await admin
    .from("infrastructure_projects")
    .select("id, org_id")
    .eq("id", estimateRow.project_id)
    .eq("org_id", effectiveOrgId)
    .maybeSingle();

  if (projectError) {
    throw new Error(`Failed to validate associated project: ${projectError.message}`);
  }

  if (!project) {
    return null;
  }

  return {
    ...estimateRow,
    org_id: (project as ProjectRow).org_id,
  };
}

async function validateProjectOrg(projectId: string, effectiveOrgId: string): Promise<ProjectRow> {
  const { data: project, error: projectError } = await admin
    .from("infrastructure_projects")
    .select("id, org_id")
    .eq("id", projectId)
    .eq("org_id", effectiveOrgId)
    .single();

  if (projectError) {
    throw new Error(`Failed to validate project: ${projectError.message}`);
  }

  if (!project) {
    throw new Error("Associated project not found in your org.");
  }

  return project as ProjectRow;
}

async function uploadToBestBucket(params: {
  path: string;
  fileBuffer: Buffer;
  contentType: string;
}) {
  const tried: string[] = [];

  for (const bucket of DEFAULT_BUCKET_CANDIDATES) {
    tried.push(bucket);

    const { error } = await admin.storage
      .from(bucket)
      .upload(params.path, params.fileBuffer, {
        contentType: params.contentType,
        upsert: false,
      });

    if (!error) {
      const publicUrl = admin.storage.from(bucket).getPublicUrl(params.path).data.publicUrl;

      return {
        bucket,
        publicUrl: publicUrl || null,
        storagePath: params.path,
      };
    }
  }

  throw new Error(
    `Upload failed in all candidate buckets. Tried: ${tried.join(", ")}`
  );
}

async function insertAttachmentMetadata(params: {
  orgId: string;
  estimateId: string;
  vendorId: string | null;
  fileName: string;
  fileUrl: string | null;
  storagePath: string;
  contentType: string | null;
  fileSizeBytes: number;
}) {
  const basePayload = {
    org_id: params.orgId,
    estimate_id: params.estimateId,
    vendor_id: params.vendorId,
    file_name: params.fileName,
    file_url: params.fileUrl,
    content_type: params.contentType,
    file_size_bytes: params.fileSizeBytes,
  };

  const attempts = [
    {
      ...basePayload,
      storage_path: params.storagePath,
    },
    {
      ...basePayload,
      file_path: params.storagePath,
    },
  ];

  let lastError: unknown = null;

  for (const payload of attempts) {
    const { data, error } = await admin
      .from("infrastructure_estimate_attachments")
      .insert(payload)
      .select("*")
      .single();

    if (!error && data) {
      return data as InsertedAttachmentRow;
    }

    lastError = error;
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Failed to insert attachment metadata.");
}

/* =========================================================
   POST
========================================================= */

export async function POST(req: Request) {
  const stagingResponse = json({}, 200);

  try {
    const supabaseAuth = await createAuthClient(stagingResponse);
    const profile = await resolveUserProfile(supabaseAuth);
    const effectiveOrgId = await resolveEffectiveOrgId(profile);

    if (!effectiveOrgId) {
      return jsonWithCookies(
        stagingResponse,
        { ok: false, error: "No org context found for this user." },
        403
      );
    }

    const isAdmin = isAdminRole(profile.role);
    const isVendor = isVendorUser(profile);

    if (!isAdmin && !isVendor) {
      return jsonWithCookies(
        stagingResponse,
        { ok: false, error: "User is not authorized to upload estimate attachments." },
        403
      );
    }

    const formData = await req.formData();
    const estimateId = normalizeUuid(formData.get("estimate_id"));
    const file = formData.get("file");

    if (!estimateId) {
      return jsonWithCookies(
        stagingResponse,
        { ok: false, error: "estimate_id is required." },
        400
      );
    }

    if (!(file instanceof File)) {
      return jsonWithCookies(
        stagingResponse,
        { ok: false, error: "file is required." },
        400
      );
    }

    if (file.size <= 0) {
      return jsonWithCookies(
        stagingResponse,
        { ok: false, error: "Uploaded file is empty." },
        400
      );
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return jsonWithCookies(
        stagingResponse,
        {
          ok: false,
          error: `File exceeds maximum size of ${MAX_FILE_SIZE_BYTES} bytes.`,
        },
        400
      );
    }

    const estimateRow = await loadEstimateForOrg(estimateId, effectiveOrgId);

    if (!estimateRow) {
      return jsonWithCookies(
        stagingResponse,
        { ok: false, error: "Estimate not found." },
        404
      );
    }

    const projectRow = await validateProjectOrg(estimateRow.project_id, effectiveOrgId);

    if (projectRow.org_id !== effectiveOrgId) {
      return jsonWithCookies(
        stagingResponse,
        { ok: false, error: "Estimate project org mismatch." },
        403
      );
    }

    let actorVendor: VendorRow | null = null;

    if (!isAdmin) {
      actorVendor = await resolveVendorForProfile(profile, effectiveOrgId);

      if (!actorVendor?.id) {
        return jsonWithCookies(
          stagingResponse,
          {
            ok: false,
            error:
              "No vendor record is linked to this login. Current schema requires infrastructure_vendors.email to match profiles.email for vendor attachment uploads.",
          },
          403
        );
      }

      if (!estimateRow.vendor_id) {
        return jsonWithCookies(
          stagingResponse,
          { ok: false, error: "Estimate is not linked to a vendor." },
          403
        );
      }

      if (estimateRow.vendor_id !== actorVendor.id) {
        return jsonWithCookies(
          stagingResponse,
          { ok: false, error: "You can only upload files to your own estimate records." },
          403
        );
      }

      if (!canVendorUpload(estimateRow.status)) {
        return jsonWithCookies(
          stagingResponse,
          {
            ok: false,
            error: "Attachments can only be uploaded for draft, submitted, or rejected estimates.",
          },
          403
        );
      }
    }

    const contentType = file.type || "application/octet-stream";
    const originalFileName = sanitizeFilename(file.name || "attachment");
    const storagePath = buildStoragePath({
      orgId: effectiveOrgId,
      estimateId: estimateRow.id,
      vendorId: estimateRow.vendor_id || actorVendor?.id || null,
      originalName: originalFileName,
    });

    const fileBuffer = Buffer.from(await file.arrayBuffer());

    const uploadResult = await uploadToBestBucket({
      path: storagePath,
      fileBuffer,
      contentType,
    });

    const insertedAttachment = await insertAttachmentMetadata({
      orgId: effectiveOrgId,
      estimateId: estimateRow.id,
      vendorId: estimateRow.vendor_id || actorVendor?.id || null,
      fileName: originalFileName,
      fileUrl: uploadResult.publicUrl,
      storagePath: uploadResult.storagePath,
      contentType,
      fileSizeBytes: file.size,
    });

    await admin
      .from("infrastructure_estimates")
      .update({
        updated_by: profile.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", estimateRow.id);

    return jsonWithCookies(
      stagingResponse,
      {
        ok: true,
        message: "Estimate attachment uploaded successfully.",
        attachment: insertedAttachment,
        storage: {
          bucket: uploadResult.bucket,
          path: uploadResult.storagePath,
          public_url: uploadResult.publicUrl,
        },
        workflow: {
          actor_role: profile.role,
          actor_vendor_id: actorVendor?.id || null,
          effective_org_id: effectiveOrgId,
          estimate_id: estimateRow.id,
          estimate_status: estimateRow.status || "draft",
        },
      },
      201
    );
  } catch (error: any) {
    console.error("ESTIMATE_UPLOAD_ROUTE_ERROR", error);

    return jsonWithCookies(
      stagingResponse,
      {
        ok: false,
        error: error?.message || "Unexpected error while uploading estimate attachment.",
      },
      500
    );
  }
}