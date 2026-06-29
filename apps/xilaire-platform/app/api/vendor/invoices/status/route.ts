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

type StatusPayload = {
  invoice_id?: string;
  status?: string | null;
  paid_at?: string | null;
  notes?: string | null;
};

function normalizeText(value: string | null | undefined) {
  return String(value || "").trim().toLowerCase();
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
    throw new Error("Invalid date value.");
  }
  return date.toISOString();
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

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as StatusPayload;

    const invoiceId = toNullableTrimmed(body.invoice_id);
    const requestedStatus = toNullableTrimmed(body.status);

    if (!invoiceId) {
      return NextResponse.json(
        { error: "invoice_id is required." },
        { status: 400 }
      );
    }

    if (!requestedStatus) {
      return NextResponse.json(
        { error: "status is required." },
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
        { error: "You do not have permission to update invoice status." },
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

      if (!invoice.vendor_id || invoice.vendor_id !== vendorRow.id) {
        return NextResponse.json({ error: "Forbidden." }, { status: 403 });
      }
    }

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

    const updatePayload: Record<string, unknown> = {
      status: requestedStatus,
    };

    if (normalizeText(requestedStatus) === "paid") {
      if (!adminView) {
        return NextResponse.json(
          { error: "Only admin users may mark invoices as paid." },
          { status: 403 }
        );
      }

      updatePayload.paid_at = toNullableIsoDate(body.paid_at) ?? new Date().toISOString();
    } else if (normalizeText(requestedStatus) !== "paid") {
      if (adminView && normalizeText(invoice.status) === "paid") {
        updatePayload.paid_at = null;
      } else {
        updatePayload.paid_at = invoice.paid_at;
      }
    }

    const { error: updateError } = await supabase
      .from("infrastructure_invoices")
      .update(updatePayload)
      .eq("id", invoice.id);

    if (updateError) {
      return NextResponse.json(
        {
          error: "Failed to update invoice status.",
          details: updateError.message,
        },
        { status: 500 }
      );
    }

    const { data: refreshedInvoice, error: refreshedError } = await supabase
      .from("infrastructure_invoices")
      .select(
        "id, org_id, vendor_id, project_id, estimate_id, invoice_number, status, total, issued_at, due_at, paid_at, created_at, updated_at"
      )
      .eq("id", invoice.id)
      .single<InvoiceRow>();

    if (refreshedError || !refreshedInvoice) {
      return NextResponse.json({
        ok: true,
        message: "Invoice status updated successfully.",
        invoice_id: invoice.id,
        status: requestedStatus,
      });
    }

    return NextResponse.json({
      ok: true,
      message: "Invoice status updated successfully.",
      invoice: {
        id: refreshedInvoice.id,
        org_id: refreshedInvoice.org_id,
        vendor_id: refreshedInvoice.vendor_id,
        project_id: refreshedInvoice.project_id,
        estimate_id: refreshedInvoice.estimate_id,
        invoice_number: refreshedInvoice.invoice_number,
        status: refreshedInvoice.status,
        total: refreshedInvoice.total,
        issued_at: refreshedInvoice.issued_at,
        due_at: refreshedInvoice.due_at,
        paid_at: refreshedInvoice.paid_at,
        created_at: refreshedInvoice.created_at,
        updated_at: refreshedInvoice.updated_at,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    return NextResponse.json(
      {
        error: "Failed to update vendor invoice status.",
        details: message,
      },
      { status: 500 }
    );
  }
}