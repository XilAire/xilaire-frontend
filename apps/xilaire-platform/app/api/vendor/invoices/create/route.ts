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

type ProjectRow = {
  id: string;
  org_id: string;
};

type EstimateRow = {
  id: string;
  org_id: string | null;
  project_id: string;
  vendor_id: string | null;
  estimate_number: string | null;
  status: string | null;
  labor_cost: number | null;
  material_cost: number | null;
  total_cost: number | null;
  notes: string | null;
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
  notes: string | null;
  created_at?: string | null;
};

type NormalizedInvoiceItem = {
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
};

type CreateInvoiceBody = {
  project_id?: string;
  estimate_id?: string | null;
  vendor_id?: string | null;
  invoice_number?: string | null;
  status?: string | null;
  subtotal?: number | string | null;
  tax?: number | string | null;
  total?: number | string | null;
  issued_at?: string | null;
  due_at?: string | null;
  notes?: string | null;
  items?:
    | Array<{
        description?: string | null;
        quantity?: number | string | null;
        unit_price?: number | string | null;
        total?: number | string | null;
      }>
    | null;
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

function roundMoney(value: number) {
  return Number(value.toFixed(2));
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

  return roundMoney(parsed);
}

function normalizeNumber(value: unknown) {
  if (value === null || value === undefined || value === "") return null;

  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string"
      ? Number(value.replace(/,/g, "").trim())
      : NaN;

  if (!Number.isFinite(parsed)) return null;

  return Number(parsed);
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

function normalizeInvoiceCreateStatus(value: unknown) {
  const normalized = normalizeTextLower(String(value || "draft"));
  return normalized === "submitted" ? "submitted" : "draft";
}

function buildInvoiceNumber(params: {
  estimateNumber: string | null;
  projectId: string;
}) {
  const suffix = Date.now().toString().slice(-6);
  const estimatePart = params.estimateNumber?.trim() || "EST";
  const projectPart = params.projectId.slice(0, 8).toUpperCase();
  return `INV-${estimatePart}-${projectPart}-${suffix}`;
}

function normalizeInvoiceItems(
  rawItems: CreateInvoiceBody["items"]
): NormalizedInvoiceItem[] {
  const bodyItems = Array.isArray(rawItems) ? rawItems : [];

  return bodyItems
    .map((item, index) => {
      const description = normalizeOptionalText(item?.description);
      const quantityRawProvided = item?.quantity !== undefined;
      const unitPriceRawProvided = item?.unit_price !== undefined;
      const totalRawProvided = item?.total !== undefined;

      const quantity = normalizeNumber(item?.quantity);
      const unitPrice = normalizeMoney(item?.unit_price);
      const explicitTotal = normalizeMoney(item?.total);

      if (
        !description &&
        quantity === null &&
        unitPrice === null &&
        explicitTotal === null
      ) {
        return null;
      }

      if (!description) {
        throw new Error(`Invoice item ${index + 1} must include a description.`);
      }

      if (quantityRawProvided && quantity === null) {
        throw new Error(`Invoice item ${index + 1} quantity must be a valid number.`);
      }

      if (unitPriceRawProvided && unitPrice === null) {
        throw new Error(`Invoice item ${index + 1} unit_price must be a valid number.`);
      }

      if (totalRawProvided && explicitTotal === null) {
        throw new Error(`Invoice item ${index + 1} total must be a valid number.`);
      }

      const safeQuantity = quantity ?? 1;
      const safeUnitPrice = unitPrice ?? 0;

      if (safeQuantity <= 0) {
        throw new Error(`Invoice item ${index + 1} quantity must be greater than 0.`);
      }

      if (safeUnitPrice < 0) {
        throw new Error(`Invoice item ${index + 1} unit_price cannot be negative.`);
      }

      const computedLineTotal = roundMoney(safeQuantity * safeUnitPrice);

      if (explicitTotal !== null && explicitTotal < 0) {
        throw new Error(`Invoice item ${index + 1} total cannot be negative.`);
      }

      if (
        explicitTotal !== null &&
        Math.abs(explicitTotal - computedLineTotal) > 0.01
      ) {
        throw new Error(
          `Invoice item ${index + 1} total does not match quantity × unit_price.`
        );
      }

      return {
        description,
        quantity: safeQuantity,
        unit_price: safeUnitPrice,
        total: computedLineTotal,
      };
    })
    .filter(Boolean) as NormalizedInvoiceItem[];
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

async function validateProjectOrg(
  projectId: string,
  effectiveOrgId: string
): Promise<ProjectRow> {
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

async function loadEstimateForOrg(
  estimateId: string,
  effectiveOrgId: string
): Promise<EstimateRow | null> {
  const { data: estimate, error } = await admin
    .from("infrastructure_estimates")
    .select(`
      id,
      org_id,
      project_id,
      vendor_id,
      estimate_number,
      status,
      labor_cost,
      material_cost,
      total_cost,
      notes
    `)
    .eq("id", estimateId)
    .eq("org_id", effectiveOrgId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load estimate: ${error.message}`);
  }

  return (estimate as EstimateRow | null) || null;
}

async function validateVendorInOrg(
  vendorId: string,
  effectiveOrgId: string
): Promise<VendorRow> {
  const { data, error } = await admin
    .from("infrastructure_vendors")
    .select("id, org_id, email, company_name")
    .eq("id", vendorId)
    .eq("org_id", effectiveOrgId)
    .single();

  if (error) {
    throw new Error(`Failed to validate vendor: ${error.message}`);
  }

  if (!data) {
    throw new Error("Vendor not found in current org.");
  }

  return data as VendorRow;
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

async function findExistingInvoiceForEstimate(params: {
  estimateId: string;
  effectiveOrgId: string;
}) {
  const { data, error } = await admin
    .from("infrastructure_invoices")
    .select("id, org_id, estimate_id, invoice_number, status")
    .eq("estimate_id", params.estimateId)
    .eq("org_id", params.effectiveOrgId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to check for existing invoice: ${error.message}`);
  }

  return data;
}

async function findExistingInvoiceNumber(params: {
  invoiceNumber: string;
  effectiveOrgId: string;
}) {
  const { data, error } = await admin
    .from("infrastructure_invoices")
    .select("id, invoice_number")
    .eq("org_id", params.effectiveOrgId)
    .eq("invoice_number", params.invoiceNumber)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to validate invoice number uniqueness: ${error.message}`);
  }

  return data;
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
        { ok: false, error: "User is not authorized to create invoices." },
        403
      );
    }

    const body = (await req.json()) as CreateInvoiceBody;

    const projectId = normalizeUuid(body.project_id);
    const estimateId = normalizeUuid(body.estimate_id);
    const requestedVendorId = normalizeUuid(body.vendor_id);
    const notes = normalizeOptionalText(body.notes);
    const invoiceNumberInput = normalizeOptionalText(body.invoice_number);
    const status = normalizeInvoiceCreateStatus(body.status);
    const issuedAt = normalizeOptionalDate(body.issued_at) || new Date().toISOString();
    const dueAt = normalizeOptionalDate(body.due_at);

    if (!projectId) {
      return jsonWithCookies(
        stagingResponse,
        { ok: false, error: "project_id is required." },
        400
      );
    }

    await validateProjectOrg(projectId, effectiveOrgId);

    let actorVendor: VendorRow | null = null;
    let resolvedVendorId: string | null = null;
    let estimateRow: EstimateRow | null = null;

    if (estimateId) {
      estimateRow = await loadEstimateForOrg(estimateId, effectiveOrgId);

      if (!estimateRow) {
        return jsonWithCookies(
          stagingResponse,
          { ok: false, error: "Estimate not found in current org." },
          404
        );
      }

      if (estimateRow.project_id !== projectId) {
        return jsonWithCookies(
          stagingResponse,
          { ok: false, error: "Estimate does not belong to the selected project." },
          400
        );
      }

      if (normalizeTextLower(estimateRow.status) !== "approved") {
        return jsonWithCookies(
          stagingResponse,
          { ok: false, error: "Invoices can only be created from approved estimates." },
          403
        );
      }

      const existingInvoice = await findExistingInvoiceForEstimate({
        estimateId,
        effectiveOrgId,
      });

      if (existingInvoice?.id) {
        return jsonWithCookies(
          stagingResponse,
          {
            ok: false,
            error: "An invoice already exists for this estimate.",
            existing_invoice_id: existingInvoice.id,
          },
          409
        );
      }

      if (!estimateRow.vendor_id) {
        return jsonWithCookies(
          stagingResponse,
          {
            ok: false,
            error: "Approved estimate is missing vendor ownership.",
          },
          400
        );
      }

      resolvedVendorId = estimateRow.vendor_id;
    }

    if (isAdmin) {
      if (!estimateId) {
        if (requestedVendorId) {
          resolvedVendorId = requestedVendorId;
        }

        if (!resolvedVendorId) {
          return jsonWithCookies(
            stagingResponse,
            { ok: false, error: "vendor_id is required for invoice creation." },
            400
          );
        }
      } else if (
        requestedVendorId &&
        resolvedVendorId &&
        requestedVendorId !== resolvedVendorId
      ) {
        return jsonWithCookies(
          stagingResponse,
          {
            ok: false,
            error: "vendor_id cannot override the vendor assigned to the estimate.",
          },
          400
        );
      }
    } else {
      actorVendor = await resolveVendorForProfile(profile, effectiveOrgId);

      if (!actorVendor?.id) {
        return jsonWithCookies(
          stagingResponse,
          {
            ok: false,
            error:
              "No vendor record is linked to this login. Current schema requires infrastructure_vendors.email to match profiles.email for vendor invoice creation.",
          },
          403
        );
      }

      resolvedVendorId = actorVendor.id;
    }

    if (!resolvedVendorId) {
      return jsonWithCookies(
        stagingResponse,
        { ok: false, error: "Unable to resolve vendor for invoice creation." },
        403
      );
    }

    await validateVendorInOrg(resolvedVendorId, effectiveOrgId);

    const assignment = await validateVendorProjectAssignment({
      vendorId: resolvedVendorId,
      projectId,
      effectiveOrgId,
    });

    if (!assignment) {
      return jsonWithCookies(
        stagingResponse,
        { ok: false, error: "Vendor is not assigned to this project." },
        403
      );
    }

    if (!isAdmin && estimateRow?.vendor_id && estimateRow.vendor_id !== resolvedVendorId) {
      return jsonWithCookies(
        stagingResponse,
        { ok: false, error: "You can only invoice your own approved estimates." },
        403
      );
    }

    let normalizedItems: NormalizedInvoiceItem[] = [];

    try {
      normalizedItems = normalizeInvoiceItems(body.items);
    } catch (itemError: any) {
      return jsonWithCookies(
        stagingResponse,
        {
          ok: false,
          error: itemError?.message || "Invalid invoice items.",
        },
        400
      );
    }

    const estimateDerivedItems =
      !normalizedItems.length && estimateRow
        ? [
            {
              description: `Estimate ${estimateRow.estimate_number || estimateRow.id}`,
              quantity: 1,
              unit_price: roundMoney(Number(estimateRow.total_cost || 0)),
              total: roundMoney(Number(estimateRow.total_cost || 0)),
            },
          ]
        : [];

    const invoiceItems = normalizedItems.length ? normalizedItems : estimateDerivedItems;

    if (!invoiceItems.length) {
      return jsonWithCookies(
        stagingResponse,
        { ok: false, error: "At least one invoice item is required." },
        400
      );
    }

    const requestedSubtotal =
      body.subtotal === undefined ? undefined : normalizeMoney(body.subtotal);

    const requestedTax = body.tax === undefined ? undefined : normalizeMoney(body.tax);

    const requestedTotal =
      body.total === undefined ? undefined : normalizeMoney(body.total);

    if (body.subtotal !== undefined && requestedSubtotal === null) {
      return jsonWithCookies(
        stagingResponse,
        { ok: false, error: "subtotal must be a valid number." },
        400
      );
    }

    if (body.tax !== undefined && requestedTax === null) {
      return jsonWithCookies(
        stagingResponse,
        { ok: false, error: "tax must be a valid number." },
        400
      );
    }

    if (body.total !== undefined && requestedTotal === null) {
      return jsonWithCookies(
        stagingResponse,
        { ok: false, error: "total must be a valid number." },
        400
      );
    }

    if (requestedSubtotal !== undefined && requestedSubtotal < 0) {
      return jsonWithCookies(
        stagingResponse,
        { ok: false, error: "subtotal cannot be negative." },
        400
      );
    }

    if (requestedTax !== undefined && requestedTax < 0) {
      return jsonWithCookies(
        stagingResponse,
        { ok: false, error: "tax cannot be negative." },
        400
      );
    }

    if (requestedTotal !== undefined && requestedTotal < 0) {
      return jsonWithCookies(
        stagingResponse,
        { ok: false, error: "total cannot be negative." },
        400
      );
    }

    const itemsSubtotal = roundMoney(
      invoiceItems.reduce((sum, item) => sum + item.total, 0)
    );

    if (
      requestedSubtotal !== undefined &&
      Math.abs(requestedSubtotal - itemsSubtotal) > 0.01
    ) {
      return jsonWithCookies(
        stagingResponse,
        {
          ok: false,
          error: "subtotal must match the sum of invoice items.",
          expected_subtotal: itemsSubtotal,
        },
        400
      );
    }

    const subtotal = itemsSubtotal;
    const tax = requestedTax ?? 0;
    const computedTotal = roundMoney(subtotal + tax);

    if (
      requestedTotal !== undefined &&
      Math.abs(requestedTotal - computedTotal) > 0.01
    ) {
      return jsonWithCookies(
        stagingResponse,
        {
          ok: false,
          error: "total must equal subtotal + tax.",
          expected_total: computedTotal,
        },
        400
      );
    }

    const total = computedTotal;

    const invoiceNumber =
      invoiceNumberInput ||
      buildInvoiceNumber({
        estimateNumber: estimateRow?.estimate_number || null,
        projectId,
      });

    const existingInvoiceNumber = await findExistingInvoiceNumber({
      invoiceNumber,
      effectiveOrgId,
    });

    if (existingInvoiceNumber?.id) {
      return jsonWithCookies(
        stagingResponse,
        {
          ok: false,
          error: "invoice_number already exists in this organization.",
          existing_invoice_id: existingInvoiceNumber.id,
        },
        409
      );
    }

    const invoiceInsertPayload = {
      org_id: effectiveOrgId,
      vendor_id: resolvedVendorId,
      project_id: projectId,
      estimate_id: estimateId,
      invoice_number: invoiceNumber,
      status,
      subtotal,
      tax,
      total,
      issued_at: issuedAt,
      due_at: dueAt,
      notes,
      created_by: profile.id,
      updated_by: profile.id,
    };

    const { data: createdInvoice, error: invoiceInsertError } = await admin
      .from("infrastructure_invoices")
      .insert(invoiceInsertPayload)
      .select("*")
      .single();

    if (invoiceInsertError || !createdInvoice) {
      return jsonWithCookies(
        stagingResponse,
        {
          ok: false,
          error: "Failed to create invoice.",
          details: invoiceInsertError?.message || null,
        },
        500
      );
    }

    const itemInsertPayload = invoiceItems.map((item) => ({
      org_id: effectiveOrgId,
      invoice_id: createdInvoice.id,
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unit_price,
      total: item.total,
      created_by: profile.id,
      updated_by: profile.id,
    }));

    const { data: createdItems, error: itemInsertError } = await admin
      .from("infrastructure_invoice_items")
      .insert(itemInsertPayload)
      .select("*");

    if (itemInsertError) {
      await admin.from("infrastructure_invoices").delete().eq("id", createdInvoice.id);

      return jsonWithCookies(
        stagingResponse,
        {
          ok: false,
          error: "Invoice was created but invoice items failed. Invoice was rolled back.",
          details: itemInsertError.message,
        },
        500
      );
    }

    return jsonWithCookies(
      stagingResponse,
      {
        ok: true,
        message: "Invoice created successfully.",
        invoice: createdInvoice as InvoiceRow,
        items: createdItems || [],
        workflow: {
          actor_role: profile.role,
          actor_vendor_id: actorVendor?.id || null,
          effective_org_id: effectiveOrgId,
          source_estimate_id: estimateId,
          project_id: projectId,
          vendor_id: resolvedVendorId,
        },
      },
      201
    );
  } catch (error: any) {
    console.error("INVOICE_CREATE_ROUTE_ERROR", error);

    return jsonWithCookies(
      stagingResponse,
      {
        ok: false,
        error: error?.message || "Unexpected error while creating invoice.",
      },
      500
    );
  }
}