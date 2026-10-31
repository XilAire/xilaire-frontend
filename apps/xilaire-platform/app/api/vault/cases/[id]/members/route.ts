import { NextRequest } from "next/server";
import {
  getVaultAdminClient,
  jsonError,
  jsonOk,
  requireVaultAccess,
  writeUnifiedVaultAccessAuditLog,
} from "@/lib/vault/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type VaultCaseRow = {
  id: string;
  org_id: string;
  name: string;
  status: string | null;
  deleted_at: string | null;
};

type VaultCaseMemberRow = {
  id: string;
  org_id: string;
  case_id: string;
  assignable_type: "custodian" | "admin";
  assignable_id: string;
  role: string | null;
  created_at: string | null;
  created_by: string | null;
};

type VaultCustodianRow = {
  id: string;
  org_id: string;
  email: string;
  display_name: string | null;
  department: string | null;
  title: string | null;
  status: string | null;
};

type VaultMailboxRow = {
  id: string;
  org_id: string;
  custodian_id: string | null;
  mailbox_address: string | null;
  display_name: string | null;
  mailbox_type: string | null;
  ingestion_status: string | null;
  deleted_at: string | null;
};

type VaultUserRoleRow = {
  user_id: string;
  role: string;
};

type ProfileRow = {
  id: string;
  org_id: string | null;
  email: string | null;
  full_name: string | null;
  role: string | null;
  status: string | null;
  account_type: string | null;
};

type AddCaseMembersRequest = {
  members?: Array<{
    assignableType?: string;
    assignable_type?: string;
    assignableId?: string;
    assignable_id?: string;
    role?: string | null;
  }>;
  assignableType?: string;
  assignable_type?: string;
  assignableId?: string;
  assignable_id?: string;
  role?: string | null;
};

function normalizeString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function normalizeAssignableType(value: unknown): "custodian" | "admin" | null {
  const normalized = normalizeString(value)?.toLowerCase();

  if (normalized === "custodian") return "custodian";
  if (normalized === "admin") return "admin";

  return null;
}

function normalizeRole(value: unknown): string {
  return normalizeString(value)?.toLowerCase() ?? "member";
}

function toRows<T>(value: unknown): T[] {
  if (!Array.isArray(value)) return [];
  return value as T[];
}

function getAccessOrgId(access: unknown): string {
  const record = access as Record<string, unknown> | null;

  const orgId =
    normalizeString(record?.orgId) ??
    normalizeString(record?.org_id) ??
    normalizeString(record?.targetOrgId) ??
    normalizeString(record?.target_org_id) ??
    normalizeString(
      record?.profile && typeof record.profile === "object"
        ? (record.profile as Record<string, unknown>).org_id
        : null
    ) ??
    normalizeString(
      record?.user && typeof record.user === "object"
        ? (record.user as Record<string, unknown>).org_id
        : null
    );

  if (!orgId) {
    throw new Error("Unable to resolve Vault org context from access object.");
  }

  return orgId;
}

function getAccessUserId(access: unknown): string | null {
  const record = access as Record<string, unknown> | null;

  return (
    normalizeString(record?.userId) ??
    normalizeString(record?.user_id) ??
    normalizeString(
      record?.user && typeof record.user === "object"
        ? (record.user as Record<string, unknown>).id
        : null
    ) ??
    null
  );
}

function isAdminVaultRole(role: string | null | undefined): boolean {
  const normalized = normalizeString(role)?.toLowerCase();

  return normalized === "vault_admin" || normalized === "vault_compliance_admin";
}

/** Mutations require a current Vault administrator identity in this organization.
 * This is independent of the read-only support scope used by GET.
 */
async function requireCaseMemberWriteAccess(
  supabase: Awaited<ReturnType<typeof getVaultAdminClient>>,
  access: unknown,
  orgId: string
) {
  const actorId = getAccessUserId(access);
  if (!actorId) return { ok: false as const, actorId: null };

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, org_id, status")
    .eq("id", actorId)
    .eq("org_id", orgId)
    .maybeSingle();
  if (profileError) throw new Error("Unable to verify acting user profile.");
  if (!profile || (profile.status && profile.status !== "active")) {
    return { ok: false as const, actorId };
  }

  const { data: roles, error: roleError } = await supabase
    .from("vault_user_roles")
    .select("user_id, role")
    .eq("org_id", orgId)
    .eq("user_id", actorId);
  if (roleError) throw new Error("Unable to verify acting user Vault roles.");

  return {
    ok: toRows<VaultUserRoleRow>(roles).some((row) => isAdminVaultRole(row.role)),
    actorId,
  };
}

