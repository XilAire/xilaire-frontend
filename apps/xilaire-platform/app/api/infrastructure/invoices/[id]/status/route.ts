import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL_PLATFORM!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY_PLATFORM!;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY_PLATFORM!;

if (!SUPABASE_URL) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL_PLATFORM");
}

if (!SERVICE_KEY) {
  throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY_PLATFORM");
}

if (!ANON_KEY) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_ANON_KEY_PLATFORM");
}

const serviceClient = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
});

const authClient = createClient(SUPABASE_URL, ANON_KEY, {
  auth: { persistSession: false },
});

const NO_STORE_HEADERS: HeadersInit = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0",
};

type InvoiceStatus = "draft" | "submitted" | "approved" | "paid" | "cancelled";

type ProfileRow = {
  id: string;
  org_id: string | null;
  role: string | null;
  email?: string | null;
  account_type?: string | null;
};

type InvoiceRow = {
  id: string;
  org_id: string;
  estimate_id: string | null;
  project_id: string | null;
  vendor_id: string | null;
  invoice_number: string | null;
  status: string | null;
  subtotal: number | null;
  tax: number | null;
  total: number | null;
  notes: string | null;
  issued_at: string | null;
  due_at: string | null;
  paid_at: string | null;
  created_at: string | null;
  updated_at: string | null;
};

function json(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: NO_STORE_HEADERS,
  });
}

function normalizeText(value: unknown) {
  return String(value || "").trim();
}

function normalizeTextLower(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

function isAdminRole(role: string | null | undefined) {
  return ["master_admin", "super_admin", "admin", "project_manager"].includes(
    normalizeTextLower(role)
  );
}

function isValidInvoiceStatus(value: string): value is InvoiceStatus {
  return ["draft", "submitted", "approved", "paid", "cancelled"].includes(value);
}

function validateTransition(currentStatus: string, nextStatus: InvoiceStatus) {
  const current = normalizeTextLower(currentStatus || "draft");

  const validTransitions: Record<string, InvoiceStatus[]> = {
    draft: ["submitted", "cancelled"],
    submitted: ["approved", "cancelled"],
    approved: ["paid", "cancelled"],
    paid: [],
    cancelled: [],
  };

  return validTransitions[current]?.includes(nextStatus) ?? false;
}

async function requireAuthedAdmin(request: NextRequest) {
  const authHeader = request.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    return { ok: false as const, status: 401, error: "Missing bearer token." };
  }

  const { data: userData, error: userError } = await authClient.auth.getUser(token);

  if (userError || !userData?.user) {
    return { ok: false as const, status: 401, error: "Unauthorized." };
  }

  const { data: profile, error: profileError } = await serviceClient
    .from("profiles")
    .select("id, org_id, role, email, account_type")
    .eq("id", userData.user.id)
    .single<ProfileRow>();

  if (profileError || !profile) {
    return { ok: false as const, status: 403, error: "Profile not found." };
  }

  if (!isAdminRole(profile.role)) {
    return { ok: false as const, status: 403, error: "Forbidden." };
  }

  return {
    ok: true as const,
    user: userData.user,
    profile,
  };
}

async function loadInvoiceHeader(invoiceId: string) {
  const result = await serviceClient
    .from("infrastructure_invoices")
    .select(`
      id,
      org_id,
      estimate_id,
      project_id,
      vendor_id,
      invoice_number,
      status,
      subtotal,
      tax,
      total,
      notes,
      issued_at,
      due_at,
      paid_at,
      created_at,
      updated_at
    `)
    .eq("id", invoiceId)
    .single<InvoiceRow>();

  if (result.error || !result.data) {
    throw new Error(result.error?.message || "Invoice not found.");
  }

  return result.data;
}

async function loadProject(projectId: string | null) {
  if (!projectId) return null;

  const result = await serviceClient
    .from("infrastructure_projects")
    .select(`
      id,
      project_name,
      client_name,
      status,
      project_type,
      project_address
    `)
    .eq("id", projectId)
    .single();

  if (result.error || !result.data) {
    return null;
  }

  return result.data;
}

async function loadVendor(vendorId: string | null) {
  if (!vendorId) return null;

  const result = await serviceClient
    .from("infrastructure_vendors")
    .select(`
      id,
      company_name,
      contact_name,
      email,
      phone,
      vendor_category
    `)
    .eq("id", vendorId)
    .single();

  if (result.error || !result.data) {
    return null;
  }

  return result.data;
}

