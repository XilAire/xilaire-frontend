import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

/* =================================================
ENV
================================================= */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL_PLATFORM!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY_PLATFORM!;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY_PLATFORM!;

if (!SUPABASE_URL) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL_PLATFORM");
if (!SERVICE_KEY) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY_PLATFORM");
if (!ANON_KEY) throw new Error("Missing NEXT_PUBLIC_SUPABASE_ANON_KEY_PLATFORM");

/* =================================================
CLIENTS
================================================= */

const serviceClient = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
});

const authClient = createClient(SUPABASE_URL, ANON_KEY, {
  auth: { persistSession: false },
});

/* =================================================
HEADERS
================================================= */

const NO_STORE_HEADERS: HeadersInit = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0",
};

/* =================================================
TYPES
================================================= */

type ProfileRow = {
  id: string;
  org_id: string | null;
  role: string | null;
  account_type: string | null;
};

type VendorRow = {
  id: string;
  org_id: string | null;
  email: string | null;
  company_name?: string | null;
  contact_name?: string | null;
  phone?: string | null;
  onboarding_status?: string | null;
  is_active?: boolean | null;
  active?: boolean | null;
};

type InvoiceRow = {
  id: string;
  org_id: string | null;
  vendor_id: string | null;
  project_id: string | null;
  estimate_id: string | null;
  invoice_number: string | null;
  status: string | null;
  total: number | string | null;
  issued_at: string | null;
  due_at: string | null;
  paid_at: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type ProjectRow = {
  id: string;
  org_id?: string | null;
  name?: string | null;
  title?: string | null;
  project_name?: string | null;
  client_name?: string | null;
  status?: string | null;
  [key: string]: unknown;
};

type EstimateRow = {
  id: string;
  org_id?: string | null;
  project_id?: string | null;
  vendor_id?: string | null;
  status?: string | null;
  estimate_number?: string | null;
  number?: string | null;
  name?: string | null;
  title?: string | null;
  estimate_name?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  [key: string]: unknown;
};

type InvoiceItemRow = {
  id: string;
  invoice_id: string;
  description: string | null;
  quantity: number | string | null;
  unit_price: number | string | null;
  total: number | string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type AuthContextSuccess = {
  ok: true;
  user: {
    id: string;
    email: string | null;
  };
  profile: ProfileRow;
};

type AuthContextFailure = {
  ok: false;
  status: number;
  error: string;
};

type AuthContext = AuthContextSuccess | AuthContextFailure;

/* =================================================
HELPERS
================================================= */

function json(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: NO_STORE_HEADERS,
  });
}

function normalize(value: unknown) {
  return String(value || "").trim();
}

function normalizeLower(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

function isAdmin(role: string | null | undefined) {
  return ["master_admin", "admin", "super_admin", "project_manager"].includes(
    normalizeLower(role)
  );
}

function normalizeStatus(value: unknown) {
  const v = normalizeLower(value);

  if (v === "submitted") return "submitted";
  if (v === "approved") return "approved";
  if (v === "paid") return "paid";
  if (v === "cancelled") return "cancelled";
  return "draft";
}

function isAuthFailure(ctx: AuthContext): ctx is AuthContextFailure {
  return ctx.ok === false;
}

function normalizeMoney(value: number | string | null | undefined): number {
  if (value === null || value === undefined || value === "") return 0;
  const num = typeof value === "number" ? value : Number(value);
  return Number.isFinite(num) ? num : 0;
}

function getProjectDisplayName(project: ProjectRow | null): string {
  if (!project) return "Project";

  const candidates = [
    project.project_name,
    project.name,
    project.title,
    typeof project.project_title === "string" ? project.project_title : null,
    typeof project.client_project_name === "string" ? project.client_project_name : null,
  ];

  for (const value of candidates) {
    const trimmed = String(value || "").trim();
    if (trimmed) return trimmed;
  }

  return "Project";
}

function getClientDisplayName(project: ProjectRow | null): string {
  if (!project) return "Client";

  const candidates = [
    project.client_name,
    typeof project.customer_name === "string" ? project.customer_name : null,
    typeof project.account_name === "string" ? project.account_name : null,
  ];

  for (const value of candidates) {
    const trimmed = String(value || "").trim();
    if (trimmed) return trimmed;
  }

  return "Client";
}

function getEstimateDisplayNumber(
  estimate: EstimateRow | null,
  estimateId?: string | null
): string | null {
  if (estimate) {
    const candidates = [
      estimate.estimate_number,
      estimate.number,
      estimate.estimate_name,
      estimate.name,
      estimate.title,
      typeof estimate.display_name === "string" ? estimate.display_name : null,
      typeof estimate.label === "string" ? estimate.label : null,
    ];

    for (const value of candidates) {
      const trimmed = String(value || "").trim();
      if (trimmed) return trimmed;
    }

    const idValue = String(estimate.id || "").trim();
    if (idValue) {
      return `EST-${idValue.slice(0, 8).toUpperCase()}`;
    }
  }

  const fallbackId = String(estimateId || "").trim();
  if (fallbackId) {
    return `EST-${fallbackId.slice(0, 8).toUpperCase()}`;
  }

  return null;
}

/* =================================================
AUTH
================================================= */

async function getUserContext(request: NextRequest): Promise<AuthContext> {
  const authHeader = request.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7).trim()
    : null;

  if (!token) {
    return { ok: false, status: 401, error: "Missing bearer token." };
  }

  const { data: userData, error: userError } = await authClient.auth.getUser(token);

  if (userError || !userData?.user) {
    return { ok: false, status: 401, error: "Unauthorized." };
  }

  const { data: profile, error: profileError } = await serviceClient
    .from("profiles")
    .select("id, org_id, role, account_type")
    .eq("id", userData.user.id)
    .single<ProfileRow>();

  if (profileError || !profile) {
    return { ok: false, status: 403, error: "Profile not found." };
  }

  return {
    ok: true,
    user: {
      id: userData.user.id,
      email: userData.user.email ?? null,
    },
    profile,
  };
}

