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
  status: string | null;
  estimate_number: string | null;
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
};

type InvoiceItemInput = {
  id?: string | null;
  description?: string | null;
  quantity?: number | string | null;
  unit_price?: number | string | null;
  total?: number | string | null;
};

type UpdateInvoiceBody = {
  id?: string;
  invoice_number?: string | null;
  status?: string | null;
  subtotal?: number | string | null;
  tax?: number | string | null;
  total?: number | string | null;
  issued_at?: string | null;
  due_at?: string | null;
  paid_at?: string | null;
  notes?: string | null;
  items?: InvoiceItemInput[] | null;
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

function normalizePositiveNumber(value: unknown) {
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

function canVendorEditInvoice(status: string | null | undefined) {
  const normalized = normalizeTextLower(status || "draft");
  return normalized === "draft" || normalized === "submitted";
}

function canVendorSetStatus(nextStatus: string) {
  return nextStatus === "draft" || nextStatus === "submitted";
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
      notes
    `)
    .eq("id", invoiceId)
    .eq("org_id", effectiveOrgId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load invoice: ${error.message}`);
  }

  return (invoice as InvoiceRow | null) || null;
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
      status,
      estimate_number
    `)
    .eq("id", estimateId)
    .eq("org_id", effectiveOrgId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load estimate: ${error.message}`);
  }

  return (estimate as EstimateRow | null) || null;
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

