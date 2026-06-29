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

type InvoiceRow = {
  id: string;
  org_id: string | null;
  vendor_id: string | null;
  project_id: string;
  estimate_id: string | null;
  invoice_number: string | null;
  status: string | null;
  subtotal: number | null;
  tax: number | null;
  total: number | null;
  issued_at: string | null;
  due_at: string | null;
  paid_at: string | null;
  notes: string | null;
  updated_at?: string | null;
  updated_by?: string | null;
};

type ProjectRow = {
  id: string;
  org_id: string;
};

type StatusRequestBody = {
  invoice_id?: string;
  status?: string;
  paid_at?: string | null;
  notes?: string | null;
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

const INVOICE_STATUSES = new Set([
  "draft",
  "submitted",
  "approved",
  "paid",
  "cancelled",
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

function normalizeUuid(value: unknown) {
  if (typeof value !== "string") return null;
  const v = value.trim();
  return v.length ? v : null;
}

function normalizeOptionalText(value: unknown) {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text.length ? text : null;
}

function normalizeOptionalDate(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const raw = String(value).trim();
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function normalizeInvoiceStatus(value: unknown) {
  const normalized = normalizeTextLower(String(value || ""));
  return INVOICE_STATUSES.has(normalized) ? normalized : null;
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

function canVendorTransition(current: string, next: string) {
  if (current === next) return true;
  if (current === "draft" && next === "submitted") return true;
  if (current === "submitted" && next === "draft") return true;
  return false;
}

function canAdminTransition(current: string, next: string) {
  if (current === next) return true;

  if (current === "draft" && next === "submitted") return true;
  if (current === "submitted" && next === "approved") return true;
  if (current === "submitted" && next === "draft") return true;
  if (current === "approved" && next === "paid") return true;
  if (current === "approved" && next === "cancelled") return true;
  if (current === "approved" && next === "draft") return true;
  if (current === "paid" && next === "draft") return true;
  if (current === "cancelled" && next === "draft") return true;

  return false;
}

/* =========================================================
   AUTH / CONTEXT
========================================================= */

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

/* =========================================================
   LOADERS / VALIDATORS
========================================================= */

async function loadInvoiceForOrg(
  invoiceId: string,
  effectiveOrgId: string
): Promise<InvoiceRow | null> {
  const { data: invoice, error } = await admin
    .from("infrastructure_invoices")
    .select(`
      id,
      org_id,
      vendor_id,
      project_id,
      estimate_id,
      invoice_number,
      status,
      subtotal,
      tax,
      total,
      issued_at,
      due_at,
      paid_at,
      notes,
      updated_at,
      updated_by
    `)
    .eq("id", invoiceId)
    .eq("org_id", effectiveOrgId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load invoice: ${error.message}`);
  }

  return (invoice as InvoiceRow | null) || null;
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

async function validateVendorProjectAssignment(params: {
  vendorId: string;
  projectId: string;
  effectiveOrgId: string;
}) {
  const { data, error } = await admin
    .from("infrastructure_project_vendors")
    .select("id")
    .eq("org_id", params.effectiveOrgId)
    .eq("project_id", params.projectId)
    .eq("vendor_id", params.vendorId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to validate vendor project assignment: ${error.message}`);
  }

  return data;
}

/* =========================================================
   POST
========================================================= */

export async function POST(req: Request) {
  const stagingResponse = json({}, 200);

  try {
    const body = (await req.json()) as StatusRequestBody;

    const invoiceId = normalizeUuid(body?.invoice_id);
    const nextStatus = normalizeInvoiceStatus(body?.status);
    const paidAt = normalizeOptionalDate(body?.paid_at);
    const notes = normalizeOptionalText(body?.notes);

    if (!invoiceId) {
      return jsonWithCookies(
        stagingResponse,
        { ok: false, error: "invoice_id is required." },
        400
      );
    }

    if (!nextStatus) {
      return jsonWithCookies(
        stagingResponse,
        { ok: false, error: "status is required and must be valid." },
        400
      );
    }

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
        { ok: false, error: "User is not authorized to update invoice status." },
        403
      );
    }

    const invoice = await loadInvoiceForOrg(invoiceId, effectiveOrgId);

    if (!invoice) {
      return jsonWithCookies(
        stagingResponse,
        { ok: false, error: "Invoice not found in current org." },
        404
      );
    }

    await validateProjectOrg(invoice.project_id, effectiveOrgId);

    const currentStatus = normalizeTextLower(invoice.status || "draft");

    let actorVendor: VendorRow | null = null;

    if (!isAdmin) {
      actorVendor = await resolveVendorForProfile(profile, effectiveOrgId);

      if (!actorVendor?.id) {
        return jsonWithCookies(
          stagingResponse,
          {
            ok: false,
            error:
              "No vendor record is linked to this login. Current schema requires infrastructure_vendors.email to match profiles.email for vendor invoice status updates.",
          },
          403
        );
      }

      if (!invoice.vendor_id) {
        return jsonWithCookies(
          stagingResponse,
          { ok: false, error: "Invoice is not linked to a vendor." },
          403
        );
      }

      if (invoice.vendor_id !== actorVendor.id) {
        return jsonWithCookies(
          stagingResponse,
          { ok: false, error: "You can only act on your own invoice records." },
          403
        );
      }

      const assignment = await validateVendorProjectAssignment({
        vendorId: actorVendor.id,
        projectId: invoice.project_id,
        effectiveOrgId,
      });

      if (!assignment) {
        return jsonWithCookies(
          stagingResponse,
          { ok: false, error: "Vendor is not assigned to this project." },
          403
        );
      }

      if (!canVendorTransition(currentStatus, nextStatus)) {
        return jsonWithCookies(
          stagingResponse,
          {
            ok: false,
            error: `Invalid vendor transition from ${currentStatus} to ${nextStatus}.`,
          },
          400
        );
      }

      if (paidAt !== null) {
        return jsonWithCookies(
          stagingResponse,
          { ok: false, error: "Vendor users cannot set paid_at." },
          403
        );
      }
    } else {
      if (!canAdminTransition(currentStatus, nextStatus)) {
        return jsonWithCookies(
          stagingResponse,
          {
            ok: false,
            error: `Invalid admin transition from ${currentStatus} to ${nextStatus}.`,
          },
          400
        );
      }
    }

    const now = new Date().toISOString();

    const updatePayload: Record<string, unknown> = {
      status: nextStatus,
      updated_by: profile.id,
      updated_at: now,
    };

    if (notes !== null) {
      updatePayload.notes = notes;
    }

    if (isAdmin) {
      if (nextStatus === "paid") {
        updatePayload.paid_at = paidAt || now;
      } else if (nextStatus !== "paid") {
        updatePayload.paid_at = null;
      }
    }

    const { data: updatedInvoice, error: updateError } = await admin
      .from("infrastructure_invoices")
      .update(updatePayload)
      .eq("id", invoice.id)
      .eq("org_id", effectiveOrgId)
      .select(`
        id,
        org_id,
        vendor_id,
        project_id,
        estimate_id,
        invoice_number,
        status,
        subtotal,
        tax,
        total,
        issued_at,
        due_at,
        paid_at,
        notes,
        updated_at,
        updated_by
      `)
      .single();

    if (updateError || !updatedInvoice) {
      return jsonWithCookies(
        stagingResponse,
        {
          ok: false,
          error: "Failed to update invoice status.",
          details: updateError?.message || null,
        },
        500
      );
    }

    return jsonWithCookies(
      stagingResponse,
      {
        ok: true,
        message: "Invoice status updated successfully.",
        invoice: updatedInvoice,
        workflow: {
          actor_role: profile.role,
          actor_vendor_id: actorVendor?.id || null,
          effective_org_id: effectiveOrgId,
          invoice_id: invoice.id,
          previous_status: currentStatus,
          new_status: nextStatus,
        },
      },
      200
    );
  } catch (error: any) {
    console.error("INVOICE_STATUS_ROUTE_ERROR", error);

    return jsonWithCookies(
      stagingResponse,
      {
        ok: false,
        error: error?.message || "Unexpected error while updating invoice status.",
      },
      500
    );
  }
}