function getCustodianDisplayName(row: VaultCustodianRow | null) {
  if (!row) return null;
  return normalizeString(row.display_name) ?? row.email;
}

function getProfileDisplayName(row: ProfileRow | null) {
  if (!row) return null;
  return normalizeString(row.full_name) ?? normalizeString(row.email) ?? row.id;
}

function buildMemberPayload(
  row: VaultCaseMemberRow,
  custodiansById: Map<string, VaultCustodianRow>,
  profilesById: Map<string, ProfileRow>,
  vaultRolesByUserId: Map<string, VaultUserRoleRow>,
  mailboxesByCustodianId: Map<string, VaultMailboxRow[]>
) {
  const custodian =
    row.assignable_type === "custodian"
      ? custodiansById.get(row.assignable_id) ?? null
      : null;

  const profile =
    row.assignable_type === "admin"
      ? profilesById.get(row.assignable_id) ?? null
      : null;

  const vaultRole =
    row.assignable_type === "admin"
      ? vaultRolesByUserId.get(row.assignable_id) ?? null
      : null;

  const mailboxes =
    row.assignable_type === "custodian"
      ? mailboxesByCustodianId.get(row.assignable_id) ?? []
      : [];

  return {
    id: row.id,
    org_id: row.org_id,
    case_id: row.case_id,
    assignable_type: row.assignable_type,
    assignable_id: row.assignable_id,
    role: row.role ?? "member",
    created_at: row.created_at,
    created_by: row.created_by,

    display_name:
      row.assignable_type === "custodian"
        ? getCustodianDisplayName(custodian)
        : getProfileDisplayName(profile),

    email:
      row.assignable_type === "custodian"
        ? custodian?.email ?? null
        : profile?.email ?? null,

    department:
      row.assignable_type === "custodian" ? custodian?.department ?? null : null,

    title: row.assignable_type === "custodian" ? custodian?.title ?? null : null,

    profile_role: row.assignable_type === "admin" ? profile?.role ?? null : null,

    vault_role: row.assignable_type === "admin" ? vaultRole?.role ?? null : null,

    account_type:
      row.assignable_type === "admin" ? profile?.account_type ?? null : null,

    mailbox_count: mailboxes.length,

    mailboxes: mailboxes.map((mailbox) => ({
      id: mailbox.id,
      mailbox_address: mailbox.mailbox_address,
      display_name: mailbox.display_name,
      mailbox_type: mailbox.mailbox_type,
      ingestion_status: mailbox.ingestion_status,
    })),
  };
}

async function loadCaseOrError(
  supabase: Awaited<ReturnType<typeof getVaultAdminClient>>,
  caseId: string,
  orgId: string
) {
  const { data, error } = await supabase
    .from("vault_cases")
    .select("id, org_id, name, status, deleted_at")
    .eq("id", caseId)
    .eq("org_id", orgId)
    .maybeSingle();

  if (error) {
    return {
      ok: false as const,
      response: jsonError("Failed to load Vault case.", 500, {
        details: error.message,
      }),
    };
  }

  if (!data) {
    return {
      ok: false as const,
      response: jsonError("Vault case was not found.", 404),
    };
  }

  if ((data as VaultCaseRow).deleted_at) {
    return {
      ok: false as const,
      response: jsonError("Vault case is deleted.", 409),
    };
  }

  return {
    ok: true as const,
    caseRow: data as VaultCaseRow,
  };
}