/* =================================================
GET
================================================= */

export async function GET(request: NextRequest) {
  try {
    const ctx = await getUserContext(request);

    if (isAuthFailure(ctx)) {
      return json({ ok: false, error: ctx.error }, ctx.status);
    }

    const isAdminUser = isAdmin(ctx.profile.role);
    const userEmail = normalizeLower(ctx.user.email);

    let vendor: VendorRow | null = null;

    if (!isAdminUser) {
      if (!userEmail) {
        return json(
          {
            ok: false,
            error: "Authenticated vendor user is missing email.",
          },
          403
        );
      }

      const { data: vendorRows, error: vendorError } = await serviceClient
        .from("infrastructure_vendors")
        .select("id, org_id, email, company_name, contact_name, phone, onboarding_status, is_active, active")
        .eq("org_id", ctx.profile.org_id);

      if (vendorError) {
        return json(
          {
            ok: false,
            error: vendorError.message,
          },
          500
        );
      }

      vendor =
        (vendorRows || []).find(
          (row) => normalizeLower(row.email) === userEmail
        ) || null;

      if (!vendor) {
        return json(
          {
            ok: false,
            error: "Vendor profile not found for this user.",
          },
          403
        );
      }
    }

    let invoiceQuery = serviceClient
      .from("infrastructure_invoices")
      .select(
        "id, org_id, vendor_id, project_id, estimate_id, invoice_number, status, total, issued_at, due_at, paid_at, created_at, updated_at"
      )
      .order("updated_at", { ascending: false })
      .order("created_at", { ascending: false });

    if (isAdminUser) {
      if (ctx.profile.org_id) {
        invoiceQuery = invoiceQuery.eq("org_id", ctx.profile.org_id);
      }
    } else {
      invoiceQuery = invoiceQuery.eq("vendor_id", vendor!.id);

      if (vendor?.org_id) {
        invoiceQuery = invoiceQuery.eq("org_id", vendor.org_id);
      }
    }

    const { data: invoiceRows, error: invoiceError } = await invoiceQuery;

    if (invoiceError) {
      return json({ ok: false, error: invoiceError.message }, 500);
    }

    const invoices = Array.isArray(invoiceRows) ? (invoiceRows as InvoiceRow[]) : [];

    const projectIds = Array.from(
      new Set(invoices.map((row) => normalize(row.project_id)).filter(Boolean))
    );

    const vendorIds = Array.from(
      new Set(invoices.map((row) => normalize(row.vendor_id)).filter(Boolean))
    );

    const estimateIds = Array.from(
      new Set(invoices.map((row) => normalize(row.estimate_id)).filter(Boolean))
    );

    const invoiceIds = invoices.map((row) => normalize(row.id)).filter(Boolean);

    const [projectsResult, vendorsResult, estimatesResult, itemsResult] = await Promise.all([
      projectIds.length
        ? serviceClient
            .from("infrastructure_projects")
            .select("*")
            .in("id", projectIds)
        : Promise.resolve({ data: [], error: null }),
      vendorIds.length
        ? serviceClient
            .from("infrastructure_vendors")
            .select("id, org_id, email, company_name, contact_name, phone, onboarding_status, is_active, active")
            .in("id", vendorIds)
        : Promise.resolve({ data: [], error: null }),
      estimateIds.length
        ? serviceClient
            .from("infrastructure_estimates")
            .select("*")
            .in("id", estimateIds)
        : Promise.resolve({ data: [], error: null }),
      invoiceIds.length
        ? serviceClient
            .from("infrastructure_invoice_items")
            .select("id, invoice_id, description, quantity, unit_price, total, created_at, updated_at")
            .in("invoice_id", invoiceIds)
            .order("created_at", { ascending: true })
        : Promise.resolve({ data: [], error: null }),
    ]);

    if (projectsResult.error) {
      return json({ ok: false, error: projectsResult.error.message }, 500);
    }

    if (vendorsResult.error) {
      return json({ ok: false, error: vendorsResult.error.message }, 500);
    }

    if (estimatesResult.error) {
      return json({ ok: false, error: estimatesResult.error.message }, 500);
    }

    if (itemsResult.error) {
      return json({ ok: false, error: itemsResult.error.message }, 500);
    }

    const projectMap = new Map<string, ProjectRow>();
    for (const row of (projectsResult.data || []) as ProjectRow[]) {
      projectMap.set(normalize(row.id), row);
    }

    const vendorMap = new Map<string, VendorRow>();
    for (const row of (vendorsResult.data || []) as VendorRow[]) {
      vendorMap.set(normalize(row.id), row);
    }

    const estimateMap = new Map<string, EstimateRow>();
    for (const row of (estimatesResult.data || []) as EstimateRow[]) {
      estimateMap.set(normalize(row.id), row);
    }

    const itemsMap = new Map<string, InvoiceItemRow[]>();
    for (const row of (itemsResult.data || []) as InvoiceItemRow[]) {
      const key = normalize(row.invoice_id);
      const existing = itemsMap.get(key) || [];
      existing.push({
        id: normalize(row.id),
        invoice_id: normalize(row.invoice_id),
        description: row.description ?? null,
        quantity: row.quantity ?? null,
        unit_price: row.unit_price ?? null,
        total: row.total ?? null,
        created_at: row.created_at ?? null,
        updated_at: row.updated_at ?? null,
      });
      itemsMap.set(key, existing);
    }

    const normalizedInvoices = invoices.map((row) => {
      const invoiceId = normalize(row.id);
      const project = projectMap.get(normalize(row.project_id)) || null;
      const linkedVendor = row.vendor_id ? vendorMap.get(normalize(row.vendor_id)) || null : null;
      const estimate = row.estimate_id ? estimateMap.get(normalize(row.estimate_id)) || null : null;
      const items = itemsMap.get(invoiceId) || [];

      const subtotal = Number(
        items.reduce((sum, item) => sum + normalizeMoney(item.total), 0).toFixed(2)
      );

      const total = normalizeMoney(row.total);
      const tax = Number(Math.max(total - subtotal, 0).toFixed(2));

      return {
        id: invoiceId,
        org_id: row.org_id ? normalize(row.org_id) : null,
        vendor_id: row.vendor_id ? normalize(row.vendor_id) : null,
        project_id: normalize(row.project_id),
        estimate_id: row.estimate_id ? normalize(row.estimate_id) : null,
        invoice_number: row.invoice_number ? String(row.invoice_number).trim() : null,
        status: normalizeStatus(row.status),
        subtotal,
        tax,
        total,
        issued_at: row.issued_at ?? null,
        due_at: row.due_at ?? null,
        paid_at: row.paid_at ?? null,
        notes: null,
        created_at: row.created_at ?? null,
        updated_at: row.updated_at ?? null,
        project_name: getProjectDisplayName(project),
        client_name: getClientDisplayName(project),
        vendor_name: linkedVendor?.company_name?.trim() || vendor?.company_name?.trim() || null,
        estimate_number: getEstimateDisplayNumber(estimate, row.estimate_id),
        estimate_status:
          typeof estimate?.status === "string" ? estimate.status : null,
        items,
      };
    });

    return json({
      ok: true,
      scope: isAdminUser ? "admin" : "vendor",
      vendor_id: vendor?.id ?? null,
      count: normalizedInvoices.length,
      invoices: normalizedInvoices,
    });
  } catch (err: any) {
    return json(
      {
        ok: false,
        error: err?.message || "Unexpected error.",
      },
      500
    );
  }
}