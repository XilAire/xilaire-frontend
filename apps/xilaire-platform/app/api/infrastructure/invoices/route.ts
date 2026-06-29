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

type InvoiceStatus =
  | "draft"
  | "submitted"
  | "approved"
  | "paid"
  | "cancelled";

type InvoiceRow = {
  id: string;
  org_id: string;
  vendor_id: string | null;
  project_id: string;
  estimate_id: string | null;
  invoice_number: string | null;
  status: InvoiceStatus | string | null;
  subtotal: number | null;
  tax: number | null;
  total: number | null;
  issued_at: string | null;
  due_at: string | null;
  paid_at: string | null;
  notes: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type InvoiceItemRow = {
  id: string;
  invoice_id: string;
  description: string | null;
  quantity: number | null;
  unit_price: number | null;
  total: number | null;
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

function normalizeInvoiceStatus(value: unknown): InvoiceStatus {
  const normalized = normalizeTextLower(value || "draft");

  if (normalized === "submitted") return "submitted";
  if (normalized === "approved") return "approved";
  if (normalized === "paid") return "paid";
  if (normalized === "cancelled") return "cancelled";
  return "draft";
}

async function requireAuthedAdmin(request: NextRequest) {
  const authHeader = request.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    return {
      ok: false as const,
      status: 401,
      error: "Missing bearer token.",
    };
  }

  const { data: userData, error: userError } = await authClient.auth.getUser(token);

  if (userError || !userData?.user) {
    return {
      ok: false as const,
      status: 401,
      error: "Unauthorized.",
    };
  }

  const { data: profile, error: profileError } = await serviceClient
    .from("profiles")
    .select("id, org_id, role")
    .eq("id", userData.user.id)
    .single<ProfileRow>();

  if (profileError || !profile) {
    return {
      ok: false as const,
      status: 403,
      error: "Profile not found.",
    };
  }

  if (!isAdminRole(profile.role)) {
    return {
      ok: false as const,
      status: 403,
      error: "Forbidden.",
    };
  }

  return {
    ok: true as const,
    user: userData.user,
    profile,
  };
}

function parseStatusFilter(raw: string | null): InvoiceStatus | "all" {
  const normalized = normalizeTextLower(raw || "all");

  if (
    normalized === "draft" ||
    normalized === "submitted" ||
    normalized === "approved" ||
    normalized === "paid" ||
    normalized === "cancelled"
  ) {
    return normalized;
  }

  return "all";
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuthedAdmin(request);

    if (!auth.ok) {
      return json(
        {
          ok: false,
          error: auth.error,
        },
        auth.status
      );
    }

    const role = normalizeTextLower(auth.profile.role);
    const isMasterAdmin = role === "master_admin";
    const orgId = auth.profile.org_id;

    const { searchParams } = new URL(request.url);
    const statusFilter = parseStatusFilter(searchParams.get("status"));
    const includeItems = normalizeTextLower(searchParams.get("include_items")) === "true";

    let invoicesQuery = serviceClient
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
        created_at,
        updated_at,
        project:infrastructure_projects (
          project_name,
          client_name
        ),
        vendor:infrastructure_vendors (
          company_name
        ),
        estimate:infrastructure_estimates (
          estimate_number,
          status
        )
      `)
      .order("updated_at", { ascending: false })
      .order("created_at", { ascending: false });

    if (!isMasterAdmin && orgId) {
      invoicesQuery = invoicesQuery.eq("org_id", orgId);
    }

    if (statusFilter !== "all") {
      invoicesQuery = invoicesQuery.eq("status", statusFilter);
    }

    const { data: invoicesData, error: invoicesError } = await invoicesQuery;

    if (invoicesError) {
      return json(
        {
          ok: false,
          error: invoicesError.message || "Failed to load infrastructure invoices.",
        },
        500
      );
    }

    const rawInvoices = Array.isArray(invoicesData) ? invoicesData : [];
    const invoiceIds = rawInvoices
      .map((row: any) => normalizeText(row?.id))
      .filter(Boolean);

    const itemsByInvoiceId = new Map<string, InvoiceItemRow[]>();

    if (includeItems && invoiceIds.length > 0) {
      const { data: itemsData, error: itemsError } = await serviceClient
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
        .in("invoice_id", invoiceIds)
        .order("created_at", { ascending: true });

      if (itemsError) {
        return json(
          {
            ok: false,
            error: itemsError.message || "Failed to load invoice items.",
          },
          500
        );
      }

      for (const item of itemsData || []) {
        const invoiceId = normalizeText(item?.invoice_id);
        if (!invoiceId) continue;

        const existing = itemsByInvoiceId.get(invoiceId) || [];
        existing.push({
          id: normalizeText(item?.id),
          invoice_id: invoiceId,
          description: item?.description ? String(item.description) : null,
          quantity: item?.quantity ?? null,
          unit_price: item?.unit_price ?? null,
          total: item?.total ?? null,
          created_at: item?.created_at ? String(item.created_at) : null,
          updated_at: item?.updated_at ? String(item.updated_at) : null,
        });
        itemsByInvoiceId.set(invoiceId, existing);
      }
    }

    const invoices = rawInvoices.map((row: any) => {
      const project = Array.isArray(row?.project) ? row.project[0] : row?.project;
      const vendor = Array.isArray(row?.vendor) ? row.vendor[0] : row?.vendor;
      const estimate = Array.isArray(row?.estimate) ? row.estimate[0] : row?.estimate;
      const id = normalizeText(row?.id);

      return {
        id,
        org_id: normalizeText(row?.org_id),
        vendor_id: row?.vendor_id ? normalizeText(row.vendor_id) : null,
        project_id: normalizeText(row?.project_id),
        estimate_id: row?.estimate_id ? normalizeText(row.estimate_id) : null,
        invoice_number: row?.invoice_number ? String(row.invoice_number).trim() : null,
        status: normalizeInvoiceStatus(row?.status),
        subtotal: row?.subtotal ?? null,
        tax: row?.tax ?? null,
        total: row?.total ?? null,
        issued_at: row?.issued_at ? String(row.issued_at) : null,
        due_at: row?.due_at ? String(row.due_at) : null,
        paid_at: row?.paid_at ? String(row.paid_at) : null,
        notes: row?.notes ? String(row.notes) : null,
        created_at: row?.created_at ? String(row.created_at) : null,
        updated_at: row?.updated_at ? String(row.updated_at) : null,
        project_name: normalizeText(project?.project_name) || "Untitled Project",
        client_name: normalizeText(project?.client_name) || "Unknown Client",
        vendor_name: normalizeText(vendor?.company_name) || "Unknown Vendor",
        estimate_number: estimate?.estimate_number
          ? String(estimate.estimate_number).trim()
          : null,
        estimate_status: estimate?.status ? String(estimate.status).trim() : null,
        items: includeItems ? itemsByInvoiceId.get(id) || [] : [],
      };
    });

    return json({
      ok: true,
      scope: isMasterAdmin ? "global" : "org",
      org_id: isMasterAdmin ? orgId ?? null : orgId,
      status_filter: statusFilter,
      include_items: includeItems,
      count: invoices.length,
      invoices,
    });
  } catch (error: any) {
    return json(
      {
        ok: false,
        error: normalizeText(error?.message || "Unexpected infrastructure invoices API error."),
      },
      500
    );
  }
}