import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getVaultAdminClient } from "@/lib/vault/server";

export const dynamic = "force-dynamic";

const FALLBACK_ORG_ID = "276f130f-6f47-44a3-80e5-3cbbf246edf7";

type AssignableType = "custodian" | "admin";

type PageContext = {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

type VaultCaseRow = {
  id: string;
  org_id: string;
  name: string | null;
  description: string | null;
  status: string | null;
  priority: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string | null;
  updated_at: string | null;
  deleted_at: string | null;
  deleted_by: string | null;
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

type CaseMemberItem = {
  id: string;
  assignable_type: AssignableType;
  assignable_id: string;
  role: string;
  display_name: string | null;
  email: string | null;
  department: string | null;
  title: string | null;
  vault_role: string | null;
  profile_role: string | null;
  account_type: string | null;
  mailbox_count: number;
  mailboxes: Array<{
    id: string;
    mailbox_address: string | null;
    display_name: string | null;
    mailbox_type: string | null;
    ingestion_status: string | null;
  }>;
  created_at: string | null;
  created_by: string | null;
};

type EligibleMemberItem = {
  id: string;
  assignable_type: AssignableType;
  assignable_id: string;
  display_name: string;
  email: string | null;
  mailbox_address: string | null;
  department: string | null;
  title: string | null;
  role: string | null;
  default_case_role: string | null;
  assigned_role: string | null;
  is_assigned: boolean;
  assigned_member_id: string | null;
  mailbox_count: number;
  mailboxes: Array<{
    id: string;
    mailbox_address: string | null;
    display_name: string | null;
    mailbox_type: string | null;
    ingestion_status: string | null;
  }>;
};


type CaseWorkspaceTab =
  | "overview"
  | "members"
  | "searches"
  | "holds"
  | "review-sets"
  | "exports"
  | "data-sources"
  | "activity";

const CASE_WORKSPACE_TABS: Array<{
  key: CaseWorkspaceTab;
  label: string;
  description: string;
}> = [
  {
    key: "overview",
    label: "Overview",
    description: "Command center summary for this Vault case.",
  },
  {
    key: "members",
    label: "Members",
    description: "Custodians, reviewers, admins, and mailbox scope.",
  },
  {
    key: "searches",
    label: "Searches",
    description: "Case-scoped searches and evidence discovery.",
  },
  {
    key: "holds",
    label: "Hold Policies",
    description: "Preservation policies and legal hold scope.",
  },
  {
    key: "review-sets",
    label: "Review Sets",
    description: "Evidence batches, review workflows, and tagging.",
  },
  {
    key: "exports",
    label: "Exports",
    description: "Export queue, packages, manifests, and status.",
  },
  {
    key: "data-sources",
    label: "Data Sources",
    description: "Connected providers, mailboxes, imports, and ingestion.",
  },
  {
    key: "activity",
    label: "Activity",
    description: "Audit timeline and case activity history.",
  },
];

function normalizeString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function normalizeRole(value: unknown): string {
  const normalized = normalizeString(value)?.toLowerCase() ?? "member";

  if (normalized === "owner") return "owner";
  if (normalized === "admin") return "admin";
  if (normalized === "reviewer") return "reviewer";
  if (normalized === "viewer") return "viewer";
  if (normalized === "member") return "member";

  return normalized;
}

function normalizeDepartmentKey(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase();
}

function toRows<T>(value: unknown): T[] {
  if (!Array.isArray(value)) return [];
  return value as T[];
}

function toSingleRow<T>(value: unknown): T | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as T;
}

function formatDate(value: string | null) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function getStatusClass(status: string | null | undefined) {
  switch ((status ?? "").toLowerCase()) {
    case "open":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";
    case "active":
      return "border-blue-500/30 bg-blue-500/10 text-blue-300";
    case "pending":
      return "border-yellow-500/30 bg-yellow-500/10 text-yellow-300";
    case "closed":
      return "border-zinc-500/30 bg-zinc-500/10 text-zinc-300";
    case "archived":
      return "border-purple-500/30 bg-purple-500/10 text-purple-300";
    default:
      return "border-zinc-500/30 bg-zinc-500/10 text-zinc-300";
  }
}

function getPriorityClass(priority: string | null | undefined) {
  switch ((priority ?? "").toLowerCase()) {
    case "critical":
      return "border-red-500/30 bg-red-500/10 text-red-300";
    case "high":
      return "border-orange-500/30 bg-orange-500/10 text-orange-300";
    case "medium":
      return "border-yellow-500/30 bg-yellow-500/10 text-yellow-300";
    case "normal":
      return "border-blue-500/30 bg-blue-500/10 text-blue-300";
    case "low":
      return "border-zinc-500/30 bg-zinc-500/10 text-zinc-300";
    default:
      return "border-zinc-500/30 bg-zinc-500/10 text-zinc-300";
  }
}

function getRoleClass(role: string | null | undefined) {
  switch ((role ?? "").toLowerCase()) {
    case "owner":
      return "border-purple-500/30 bg-purple-500/10 text-purple-300";
    case "admin":
      return "border-blue-500/30 bg-blue-500/10 text-blue-300";
    case "reviewer":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";
    case "viewer":
      return "border-zinc-500/30 bg-zinc-500/10 text-zinc-300";
    default:
      return "border-slate-500/30 bg-slate-500/10 text-slate-300";
  }
}

function isAdminVaultRole(role: string | null | undefined) {
  const normalized = normalizeString(role)?.toLowerCase();

  return normalized === "vault_admin" || normalized === "vault_compliance_admin";
}

function getCustodianDisplayName(row: VaultCustodianRow | null) {
  if (!row) return null;
  return normalizeString(row.display_name) ?? row.email;
}

function getProfileDisplayName(row: ProfileRow | null) {
  if (!row) return null;
  return normalizeString(row.full_name) ?? normalizeString(row.email) ?? row.id;
}

function revalidateCaseWorkspace(caseId: string) {
  revalidatePath("/vault/cases");
  revalidatePath(`/vault/cases/${caseId}`);
  revalidatePath(`/vault/cases/${caseId}/summary`);
  revalidatePath(`/vault/cases/${caseId}/search`);
  revalidatePath(`/vault/cases/${caseId}/holds`);
  revalidatePath(`/vault/cases/${caseId}/review-sets`);
  revalidatePath(`/vault/cases/${caseId}/exports`);
  revalidatePath(`/vault/cases/${caseId}/activity`);
}

function groupMailboxesByCustodianId(rows: VaultMailboxRow[]) {
  const map = new Map<string, VaultMailboxRow[]>();

  for (const row of rows) {
    if (!row.custodian_id) continue;

    const existing = map.get(row.custodian_id) ?? [];
    existing.push(row);
    map.set(row.custodian_id, existing);
  }

  return map;
}

function buildMemberPayload(
  row: VaultCaseMemberRow,
  custodiansById: Map<string, VaultCustodianRow>,
  profilesById: Map<string, ProfileRow>,
  vaultRolesByUserId: Map<string, VaultUserRoleRow>,
  mailboxesByCustodianId: Map<string, VaultMailboxRow[]>
): CaseMemberItem {
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
    assignable_type: row.assignable_type,
    assignable_id: row.assignable_id,
    role: row.role ?? "member",
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
    vault_role: row.assignable_type === "admin" ? vaultRole?.role ?? null : null,
    profile_role: row.assignable_type === "admin" ? profile?.role ?? null : null,
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
    created_at: row.created_at,
    created_by: row.created_by,
  };
}

