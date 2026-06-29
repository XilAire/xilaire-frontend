import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ProfileRow = {
  id: string;
  email: string | null;
  role: string | null;
  account_type: string | null;
  org_id: string | null;
  company_name?: string | null;
};

type InvoiceRow = {
  id: string;
  org_id: string | null;
  project_id: string | null;
  vendor_id: string | null;
  estimate_id: string | null;
  status: string | null;
  invoice_number: string | null;
  total: number | string | null;
  issued_at: string | null;
  due_at: string | null;
  paid_at: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type VendorRow = {
  id: string;
  org_id: string | null;
  company_name: string | null;
  contact_name: string | null;
  email: string | null;
  phone?: string | null;
  onboarding_status?: string | null;
  is_active?: boolean | null;
  active?: boolean | null;
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

type ProjectRow = {
  id: string;
  org_id?: string | null;
  name?: string | null;
  title?: string | null;
  project_name?: string | null;
  status?: string | null;
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

function normalizeMoney(value: number | string | null | undefined): number {
  if (value === null || value === undefined || value === "") return 0;
  const num = typeof value === "number" ? value : Number(value);
  return Number.isFinite(num) ? num : 0;
}

function normalizeText(value: string | null | undefined) {
  return String(value || "").trim().toLowerCase();
}

function isAdmin(profile: ProfileRow | null): boolean {
  if (!profile) return false;

  const role = normalizeText(profile.role);
  const accountType = normalizeText(profile.account_type);

  return (
    role === "master_admin" ||
    role === "super_admin" ||
    role === "admin" ||
    role === "project_manager" ||
    role === "internal_admin" ||
    accountType === "internal"
  );
}

function isVendorUser(profile: ProfileRow | null): boolean {
  if (!profile) return false;

  const role = normalizeText(profile.role);
  const accountType = normalizeText(profile.account_type);

  return (
    accountType === "vendor" ||
    role === "vendor" ||
    role === "vendor_admin"
  );
}

function extractInvoiceId(
  req: NextRequest,
  context?: { params?: { id?: string } | Promise<{ id?: string }> }
) {
  let idFromParams = "";

  const params = context?.params as any;

  if (params && typeof params === "object" && "id" in params) {
    idFromParams = String(params.id || "").trim();
  }

  const url = new URL(req.url);
  const pathParts = url.pathname.split("/").filter(Boolean);
  const idFromPath = String(pathParts[pathParts.length - 1] || "").trim();

  return idFromParams || idFromPath;
}

function getProjectDisplayName(project: ProjectRow | null): string {
  if (!project) return "Untitled Project";

  const candidates = [
    project.name,
    project.title,
    project.project_name,
    typeof project.client_project_name === "string" ? project.client_project_name : null,
    typeof project.project_title === "string" ? project.project_title : null,
  ];

  for (const value of candidates) {
    const trimmed = String(value || "").trim();
    if (trimmed) return trimmed;
  }

  return "Untitled Project";
}

function getEstimateDisplayNumber(estimate: EstimateRow | null, estimateId?: string | null): string | null {
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

export async function GET(
  req: NextRequest,
  context?: { params?: { id?: string } | Promise<{ id?: string }> }
) {
  try {
    let routeParams: any = context?.params;

    if (routeParams && typeof routeParams?.then === "function") {
      routeParams = await routeParams;
      context = { params: routeParams };
    }

    const invoiceId = extractInvoiceId(req, context);

    if (!invoiceId) {
      return NextResponse.json(
        { error: "Invoice id is required." },
        { status: 400 }
      );
    }

    const cookieStore = await cookies();

    const authClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL_PLATFORM!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY_PLATFORM!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll() {},
        },
      }
    );

    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL_PLATFORM!,
      process.env.SUPABASE_SERVICE_ROLE_KEY_PLATFORM!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const {
      data: { user },
      error: authError,
    } = await authClient.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { data: profile, error: profileError } = await adminClient
      .from("profiles")
      .select("id, email, role, account_type, org_id, company_name")
      .eq("id", user.id)
      .maybeSingle<ProfileRow>();

    if (profileError || !profile) {
      return NextResponse.json(
        {
          error: "Profile not found.",
          details: profileError?.message || null,
        },
        { status: 403 }
      );
    }

    const adminView = isAdmin(profile);
    const vendorView = isVendorUser(profile);

    if (!adminView && !vendorView) {
      return NextResponse.json(
        { error: "You do not have access to vendor invoice details." },
        { status: 403 }
      );
    }

    const { data: invoiceRows, error: invoiceError } = await adminClient
      .from("infrastructure_invoices")
      .select(
        "id, org_id, project_id, vendor_id, estimate_id, status, invoice_number, total, issued_at, due_at, paid_at, created_at, updated_at"
      )
      .eq("id", invoiceId)
      .limit(1);

    if (invoiceError) {
      return NextResponse.json(
        {
          error: "Failed to load invoice.",
          details: invoiceError.message,
          invoice_id: invoiceId,
        },
        { status: 500 }
      );
    }

    const invoice = Array.isArray(invoiceRows)
      ? (invoiceRows[0] as InvoiceRow | undefined)
      : undefined;

    if (!invoice) {
      return NextResponse.json(
        {
          error: "Invoice not found.",
          invoice_id: invoiceId,
        },
        { status: 404 }
      );
    }

    if (!adminView && profile.org_id && invoice.org_id && profile.org_id !== invoice.org_id) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    let vendorContext: VendorRow | null = null;

    if (!adminView) {
      const emailCandidates = [user.email, profile.email]
        .filter((value): value is string => Boolean(value))
        .map((value) => value.trim().toLowerCase());

      if (emailCandidates.length === 0) {
        return NextResponse.json(
          { error: "Vendor account is missing an email address." },
          { status: 403 }
        );
      }

      const { data: vendorRows, error: vendorLookupError } = await adminClient
        .from("infrastructure_vendors")
        .select(
          "id, org_id, company_name, contact_name, email, phone, onboarding_status, is_active, active"
        )
        .eq("org_id", profile.org_id);

      if (vendorLookupError) {
        return NextResponse.json(
          {
            error: "Failed to resolve vendor access.",
            details: vendorLookupError.message,
          },
          { status: 500 }
        );
      }

      vendorContext =
        (vendorRows || []).find((row) =>
          emailCandidates.includes(String(row.email || "").trim().toLowerCase())
        ) || null;

      if (!vendorContext) {
        return NextResponse.json(
          { error: "Vendor record not found." },
          { status: 403 }
        );
      }

      if (!invoice.vendor_id || invoice.vendor_id !== vendorContext.id) {
        return NextResponse.json({ error: "Forbidden." }, { status: 403 });
      }
    }

    const vendorPromise = invoice.vendor_id
      ? adminClient
          .from("infrastructure_vendors")
          .select(
            "id, org_id, company_name, contact_name, email, phone, onboarding_status, is_active, active"
          )
          .eq("id", invoice.vendor_id)
          .maybeSingle<VendorRow>()
      : Promise.resolve({ data: null, error: null });

    const itemsPromise = adminClient
      .from("infrastructure_invoice_items")
      .select("id, invoice_id, description, quantity, unit_price, total, created_at, updated_at")
      .eq("invoice_id", invoice.id)
      .order("created_at", { ascending: true })
      .returns<InvoiceItemRow[]>();

    const [vendorResult, itemsResult] = await Promise.all([
      vendorPromise,
      itemsPromise,
    ]);

    if (vendorResult.error) {
      return NextResponse.json(
        {
          error: "Failed to load linked vendor.",
          details: vendorResult.error.message,
        },
        { status: 500 }
      );
    }

    if (itemsResult.error) {
      return NextResponse.json(
        {
          error: "Failed to load invoice items.",
          details: itemsResult.error.message,
        },
        { status: 500 }
      );
    }

    let project: ProjectRow | null = null;

    if (invoice.project_id) {
      const { data: projectRow } = await adminClient
        .from("infrastructure_projects")
        .select("*")
        .eq("id", invoice.project_id)
        .maybeSingle<ProjectRow>();

      project = projectRow ?? null;
    }

    let estimate: EstimateRow | null = null;

    if (invoice.estimate_id) {
      const { data: estimateRow } = await adminClient
        .from("infrastructure_estimates")
        .select("*")
        .eq("id", invoice.estimate_id)
        .maybeSingle<EstimateRow>();

      estimate = estimateRow ?? null;
    }

    const vendor = vendorResult.data ?? vendorContext ?? null;
    const items = itemsResult.data ?? [];

    const subtotal = Number(
      items.reduce((sum, item) => sum + normalizeMoney(item.total), 0).toFixed(2)
    );
    const invoiceTotal = normalizeMoney(invoice.total);
    const tax = Number(Math.max(invoiceTotal - subtotal, 0).toFixed(2));
    const estimateDisplayNumber = getEstimateDisplayNumber(estimate, invoice.estimate_id);

    return NextResponse.json({
      ok: true,
      invoice: {
        id: invoice.id,
        org_id: invoice.org_id,
        project_id: invoice.project_id,
        vendor_id: invoice.vendor_id,
        estimate_id: invoice.estimate_id,
        status: invoice.status,
        invoice_number: invoice.invoice_number,
        subtotal,
        tax,
        total: invoiceTotal,
        issued_at: invoice.issued_at,
        due_at: invoice.due_at,
        paid_at: invoice.paid_at,
        notes: null,
        created_at: invoice.created_at,
        updated_at: invoice.updated_at,

        project: project
          ? {
              id: project.id,
              name: getProjectDisplayName(project),
              status: typeof project.status === "string" ? project.status : null,
            }
          : null,

        vendor: vendor
          ? {
              id: vendor.id,
              company_name: vendor.company_name || "Unknown Vendor",
              contact_name: vendor.contact_name || null,
              email: vendor.email || null,
              phone: vendor.phone || null,
              onboarding_status: vendor.onboarding_status || null,
              is_active:
                typeof vendor.is_active === "boolean"
                  ? vendor.is_active
                  : typeof vendor.active === "boolean"
                  ? vendor.active
                  : null,
            }
          : null,

        estimate: invoice.estimate_id
          ? {
              id: estimate?.id || invoice.estimate_id,
              estimate_number: estimateDisplayNumber,
              status: typeof estimate?.status === "string" ? estimate.status : null,
              project_id:
                typeof estimate?.project_id === "string" ? estimate.project_id : null,
              vendor_id:
                typeof estimate?.vendor_id === "string" ? estimate.vendor_id : null,
              created_at:
                typeof estimate?.created_at === "string" ? estimate.created_at : null,
              updated_at:
                typeof estimate?.updated_at === "string" ? estimate.updated_at : null,
            }
          : null,

        items: items.map((item) => ({
          id: item.id,
          invoice_id: item.invoice_id,
          description: item.description || "",
          quantity: normalizeMoney(item.quantity),
          unit_price: normalizeMoney(item.unit_price),
          total: normalizeMoney(item.total),
          created_at: item.created_at || null,
          updated_at: item.updated_at || null,
        })),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    return NextResponse.json(
      {
        error: "Failed to load vendor invoice detail.",
        details: message,
      },
      { status: 500 }
    );
  }
}