import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ProfileRow = {
  id: string;
  email: string | null;
  role: string | null;
  account_type: string | null;
  org_id: string | null;
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

type VendorRow = {
  id: string;
  org_id: string | null;
  email: string | null;
  company_name: string | null;
};

type UpdateItemInput = {
  id?: string | null;
  description?: string | null;
  quantity?: number | null;
  unit_price?: number | null;
  total?: number | null;
};

type UpdateInvoicePayload = {
  id?: string;
  invoice_number?: string | null;
  status?: string | null;
  subtotal?: number | null;
  tax?: number | null;
  total?: number | null;
  issued_at?: string | null;
  due_at?: string | null;
  paid_at?: string | null;
  notes?: string | null;
  items?: UpdateItemInput[];
};

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

function canVendorSetStatus(status: string | null | undefined) {
  const normalized = normalizeText(status);
  return normalized === "draft" || normalized === "submitted";
}

function canAdminSetStatus(status: string | null | undefined) {
  const normalized = normalizeText(status);
  return (
    normalized === "draft" ||
    normalized === "submitted" ||
    normalized === "approved" ||
    normalized === "paid" ||
    normalized === "cancelled"
  );
}

function toNullableTrimmed(value: unknown): string | null {
  if (value == null) return null;
  const trimmed = String(value).trim();
  return trimmed.length ? trimmed : null;
}

function toNullableIsoDate(value: unknown): string | null {
  if (value == null || value === "") return null;
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) {
    throw new Error("One or more dates are invalid.");
  }
  return date.toISOString();
}

function toNumberOrNull(value: unknown): number | null {
  if (value == null || value === "") return null;
  const num = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(num)) {
    throw new Error("One or more numeric values are invalid.");
  }
  return Number(num.toFixed(2));
}