async function loadEstimate(estimateId: string | null) {
  if (!estimateId) return null;

  const safeResult = await serviceClient
    .from("infrastructure_estimates")
    .select(`
      id,
      status,
      total_cost,
      labor_cost,
      material_cost,
      notes,
      created_at,
      updated_at
    `)
    .eq("id", estimateId)
    .single();

  if (safeResult.error || !safeResult.data) {
    return null;
  }

  let estimateNumber: string | null = null;
  let submittedAt: string | null = null;
  let approvedAt: string | null = null;

  const optionalResult = await serviceClient
    .from("infrastructure_estimates")
    .select(`
      id,
      estimate_number,
      submitted_at,
      approved_at
    `)
    .eq("id", estimateId)
    .single();

  if (!optionalResult.error && optionalResult.data) {
    estimateNumber = optionalResult.data.estimate_number ?? null;
    submittedAt = optionalResult.data.submitted_at ?? null;
    approvedAt = optionalResult.data.approved_at ?? null;
  }

  return {
    id: safeResult.data.id,
    estimate_number: estimateNumber,
    status: safeResult.data.status ?? null,
    amount: safeResult.data.total_cost ?? null,
    total_cost: safeResult.data.total_cost ?? null,
    labor_cost: safeResult.data.labor_cost ?? null,
    material_cost: safeResult.data.material_cost ?? null,
    notes: safeResult.data.notes ?? null,
    submitted_at: submittedAt,
    approved_at: approvedAt,
  };
}

async function loadInvoiceItems(invoiceId: string) {
  const result = await serviceClient
    .from("infrastructure_invoice_items")
    .select(`
      id,
      invoice_id,
      description,
      quantity,
      unit_price,
      total,
      created_at,
      updated_at
    `)
    .eq("invoice_id", invoiceId)
    .order("created_at", { ascending: true });

  if (result.error) {
    return [];
  }

  return result.data || [];
}

async function getHydratedInvoice(invoiceId: string) {
  const invoice = await loadInvoiceHeader(invoiceId);

  const [project, vendor, estimate, items] = await Promise.all([
    loadProject(invoice.project_id),
    loadVendor(invoice.vendor_id),
    loadEstimate(invoice.estimate_id),
    loadInvoiceItems(invoice.id),
  ]);

  return {
    ...invoice,
    submitted_at: null,
    approved_at: null,
    cancelled_at: null,
    project,
    vendor,
    estimate,
    items,
  };
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const auth = await requireAuthedAdmin(request);

    if (!auth.ok) {
      return json({ ok: false, error: auth.error }, auth.status);
    }

    const resolvedParams =
      typeof (context.params as Promise<{ id: string }>).then === "function"
        ? await (context.params as Promise<{ id: string }>)
        : (context.params as { id: string });

    const invoiceId = normalizeText(resolvedParams?.id);

    if (!invoiceId) {
      return json({ ok: false, error: "Invoice id is required." }, 400);
    }

    const body = await request.json().catch(() => null);
    const nextStatus = normalizeTextLower(body?.status);

    if (!isValidInvoiceStatus(nextStatus)) {
      return json({ ok: false, error: "Invalid invoice status." }, 400);
    }

    const existing = await loadInvoiceHeader(invoiceId);

    if (
      normalizeTextLower(auth.profile.role) !== "master_admin" &&
      auth.profile.org_id &&
      existing.org_id !== auth.profile.org_id
    ) {
      return json({ ok: false, error: "Forbidden." }, 403);
    }

    const currentStatus = normalizeTextLower(existing.status || "draft");

    if (currentStatus === nextStatus) {
      const invoice = await getHydratedInvoice(invoiceId);

      return json({
        ok: true,
        invoice,
      });
    }

    if (!validateTransition(currentStatus, nextStatus)) {
      return json(
        {
          ok: false,
          error: `Invalid invoice status transition from ${currentStatus} to ${nextStatus}.`,
        },
        400
      );
    }

    const nowIso = new Date().toISOString();

    const updatePayload: Record<string, unknown> = {
      status: nextStatus,
      updated_at: nowIso,
    };

    if (nextStatus === "paid") {
      updatePayload.paid_at = nowIso;
    }

    if (currentStatus === "paid" && nextStatus !== "paid") {
      updatePayload.paid_at = null;
    }

    if (nextStatus === "submitted" && !existing.issued_at) {
      updatePayload.issued_at = nowIso;
    }

    const updateResult = await serviceClient
      .from("infrastructure_invoices")
      .update(updatePayload)
      .eq("id", invoiceId)
      .select("id")
      .single();

    if (updateResult.error || !updateResult.data) {
      return json(
        {
          ok: false,
          error: updateResult.error?.message || "Failed to update invoice status.",
        },
        500
      );
    }

    const invoice = await getHydratedInvoice(invoiceId);

    return json({
      ok: true,
      invoice,
    });
  } catch (error: any) {
    const message = normalizeText(error?.message || "Failed to update invoice.");

    if (message.toLowerCase().includes("not found")) {
      return json({ ok: false, error: "Invoice not found." }, 404);
    }

    return json(
      {
        ok: false,
        error: message || "Unexpected error while updating invoice status.",
      },
      500
    );
  }
}