async function loadMemberDetails(
  supabase: Awaited<ReturnType<typeof getVaultAdminClient>>,
  rows: VaultCaseMemberRow[],
  orgId: string
) {
  const custodianIds = Array.from(
    new Set(
      rows
        .filter((row) => row.assignable_type === "custodian")
        .map((row) => row.assignable_id)
    )
  );

  const adminIds = Array.from(
    new Set(
      rows
        .filter((row) => row.assignable_type === "admin")
        .map((row) => row.assignable_id)
    )
  );

  const [custodiansResult, profilesResult, vaultRolesResult, mailboxesResult] =
    await Promise.all([
      custodianIds.length
        ? supabase
            .from("vault_custodians")
            .select("id, org_id, email, display_name, department, title, status")
            .eq("org_id", orgId)
            .in("id", custodianIds)
        : Promise.resolve({ data: [], error: null }),

      adminIds.length
        ? supabase
            .from("profiles")
            .select("id, org_id, email, full_name, role, status, account_type")
            .eq("org_id", orgId)
            .in("id", adminIds)
        : Promise.resolve({ data: [], error: null }),

      adminIds.length
        ? supabase
            .from("vault_user_roles")
            .select("user_id, role")
            .eq("org_id", orgId)
            .in("user_id", adminIds)
        : Promise.resolve({ data: [], error: null }),

      custodianIds.length
        ? supabase
            .from("vault_source_mailboxes")
            .select(
              "id, org_id, custodian_id, mailbox_address, display_name, mailbox_type, ingestion_status, deleted_at"
            )
            .eq("org_id", orgId)
            .in("custodian_id", custodianIds)
            .is("deleted_at", null)
        : Promise.resolve({ data: [], error: null }),
    ]);

  if (custodiansResult.error) throw new Error(custodiansResult.error.message);
  if (profilesResult.error) throw new Error(profilesResult.error.message);
  if (vaultRolesResult.error) throw new Error(vaultRolesResult.error.message);
  if (mailboxesResult.error) throw new Error(mailboxesResult.error.message);

  const custodiansById = new Map<string, VaultCustodianRow>(
    toRows<VaultCustodianRow>(custodiansResult.data).map((row) => [row.id, row])
  );

  const profilesById = new Map<string, ProfileRow>(
    toRows<ProfileRow>(profilesResult.data).map((row) => [row.id, row])
  );

  const vaultRolesByUserId = new Map<string, VaultUserRoleRow>(
    toRows<VaultUserRoleRow>(vaultRolesResult.data)
      .filter((row) => isAdminVaultRole(row.role))
      .map((row) => [row.user_id, row])
  );

  const mailboxesByCustodianId = new Map<string, VaultMailboxRow[]>();

  for (const mailbox of toRows<VaultMailboxRow>(mailboxesResult.data)) {
    if (!mailbox.custodian_id) continue;

    const existing = mailboxesByCustodianId.get(mailbox.custodian_id) ?? [];
    existing.push(mailbox);
    mailboxesByCustodianId.set(mailbox.custodian_id, existing);
  }

  return {
    custodiansById,
    profilesById,
    vaultRolesByUserId,
    mailboxesByCustodianId,
  };
}