async function replaceInvoiceItems(params: {
  invoiceId: string;
  effectiveOrgId: string;
  actorId: string;
  items: Array<{
    description: string;
    quantity: number;
    unit_price: number;
    total: number;
  }>;
}) {
  await admin
    .from("infrastructure_invoice_items")
    .delete()
    .eq("invoice_id", params.invoiceId)
    .eq("org_id", params.effectiveOrgId);

  if (!params.items.length) {
    return [];
  }

  const insertPayload = params.items.map((item) => ({
    org_id: params.effectiveOrgId,
    invoice_id: params.invoiceId,
    description: item.description,
    quantity: item.quantity,
    unit_price: item.unit_price,
    total: item.total,
    created_by: params.actorId,
    updated_by: params.actorId,
  }));

  const { data, error } = await admin
    .from("infrastructure_invoice_items")
    .insert(insertPayload)
    .select("*");

  if (error) {
    throw new Error(`Failed to replace invoice items: ${error.message}`);
  }

  return data || [];
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
        { ok: false, error: "User is not authorized to update invoices." },
        403
      );
    }

    const body = (await req.json()) as UpdateInvoiceBody;
    const invoiceId = normalizeUuid(body.id);

    if (!invoiceId) {
      return jsonWithCookies(
        stagingResponse,
        { ok: false, error: "id is required." },
        400
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

    let actorVendor: VendorRow | null = null;

    if (!isAdmin) {
      actorVendor = await resolveVendorForProfile(profile, effectiveOrgId);

      if (!actorVendor?.id) {
        return jsonWithCookies(
          stagingResponse,
          {
            ok: false,
            error:
              "No vendor record is linked to this login. Current schema requires infrastructure_vendors.email to match profiles.email for vendor invoice updates.",
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
          { ok: false, error: "You can only update your own invoice records." },
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

      if (!canVendorEditInvoice(invoice.status)) {
        return jsonWithCookies(
          stagingResponse,
          { ok: false, error: "Only draft or submitted invoices can be edited by vendor users." },
          403
        );
      }
    }

    if (invoice.estimate_id) {
      const estimate = await loadEstimateForOrg(invoice.estimate_id, effectiveOrgId);

      if (!estimate) {
        return jsonWithCookies(
          stagingResponse,
          { ok: false, error: "Linked estimate not found in current org." },
          404
        );
      }

      if (estimate.project_id !== invoice.project_id) {
        return jsonWithCookies(
          stagingResponse,
          { ok: false, error: "Linked estimate project does not match invoice project." },
          400
        );
      }

      if (!isAdmin && estimate.vendor_id && estimate.vendor_id !== actorVendor?.id) {
        return jsonWithCookies(
          stagingResponse,
          { ok: false, error: "You can only update invoices linked to your own estimate records." },
          403
        );
      }
    }

    const requestedStatus =
      body.status === undefined ? undefined : normalizeInvoiceStatus(body.status);

    if (body.status !== undefined && !requestedStatus) {
      return jsonWithCookies(
        stagingResponse,
        { ok: false, error: "Invalid invoice status." },
        400
      );
    }

    if (!isAdmin && requestedStatus && !canVendorSetStatus(requestedStatus)) {
      return jsonWithCookies(
        stagingResponse,
        { ok: false, error: "Vendor users may only set invoice status to draft or submitted." },
        403
      );
    }

    const invoiceNumber =
      body.invoice_number === undefined ? undefined : normalizeOptionalText(body.invoice_number);

    const notes =
      body.notes === undefined ? undefined : normalizeOptionalText(body.notes);

    const issuedAt =
      body.issued_at === undefined ? undefined : normalizeOptionalDate(body.issued_at);

    const dueAt =
      body.due_at === undefined ? undefined : normalizeOptionalDate(body.due_at);

    const paidAt =
      body.paid_at === undefined ? undefined : normalizeOptionalDate(body.paid_at);

    const subtotal =
      body.subtotal === undefined ? undefined : normalizeMoney(body.subtotal);

    const tax =
      body.tax === undefined ? undefined : normalizeMoney(body.tax);

    const total =
      body.total === undefined ? undefined : normalizeMoney(body.total);

    if (body.subtotal !== undefined && subtotal === null) {
      return jsonWithCookies(
        stagingResponse,
        { ok: false, error: "subtotal must be a valid number." },
        400
      );
    }

    if (body.tax !== undefined && tax === null) {
      return jsonWithCookies(
        stagingResponse,
        { ok: false, error: "tax must be a valid number." },
        400
      );
    }

    if (body.total !== undefined && total === null) {
      return jsonWithCookies(
        stagingResponse,
        { ok: false, error: "total must be a valid number." },
        400
      );
    }

    let normalizedItems:
      | Array<{
          description: string;
          quantity: number;
          unit_price: number;
          total: number;
        }>
      | undefined = undefined;

    if (body.items !== undefined) {
      const rawItems = Array.isArray(body.items) ? body.items : [];

      normalizedItems = rawItems
        .map((item) => {
          const description = normalizeOptionalText(item?.description);
          const quantity = normalizePositiveNumber(item?.quantity);
          const unitPrice = normalizeMoney(item?.unit_price);
          const totalValue =
            normalizeMoney(item?.total) ??
            (quantity !== null && unitPrice !== null
              ? Number((quantity * unitPrice).toFixed(2))
              : null);

          if (!description && quantity === null && unitPrice === null && totalValue === null) {
            return null;
          }

          return {
            description: description || "Invoice item",
            quantity: quantity ?? 1,
            unit_price: unitPrice ?? 0,
            total: totalValue ?? 0,
          };
        })
        .filter(Boolean) as Array<{
        description: string;
        quantity: number;
        unit_price: number;
        total: number;
      }>;
    }

    if (normalizedItems && !normalizedItems.length) {
      return jsonWithCookies(
        stagingResponse,
        { ok: false, error: "At least one invoice item is required when replacing items." },
        400
      );
    }

    const computedSubtotalFromItems =
      normalizedItems !== undefined
        ? Number(
            normalizedItems.reduce((sum, item) => sum + Number(item.total || 0), 0).toFixed(2)
          )
        : null;

    const nextSubtotal =
      subtotal !== undefined
        ? subtotal
        : computedSubtotalFromItems !== null
        ? computedSubtotalFromItems
        : invoice.subtotal ?? 0;

    const nextTax =
      tax !== undefined
        ? tax
        : invoice.tax ?? 0;

    const nextTotal =
      total !== undefined
        ? total
        : normalizedItems !== undefined || subtotal !== undefined || tax !== undefined
        ? Number((Number(nextSubtotal || 0) + Number(nextTax || 0)).toFixed(2))
        : invoice.total ?? 0;

    const now = new Date().toISOString();

    const updatePayload: Record<string, unknown> = {
      updated_by: profile.id,
      updated_at: now,
      subtotal: nextSubtotal,
      tax: nextTax,
      total: nextTotal,
    };

    if (invoiceNumber !== undefined) updatePayload.invoice_number = invoiceNumber;
    if (notes !== undefined) updatePayload.notes = notes;
    if (issuedAt !== undefined) updatePayload.issued_at = issuedAt;
    if (dueAt !== undefined) updatePayload.due_at = dueAt;

    if (requestedStatus !== undefined) {
      updatePayload.status = requestedStatus;

      if (isAdmin) {
        if (requestedStatus === "paid") {
          updatePayload.paid_at = paidAt !== undefined ? paidAt : now;
        } else if (paidAt !== undefined) {
          updatePayload.paid_at = paidAt;
        } else if (requestedStatus !== "paid") {
          updatePayload.paid_at = null;
        }
      } else {
        if (paidAt !== undefined) {
          return jsonWithCookies(
            stagingResponse,
            { ok: false, error: "Vendor users cannot set paid_at." },
            403
          );
        }
      }
    } else if (paidAt !== undefined) {
      if (!isAdmin) {
        return jsonWithCookies(
          stagingResponse,
          { ok: false, error: "Vendor users cannot set paid_at." },
          403
        );
      }

      updatePayload.paid_at = paidAt;
    }

    const { data: updatedInvoice, error: updateError } = await admin
      .from("infrastructure_invoices")
      .update(updatePayload)
      .eq("id", invoice.id)
      .eq("org_id", effectiveOrgId)
      .select("*")
      .single();

    if (updateError || !updatedInvoice) {
      return jsonWithCookies(
        stagingResponse,
        {
          ok: false,
          error: "Failed to update invoice.",
          details: updateError?.message || null,
        },
        500
      );
    }

    const updatedItems =
      normalizedItems !== undefined
        ? await replaceInvoiceItems({
            invoiceId: invoice.id,
            effectiveOrgId,
            actorId: profile.id,
            items: normalizedItems,
          })
        : null;

    return jsonWithCookies(
      stagingResponse,
      {
        ok: true,
        message: "Invoice updated successfully.",
        invoice: updatedInvoice,
        items: updatedItems,
        workflow: {
          actor_role: profile.role,
          actor_vendor_id: actorVendor?.id || null,
          effective_org_id: effectiveOrgId,
          invoice_id: invoice.id,
          previous_status: invoice.status,
          new_status: requestedStatus ?? invoice.status,
        },
      },
      200
    );
  } catch (error: any) {
    console.error("INVOICE_UPDATE_ROUTE_ERROR", error);

    return jsonWithCookies(
      stagingResponse,
      {
        ok: false,
        error: error?.message || "Unexpected error while updating invoice.",
      },
      500
    );
  }
}