import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

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

const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
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
  "Surrogate-Control": "no-store",
};

/* =================================================
TYPES
================================================= */

type ProfileRow = {
  id: string;
  org_id: string | null;
  role: string | null;
};

type EstimateRow = {
  id: string;
  org_id: string;
  project_id: string;
  vendor_id: string | null;
  site_visit_id: string | null;
  status: string | null;
  notes: string | null;
  labor_cost: number | null;
  material_cost: number | null;
  total_cost: number | null;
};

type CreateFromEstimateBody = {
  estimate_id?: string;
};

type ParsedTask = {
  code: string;
  label: string;
};

type BuiltInvoiceItem = {
  description: string;
  quantity: number;
  unit_price: number;
  amount: number;
};

type InvoiceHeaderInsert = {
  org_id: string;
  project_id: string;
  vendor_id: string | null;
  estimate_id: string;
  invoice_number: string;
  status: string;
  subtotal: number;
  tax: number;
  total: number;
  notes: string | null;
  created_by?: string;
  updated_by?: string;
};

/* =================================================
HELPERS
================================================= */

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

function json(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: NO_STORE_HEADERS,
  });
}

function error(message: string, status = 400, details?: unknown, stage?: string) {
  return json(
    {
      ok: false,
      error: message,
      details: details ?? null,
      stage: stage ?? null,
    },
    status
  );
}

function normalizeText(value: unknown) {
  return String(value || "").trim();
}