async function validateMemberTarget(
  supabase: Awaited<ReturnType<typeof getVaultAdminClient>>,
  orgId: string,
  assignableType: "custodian" | "admin",
  assignableId: string
) {
  if (assignableType === "custodian") {
    const { data, error } = await supabase
      .from("vault_custodians")
      .select("id, org_id, email, display_name, department, title, status")
      .eq("id", assignableId)
      .eq("org_id", orgId)
      .maybeSingle();

    if (error) {
      return {
        ok: false as const,
        reason: "Failed validating custodian.",
        details: error.message,
      };
    }

    if (!data) {
      return {
        ok: false as const,
        reason: "Custodian was not found in this organization.",
      };
    }

    const custodian = data as VaultCustodianRow;

    if (custodian.status !== "active") {
      return {
        ok: false as const,
        reason: "Custodian is not active.",
      };
    }

    return {
      ok: true as const,
    };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, org_id, email, full_name, role, status, account_type")
    .eq("id", assignableId)
    .eq("org_id", orgId)
    .maybeSingle();

  if (profileError) {
    return {
      ok: false as const,
      reason: "Failed validating admin profile.",
      details: profileError.message,
    };
  }

  if (!profile) {
    return {
      ok: false as const,
      reason: "Admin profile was not found in this organization.",
    };
  }

  const profileRow = profile as ProfileRow;

  if (profileRow.status && profileRow.status !== "active") {
    return {
      ok: false as const,
      reason: "Admin profile is not active.",
    };
  }

  const { data: roleRows, error: roleError } = await supabase
    .from("vault_user_roles")
    .select("user_id, role")
    .eq("org_id", orgId)
    .eq("user_id", assignableId);

  if (roleError) {
    return {
      ok: false as const,
      reason: "Failed validating admin Vault role.",
      details: roleError.message,
    };
  }

  const hasAdminVaultRole = toRows<VaultUserRoleRow>(roleRows).some((row) =>
    isAdminVaultRole(row.role)
  );

  if (!hasAdminVaultRole) {
    return {
      ok: false as const,
      reason:
        "User is not eligible to be added as a case admin. Required role: vault_admin or vault_compliance_admin.",
    };
  }

  return {
    ok: true as const,
  };
}

function normalizeMembersRequest(body: AddCaseMembersRequest | null) {
  const directAssignableType =
    normalizeAssignableType(body?.assignableType) ??
    normalizeAssignableType(body?.assignable_type);

  const directAssignableId =
    normalizeString(body?.assignableId) ?? normalizeString(body?.assignable_id);

  const directMember =
    directAssignableType && directAssignableId
      ? [
          {
            assignable_type: directAssignableType,
            assignable_id: directAssignableId,
            role: normalizeRole(body?.role),
          },
        ]
      : [];

  const arrayMembers = Array.isArray(body?.members)
    ? body.members
        .map((member) => {
          const assignableType =
            normalizeAssignableType(member.assignableType) ??
            normalizeAssignableType(member.assignable_type);

          const assignableId =
            normalizeString(member.assignableId) ??
            normalizeString(member.assignable_id);

          if (!assignableType || !assignableId) return null;

          return {
            assignable_type: assignableType,
            assignable_id: assignableId,
            role: normalizeRole(member.role),
          };
        })
        .filter(
          (
            member
          ): member is {
            assignable_type: "custodian" | "admin";
            assignable_id: string;
            role: string;
          } => Boolean(member)
        )
    : [];

  const deduped = new Map<
    string,
    {
      assignable_type: "custodian" | "admin";
      assignable_id: string;
      role: string;
    }
  >();

  for (const member of [...directMember, ...arrayMembers]) {
    deduped.set(`${member.assignable_type}:${member.assignable_id}`, member);
  }

  return Array.from(deduped.values());
}

export async function GET(request: NextRequest, context: RouteContext) {
  const startedAt = Date.now();

  try {
    const { id: caseId } = await context.params;

    const access = await requireVaultAccess(request, {
      supportScope: "vault_read_only",
    });

    const orgId = getAccessOrgId(access);
    const supabase = await getVaultAdminClient();

    const caseLookup = await loadCaseOrError(supabase, caseId, orgId);

    if (!caseLookup.ok) {
      return caseLookup.response;
    }

    const { data, error } = await supabase
      .from("vault_case_members")
      .select(
        "id, org_id, case_id, assignable_type, assignable_id, role, created_at, created_by"
      )
      .eq("org_id", orgId)
      .eq("case_id", caseId)
      .order("created_at", { ascending: true });

    if (error) {
      await writeUnifiedVaultAccessAuditLog({
        access,
        action: "vault.case.members.list.failed",
        entityType: "vault_case",
        entityId: caseId,
        status: "failure",
        request,
        details: {
          error: error.message,
          duration_ms: Date.now() - startedAt,
        },
      });

      return jsonError("Failed to load case members.", 500, {
        details: error.message,
      });
    }

    const rows = toRows<VaultCaseMemberRow>(data);
    const details = await loadMemberDetails(supabase, rows, orgId);

    const items = rows.map((row) =>
      buildMemberPayload(
        row,
        details.custodiansById,
        details.profilesById,
        details.vaultRolesByUserId,
        details.mailboxesByCustodianId
      )
    );

    await writeUnifiedVaultAccessAuditLog({
      access,
      action: "vault.case.members.list",
      entityType: "vault_case",
      entityId: caseId,
      status: "success",
      request,
      details: {
        returned_count: items.length,
        custodian_count: items.filter(
          (item) => item.assignable_type === "custodian"
        ).length,
        admin_count: items.filter((item) => item.assignable_type === "admin")
          .length,
        mailbox_count: items.reduce(
          (total, item) => total + (item.mailbox_count ?? 0),
          0
        ),
        duration_ms: Date.now() - startedAt,
      },
    });

    return jsonOk({
      ok: true,
      case: caseLookup.caseRow,
      items,
      summary: {
        totalCount: items.length,
        custodianCount: items.filter(
          (item) => item.assignable_type === "custodian"
        ).length,
        adminCount: items.filter((item) => item.assignable_type === "admin")
          .length,
        mailboxCount: items.reduce(
          (total, item) => total + (item.mailbox_count ?? 0),
          0
        ),
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error loading case members.";

    return jsonError("Failed to load case members.", 500, {
      details: message,
    });
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  const startedAt = Date.now();

  try {
    const { id: caseId } = await context.params;

    const access = await requireVaultAccess(request, {
      supportScope: "vault_read_only",
    });

    const orgId = getAccessOrgId(access);
    const actorUserId = getAccessUserId(access);
    const supabase = await getVaultAdminClient();

    const authorization = await requireCaseMemberWriteAccess(supabase, access, orgId);
    if (!authorization.ok) {
      await writeUnifiedVaultAccessAuditLog({
        access, action: "vault.case.members.add.denied", entityType: "vault_case",
        entityId: caseId, status: "failure", request,
        details: { reason: "insufficient_write_permissions", duration_ms: Date.now() - startedAt },
      });
      return jsonError("Insufficient permissions to modify case members.", 403);
    }

    const caseLookup = await loadCaseOrError(supabase, caseId, orgId);

    if (!caseLookup.ok) {
      return caseLookup.response;
    }

    const body =
      (await request.json().catch(() => null)) as AddCaseMembersRequest | null;

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return jsonError("A JSON object is required.", 400);
    }
    if (body.members !== undefined && !Array.isArray(body.members)) {
      return jsonError("members must be an array.", 400);
    }
    if (Array.isArray(body.members) && body.members.length > 100) {
      return jsonError("No more than 100 members may be submitted at once.", 400);
    }
    if (Array.isArray(body.members) && body.members.some((item) =>
      !item || typeof item !== "object" ||
      !normalizeAssignableType(item.assignableType ?? item.assignable_type) ||
      !normalizeString(item.assignableId ?? item.assignable_id)
    )) {
      return jsonError("Every member must include a valid assignable type and ID.", 400);
    }
    const members = normalizeMembersRequest(body);

    if (!members.length) {
      return jsonError("At least one valid case member is required.", 400);
    }

    const validationFailures: Array<{
      assignable_type: string;
      assignable_id: string;
      reason: string;
      details?: string;
    }> = [];

    for (const member of members) {
      const validation = await validateMemberTarget(
        supabase,
        orgId,
        member.assignable_type,
        member.assignable_id
      );

      if (!validation.ok) {
        validationFailures.push({
          assignable_type: member.assignable_type,
          assignable_id: member.assignable_id,
          reason: validation.reason,
          details: "details" in validation ? validation.details : undefined,
        });
      }
    }

    if (validationFailures.length) {
      await writeUnifiedVaultAccessAuditLog({
        access,
        action: "vault.case.members.add.validation_failed",
        entityType: "vault_case",
        entityId: caseId,
        status: "warning",
        request,
        details: {
          failures: validationFailures,
          requested_count: members.length,
          duration_ms: Date.now() - startedAt,
        },
      });

      return jsonError("One or more case members could not be validated.", 400, {
        failures: validationFailures,
      });
    }

    const insertPayload = members.map((member) => ({
      org_id: orgId,
      case_id: caseId,
      assignable_type: member.assignable_type,
      assignable_id: member.assignable_id,
      role: member.role,
      created_by: actorUserId,
    }));

    const { data, error } = await supabase
      .from("vault_case_members")
      .upsert(insertPayload, {
        onConflict: "case_id,assignable_type,assignable_id",
        ignoreDuplicates: true,
      })
      .select(
        "id, org_id, case_id, assignable_type, assignable_id, role, created_at, created_by"
      );

    if (error) {
      await writeUnifiedVaultAccessAuditLog({
        access,
        action: "vault.case.members.add.failed",
        entityType: "vault_case",
        entityId: caseId,
        status: "failure",
        request,
        details: {
          error: error.message,
          requested_count: members.length,
          duration_ms: Date.now() - startedAt,
        },
      });

      return jsonError("Failed to add case members.", 500, {
        details: error.message,
      });
    }

    const rows = toRows<VaultCaseMemberRow>(data);
    const details = await loadMemberDetails(supabase, rows, orgId);

    const items = rows.map((row) =>
      buildMemberPayload(
        row,
        details.custodiansById,
        details.profilesById,
        details.vaultRolesByUserId,
        details.mailboxesByCustodianId
      )
    );

    await writeUnifiedVaultAccessAuditLog({
      access,
      action: "vault.case.members.add",
      entityType: "vault_case",
      entityId: caseId,
      status: "success",
      request,
      details: {
        added_count: items.length,
        requested_count: members.length,
        ignored_existing_count: members.length - items.length,
        custodian_count: items.filter(
          (item) => item.assignable_type === "custodian"
        ).length,
        admin_count: items.filter((item) => item.assignable_type === "admin")
          .length,
        mailbox_count: items.reduce(
          (total, item) => total + (item.mailbox_count ?? 0),
          0
        ),
        duration_ms: Date.now() - startedAt,
      },
    });

    return jsonOk(
      {
        ok: true,
        case: caseLookup.caseRow,
        items,
        summary: {
          addedCount: items.length,
          requestedCount: members.length,
          ignoredExistingCount: members.length - items.length,
          custodianCount: items.filter(
            (item) => item.assignable_type === "custodian"
          ).length,
          adminCount: items.filter((item) => item.assignable_type === "admin")
            .length,
          mailboxCount: items.reduce(
            (total, item) => total + (item.mailbox_count ?? 0),
            0
          ),
        },
      },
      items.length ? 201 : 200
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error adding case members.";

    return jsonError("Failed to add case members.", 500, {
      details: message,
    });
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const startedAt = Date.now();

  try {
    const { id: caseId } = await context.params;

    const access = await requireVaultAccess(request, {
      supportScope: "vault_read_only",
    });

    const orgId = getAccessOrgId(access);
    const supabase = await getVaultAdminClient();

    const authorization = await requireCaseMemberWriteAccess(supabase, access, orgId);
    if (!authorization.ok) {
      await writeUnifiedVaultAccessAuditLog({
        access, action: "vault.case.members.remove.denied", entityType: "vault_case",
        entityId: caseId, status: "failure", request,
        details: { reason: "insufficient_write_permissions", duration_ms: Date.now() - startedAt },
      });
      return jsonError("Insufficient permissions to modify case members.", 403);
    }

    const url = new URL(request.url);

    const memberId = normalizeString(url.searchParams.get("memberId"));
    const assignableType = normalizeAssignableType(
      url.searchParams.get("assignableType") ??
        url.searchParams.get("assignable_type")
    );
    const assignableId =
      normalizeString(url.searchParams.get("assignableId")) ??
      normalizeString(url.searchParams.get("assignable_id"));

    if (!memberId && (!assignableType || !assignableId)) {
      return jsonError(
        "Provide memberId or assignableType plus assignableId to remove a case member.",
        400
      );
    }

    const caseLookup = await loadCaseOrError(supabase, caseId, orgId);

    if (!caseLookup.ok) {
      return caseLookup.response;
    }

    let deleteQuery = supabase
      .from("vault_case_members")
      .delete()
      .eq("org_id", orgId)
      .eq("case_id", caseId);

    if (memberId) {
      deleteQuery = deleteQuery.eq("id", memberId);
    } else {
      deleteQuery = deleteQuery
        .eq("assignable_type", assignableType)
        .eq("assignable_id", assignableId);
    }

    const { data: deletedRows, error } = await deleteQuery.select("id");

    if (error) {
      await writeUnifiedVaultAccessAuditLog({
        access,
        action: "vault.case.members.remove.failed",
        entityType: "vault_case",
        entityId: caseId,
        status: "failure",
        request,
        details: {
          member_id: memberId,
          assignable_type: assignableType,
          assignable_id: assignableId,
          error: error.message,
          duration_ms: Date.now() - startedAt,
        },
      });

      return jsonError("Failed to remove case member.", 500, {
        details: error.message,
      });
    }

    const removedCount = toRows<{ id: string }>(deletedRows).length;

    await writeUnifiedVaultAccessAuditLog({
      access,
      action: "vault.case.members.remove",
      entityType: "vault_case",
      entityId: caseId,
      status: "success",
      request,
      details: {
        member_id: memberId,
        assignable_type: assignableType,
        assignable_id: assignableId,
        removed_count: removedCount,
        duration_ms: Date.now() - startedAt,
      },
    });

    return jsonOk({
      ok: true,
      removed: removedCount > 0,
      removedCount,
      case: caseLookup.caseRow,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error removing case member.";

    return jsonError("Failed to remove case member.", 500, {
      details: message,
    });
  }
}
