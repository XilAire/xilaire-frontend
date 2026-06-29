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

type ProfileRow = {
  id: string;
  org_id: string | null;
  role: string | null;
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
    .select("id, org_id, role")
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
    profile,
  };
}

async function loadInvoiceHeader(invoiceId: string) {
  const { data, error } = await serviceClient
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

  if (error || !data) {
    throw new Error(error?.message || "Invoice not found.");
  }

  return data;
}

async function loadProject(projectId: string | null) {
  if (!projectId) return null;

  const { data } = await serviceClient
    .from("infrastructure_projects")
    .select(`id, project_name, client_name, status, project_type, project_address`)
    .eq("id", projectId)
    .single();

  return data || null;
}

async function loadVendor(vendorId: string | null) {
  if (!vendorId) return null;

  const { data } = await serviceClient
    .from("infrastructure_vendors")
    .select(`id, company_name, contact_name, email, phone, vendor_category`)
    .eq("id", vendorId)
    .single();

  return data || null;
}

async function loadEstimate(estimateId: string | null) {
  if (!estimateId) return null;

  // SAFE query (always works)
  const { data: base } = await serviceClient
    .from("infrastructure_estimates")
    .select(`
      id,
      status,
      total_cost,
      labor_cost,
      material_cost,
      notes
    `)
    .eq("id", estimateId)
    .single();

  if (!base) return null;

  // OPTIONAL query (may fail safely)
  const { data: optional } = await serviceClient
    .from("infrastructure_estimates")
    .select(`estimate_number, submitted_at, approved_at`)
    .eq("id", estimateId)
    .single();

  return {
    id: base.id,
    estimate_number: optional?.estimate_number ?? null,
    status: base.status ?? null,
    amount: base.total_cost ?? null,
    total_cost: base.total_cost ?? null,
    labor_cost: base.labor_cost ?? null,
    material_cost: base.material_cost ?? null,
    notes: base.notes ?? null,
    submitted_at: optional?.submitted_at ?? null,
    approved_at: optional?.approved_at ?? null,
  };
}

async function loadInvoiceItems(invoiceId: string) {
  const { data } = await serviceClient
    .from("infrastructure_invoice_items")
    .select(`
      id,
      description,
      quantity,
      unit_price,
      total
    `)
    .eq("invoice_id", invoiceId)
    .order("created_at", { ascending: true });

  return data || [];
}

export async function GET(
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

    const invoice = await loadInvoiceHeader(invoiceId);

    // ORG SECURITY
    if (
      normalizeTextLower(auth.profile.role) !== "master_admin" &&
      auth.profile.org_id &&
      invoice.org_id !== auth.profile.org_id
    ) {
      return json({ ok: false, error: "Forbidden." }, 403);
    }

    const [project, vendor, estimate, items] = await Promise.all([
      loadProject(invoice.project_id),
      loadVendor(invoice.vendor_id),
      loadEstimate(invoice.estimate_id),
      loadInvoiceItems(invoice.id),
    ]);

    return json({
      ok: true,
      invoice: {
        ...invoice,
        submitted_at: null,
        approved_at: null,
        cancelled_at: null,
        project,
        vendor,
        estimate,
        items,
      },
    });
  } catch (error: any) {
    const message = normalizeText(error?.message || "Failed to load invoice.");

    if (message.toLowerCase().includes("not found")) {
      return json({ ok: false, error: "Invoice not found." }, 404);
    }

    return json(
      {
        ok: false,
        error: message || "Unexpected error while loading invoice.",
      },
      500
    );
  }
}