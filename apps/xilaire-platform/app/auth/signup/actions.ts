"use server";

import { supabaseAdmin } from "@/lib/supabaseAdmin";

type ProvisionProfileInput = {
  id: string;
  email: string;
  full_name: string;
  account_type: "individual" | "business" | "vendor";
  company_name?: string | null;
  trade_services?: string | null;
  phone?: string | null;
  website?: string | null;
  vendor_category?: string | null;
};

type ProfileUpsertPayload = {
  id: string;
  email: string;
  full_name: string;
  role: string;
  status: string;
  account_type: "individual" | "business" | "vendor";
  company_name: string | null;
  trade_services: string | null;
  phone?: string | null;
  org_id?: string | null;
  updated_at: string;
};

type VendorLookupRow = {
  id: string;
  org_id?: string | null;
  email?: string | null;
  company_name?: string | null;
  trade_services?: string | null;
  phone?: string | null;
  website?: string | null;
  vendor_category?: string | null;
};

function normalizeString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function normalizeEmail(value: unknown): string | null {
  const normalized = normalizeString(value);
  return normalized ? normalized.toLowerCase() : null;
}

function parseServiceTypes(value: string | null): string[] {
  if (!value) return [];

  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function resolveProfileRole(
  accountType: ProvisionProfileInput["account_type"]
) {
  switch (accountType) {
    case "individual":
    case "business":
    case "vendor":
    default:
      return "user";
  }
}

function resolveVendorOrgId() {
  return normalizeString(process.env.DEFAULT_VENDOR_ORG_ID_PLATFORM) || null;
}

async function waitForAuthUser(
  userId: string,
  maxAttempts = 10,
  delayMs = 400
) {
  let lastError: string | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const { data, error } = await supabaseAdmin.auth.admin.getUserById(userId);

    if (!error && data?.user?.id) {
      return data.user;
    }

    lastError = error?.message ?? "Auth user not yet visible";

    if (attempt < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  throw new Error(
    `Auth user not visible after retries: ${lastError ?? "unknown error"}`
  );
}

async function ensureVendorRecord(params: {
  org_id: string;
  email: string;
  full_name: string;
  company_name: string | null;
  trade_services: string | null;
  phone?: string | null;
  website?: string | null;
  vendor_category?: string | null;
}) {
  const now = new Date().toISOString();

  const normalizedOrgId = normalizeString(params.org_id);
  const normalizedEmail = normalizeEmail(params.email);
  const normalizedFullName = normalizeString(params.full_name);
  const normalizedCompanyName = normalizeString(params.company_name);
  const normalizedTradeServices = normalizeString(params.trade_services);
  const normalizedPhone = normalizeString(params.phone);
  const normalizedWebsite = normalizeString(params.website);
  const normalizedVendorCategory = normalizeString(params.vendor_category);
  const normalizedServiceTypes = parseServiceTypes(normalizedTradeServices);

  if (!normalizedOrgId || !normalizedEmail) {
    throw new Error("Vendor provisioning is missing org_id or email.");
  }

  const { data: existingVendor, error: lookupError } = await supabaseAdmin
    .from("infrastructure_vendors")
    .select(
      "id, org_id, email, company_name, trade_services, phone, website, vendor_category"
    )
    .eq("org_id", normalizedOrgId)
    .eq("email", normalizedEmail)
    .maybeSingle<VendorLookupRow>();

  if (lookupError) {
    console.error("SIGNUP_VENDOR_LOOKUP_ERROR:", lookupError);
    throw new Error(lookupError.message);
  }

  if (existingVendor?.id) {
    const { error: updateError } = await supabaseAdmin
      .from("infrastructure_vendors")
      .update({
        company_name: normalizedCompanyName || "Unnamed Vendor",
        contact_name: normalizedFullName,
        email: normalizedEmail,
        trade_services: normalizedTradeServices,
        service_types: normalizedServiceTypes,
        phone: normalizedPhone,
        website: normalizedWebsite,
        vendor_category: normalizedVendorCategory,
        active: true,
        is_active: true,
      })
      .eq("id", existingVendor.id);

    if (updateError) {
      console.error("SIGNUP_VENDOR_UPDATE_ERROR:", updateError);
      throw new Error(updateError.message);
    }

    return existingVendor.id;
  }

  const { data: insertedVendor, error: insertError } = await supabaseAdmin
    .from("infrastructure_vendors")
    .insert({
      org_id: normalizedOrgId,
      company_name: normalizedCompanyName || "Unnamed Vendor",
      contact_name: normalizedFullName,
      email: normalizedEmail,
      trade_services: normalizedTradeServices,
      service_types: normalizedServiceTypes,
      phone: normalizedPhone,
      website: normalizedWebsite,
      vendor_category: normalizedVendorCategory,
      active: true,
      is_active: true,
      created_at: now,
    })
    .select("id")
    .single<VendorLookupRow>();

  if (insertError) {
    console.error("SIGNUP_VENDOR_INSERT_ERROR:", insertError);
    throw new Error(insertError.message);
  }

  return insertedVendor?.id || null;
}

export async function provisionProfile(user: ProvisionProfileInput) {
  const normalizedId = normalizeString(user.id);
  const normalizedEmail = normalizeEmail(user.email);
  const normalizedFullName = normalizeString(user.full_name);
  const normalizedCompanyName = normalizeString(user.company_name);
  const normalizedTradeServices = normalizeString(user.trade_services);
  const normalizedPhone = normalizeString(user.phone);
  const normalizedWebsite = normalizeString(user.website);
  const normalizedVendorCategory = normalizeString(user.vendor_category);
  const normalizedAccountType = user.account_type;

  if (!normalizedId || !normalizedEmail || !normalizedFullName) {
    throw new Error("Missing required profile fields for provisioning.");
  }

  if (
    normalizedAccountType !== "individual" &&
    normalizedAccountType !== "business" &&
    normalizedAccountType !== "vendor"
  ) {
    throw new Error("Invalid account_type for provisioning.");
  }

  await waitForAuthUser(normalizedId);

  const isVendor = normalizedAccountType === "vendor";
  const vendorOrgId = isVendor ? resolveVendorOrgId() : null;

  if (isVendor && !vendorOrgId) {
    throw new Error(
      "Missing DEFAULT_VENDOR_ORG_ID_PLATFORM. Vendor signup cannot assign org context."
    );
  }

  const payload: ProfileUpsertPayload = {
    id: normalizedId,
    email: normalizedEmail,
    full_name: normalizedFullName,
    role: resolveProfileRole(normalizedAccountType),
    status: "active",
    account_type: normalizedAccountType,
    company_name: normalizedCompanyName,
    trade_services: normalizedTradeServices,
    phone: normalizedPhone,
    updated_at: new Date().toISOString(),
  };

  if (isVendor) {
    payload.org_id = vendorOrgId;
  }

  console.log("SIGNUP_PROFILE_UPSERT_PAYLOAD:", payload);

  const { error: profileError } = await supabaseAdmin
    .from("profiles")
    .upsert(payload, { onConflict: "id" });

  if (profileError) {
    console.error("SIGNUP_PROVISION_PROFILE_ERROR:", profileError);
    throw new Error(profileError.message);
  }

  if (isVendor && vendorOrgId) {
    const vendorId = await ensureVendorRecord({
      org_id: vendorOrgId,
      email: normalizedEmail,
      full_name: normalizedFullName,
      company_name: normalizedCompanyName,
      trade_services: normalizedTradeServices,
      phone: normalizedPhone,
      website: normalizedWebsite,
      vendor_category: normalizedVendorCategory,
    });

    console.log("SIGNUP_VENDOR_RECORD_OK:", {
      profile_id: normalizedId,
      vendor_id: vendorId,
      email: normalizedEmail,
      org_id: vendorOrgId,
    });
  }
}