function memberSearchText(item: EligibleMemberItem) {
  return [
    item.display_name,
    item.email,
    item.mailbox_address,
    item.department,
    item.title,
    item.role,
    item.default_case_role,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function buildCaseDetailQuery(input: {
  memberQ: string;
  departments: string;
  showAdmins: boolean;
  showCustodians: boolean;
  includeAssigned: boolean;
}) {
  const params = new URLSearchParams();

  if (input.memberQ) params.set("memberQ", input.memberQ);
  if (input.departments) params.set("departments", input.departments);
  if (!input.showAdmins) params.set("showAdmins", "false");
  if (!input.showCustodians) params.set("showCustodians", "false");
  if (input.includeAssigned) params.set("includeAssigned", "true");

  return params.toString();
}


function normalizeWorkspaceTab(value: unknown): CaseWorkspaceTab {
  const normalized = normalizeString(value)?.toLowerCase();

  if (normalized === "members") return "members";
  if (normalized === "searches") return "searches";
  if (normalized === "holds") return "holds";
  if (normalized === "hold-policies") return "holds";
  if (normalized === "review-sets") return "review-sets";
  if (normalized === "reviewsets") return "review-sets";
  if (normalized === "exports") return "exports";
  if (normalized === "data-sources") return "data-sources";
  if (normalized === "datasources") return "data-sources";
  if (normalized === "sources") return "data-sources";
  if (normalized === "activity") return "activity";

  return "overview";
}

function buildTabHref(input: {
  caseId: string;
  tab: CaseWorkspaceTab;
  memberQ: string;
  departments: string;
  showAdmins: boolean;
  showCustodians: boolean;
  includeAssigned: boolean;
}) {
  const params = new URLSearchParams();

  if (input.tab !== "overview") params.set("tab", input.tab);

  if (input.tab === "members") {
    if (input.memberQ) params.set("memberQ", input.memberQ);
    if (input.departments) params.set("departments", input.departments);
    if (!input.showAdmins) params.set("showAdmins", "false");
    if (!input.showCustodians) params.set("showCustodians", "false");
    if (input.includeAssigned) params.set("includeAssigned", "true");
  }

  const query = params.toString();
  return query ? `/vault/cases/${input.caseId}?${query}` : `/vault/cases/${input.caseId}`;
}

function getCurrentTabDescription(tab: CaseWorkspaceTab) {
  return (
    CASE_WORKSPACE_TABS.find((workspaceTab) => workspaceTab.key === tab)
      ?.description ?? "Vault case workspace."
  );
}

function buildDepartmentHref(input: {
  caseId: string;
  department: string;
  memberQ: string;
  currentDepartments: string;
  showAdmins: boolean;
  showCustodians: boolean;
  includeAssigned: boolean;
}) {
  const current = input.currentDepartments
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  const departmentExists = current.some(
    (item) =>
      normalizeDepartmentKey(item) === normalizeDepartmentKey(input.department)
  );

  const nextDepartments = departmentExists
    ? current.filter(
        (item) =>
          normalizeDepartmentKey(item) !==
          normalizeDepartmentKey(input.department)
      )
    : [...current, input.department];

  const query = buildCaseDetailQuery({
    memberQ: input.memberQ,
    departments: nextDepartments.join(","),
    showAdmins: input.showAdmins,
    showCustodians: input.showCustodians,
    includeAssigned: input.includeAssigned,
  });

  return query
    ? `/vault/cases/${input.caseId}?${query}`
    : `/vault/cases/${input.caseId}`;
}

async function loadCase(caseId: string) {
  const supabase = await getVaultAdminClient();

  const { data, error } = await supabase
    .from("vault_cases")
    .select(
      [
        "id",
        "org_id",
        "name",
        "description",
        "status",
        "priority",
        "created_by",
        "updated_by",
        "created_at",
        "updated_at",
        "deleted_at",
        "deleted_by",
      ].join(", ")
    )
    .eq("id", caseId)
    .eq("org_id", FALLBACK_ORG_ID)
    .maybeSingle();

  if (error) {
    return {
      item: null,
      error: error.message,
    };
  }

  return {
    item: toSingleRow<VaultCaseRow>(data),
    error: null,
  };
}

async function loadCaseMembers(caseId: string) {
  const supabase = await getVaultAdminClient();

  const { data, error } = await supabase
    .from("vault_case_members")
    .select(
      "id, org_id, case_id, assignable_type, assignable_id, role, created_at, created_by"
    )
    .eq("org_id", FALLBACK_ORG_ID)
    .eq("case_id", caseId)
    .order("created_at", { ascending: true });

  if (error) {
    return {
      items: [] as CaseMemberItem[],
      error: error.message,
    };
  }

  const rows = toRows<VaultCaseMemberRow>(data);

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

  const [custodiansResult, profilesResult, rolesResult, mailboxesResult] =
    await Promise.all([
      custodianIds.length
        ? supabase
            .from("vault_custodians")
            .select("id, org_id, email, display_name, department, title, status")
            .eq("org_id", FALLBACK_ORG_ID)
            .in("id", custodianIds)
        : Promise.resolve({ data: [], error: null }),

      adminIds.length
        ? supabase
            .from("profiles")
            .select("id, org_id, email, full_name, role, status, account_type")
            .eq("org_id", FALLBACK_ORG_ID)
            .in("id", adminIds)
        : Promise.resolve({ data: [], error: null }),

      adminIds.length
        ? supabase
            .from("vault_user_roles")
            .select("user_id, role")
            .eq("org_id", FALLBACK_ORG_ID)
            .in("user_id", adminIds)
        : Promise.resolve({ data: [], error: null }),

      custodianIds.length
        ? supabase
            .from("vault_source_mailboxes")
            .select(
              "id, org_id, custodian_id, mailbox_address, display_name, mailbox_type, ingestion_status, deleted_at"
            )
            .eq("org_id", FALLBACK_ORG_ID)
            .in("custodian_id", custodianIds)
            .is("deleted_at", null)
        : Promise.resolve({ data: [], error: null }),
    ]);

  const errors = [
    custodiansResult.error?.message,
    profilesResult.error?.message,
    rolesResult.error?.message,
    mailboxesResult.error?.message,
  ].filter(Boolean);

  if (errors.length) {
    return {
      items: [] as CaseMemberItem[],
      error: errors.join(" | "),
    };
  }

  const custodiansById = new Map<string, VaultCustodianRow>(
    toRows<VaultCustodianRow>(custodiansResult.data).map((row) => [row.id, row])
  );

  const profilesById = new Map<string, ProfileRow>(
    toRows<ProfileRow>(profilesResult.data).map((row) => [row.id, row])
  );

  const rolesByUserId = new Map<string, VaultUserRoleRow>(
    toRows<VaultUserRoleRow>(rolesResult.data)
      .filter((row) => isAdminVaultRole(row.role))
      .map((row) => [row.user_id, row])
  );

  const mailboxesByCustodianId = groupMailboxesByCustodianId(
    toRows<VaultMailboxRow>(mailboxesResult.data)
  );

  return {
    items: rows.map((row) =>
      buildMemberPayload(
        row,
        custodiansById,
        profilesById,
        rolesByUserId,
        mailboxesByCustodianId
      )
    ),
    error: null,
  };
}

async function loadEligibleMembers(input: {
  caseId: string;
  q: string;
  departments: string;
  includeAdmins: boolean;
  includeCustodians: boolean;
  includeAssigned: boolean;
}) {
  const supabase = await getVaultAdminClient();

  const assignedResult = await supabase
    .from("vault_case_members")
    .select("id, assignable_type, assignable_id, role")
    .eq("org_id", FALLBACK_ORG_ID)
    .eq("case_id", input.caseId);

  const assignedByKey = new Map<
    string,
    { id: string; assignable_type: string; assignable_id: string; role: string | null }
  >();

  if (!assignedResult.error) {
    for (const row of toRows<{
      id: string;
      assignable_type: string;
      assignable_id: string;
      role: string | null;
    }>(assignedResult.data)) {
      assignedByKey.set(`${row.assignable_type}:${row.assignable_id}`, row);
    }
  }

  const selectedDepartments = input.departments
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

  const [custodiansResult, mailboxesResult, profilesResult, rolesResult] =
    await Promise.all([
      input.includeCustodians
        ? supabase
            .from("vault_custodians")
            .select("id, org_id, email, display_name, department, title, status")
            .eq("org_id", FALLBACK_ORG_ID)
            .eq("status", "active")
            .order("display_name", { ascending: true, nullsFirst: false })
            .limit(300)
        : Promise.resolve({ data: [], error: null }),

      input.includeCustodians
        ? supabase
            .from("vault_source_mailboxes")
            .select(
              "id, org_id, custodian_id, mailbox_address, display_name, mailbox_type, ingestion_status, deleted_at"
            )
            .eq("org_id", FALLBACK_ORG_ID)
            .is("deleted_at", null)
            .limit(750)
        : Promise.resolve({ data: [], error: null }),

      input.includeAdmins
        ? supabase
            .from("profiles")
            .select("id, org_id, email, full_name, role, status, account_type")
            .eq("org_id", FALLBACK_ORG_ID)
            .eq("status", "active")
            .order("full_name", { ascending: true, nullsFirst: false })
            .limit(250)
        : Promise.resolve({ data: [], error: null }),

      input.includeAdmins
        ? supabase
            .from("vault_user_roles")
            .select("user_id, role")
            .eq("org_id", FALLBACK_ORG_ID)
            .in("role", ["vault_admin", "vault_compliance_admin"])
        : Promise.resolve({ data: [], error: null }),
    ]);

  const errors = [
    assignedResult.error?.message,
    custodiansResult.error?.message,
    mailboxesResult.error?.message,
    profilesResult.error?.message,
    rolesResult.error?.message,
  ].filter(Boolean);

  if (errors.length) {
    return {
      items: [] as EligibleMemberItem[],
      departments: [] as string[],
      departmentCounts: {} as Record<string, number>,
      error: errors.join(" | "),
    };
  }

  const mailboxesByCustodianId = groupMailboxesByCustodianId(
    toRows<VaultMailboxRow>(mailboxesResult.data)
  );

  const custodians = toRows<VaultCustodianRow>(custodiansResult.data);
  const departmentCounts: Record<string, number> = {};

  for (const row of custodians) {
    const department = normalizeString(row.department);
    if (!department) continue;
    departmentCounts[department] = (departmentCounts[department] ?? 0) + 1;
  }

  const departments = Object.keys(departmentCounts).sort((a, b) =>
    a.localeCompare(b)
  );

  const custodianItems: EligibleMemberItem[] = custodians
    .filter((row) => {
      const assigned = assignedByKey.has(`custodian:${row.id}`);
      return input.includeAssigned || !assigned;
    })
    .filter((row) => {
      if (!selectedDepartments.length) return true;
      return selectedDepartments.includes(normalizeDepartmentKey(row.department));
    })
    .map((row) => {
      const assigned = assignedByKey.get(`custodian:${row.id}`) ?? null;
      const mailboxes = mailboxesByCustodianId.get(row.id) ?? [];
      const primaryMailbox =
        normalizeString(mailboxes[0]?.mailbox_address) ??
        normalizeString(row.email);

      return {
        id: row.id,
        assignable_type: "custodian",
        assignable_id: row.id,
        display_name: getCustodianDisplayName(row) ?? row.email,
        email: row.email,
        mailbox_address: primaryMailbox,
        department: row.department,
        title: row.title,
        role: null,
        default_case_role: "member",
        assigned_role: assigned?.role ?? null,
        is_assigned: Boolean(assigned),
        assigned_member_id: assigned?.id ?? null,
        mailbox_count: mailboxes.length,
        mailboxes: mailboxes.map((mailbox) => ({
          id: mailbox.id,
          mailbox_address: mailbox.mailbox_address,
          display_name: mailbox.display_name,
          mailbox_type: mailbox.mailbox_type,
          ingestion_status: mailbox.ingestion_status,
        })),
      };
    });

  const eligibleRoles = new Map<string, VaultUserRoleRow>(
    toRows<VaultUserRoleRow>(rolesResult.data)
      .filter((row) => isAdminVaultRole(row.role))
      .map((row) => [row.user_id, row])
  );

  const adminItems: EligibleMemberItem[] = toRows<ProfileRow>(profilesResult.data)
    .filter((row) => Boolean(normalizeString(row.email)))
    .filter((row) => eligibleRoles.has(row.id))
    .filter((row) => {
      const assigned = assignedByKey.has(`admin:${row.id}`);
      return input.includeAssigned || !assigned;
    })
    .map((row) => {
      const assigned = assignedByKey.get(`admin:${row.id}`) ?? null;

      return {
        id: row.id,
        assignable_type: "admin",
        assignable_id: row.id,
        display_name: getProfileDisplayName(row) ?? row.id,
        email: row.email,
        mailbox_address: row.email,
        department: null,
        title: null,
        role: eligibleRoles.get(row.id)?.role ?? null,
        default_case_role: "admin",
        assigned_role: assigned?.role ?? null,
        is_assigned: Boolean(assigned),
        assigned_member_id: assigned?.id ?? null,
        mailbox_count: 0,
        mailboxes: [],
      };
    });

  const q = input.q.toLowerCase();

  const items = [...custodianItems, ...adminItems].filter((item) => {
    if (!q) return true;
    return memberSearchText(item).includes(q);
  });

  return {
    items,
    departments,
    departmentCounts,
    error: null,
  };
}

async function addCaseMember(formData: FormData) {
  "use server";

  const caseId = normalizeString(formData.get("caseId"));
  const assignableType = normalizeString(formData.get("assignableType"));
  const assignableId = normalizeString(formData.get("assignableId"));
  const role = normalizeRole(formData.get("role"));

  if (!caseId || !assignableType || !assignableId) {
    redirect(`/vault/cases/${caseId ?? ""}?error=missing-member`);
  }

  if (assignableType !== "custodian" && assignableType !== "admin") {
    redirect(`/vault/cases/${caseId}?error=invalid-member-type`);
  }

  const supabase = await getVaultAdminClient();

  const { error } = await supabase.from("vault_case_members").upsert(
    {
      org_id: FALLBACK_ORG_ID,
      case_id: caseId,
      assignable_type: assignableType,
      assignable_id: assignableId,
      role,
      created_by: null,
    },
    {
      onConflict: "case_id,assignable_type,assignable_id",
      ignoreDuplicates: false,
    }
  );

  if (error) {
    redirect(
      `/vault/cases/${caseId}?error=add-member-failed&details=${encodeURIComponent(
        error.message
      )}`
    );
  }

  revalidateCaseWorkspace(caseId);
  redirect(`/vault/cases/${caseId}`);
}

async function updateCaseMemberRole(formData: FormData) {
  "use server";

  const caseId = normalizeString(formData.get("caseId"));
  const memberId = normalizeString(formData.get("memberId"));
  const role = normalizeRole(formData.get("role"));

  if (!caseId || !memberId) {
    redirect(`/vault/cases/${caseId ?? ""}?error=missing-update-member`);
  }

  const supabase = await getVaultAdminClient();

  const { error } = await supabase
    .from("vault_case_members")
    .update({ role })
    .eq("org_id", FALLBACK_ORG_ID)
    .eq("case_id", caseId)
    .eq("id", memberId);

  if (error) {
    redirect(
      `/vault/cases/${caseId}?error=update-member-role-failed&details=${encodeURIComponent(
        error.message
      )}`
    );
  }

  revalidateCaseWorkspace(caseId);
  redirect(`/vault/cases/${caseId}`);
}

async function addDepartmentCustodians(formData: FormData) {
  "use server";

  const caseId = normalizeString(formData.get("caseId"));
  const department = normalizeString(formData.get("department"));
  const role = normalizeRole(formData.get("role"));

  if (!caseId || !department) {
    redirect(`/vault/cases/${caseId ?? ""}?error=missing-department`);
  }

  const supabase = await getVaultAdminClient();

  const { data: custodiansData, error: custodiansError } = await supabase
    .from("vault_custodians")
    .select("id, department, status")
    .eq("org_id", FALLBACK_ORG_ID)
    .eq("status", "active");

  if (custodiansError) {
    redirect(
      `/vault/cases/${caseId}?error=department-load-failed&details=${encodeURIComponent(
        custodiansError.message
      )}`
    );
  }

  const matchingCustodians = toRows<{
    id: string;
    department: string | null;
    status: string | null;
  }>(custodiansData).filter(
    (row) =>
      normalizeDepartmentKey(row.department) === normalizeDepartmentKey(department)
  );

  if (!matchingCustodians.length) {
    redirect(
      `/vault/cases/${caseId}?error=no-department-custodians&details=${encodeURIComponent(
        `No active custodians found for department ${department}.`
      )}`
    );
  }

  const { data: existingData, error: existingError } = await supabase
    .from("vault_case_members")
    .select("assignable_type, assignable_id")
    .eq("org_id", FALLBACK_ORG_ID)
    .eq("case_id", caseId)
    .eq("assignable_type", "custodian");

  if (existingError) {
    redirect(
      `/vault/cases/${caseId}?error=existing-members-load-failed&details=${encodeURIComponent(
        existingError.message
      )}`
    );
  }

  const existingCustodianIds = new Set(
    toRows<{ assignable_id: string }>(existingData).map(
      (row) => row.assignable_id
    )
  );

  const insertPayload = matchingCustodians
    .filter((row) => !existingCustodianIds.has(row.id))
    .map((row) => ({
      org_id: FALLBACK_ORG_ID,
      case_id: caseId,
      assignable_type: "custodian",
      assignable_id: row.id,
      role,
      created_by: null,
    }));

  if (!insertPayload.length) {
    redirect(
      `/vault/cases/${caseId}?error=department-already-added&details=${encodeURIComponent(
        `All active custodians for ${department} are already assigned to this case.`
      )}`
    );
  }

  const { error } = await supabase.from("vault_case_members").upsert(
    insertPayload,
    {
      onConflict: "case_id,assignable_type,assignable_id",
      ignoreDuplicates: false,
    }
  );

  if (error) {
    redirect(
      `/vault/cases/${caseId}?error=add-department-failed&details=${encodeURIComponent(
        error.message
      )}`
    );
  }

  revalidateCaseWorkspace(caseId);
  redirect(`/vault/cases/${caseId}`);
}

async function removeCaseMember(formData: FormData) {
  "use server";

  const caseId = normalizeString(formData.get("caseId"));
  const memberId = normalizeString(formData.get("memberId"));

  if (!caseId || !memberId) {
    redirect(`/vault/cases/${caseId ?? ""}?error=missing-remove-member`);
  }

  const supabase = await getVaultAdminClient();

  const { error } = await supabase
    .from("vault_case_members")
    .delete()
    .eq("org_id", FALLBACK_ORG_ID)
    .eq("case_id", caseId)
    .eq("id", memberId);

  if (error) {
    redirect(
      `/vault/cases/${caseId}?error=remove-member-failed&details=${encodeURIComponent(
        error.message
      )}`
    );
  }

  revalidateCaseWorkspace(caseId);
  redirect(`/vault/cases/${caseId}`);
}

export default async function VaultCaseDetailPage({
  params,
  searchParams,
}: PageContext) {
  const { id: caseId } = await params;
  const resolvedSearchParams = await searchParams;

  const memberQ =
    typeof resolvedSearchParams.memberQ === "string"
      ? resolvedSearchParams.memberQ
      : "";

  const departments =
    typeof resolvedSearchParams.departments === "string"
      ? resolvedSearchParams.departments
      : "";

  const selectedDepartmentKeys = departments
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

  const showAdmins = resolvedSearchParams.showAdmins !== "false";
  const showCustodians = resolvedSearchParams.showCustodians !== "false";
  const includeAssigned = resolvedSearchParams.includeAssigned === "true";

  const activeTab = normalizeWorkspaceTab(resolvedSearchParams.tab);

  const error =
    typeof resolvedSearchParams.error === "string"
      ? resolvedSearchParams.error
      : null;

  const details =
    typeof resolvedSearchParams.details === "string"
      ? resolvedSearchParams.details
      : null;

  const [caseResult, memberResult, eligibleResult] = await Promise.all([
    loadCase(caseId),
    loadCaseMembers(caseId),
    loadEligibleMembers({
      caseId,
      q: memberQ,
      departments,
      includeAdmins: showAdmins,
      includeCustodians: showCustodians,
      includeAssigned,
    }),
  ]);

  const item = caseResult.item;

  if (!item) {
    return (
      <main className="min-h-screen bg-zinc-950 px-6 py-8 text-zinc-100">
        <div className="mx-auto max-w-4xl rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-red-200">
          <h1 className="text-xl font-semibold">Case not found</h1>
          <p className="mt-2 text-sm text-red-200/80">
            {caseResult.error ?? "The requested case could not be loaded."}
          </p>
          <Link
            href="/vault/cases"
            className="mt-5 inline-flex rounded-xl border border-zinc-700 px-4 py-2 text-sm text-zinc-200 hover:bg-zinc-800"
          >
            Back to cases
          </Link>
        </div>
      </main>
    );
  }

  const memberCount = memberResult.items.length;

  const custodianCount = memberResult.items.filter(
    (member) => member.assignable_type === "custodian"
  ).length;

  const adminCount = memberResult.items.filter(
    (member) => member.assignable_type === "admin"
  ).length;

  const mailboxCount = memberResult.items.reduce<number>(
    (total, member) => total + (member.mailbox_count ?? 0),
    0
  );

  const reviewerCount = memberResult.items.filter(
    (member) => member.role === "reviewer"
  ).length;

  const departmentMemberCounts = memberResult.items
    .filter((member) => member.assignable_type === "custodian")
    .reduce<Record<string, number>>((acc, member) => {
      const department = normalizeString(member.department);
      if (!department) return acc;
      acc[department] = (acc[department] ?? 0) + 1;
      return acc;
    }, {});

  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-8 text-zinc-100">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-6 shadow-xl">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">
                Vault Case
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight">
                {item.name ?? "Untitled Case"}
              </h1>
              <p className="mt-2 max-w-3xl whitespace-pre-wrap text-sm leading-6 text-zinc-400">
                {item.description || "No description provided."}
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                <span
                  className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${getStatusClass(
                    item.status
                  )}`}
                >
                  {item.status ?? "open"}
                </span>

                <span
                  className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${getPriorityClass(
                    item.priority
                  )}`}
                >
                  {item.priority ?? "normal"}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                href="/vault/cases"
                className="inline-flex items-center justify-center rounded-xl border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-300 hover:bg-zinc-800"
              >
                Back to cases
              </Link>

              <Link
                href={`/vault/cases/${item.id}/summary`}
                className="inline-flex items-center justify-center rounded-xl border border-purple-500/40 bg-purple-500/15 px-4 py-2 text-sm font-medium text-purple-200 hover:bg-purple-500/25"
              >
                Summary
              </Link>

              <Link
                href={`/vault/cases/${item.id}/search`}
                className="inline-flex items-center justify-center rounded-xl border border-blue-500/40 bg-blue-500/15 px-4 py-2 text-sm font-medium text-blue-200 hover:bg-blue-500/25"
              >
                Search case
              </Link>

              <Link
                href={`/vault/cases/${item.id}/holds`}
                className="inline-flex items-center justify-center rounded-xl border border-amber-500/40 bg-amber-500/15 px-4 py-2 text-sm font-medium text-amber-200 hover:bg-amber-500/25"
              >
                Case holds
              </Link>

              <Link
                href={`/vault/cases/${item.id}/exports`}
                className="inline-flex items-center justify-center rounded-xl border border-emerald-500/40 bg-emerald-500/15 px-4 py-2 text-sm font-medium text-emerald-200 hover:bg-emerald-500/25"
              >
                Case exports
              </Link>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-3 shadow-xl">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="px-2">
              <p className="text-sm font-medium text-zinc-300">Case workspace</p>
              <p className="mt-1 text-xs text-zinc-500">
                {getCurrentTabDescription(activeTab)}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {CASE_WORKSPACE_TABS.map((workspaceTab) => {
                const isActive = workspaceTab.key === activeTab;

                return (
                  <Link
                    key={workspaceTab.key}
                    href={buildTabHref({
                      caseId: item.id,
                      tab: workspaceTab.key,
                      memberQ,
                      departments,
                      showAdmins,
                      showCustodians,
                      includeAssigned,
                    })}
                    className={
                      "rounded-xl border px-3 py-2 text-xs font-medium transition " +
                      (isActive
                        ? "border-blue-500/50 bg-blue-500/15 text-blue-200"
                        : "border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-700 hover:bg-zinc-800 hover:text-zinc-200")
                    }
                    title={workspaceTab.description}
                  >
                    {workspaceTab.label}
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <Link
            href={`/vault/cases/${item.id}/summary`}
            className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5 hover:border-purple-500/40 hover:bg-purple-500/10"
          >
            <p className="text-sm font-medium text-purple-200">Case Summary</p>
            <p className="mt-2 text-sm leading-6 text-zinc-500">
              Review the workspace dashboard, custodians, holds, exports, and
              case-level activity in one place.
            </p>
          </Link>

          <Link
            href={`/vault/cases/${item.id}/search`}
            className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5 hover:border-blue-500/40 hover:bg-blue-500/10"
          >
            <p className="text-sm font-medium text-blue-200">Case Search</p>
            <p className="mt-2 text-sm leading-6 text-zinc-500">
              Search only messages connected to assigned case custodians and
              create case exports from selected results.
            </p>
          </Link>

          <Link
            href={`/vault/cases/${item.id}/holds`}
            className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5 hover:border-amber-500/40 hover:bg-amber-500/10"
          >
            <p className="text-sm font-medium text-amber-200">Case Holds</p>
            <p className="mt-2 text-sm leading-6 text-zinc-500">
              View active, released, and deleted holds related to this case
              through assigned custodian messages.
            </p>
          </Link>

          <Link
            href={`/vault/cases/${item.id}/exports`}
            className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5 hover:border-emerald-500/40 hover:bg-emerald-500/10"
          >
            <p className="text-sm font-medium text-emerald-200">Case Exports</p>
            <p className="mt-2 text-sm leading-6 text-zinc-500">
              Review export jobs tied to this case through export filters using
              caseId or case_id.
            </p>
          </Link>

          <Link
            href={`/vault/cases/${item.id}/review-sets`}
            className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5 hover:border-fuchsia-500/40 hover:bg-fuchsia-500/10"
          >
            <p className="text-sm font-medium text-fuchsia-200">Review Sets</p>
            <p className="mt-2 text-sm leading-6 text-zinc-500">
              Open case review sets to manage evidence batches, reviewer
              assignments, tagging, privileged items, and export-ready evidence.
            </p>
          </Link>
        </section>

        {(error || details || memberResult.error || eligibleResult.error) && (
          <section className="rounded-2xl border border-red-500/30 bg-red-500/10 p-5 text-red-200">
            <p className="font-medium">Case warning</p>
            {error ? <p className="mt-2 text-sm">Error: {error}</p> : null}
            {details ? <p className="mt-2 text-sm">{details}</p> : null}
            {memberResult.error ? (
              <p className="mt-2 text-sm">{memberResult.error}</p>
            ) : null}
            {eligibleResult.error ? (
              <p className="mt-2 text-sm">{eligibleResult.error}</p>
            ) : null}
          </section>
        )}

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5">
            <p className="text-sm text-zinc-500">Members</p>
            <p className="mt-2 text-2xl font-semibold">{memberCount}</p>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5">
            <p className="text-sm text-zinc-500">Custodians</p>
            <p className="mt-2 text-2xl font-semibold">{custodianCount}</p>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5">
            <p className="text-sm text-zinc-500">Admins</p>
            <p className="mt-2 text-2xl font-semibold">{adminCount}</p>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5">
            <p className="text-sm text-zinc-500">Reviewers</p>
            <p className="mt-2 text-2xl font-semibold">{reviewerCount}</p>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5">
            <p className="text-sm text-zinc-500">Mailboxes</p>
            <p className="mt-2 text-2xl font-semibold">{mailboxCount}</p>
          </div>
        </section>

        {Object.keys(departmentMemberCounts).length ? (
          <section className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5">
            <p className="text-sm font-medium text-zinc-300">
              Assigned custodian departments
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {Object.entries(departmentMemberCounts)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([department, count]) => (
                  <span
                    key={department}
                    className="rounded-full border border-zinc-800 bg-zinc-950 px-3 py-1 text-xs text-zinc-400"
                  >
                    {department} ({count})
                  </span>
                ))}
            </div>
          </section>
        ) : null}

        {activeTab !== "members" ? (
          <section className="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-sm font-medium text-blue-200">
                  Active workspace: {CASE_WORKSPACE_TABS.find((tab) => tab.key === activeTab)?.label ?? "Overview"}
                </p>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-500">
                  {getCurrentTabDescription(activeTab)} The workspace tabs now
                  render tab-specific panels on this page instead of only
                  changing the active button state. Use the action buttons below
                  to open the deeper case module when a dedicated page exists.
                </p>
              </div>

              <Link
                href={buildTabHref({
                  caseId: item.id,
                  tab: "members",
                  memberQ,
                  departments,
                  showAdmins,
                  showCustodians,
                  includeAssigned,
                })}
                className="inline-flex items-center justify-center rounded-xl border border-blue-500/40 bg-blue-500/10 px-4 py-2 text-sm font-medium text-blue-200 hover:bg-blue-500/20"
              >
                Manage members
              </Link>
            </div>
          </section>
        ) : null}

        {activeTab === "overview" ? (
          <section className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-sm font-medium text-zinc-200">Overview workspace</p>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-500">
                  This overview shows the case summary, current member counts,
                  custodian scope, mailbox coverage, and quick links into the
                  operational case modules.
                </p>
              </div>
              <Link
                href={`/vault/cases/${item.id}/summary`}
                className="inline-flex items-center justify-center rounded-xl border border-purple-500/40 bg-purple-500/10 px-4 py-2 text-sm font-medium text-purple-200 hover:bg-purple-500/20"
              >
                Open summary
              </Link>
            </div>
          </section>
        ) : null}

        {activeTab === "searches" ? (
          <section className="rounded-2xl border border-blue-500/30 bg-blue-500/10 p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-sm font-medium text-blue-200">Searches workspace</p>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-400">
                  Search case-scoped evidence across assigned custodians and
                  connected mailbox sources. This keeps discovery activity tied
                  directly to this case workspace.
                </p>
              </div>
              <Link
                href={`/vault/cases/${item.id}/search`}
                className="inline-flex items-center justify-center rounded-xl border border-blue-500/40 bg-blue-500/10 px-4 py-2 text-sm font-medium text-blue-200 hover:bg-blue-500/20"
              >
                Open case search
              </Link>
            </div>
          </section>
        ) : null}

        {activeTab === "holds" ? (
          <section className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-sm font-medium text-amber-200">Hold policies workspace</p>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-400">
                  Review preservation scope, active holds, released holds, and
                  case-related custodian hold coverage.
                </p>
              </div>
              <Link
                href={`/vault/cases/${item.id}/holds`}
                className="inline-flex items-center justify-center rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-2 text-sm font-medium text-amber-200 hover:bg-amber-500/20"
              >
                Open case holds
              </Link>
            </div>
          </section>
        ) : null}

        {activeTab === "review-sets" ? (
          <section className="rounded-2xl border border-fuchsia-500/30 bg-fuchsia-500/10 p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-sm font-medium text-fuchsia-200">Review sets workspace</p>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-400">
                  Manage evidence batches, reviewer assignments, tagging,
                  privileged evidence, and export-ready review items for this
                  case.
                </p>
              </div>
              <Link
                href={`/vault/cases/${item.id}/review-sets`}
                className="inline-flex items-center justify-center rounded-xl border border-fuchsia-500/40 bg-fuchsia-500/10 px-4 py-2 text-sm font-medium text-fuchsia-200 hover:bg-fuchsia-500/20"
              >
                Open review sets
              </Link>
            </div>
          </section>
        ) : null}

        {activeTab === "exports" ? (
          <section className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-sm font-medium text-emerald-200">Exports workspace</p>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-400">
                  Review export jobs, package preparation, manifests, filters,
                  and case-linked production history.
                </p>
              </div>
              <Link
                href={`/vault/cases/${item.id}/exports`}
                className="inline-flex items-center justify-center rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-200 hover:bg-emerald-500/20"
              >
                Open case exports
              </Link>
            </div>
          </section>
        ) : null}

        {activeTab === "data-sources" ? (
          <section className="rounded-2xl border border-cyan-500/30 bg-cyan-500/10 p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-sm font-medium text-cyan-200">Data sources workspace</p>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-400">
                  Review connected mailbox sources, ingestion coverage, and
                  custodian data scope currently attached through case members.
                </p>
              </div>
              <Link
                href="/vault/sources"
                className="inline-flex items-center justify-center rounded-xl border border-cyan-500/40 bg-cyan-500/10 px-4 py-2 text-sm font-medium text-cyan-200 hover:bg-cyan-500/20"
              >
                Open sources
              </Link>
            </div>
          </section>
        ) : null}

        {activeTab === "activity" ? (
          <section className="rounded-2xl border border-zinc-700 bg-zinc-900/70 p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-sm font-medium text-zinc-200">Activity workspace</p>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-500">
                  Review case activity, audit events, membership updates, hold
                  actions, search activity, review updates, and export actions.
                </p>
              </div>
              <Link
                href={`/vault/cases/${item.id}/activity`}
                className="inline-flex items-center justify-center rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-2 text-sm font-medium text-zinc-200 hover:bg-zinc-800"
              >
                Open activity
              </Link>
            </div>
          </section>
        ) : null}

        {activeTab === "members" ? (
        <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70">
            <div className="border-b border-zinc-800 px-5 py-4">
              <h2 className="text-lg font-semibold">Case Members</h2>
              <p className="mt-1 text-sm text-zinc-500">
                Custodians and Vault admins currently assigned to this case.
              </p>
            </div>

            {memberResult.items.length ? (
              <div className="divide-y divide-zinc-800">
                {memberResult.items.map((member) => (
                  <div key={member.id} className="p-5">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <p className="font-medium text-zinc-100">
                          {member.display_name ?? "Unnamed member"}
                        </p>
                        <p className="mt-1 text-sm text-zinc-500">
                          {member.email ?? "No email"} · {member.assignable_type}
                        </p>

                        <div className="mt-2 flex flex-wrap gap-2">
                          <span
                            className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${getRoleClass(
                              member.role
                            )}`}
                          >
                            Case role: {member.role}
                          </span>

                          {member.vault_role ? (
                            <span className="inline-flex rounded-full border border-blue-500/30 bg-blue-500/10 px-2.5 py-1 text-xs font-medium text-blue-300">
                              Vault role: {member.vault_role}
                            </span>
                          ) : null}
                        </div>

                        {member.department ? (
                          <p className="mt-2 text-sm text-zinc-500">
                            Department: {member.department}
                          </p>
                        ) : null}

                        {member.title ? (
                          <p className="mt-1 text-sm text-zinc-500">
                            Title: {member.title}
                          </p>
                        ) : null}

                        <p className="mt-2 text-xs text-zinc-600">
                          Added {formatDate(member.created_at)}
                        </p>
                      </div>

                      <div className="flex flex-col gap-2 sm:flex-row lg:flex-col">
                        <form action={updateCaseMemberRole} className="flex gap-2">
                          <input type="hidden" name="caseId" value={item.id} />
                          <input
                            type="hidden"
                            name="memberId"
                            value={member.id}
                          />
                          <select
                            name="role"
                            defaultValue={member.role}
                            className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-200 outline-none focus:border-blue-500/60"
                          >
                            <option value="owner">Owner</option>
                            <option value="admin">Admin</option>
                            <option value="reviewer">Reviewer</option>
                            <option value="viewer">Viewer</option>
                            <option value="member">Member</option>
                          </select>
                          <button
                            type="submit"
                            className="rounded-xl border border-blue-500/30 bg-blue-500/10 px-3 py-1.5 text-xs text-blue-200 hover:bg-blue-500/20"
                          >
                            Update
                          </button>
                        </form>

                        <form action={removeCaseMember}>
                          <input type="hidden" name="caseId" value={item.id} />
                          <input
                            type="hidden"
                            name="memberId"
                            value={member.id}
                          />
                          <button
                            type="submit"
                            className="w-full rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs text-red-200 hover:bg-red-500/20"
                          >
                            Remove
                          </button>
                        </form>
                      </div>
                    </div>

                    {member.mailboxes.length ? (
                      <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-950/70 p-3">
                        <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                          Mailboxes
                        </p>
                        <div className="mt-2 grid gap-2">
                          {member.mailboxes.map((mailbox) => (
                            <div
                              key={mailbox.id}
                              className="rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 py-2 text-sm text-zinc-300"
                            >
                              <div>{mailbox.mailbox_address ?? "Unknown mailbox"}</div>
                              <div className="mt-1 text-xs text-zinc-600">
                                {mailbox.mailbox_type ?? "mailbox"} ·{" "}
                                {mailbox.ingestion_status ?? "unknown"}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-10 text-center">
                <p className="text-sm text-zinc-500">
                  No members have been added to this case yet.
                </p>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70">
            <div className="border-b border-zinc-800 px-5 py-4">
              <h2 className="text-lg font-semibold">Add Members</h2>
              <p className="mt-1 text-sm text-zinc-500">
                Add custodians, departments, or Vault admins to this case.
              </p>
            </div>

            <div className="border-b border-zinc-800 p-5">
              <form className="grid gap-4" action={`/vault/cases/${item.id}`}>
                <div>
                  <label className="text-sm text-zinc-400" htmlFor="memberQ">
                    Search eligible members
                  </label>
                  <input
                    id="memberQ"
                    name="memberQ"
                    defaultValue={memberQ}
                    placeholder="Search by name, email, mailbox, department, or role"
                    className="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-blue-500/60"
                  />
                </div>

                <div>
                  <label
                    className="text-sm text-zinc-400"
                    htmlFor="departments"
                  >
                    Departments
                  </label>
                  <input
                    id="departments"
                    name="departments"
                    defaultValue={departments}
                    placeholder="Example: HR, SALES, ADMIN"
                    className="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-blue-500/60"
                  />
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <input type="hidden" name="showCustodians" value="false" />
                  <label className="flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-300">
                    <input
                      type="checkbox"
                      name="showCustodians"
                      value="true"
                      defaultChecked={showCustodians}
                    />
                    Custodians
                  </label>

                  <input type="hidden" name="showAdmins" value="false" />
                  <label className="flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-300">
                    <input
                      type="checkbox"
                      name="showAdmins"
                      value="true"
                      defaultChecked={showAdmins}
                    />
                    Admins
                  </label>

                  <label className="flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-300">
                    <input
                      type="checkbox"
                      name="includeAssigned"
                      value="true"
                      defaultChecked={includeAssigned}
                    />
                    Assigned
                  </label>
                </div>

                <button
                  type="submit"
                  className="rounded-xl border border-blue-500/40 bg-blue-500/10 px-4 py-2 text-sm font-medium text-blue-200 hover:bg-blue-500/20"
                >
                  Apply filters
                </button>
              </form>

              {eligibleResult.departments.length ? (
                <div className="mt-4">
                  <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                    Department quick filters
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {eligibleResult.departments.map((department) => {
                      const active = selectedDepartmentKeys.includes(
                        normalizeDepartmentKey(department)
                      );

                      return (
                        <Link
                          key={department}
                          href={buildDepartmentHref({
                            caseId: item.id,
                            department,
                            memberQ,
                            currentDepartments: departments,
                            showAdmins,
                            showCustodians,
                            includeAssigned,
                          })}
                          className={
                            "rounded-full border px-3 py-1 text-xs " +
                            (active
                              ? "border-blue-500/50 bg-blue-500/15 text-blue-200"
                              : "border-zinc-800 bg-zinc-950 text-zinc-400 hover:bg-zinc-800")
                          }
                        >
                          {department}{" "}
                          {eligibleResult.departmentCounts[department]
                            ? `(${eligibleResult.departmentCounts[department]})`
                            : ""}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </div>

            {eligibleResult.departments.length ? (
              <div className="border-b border-zinc-800 p-5">
                <p className="text-sm font-medium text-zinc-300">
                  Add entire department
                </p>
                <div className="mt-3 grid gap-2">
                  {eligibleResult.departments.map((department) => (
                    <form
                      key={department}
                      action={addDepartmentCustodians}
                      className="flex flex-col gap-2 rounded-xl border border-zinc-800 bg-zinc-950 p-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <p className="text-sm text-zinc-200">{department}</p>
                        <p className="text-xs text-zinc-600">
                          {eligibleResult.departmentCounts[department] ?? 0} active
                          custodian(s)
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <input type="hidden" name="caseId" value={item.id} />
                        <input
                          type="hidden"
                          name="department"
                          value={department}
                        />
                        <select
                          name="role"
                          defaultValue="member"
                          className="rounded-xl border border-zinc-800 bg-zinc-900 px-2 py-1.5 text-xs text-zinc-200"
                        >
                          <option value="reviewer">Reviewer</option>
                          <option value="viewer">Viewer</option>
                          <option value="member">Member</option>
                        </select>
                        <button
                          type="submit"
                          className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs text-emerald-200 hover:bg-emerald-500/20"
                        >
                          Add
                        </button>
                      </div>
                    </form>
                  ))}
                </div>
              </div>
            ) : null}

            {eligibleResult.items.length ? (
              <div className="max-h-[720px] divide-y divide-zinc-800 overflow-y-auto">
                {eligibleResult.items.map((eligible) => (
                  <div
                    key={`${eligible.assignable_type}:${eligible.id}`}
                    className="p-5"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <p className="font-medium text-zinc-100">
                          {eligible.display_name}
                        </p>
                        <p className="mt-1 text-sm text-zinc-500">
                          {eligible.email ?? "No email"} ·{" "}
                          {eligible.assignable_type}
                        </p>

                        <div className="mt-2 flex flex-wrap gap-2">
                          <span
                            className={`rounded-full border px-2.5 py-1 text-xs ${getRoleClass(
                              eligible.default_case_role
                            )}`}
                          >
                            Default: {eligible.default_case_role ?? "member"}
                          </span>

                          {eligible.is_assigned ? (
                            <span className="rounded-full border border-yellow-500/30 bg-yellow-500/10 px-2.5 py-1 text-xs text-yellow-300">
                              Already assigned: {eligible.assigned_role ?? "member"}
                            </span>
                          ) : null}
                        </div>

                        {eligible.department ? (
                          <p className="mt-2 text-sm text-zinc-500">
                            Department: {eligible.department}
                          </p>
                        ) : null}

                        {eligible.mailbox_address ? (
                          <p className="mt-1 text-sm text-zinc-500">
                            Primary mailbox: {eligible.mailbox_address}
                          </p>
                        ) : null}

                        {eligible.role ? (
                          <p className="mt-1 text-sm text-zinc-500">
                            Vault role: {eligible.role}
                          </p>
                        ) : null}
                      </div>

                      {eligible.is_assigned ? (
                        <div className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-500">
                          Assigned
                        </div>
                      ) : (
                        <form action={addCaseMember} className="flex gap-2">
                          <input type="hidden" name="caseId" value={item.id} />
                          <input
                            type="hidden"
                            name="assignableType"
                            value={eligible.assignable_type}
                          />
                          <input
                            type="hidden"
                            name="assignableId"
                            value={eligible.assignable_id}
                          />
                          <select
                            name="role"
                            defaultValue={eligible.default_case_role ?? "member"}
                            className="rounded-xl border border-zinc-800 bg-zinc-950 px-2 py-1.5 text-xs text-zinc-200"
                          >
                            <option value="owner">Owner</option>
                            <option value="admin">Admin</option>
                            <option value="reviewer">Reviewer</option>
                            <option value="viewer">Viewer</option>
                            <option value="member">Member</option>
                          </select>
                          <button
                            type="submit"
                            className="rounded-xl border border-blue-500/40 bg-blue-500/10 px-3 py-1.5 text-xs text-blue-200 hover:bg-blue-500/20"
                          >
                            Add
                          </button>
                        </form>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-10 text-center">
                <p className="text-sm text-zinc-500">
                  No eligible members found for the current filters.
                </p>
              </div>
            )}
          </div>
        </section>
        ) : null}
      </div>
    </main>
  );
}