function normalizeTextLower(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

function normalizeUuid(value: unknown) {
  const normalized = String(value || "").trim();
  return normalized || null;
}

function isAdminRole(role: string | null | undefined) {
  return ["master_admin", "admin", "super_admin", "project_manager"].includes(
    normalizeTextLower(role)
  );
}

function roundMoney(value: number) {
  return Number(value.toFixed(2));
}

function buildInvoiceNumber(params: {
  estimateId: string;
  projectId: string;
}) {
  const suffix = Date.now().toString().slice(-6);
  return `INV-EST-${params.estimateId.slice(0, 8).toUpperCase()}-${params.projectId
    .slice(0, 8)
    .toUpperCase()}-${suffix}`;
}

function prettifyTaskCode(taskCode: string) {
  return taskCode.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function shouldRetryForSchema(errorMessage: string) {
  const msg = normalizeTextLower(errorMessage);

  return (
    msg.includes("column") ||
    msg.includes("schema cache") ||
    msg.includes("could not find") ||
    msg.includes("does not exist") ||
    msg.includes("unknown") ||
    msg.includes("record") ||
    msg.includes("null value") ||
    msg.includes("violates")
  );
}

/* =================================================
TASK SNAPSHOT PARSING
================================================= */

function parseAssignedTasksFromNotes(notes: string | null | undefined): ParsedTask[] {
  const text = String(notes || "");
  if (!text) return [];

  const lines = text.split(/\r?\n/).map((line) => line.trim());
  const tasks: ParsedTask[] = [];

  for (const line of lines) {
    const match = line.match(/^-\s*(.*?)\s*\[([a-z0-9_ -]+)\]\s*$/i);
    if (!match) continue;

    const label = normalizeText(match[1]);
    const code = normalizeTextLower(match[2]).replace(/\s+/g, "_");

    if (!code) continue;

    tasks.push({
      code,
      label: label || prettifyTaskCode(code),
    });
  }

  const deduped = new Map<string, ParsedTask>();
  for (const task of tasks) {
    if (!deduped.has(task.code)) {
      deduped.set(task.code, task);
    }
  }

  return Array.from(deduped.values());
}

function buildInvoiceItemsFromEstimate(estimate: EstimateRow): BuiltInvoiceItem[] {
  const totalCost = roundMoney(Number(estimate.total_cost || 0));
  const laborCost = roundMoney(Number(estimate.labor_cost || 0));
  const materialCost = roundMoney(Number(estimate.material_cost || 0));

  const parsedTasks = parseAssignedTasksFromNotes(estimate.notes);

  if (parsedTasks.length > 0) {
    const perTaskAmount =
      parsedTasks.length > 0 ? roundMoney(totalCost / parsedTasks.length) : totalCost;

    return parsedTasks.map((task, index) => {
      const isLast = index === parsedTasks.length - 1;
      const allocatedBefore = roundMoney(perTaskAmount * index);
      const amount = isLast
        ? roundMoney(totalCost - allocatedBefore)
        : perTaskAmount;

      return {
        description: task.label,
        quantity: 1,
        unit_price: amount,
        amount,
      };
    });
  }

  const items: BuiltInvoiceItem[] = [];

  if (laborCost > 0) {
    items.push({
      description: "Labor",
      quantity: 1,
      unit_price: laborCost,
      amount: laborCost,
    });
  }

  if (materialCost > 0) {
    items.push({
      description: "Materials",
      quantity: 1,
      unit_price: materialCost,
      amount: materialCost,
    });
  }

  if (items.length === 0) {
    items.push({
      description: "Estimate Conversion",
      quantity: 1,
      unit_price: totalCost,
      amount: totalCost,
    });
  }

  return items;
}

async function createInvoiceRecord(params: {
  orgId: string;
  estimate: EstimateRow;
  userId: string;
}) {
  const totalCost = roundMoney(Number(params.estimate.total_cost || 0));
  const subtotal = totalCost;
  const tax = 0;
  const total = subtotal;

  const invoiceNumber = buildInvoiceNumber({
    estimateId: params.estimate.id,
    projectId: params.estimate.project_id,
  });

  const basePayload: InvoiceHeaderInsert = {
    org_id: params.orgId,
    project_id: params.estimate.project_id,
    vendor_id: params.estimate.vendor_id,
    estimate_id: params.estimate.id,
    invoice_number: invoiceNumber,
    status: "draft",
    subtotal,
    tax,
    total,
    notes: params.estimate.notes || null,
    created_by: params.userId,
    updated_by: params.userId,
  };

  let result = await admin
    .from("infrastructure_invoices")
    .insert(basePayload)
    .select("*")
    .single();

  if (!result.error && result.data) {
    return result.data;
  }

  const retryPayload = {
    org_id: params.orgId,
    project_id: params.estimate.project_id,
    vendor_id: params.estimate.vendor_id,
    estimate_id: params.estimate.id,
    invoice_number: invoiceNumber,
    status: "draft",
    subtotal,
    tax,
    total,
    notes: params.estimate.notes || null,
  };

  if (!shouldRetryForSchema(result.error?.message || "")) {
    throw new Error(result.error?.message || "Failed to create invoice");
  }

  result = await admin
    .from("infrastructure_invoices")
    .insert(retryPayload)
    .select("*")
    .single();

  if (result.error || !result.data) {
    throw new Error(result.error?.message || "Failed to create invoice");
  }

  return result.data;
}

async function tryInsertItemsVariant(payload: Record<string, any>[]) {
  return admin
    .from("infrastructure_invoice_items")
    .insert(payload)
    .select("*");
}

async function insertInvoiceItems(params: {
  orgId: string;
  invoiceId: string;
  items: BuiltInvoiceItem[];
  userId: string;
}) {
  const variants: Record<string, any>[][] = [
    params.items.map((item) => ({
      org_id: params.orgId,
      invoice_id: params.invoiceId,
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unit_price,
      total: item.amount,
      created_by: params.userId,
      updated_by: params.userId,
    })),
    params.items.map((item) => ({
      org_id: params.orgId,
      invoice_id: params.invoiceId,
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unit_price,
      total: item.amount,
    })),
    params.items.map((item) => ({
      invoice_id: params.invoiceId,
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unit_price,
      total: item.amount,
      created_by: params.userId,
      updated_by: params.userId,
    })),
    params.items.map((item) => ({
      invoice_id: params.invoiceId,
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unit_price,
      total: item.amount,
    })),
    params.items.map((item) => ({
      org_id: params.orgId,
      invoice_id: params.invoiceId,
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unit_price,
      line_total: item.amount,
      created_by: params.userId,
      updated_by: params.userId,
    })),
    params.items.map((item) => ({
      org_id: params.orgId,
      invoice_id: params.invoiceId,
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unit_price,
      line_total: item.amount,
    })),
    params.items.map((item) => ({
      invoice_id: params.invoiceId,
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unit_price,
      line_total: item.amount,
      created_by: params.userId,
      updated_by: params.userId,
    })),
    params.items.map((item) => ({
      invoice_id: params.invoiceId,
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unit_price,
      line_total: item.amount,
    })),
  ];

  const errors: string[] = [];

  for (const payload of variants) {
    const result = await tryInsertItemsVariant(payload);

    if (!result.error) {
      return result.data || [];
    }

    errors.push(result.error.message || "Unknown invoice item insert error");
  }

  throw new Error(errors.join(" || "));
}

async function getHydratedInvoice(invoiceId: string) {
  const { data: invoice, error: invoiceError } = await admin
    .from("infrastructure_invoices")
    .select(`
      id,
      org_id,
      project_id,
      vendor_id,
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
      updated_at
    `)
    .eq("id", invoiceId)
    .single();

  if (invoiceError || !invoice) {
    return {
      id: invoiceId,
      items: [],
    };
  }

  let items: any[] = [];

  const totalResult = await admin
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

  if (!totalResult.error) {
    items = totalResult.data || [];
  } else {
    const lineTotalResult = await admin
      .from("infrastructure_invoice_items")
      .select(`
        id,
        invoice_id,
        description,
        quantity,
        unit_price,
        line_total,
        created_at,
        updated_at
      `)
      .eq("invoice_id", invoiceId)
      .order("created_at", { ascending: true });

    if (!lineTotalResult.error) {
      items = (lineTotalResult.data || []).map((item: any) => ({
        ...item,
        total: item.line_total ?? null,
      }));
    }
  }

  return {
    ...invoice,
    items,
  };
}

/* =================================================
POST
================================================= */

export async function POST(req: Request) {
  try {
    const token = await resolveToken(req);

    if (!token) {
      return error("Unauthorized", 401, null, "resolve-token");
    }

    const {
      data: { user },
      error: userError,
    } = await authClient.auth.getUser(token);

    if (userError || !user) {
      return error("Unauthorized", 401, userError?.message || null, "auth-user");
    }

    const body = (await req.json()) as CreateFromEstimateBody;
    const estimateId = normalizeUuid(body?.estimate_id);

    if (!estimateId) {
      return error("estimate_id is required", 400, null, "validate-body");
    }

    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("id, org_id, role")
      .eq("id", user.id)
      .single<ProfileRow>();

    if (profileError || !profile) {
      return error(
        "Profile not found for authenticated user",
        403,
        profileError?.message || null,
        "load-profile"
      );
    }

    if (!profile.org_id) {
      return error("Missing org context", 403, null, "validate-profile");
    }

    if (!isAdminRole(profile.role)) {
      return error(
        "Only infrastructure admins can convert estimates to invoices",
        403,
        { role: profile.role },
        "validate-role"
      );
    }

    const orgId = profile.org_id;

    const { data: estimate, error: estimateError } = await admin
      .from("infrastructure_estimates")
      .select(`
        id,
        org_id,
        project_id,
        vendor_id,
        site_visit_id,
        status,
        notes,
        labor_cost,
        material_cost,
        total_cost
      `)
      .eq("id", estimateId)
      .eq("org_id", orgId)
      .single<EstimateRow>();

    if (estimateError || !estimate) {
      return error("Estimate not found", 404, estimateError?.message || null, "load-estimate");
    }

    if (normalizeTextLower(estimate.status) !== "approved") {
      return error(
        "Only approved estimates can be converted",
        400,
        { status: estimate.status },
        "validate-estimate-status"
      );
    }

    if (!estimate.project_id) {
      return error("Estimate is missing project_id", 400, null, "validate-project-id");
    }

    if (!estimate.vendor_id) {
      return error("Estimate is missing vendor_id", 400, null, "validate-vendor-id");
    }

    const { data: existingInvoices, error: existingError } = await admin
      .from("infrastructure_invoices")
      .select(`
        id,
        invoice_number,
        status,
        subtotal,
        tax,
        total,
        created_at,
        updated_at
      `)
      .eq("estimate_id", estimateId)
      .eq("org_id", orgId)
      .limit(1);

    if (existingError) {
      return error(
        "Failed checking for existing invoice",
        500,
        existingError.message,
        "check-existing-invoice"
      );
    }

    if (existingInvoices && existingInvoices.length > 0) {
      const existingInvoiceId = String(existingInvoices[0].id || "").trim();

      let existingInvoice: Record<string, unknown> | null = null;

      if (existingInvoiceId) {
        existingInvoice = await getHydratedInvoice(existingInvoiceId);
      }

      return json(
        {
          ok: true,
          already_exists: true,
          message: "Invoice already exists for this estimate",
          invoice_id: existingInvoiceId || null,
          invoice: existingInvoice,
        },
        200
      );
    }

    const invoice = await createInvoiceRecord({
      orgId,
      estimate,
      userId: user.id,
    });

    const builtItems = buildInvoiceItemsFromEstimate(estimate);

    let insertedItems: any[] = [];

    try {
      insertedItems = await insertInvoiceItems({
        orgId,
        invoiceId: String(invoice.id),
        items: builtItems,
        userId: user.id,
      });
    } catch (itemErr: any) {
      await admin.from("infrastructure_invoices").delete().eq("id", invoice.id);

      return error(
        "Invoice was created but invoice items failed. Invoice was rolled back.",
        500,
        itemErr?.message || null,
        "insert-invoice-items"
      );
    }

    const hydratedInvoice = await getHydratedInvoice(String(invoice.id));

    return json(
      {
        ok: true,
        already_exists: false,
        message: "Invoice created successfully from approved estimate",
        invoice_id: String(invoice.id),
        invoice_number: normalizeText((invoice as any).invoice_number) || null,
        invoice: hydratedInvoice,
        items: insertedItems || [],
      },
      201
    );
  } catch (err: any) {
    console.error("CREATE_INVOICE_FROM_ESTIMATE_ERROR:", err);

    return error(
      "Unexpected server error",
      500,
      err?.message || null,
      "unhandled-catch"
    );
  }
}