function calculateItemTotal(item: UpdateItemInput): number {
  const explicitTotal = toNumberOrNull(item.total);
  if (explicitTotal != null) return explicitTotal;

  const quantity = toNumberOrNull(item.quantity) ?? 1;
  const unitPrice = toNumberOrNull(item.unit_price) ?? 0;

  return Number((quantity * unitPrice).toFixed(2));
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as UpdateInvoicePayload;
    const invoiceId = toNullableTrimmed(body.id);

    if (!invoiceId) {
      return NextResponse.json(
        { error: "Invoice id is required." },
        { status: 400 }
      );
    }

    const cookieStore = await cookies();

    const supabase = createServerClient(
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

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, email, role, account_type, org_id")
      .eq("id", user.id)
      .single<ProfileRow>();

    if (profileError || !profile) {
      return NextResponse.json({ error: "Profile not found." }, { status: 403 });
    }

    const adminView = isAdmin(profile);
    const vendorView = isVendorUser(profile);

    if (!adminView && !vendorView) {
      return NextResponse.json(
        { error: "You do not have permission to update invoices." },
        { status: 403 }
      );
    }

    const { data: invoice, error: invoiceError } = await supabase
      .from("infrastructure_invoices")
      .select(
        "id, org_id, vendor_id, project_id, estimate_id, invoice_number, status, total, issued_at, due_at, paid_at, created_at, updated_at"
      )
      .eq("id", invoiceId)
      .single<InvoiceRow>();

    if (invoiceError || !invoice) {
      return NextResponse.json({ error: "Invoice not found." }, { status: 404 });
    }

    if (profile.org_id && invoice.org_id && profile.org_id !== invoice.org_id && !adminView) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    let resolvedVendor: VendorRow | null = null;

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

      const { data: vendorRow, error: vendorError } = await supabase
        .from("infrastructure_vendors")
        .select("id, org_id, email, company_name")
        .in("email", emailCandidates)
        .eq("org_id", profile.org_id)
        .limit(1)
        .maybeSingle<VendorRow>();

      if (vendorError) {
        return NextResponse.json(
          {
            error: "Failed to resolve vendor access.",
            details: vendorError.message,
          },
          { status: 500 }
        );
      }

      if (!vendorRow) {
        return NextResponse.json(
          { error: "Vendor record not found." },
          { status: 403 }
        );
      }

      resolvedVendor = vendorRow;

      if (!invoice.vendor_id || invoice.vendor_id !== resolvedVendor.id) {
        return NextResponse.json({ error: "Forbidden." }, { status: 403 });
      }
    }

    const requestedStatus = toNullableTrimmed(body.status) ?? invoice.status ?? "draft";

    if (!adminView && !canVendorSetStatus(requestedStatus)) {
      return NextResponse.json(
        { error: "Vendor users may only set status to draft or submitted." },
        { status: 403 }
      );
    }

    if (adminView && !canAdminSetStatus(requestedStatus)) {
      return NextResponse.json(
        { error: "Invalid invoice status." },
        { status: 400 }
      );
    }

    const normalizedItems = Array.isArray(body.items)
      ? body.items
          .map((item) => {
            const description = toNullableTrimmed(item.description) || "Invoice item";
            const quantity = toNumberOrNull(item.quantity) ?? 1;
            const unitPrice = toNumberOrNull(item.unit_price) ?? 0;
            const total = calculateItemTotal(item);

            const isMeaningful =
              description ||
              quantity !== 0 ||
              unitPrice !== 0 ||
              total !== 0;

            if (!isMeaningful) {
              return null;
            }

            return {
              description,
              quantity,
              unit_price: unitPrice,
              total,
            };
          })
          .filter((item): item is NonNullable<typeof item> => Boolean(item))
      : [];

    const itemsSubtotal = Number(
      normalizedItems.reduce((sum, item) => sum + item.total, 0).toFixed(2)
    );

    const requestedSubtotal = toNumberOrNull(body.subtotal);
    const requestedTax = toNumberOrNull(body.tax) ?? 0;
    const requestedTotal = toNumberOrNull(body.total);

    const effectiveSubtotal = requestedSubtotal ?? itemsSubtotal;
    const effectiveTotal =
      requestedTotal ?? Number((effectiveSubtotal + requestedTax).toFixed(2));

    const invoiceUpdatePayload: Record<string, unknown> = {
      invoice_number: toNullableTrimmed(body.invoice_number) ?? invoice.invoice_number,
      status: requestedStatus,
      total: effectiveTotal,
      issued_at: toNullableIsoDate(body.issued_at),
      due_at: toNullableIsoDate(body.due_at),
    };

    if (adminView) {
      invoiceUpdatePayload.paid_at = toNullableIsoDate(body.paid_at);
    }

    if (!adminView && requestedStatus !== "paid") {
      // vendors cannot stamp paid_at
      invoiceUpdatePayload.paid_at = invoice.paid_at;
    }

    const { error: updateInvoiceError } = await supabase
      .from("infrastructure_invoices")
      .update(invoiceUpdatePayload)
      .eq("id", invoice.id);

    if (updateInvoiceError) {
      return NextResponse.json(
        {
          error: "Failed to update invoice.",
          details: updateInvoiceError.message,
        },
        { status: 500 }
      );
    }

    if (Array.isArray(body.items)) {
      const { error: deleteItemsError } = await supabase
        .from("infrastructure_invoice_items")
        .delete()
        .eq("invoice_id", invoice.id);

      if (deleteItemsError) {
        return NextResponse.json(
          {
            error: "Invoice updated, but existing items could not be replaced.",
            details: deleteItemsError.message,
          },
          { status: 500 }
        );
      }

      if (normalizedItems.length > 0) {
        const insertPayload = normalizedItems.map((item) => ({
          invoice_id: invoice.id,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total: item.total,
        }));

        const { error: insertItemsError } = await supabase
          .from("infrastructure_invoice_items")
          .insert(insertPayload);

        if (insertItemsError) {
          return NextResponse.json(
            {
              error: "Invoice updated, but replacement items failed to save.",
              details: insertItemsError.message,
            },
            { status: 500 }
          );
        }
      }
    }

    const { data: refreshedInvoice, error: refreshedInvoiceError } = await supabase
      .from("infrastructure_invoices")
      .select(
        "id, org_id, vendor_id, project_id, estimate_id, invoice_number, status, total, issued_at, due_at, paid_at, created_at, updated_at"
      )
      .eq("id", invoice.id)
      .single<InvoiceRow>();

    if (refreshedInvoiceError || !refreshedInvoice) {
      return NextResponse.json({
        ok: true,
        message: "Invoice updated successfully.",
        invoice_id: invoice.id,
      });
    }

    const { data: refreshedItems } = await supabase
      .from("infrastructure_invoice_items")
      .select("id, invoice_id, description, quantity, unit_price, total")
      .eq("invoice_id", invoice.id)
      .order("created_at", { ascending: true });

    return NextResponse.json({
      ok: true,
      message: "Invoice updated successfully.",
      invoice: {
        id: refreshedInvoice.id,
        org_id: refreshedInvoice.org_id,
        vendor_id: refreshedInvoice.vendor_id,
        project_id: refreshedInvoice.project_id,
        estimate_id: refreshedInvoice.estimate_id,
        invoice_number: refreshedInvoice.invoice_number,
        status: refreshedInvoice.status,
        subtotal: effectiveSubtotal,
        tax: requestedTax,
        total: effectiveTotal,
        issued_at: refreshedInvoice.issued_at,
        due_at: refreshedInvoice.due_at,
        paid_at: refreshedInvoice.paid_at,
        created_at: refreshedInvoice.created_at,
        updated_at: refreshedInvoice.updated_at,
        items: Array.isArray(refreshedItems) ? refreshedItems : [],
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    return NextResponse.json(
      {
        error: "Failed to update vendor invoice.",
        details: message,
      },
      { status: 500 }
    );
  }
}