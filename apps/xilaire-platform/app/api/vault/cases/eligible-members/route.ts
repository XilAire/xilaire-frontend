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

type AssignableType = "custodian" | "admin";

type VaultCustodianRow = {
  id: string;
  org_id: string;
  source_id: string | null;
  profile_id: string | null;
  external_user_id: string | null;
  email: string;
  display_name: string | null;
  department: string | null;
  title: string | null;
  employee_id: string | null;
  status: string;
  created_at: string | null;
  updated_at: string | null;
};

type VaultMailboxRow = {
  id: string;
  org_id: string;
  source_id: string;
  external_mailbox_id: string;
  mailbox_address: string | null;
  display_name: string | null;
  mailbox_type: string;
  custodian_id: string | null;
  ingestion_status: string;
  deleted_at: string | null;
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

type VaultUserRoleRow = {
  user_id: string;
  role: string;
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
  assignable_type: AssignableType;
  assignable_id: string;
  role: string | null;
  created_at: string | null;
  created_by: string | null;
};

type AssignedMemberLookup = {
  id: string;
  assignable_type: AssignableType;
  assignable_id: string;
  role: string | null;
  created_at: string | null;
  created_by: string | null;
};

function normalizeString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function parseBooleanParam(value: string | null, fallback = false): boolean {
  if (!value) return fallback;
  const normalized = value.trim().toLowerCase();
  return normalized === "true" || normalized === "1" || normalized === "yes";
}

function parsePositiveInt(
  value: string | null,
  fallback: number,
  max: number
): number {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(parsed, max);
}

function parseCsvParam(value: string | null): string[] {
  if (!value) return [];

  return Array.from(
    new Set(
      value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
    )
  );
}

function normalizeDepartmentValue(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

function toRows<T>(value: unknown): T[] {
  if (!Array.isArray(value)) return [];
  return value as T[];
}

function matchesQuery(
  haystackValues: Array<string | null | undefined>,
  q: string | null
) {
  if (!q) return true;

  const needle = q.toLowerCase();

  return haystackValues
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .includes(needle);
}

function departmentAllowed(
  department: string | null | undefined,
  selectedDepartments: string[]
) {
  if (!selectedDepartments.length) return true;

  return selectedDepartments.includes(normalizeDepartmentValue(department));
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

function isAdminVaultRole(role: string | null | undefined): boolean {
  const normalized = normalizeString(role)?.toLowerCase();

  return normalized === "vault_admin" || normalized === "vault_compliance_admin";
}

function getDefaultAssignableRole(assignableType: AssignableType): string {
  if (assignableType === "admin") return "admin";
  return "member";
}

function normalizeCustodianName(row: VaultCustodianRow): string {
  return normalizeString(row.display_name) ?? row.email ?? "Unnamed Custodian";
}

function normalizeProfileName(row: ProfileRow): string {
  return normalizeString(row.full_name) ?? normalizeString(row.email) ?? row.id;
}

function getPrimaryMailboxForCustodian(
  custodian: VaultCustodianRow,
  mailboxesByCustodianId: Map<string, VaultMailboxRow[]>
): string | null {
  const mailboxes = mailboxesByCustodianId.get(custodian.id) ?? [];

  return (
    normalizeString(mailboxes[0]?.mailbox_address) ??
    normalizeString(custodian.email)
  );
}

async function loadCaseOrNull(
  supabase: Awaited<ReturnType<typeof getVaultAdminClient>>,
  caseId: string | null,
  orgId: string
) {
  if (!caseId) return null;

  const { data, error } = await supabase
    .from("vault_cases")
    .select("id, org_id, name, status, deleted_at")
    .eq("id", caseId)
    .eq("org_id", orgId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load Vault case: ${error.message}`);
  }

  if (!data) return null;

  return data as VaultCaseRow;
}

async function loadDepartmentList(
  supabase: Awaited<ReturnType<typeof getVaultAdminClient>>,
  orgId: string
) {
  const { data } = await supabase
    .from("vault_custodians")
    .select("department")
    .eq("org_id", orgId)
    .eq("status", "active");

  return Array.from(
    new Set(
      toRows<{ department?: string | null }>(data)
        .map((row) => normalizeString(row.department))
        .filter(Boolean) as string[]
    )
  ).sort((a, b) => a.localeCompare(b));
}

function groupMailboxesByCustodianId(rows: VaultMailboxRow[]) {
  const map = new Map<string, VaultMailboxRow[]>();

  for (const mailbox of rows) {
    if (!mailbox.custodian_id) continue;

    const existing = map.get(mailbox.custodian_id) ?? [];
    existing.push(mailbox);
    map.set(mailbox.custodian_id, existing);
  }

  return map;
}

function buildAssignedMemberMap(rows: VaultCaseMemberRow[]) {
  const assigned = new Map<string, AssignedMemberLookup>();

  for (const row of rows) {
    assigned.set(`${row.assignable_type}:${row.assignable_id}`, {
      id: row.id,
      assignable_type: row.assignable_type,
      assignable_id: row.assignable_id,
      role: row.role,
      created_at: row.created_at,
      created_by: row.created_by,
    });
  }

  return assigned;
}

function buildAssignedMemberSet(rows: VaultCaseMemberRow[]) {
  return new Set(
    rows.map((row) => `${row.assignable_type}:${row.assignable_id}`)
  );
}

function buildAssignmentMetadata(
  assignedMemberMap: Map<string, AssignedMemberLookup>,
  assignableType: AssignableType,
  assignableId: string
) {
  const assigned = assignedMemberMap.get(`${assignableType}:${assignableId}`);

  return {
    is_assigned: Boolean(assigned),
    assigned_member_id: assigned?.id ?? null,
    assigned_role: assigned?.role ?? null,
    assigned_at: assigned?.created_at ?? null,
    assigned_by: assigned?.created_by ?? null,
  };
}

export async function GET(request: NextRequest) {
  const startedAt = Date.now();

  try {
    const access = await requireVaultAccess(request, {
      supportScope: "vault_read_only",
    });

    const orgId = getAccessOrgId(access);

    const url = new URL(request.url);
    const q = normalizeString(url.searchParams.get("q"));
    const caseId = normalizeString(url.searchParams.get("caseId"));
    const includeAssigned = parseBooleanParam(
      url.searchParams.get("includeAssigned"),
      false
    );
    const includeAdmins = parseBooleanParam(
      url.searchParams.get("includeAdmins"),
      true
    );
    const includeCustodians = parseBooleanParam(
      url.searchParams.get("includeCustodians"),
      true
    );
    const includeCase = parseBooleanParam(
      url.searchParams.get("includeCase"),
      true
    );
    const limit = parsePositiveInt(url.searchParams.get("limit"), 50, 200);
    const selectedDepartments = parseCsvParam(
      url.searchParams.get("departments")
    ).map((item) => normalizeDepartmentValue(item));

    const supabase = await getVaultAdminClient();

    const [
      caseRow,
      custodianResult,
      mailboxResult,
      profileResult,
      vaultRolesResult,
      departmentList,
      assignedMembersResult,
    ] = await Promise.all([
      includeCase ? loadCaseOrNull(supabase, caseId, orgId) : Promise.resolve(null),

      includeCustodians
        ? supabase
            .from("vault_custodians")
            .select(
              [
                "id",
                "org_id",
                "source_id",
                "profile_id",
                "external_user_id",
                "email",
                "display_name",
                "department",
                "title",
                "employee_id",
                "status",
                "created_at",
                "updated_at",
              ].join(", ")
            )
            .eq("org_id", orgId)
            .eq("status", "active")
            .order("display_name", {
              ascending: true,
              nullsFirst: false,
            })
            .limit(Math.max(limit * 3, 100))
        : Promise.resolve({ data: [], error: null }),

      includeCustodians
        ? supabase
            .from("vault_source_mailboxes")
            .select(
              [
                "id",
                "org_id",
                "source_id",
                "external_mailbox_id",
                "mailbox_address",
                "display_name",
                "mailbox_type",
                "custodian_id",
                "ingestion_status",
                "deleted_at",
              ].join(", ")
            )
            .eq("org_id", orgId)
            .is("deleted_at", null)
            .limit(Math.max(limit * 5, 250))
        : Promise.resolve({ data: [], error: null }),

      includeAdmins
        ? supabase
            .from("profiles")
            .select(
              [
                "id",
                "org_id",
                "email",
                "full_name",
                "role",
                "status",
                "account_type",
              ].join(", ")
            )
            .eq("org_id", orgId)
            .eq("status", "active")
            .order("full_name", {
              ascending: true,
              nullsFirst: false,
            })
            .limit(250)
        : Promise.resolve({ data: [], error: null }),

      includeAdmins
        ? supabase
            .from("vault_user_roles")
            .select("user_id, role")
            .eq("org_id", orgId)
            .in("role", ["vault_admin", "vault_compliance_admin"])
        : Promise.resolve({ data: [], error: null }),

      loadDepartmentList(supabase, orgId),

      caseId
        ? supabase
            .from("vault_case_members")
            .select(
              "id, org_id, case_id, assignable_type, assignable_id, role, created_at, created_by"
            )
            .eq("org_id", orgId)
            .eq("case_id", caseId)
        : Promise.resolve({ data: [], error: null }),
    ]);

    if (caseId && includeCase && !caseRow) {
      await writeUnifiedVaultAccessAuditLog({
        access,
        action: "vault.case.eligible_members.case_not_found",
        entityType: "vault_case",
        entityId: caseId,
        status: "warning",
        request,
        details: {
          q,
          case_id: caseId,
          departments: selectedDepartments,
          duration_ms: Date.now() - startedAt,
        },
      });

      return jsonError("Vault case was not found.", 404);
    }

    if (caseRow?.deleted_at) {
      await writeUnifiedVaultAccessAuditLog({
        access,
        action: "vault.case.eligible_members.case_deleted",
        entityType: "vault_case",
        entityId: caseId,
        status: "warning",
        request,
        details: {
          q,
          case_id: caseId,
          departments: selectedDepartments,
          duration_ms: Date.now() - startedAt,
        },
      });

      return jsonError("Vault case is deleted.", 409);
    }

    if (custodianResult.error) {
      await writeUnifiedVaultAccessAuditLog({
        access,
        action: "vault.case.eligible_members.failed",
        entityType: "vault_case",
        entityId: caseId,
        status: "failure",
        request,
        details: {
          source: "vault_custodians",
          q,
          departments: selectedDepartments,
          error: custodianResult.error.message,
          duration_ms: Date.now() - startedAt,
        },
      });

      return jsonError("Failed to load eligible custodians.", 500, {
        details: custodianResult.error.message,
      });
    }

    if (mailboxResult.error) {
      await writeUnifiedVaultAccessAuditLog({
        access,
        action: "vault.case.eligible_members.failed",
        entityType: "vault_case",
        entityId: caseId,
        status: "failure",
        request,
        details: {
          source: "vault_source_mailboxes",
          q,
          departments: selectedDepartments,
          error: mailboxResult.error.message,
          duration_ms: Date.now() - startedAt,
        },
      });

      return jsonError("Failed to load eligible custodian mailboxes.", 500, {
        details: mailboxResult.error.message,
      });
    }

    if (profileResult.error) {
      await writeUnifiedVaultAccessAuditLog({
        access,
        action: "vault.case.eligible_members.failed",
        entityType: "vault_case",
        entityId: caseId,
        status: "failure",
        request,
        details: {
          source: "profiles",
          q,
          departments: selectedDepartments,
          error: profileResult.error.message,
          duration_ms: Date.now() - startedAt,
        },
      });

      return jsonError("Failed to load eligible admin profiles.", 500, {
        details: profileResult.error.message,
      });
    }

    if (vaultRolesResult.error) {
      await writeUnifiedVaultAccessAuditLog({
        access,
        action: "vault.case.eligible_members.failed",
        entityType: "vault_case",
        entityId: caseId,
        status: "failure",
        request,
        details: {
          source: "vault_user_roles",
          q,
          departments: selectedDepartments,
          error: vaultRolesResult.error.message,
          duration_ms: Date.now() - startedAt,
        },
      });

      return jsonError("Failed to load eligible admin roles.", 500, {
        details: vaultRolesResult.error.message,
      });
    }

    if (assignedMembersResult.error) {
      await writeUnifiedVaultAccessAuditLog({
        access,
        action: "vault.case.eligible_members.failed",
        entityType: "vault_case",
        entityId: caseId,
        status: "failure",
        request,
        details: {
          source: "vault_case_members",
          q,
          departments: selectedDepartments,
          error: assignedMembersResult.error.message,
          duration_ms: Date.now() - startedAt,
        },
      });

      return jsonError("Failed to load existing case members.", 500, {
        details: assignedMembersResult.error.message,
      });
    }

    const assignedRows = toRows<VaultCaseMemberRow>(assignedMembersResult.data);
    const assignedMemberSet = buildAssignedMemberSet(assignedRows);
    const assignedMemberMap = buildAssignedMemberMap(assignedRows);

    const mailboxRows = toRows<VaultMailboxRow>(mailboxResult.data);
    const mailboxesByCustodianId = groupMailboxesByCustodianId(mailboxRows);

    const custodianItems = toRows<VaultCustodianRow>(custodianResult.data)
      .filter((row) => {
        if (!departmentAllowed(row.department, selectedDepartments)) return false;

        if (!includeAssigned && assignedMemberSet.has(`custodian:${row.id}`)) {
          return false;
        }

        const mailbox = getPrimaryMailboxForCustodian(row, mailboxesByCustodianId);

        return matchesQuery(
          [
            normalizeCustodianName(row),
            row.email,
            mailbox,
            row.department,
            row.title,
            row.employee_id,
          ],
          q
        );
      })
      .slice(0, limit)
      .map((row) => {
        const mailboxes = mailboxesByCustodianId.get(row.id) ?? [];
        const primaryMailbox = getPrimaryMailboxForCustodian(
          row,
          mailboxesByCustodianId
        );

        const assignment = buildAssignmentMetadata(
          assignedMemberMap,
          "custodian",
          row.id
        );

        return {
          id: row.id,
          entity_type: "custodian" as const,
          assignable_type: "custodian" as const,
          assignable_id: row.id,
          display_name: normalizeCustodianName(row),
          email: row.email,
          mailbox_address: primaryMailbox,
          department: normalizeString(row.department),
          title: normalizeString(row.title),
          employee_id: normalizeString(row.employee_id),
          role: null,
          default_case_role: getDefaultAssignableRole("custodian"),
          profile_role: null,
          account_type: null,
          source_table: "vault_custodians" as const,
          source_id: row.source_id,
          profile_id: row.profile_id,
          external_user_id: row.external_user_id,
          status: row.status,
          mailbox_count: mailboxes.length,
          mailboxes: mailboxes.map((mailbox) => ({
            id: mailbox.id,
            mailbox_address: mailbox.mailbox_address,
            display_name: mailbox.display_name,
            mailbox_type: mailbox.mailbox_type,
            ingestion_status: mailbox.ingestion_status,
            source_id: mailbox.source_id,
            external_mailbox_id: mailbox.external_mailbox_id,
          })),
          ...assignment,
        };
      });

    const eligibleVaultRoles = new Map<string, VaultUserRoleRow>(
      toRows<VaultUserRoleRow>(vaultRolesResult.data)
        .filter((row) => isAdminVaultRole(row.role))
        .map((row) => [row.user_id, row])
    );

    const adminItems = toRows<ProfileRow>(profileResult.data)
      .filter((row) => {
        if (!normalizeString(row.email)) return false;
        if (!eligibleVaultRoles.has(row.id)) return false;

        if (!includeAssigned && assignedMemberSet.has(`admin:${row.id}`)) {
          return false;
        }

        return matchesQuery(
          [
            normalizeProfileName(row),
            row.email,
            row.role,
            row.account_type,
            eligibleVaultRoles.get(row.id)?.role,
          ],
          q
        );
      })
      .slice(0, limit)
      .map((row) => {
        const assignment = buildAssignmentMetadata(
          assignedMemberMap,
          "admin",
          row.id
        );

        return {
          id: row.id,
          entity_type: "admin" as const,
          assignable_type: "admin" as const,
          assignable_id: row.id,
          display_name: normalizeProfileName(row),
          email: normalizeString(row.email),
          mailbox_address: normalizeString(row.email),
          department: null,
          title: null,
          role: eligibleVaultRoles.get(row.id)?.role ?? null,
          default_case_role: getDefaultAssignableRole("admin"),
          profile_role: normalizeString(row.role),
          account_type: normalizeString(row.account_type),
          source_table: "profiles" as const,
          mailbox_count: 0,
          mailboxes: [],
          ...assignment,
        };
      });

    const items = [...custodianItems, ...adminItems];

    const assignedReturnedCount = items.filter((item) => item.is_assigned).length;
    const availableReturnedCount = items.length - assignedReturnedCount;

    await writeUnifiedVaultAccessAuditLog({
      access,
      action: "vault.case.eligible_members",
      entityType: "vault_case",
      entityId: caseId,
      status: "success",
      request,
      details: {
        q,
        case_id: caseId,
        case_loaded: Boolean(caseRow),
        departments: selectedDepartments,
        includeAdmins,
        includeCustodians,
        includeAssigned,
        custodians_returned: custodianItems.length,
        admins_returned: adminItems.length,
        assigned_returned_count: assignedReturnedCount,
        available_returned_count: availableReturnedCount,
        total_assigned_in_case: assignedRows.length,
        duration_ms: Date.now() - startedAt,
      },
    });

    return jsonOk({
      ok: true,
      case: caseRow,
      items,
      custodians: custodianItems,
      admins: adminItems,
      filters: {
        q,
        caseId,
        departments: selectedDepartments,
        includeAdmins,
        includeCustodians,
        includeAssigned,
        includeCase,
        limit,
      },
      departments: departmentList,
      summary: {
        totalCount: items.length,
        custodianCount: custodianItems.length,
        adminCount: adminItems.length,
        mailboxCount: custodianItems.reduce(
          (total, item) => total + item.mailbox_count,
          0
        ),
        availableDepartmentCount: departmentList.length,
        alreadyAssignedCount: assignedRows.length,
        assignedReturnedCount,
        availableReturnedCount,
      },
      defaults: {
        custodianRole: getDefaultAssignableRole("custodian"),
        adminRole: getDefaultAssignableRole("admin"),
        allowedAssignableTypes: ["custodian", "admin"],
        allowedCaseRoles: ["owner", "admin", "reviewer", "viewer", "member"],
      },
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unknown error loading eligible case members.";

    return jsonError("Failed to load eligible case members.", 500, {
      details: message,
    });
  }
}