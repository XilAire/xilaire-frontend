import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Metadata } from "next";

/* -------------------------------------------------
   🧾 METADATA
------------------------------------------------- */
export const metadata: Metadata = {
  title: "Organization Members | CASE Trades",
  description:
    "Manage organization members, roles, permissions, invitations, team access, subscriptions, and workspace membership within the CASE Trades platform.",
};

export const dynamic = "force-dynamic";

type PageProps = {
  params: {
    id: string;
  };
};

type ProfileRow = {
  id: string;
  email: string | null;
  full_name: string | null;
};

type MemberRow = {
  id: string;
  user_id: string;
  role: string | null;
  created_at: string | null;
};

function getSupabaseUrl() {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_URL_CASE_TRADES ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    ""
  );
}

function getSupabaseServiceRoleKey() {
  return (
    process.env.SUPABASE_SERVICE_ROLE_KEY_CASE_TRADES ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    ""
  );
}

function createAdminSupabaseClient() {
  return createSupabaseClient(getSupabaseUrl(), getSupabaseServiceRoleKey(), {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function formatRoleName(value: string | null | undefined) {
  if (!value) return "Organization Member";

  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

async function addOrganizationMember(formData: FormData) {
  "use server";

  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL_CASE_TRADES ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    "";

  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY_CASE_TRADES ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    "";

  const supabase = createSupabaseClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const organizationId = String(formData.get("organization_id") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const role = String(formData.get("role") || "organization_member").trim();

  if (!organizationId || !email || !role) {
    throw new Error("Organization, email, and role are required.");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, email")
    .ilike("email", email)
    .maybeSingle();

  if (profileError) {
    throw new Error(profileError.message);
  }

  if (!profile) {
    throw new Error(
      "No profile found for that email. The user must sign up first."
    );
  }

  const { error: upsertError } = await supabase
    .from("organization_members")
    .upsert(
      {
        organization_id: organizationId,
        user_id: profile.id,
        role,
      },
      {
        onConflict: "organization_id,user_id",
      }
    );

  if (upsertError) {
    throw new Error(upsertError.message);
  }

  redirect(`/dashboard/admin/organizations/${organizationId}/members`);
}

async function removeOrganizationMember(formData: FormData) {
  "use server";

  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL_CASE_TRADES ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    "";

  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY_CASE_TRADES ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    "";

  const supabase = createSupabaseClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const organizationId = String(formData.get("organization_id") || "").trim();
  const memberId = String(formData.get("member_id") || "").trim();

  if (!organizationId || !memberId) {
    throw new Error("Organization and member are required.");
  }

  const { error } = await supabase
    .from("organization_members")
    .delete()
    .eq("id", memberId)
    .eq("organization_id", organizationId);

  if (error) {
    throw new Error(error.message);
  }

  redirect(`/dashboard/admin/organizations/${organizationId}/members`);
}

export default async function OrganizationMembersPage({ params }: PageProps) {
  const supabase = createAdminSupabaseClient();

  const { data: organization, error: organizationError } = await supabase
    .from("organizations")
    .select("id, name, slug")
    .eq("id", params.id)
    .maybeSingle();

  if (organizationError || !organization) {
    return (
      <main className="space-y-6">
        <div>
          <p className="text-sm font-medium text-red-300">
            Platform Administration
          </p>

          <h1 className="mt-1 text-2xl font-bold text-slate-100">
            Organization Not Found
          </h1>

          <p className="mt-2 text-sm text-slate-400">
            No organization was found for ID: {params.id}
          </p>

          <Link
            href="/dashboard/admin/organizations"
            className="mt-4 inline-flex rounded-lg border border-white/10 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-white/5"
          >
            Back to Organizations
          </Link>
        </div>
      </main>
    );
  }

  const { data: members, error: membersError } = await supabase
    .from("organization_members")
    .select("id, user_id, role, created_at")
    .eq("organization_id", organization.id)
    .order("created_at", { ascending: false });

  const safeMembers: MemberRow[] = Array.isArray(members) ? members : [];

  const userIds = safeMembers.map((member) => member.user_id).filter(Boolean);

  const { data: profiles } =
    userIds.length > 0
      ? await supabase
          .from("profiles")
          .select("id, email, full_name")
          .in("id", userIds)
      : { data: [] as ProfileRow[] };

  const profileById = new Map(
    (profiles as ProfileRow[]).map((profile) => [profile.id, profile])
  );

  return (
    <main className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-medium text-sky-300">
            Platform Administration
          </p>

          <h1 className="mt-1 text-3xl font-bold text-slate-100">
            Members
          </h1>

          <p className="mt-2 text-sm text-slate-400">
            Manage members for {organization.name}.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href={`/dashboard/admin/organizations/${organization.id}`}
            className="rounded-lg border border-white/10 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-white/5"
          >
            Organization Details
          </Link>

          <Link
            href="/dashboard/admin/organizations"
            className="rounded-lg border border-white/10 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-white/5"
          >
            All Organizations
          </Link>
        </div>
      </div>

      <section className="rounded-xl border border-white/10 bg-slate-900/80 p-5">
        <h2 className="font-semibold text-slate-100">Add Member</h2>

        <p className="mt-1 text-sm text-slate-400">
          Add an existing CASE Trades user to this organization. The user must
          sign up before they can be assigned.
        </p>

        <form
          action={addOrganizationMember}
          className="mt-5 grid gap-4 md:grid-cols-[1fr_220px_auto]"
        >
          <input type="hidden" name="organization_id" value={organization.id} />

          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-300">
              User Email
            </span>
            <input
              name="email"
              type="email"
              required
              placeholder="user@example.com"
              className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-600 focus:border-sky-500/60"
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-300">Role</span>
            <select
              name="role"
              required
              defaultValue="organization_member"
              className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-500/60"
            >
              <option value="organization_owner">Organization Owner</option>
              <option value="organization_admin">Organization Admin</option>
              <option value="organization_member">Organization Member</option>
            </select>
          </label>

          <div className="flex items-end">
            <button
              type="submit"
              className="w-full rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500"
            >
              Add Member
            </button>
          </div>
        </form>
      </section>

      <section className="overflow-hidden rounded-xl border border-white/10 bg-slate-900/80">
        <div className="border-b border-white/10 px-5 py-4">
          <h2 className="font-semibold text-slate-100">Current Members</h2>

          <p className="mt-1 text-sm text-slate-400">
            {safeMembers.length} member(s) assigned to this organization.
          </p>
        </div>

        {membersError ? (
          <div className="p-5 text-sm text-red-300">
            Failed to load members: {membersError.message}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-left text-sm">
              <thead className="bg-slate-950/80 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3">User</th>
                  <th className="px-5 py-3">Email</th>
                  <th className="px-5 py-3">Role</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-white/10">
                {safeMembers.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-5 py-10 text-center text-slate-400"
                    >
                      No members found.
                    </td>
                  </tr>
                ) : (
                  safeMembers.map((member) => {
                    const profile = profileById.get(member.user_id);

                    return (
                      <tr key={member.id} className="hover:bg-white/[0.03]">
                        <td className="px-5 py-4">
                          <p className="font-medium text-slate-100">
                            {profile?.full_name || "Unnamed User"}
                          </p>

                          <p className="mt-1 text-xs text-slate-500">
                            {member.user_id}
                          </p>
                        </td>

                        <td className="px-5 py-4 text-slate-300">
                          {profile?.email || "—"}
                        </td>

                        <td className="px-5 py-4">
                          <span className="rounded-full bg-slate-800 px-2 py-1 text-xs text-slate-300">
                            {formatRoleName(member.role)}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <form
                            action={removeOrganizationMember}
                            className="flex justify-end"
                          >
                            <input
                              type="hidden"
                              name="organization_id"
                              value={organization.id}
                            />

                            <input
                              type="hidden"
                              name="member_id"
                              value={member.id}
                            />

                            <button
                              type="submit"
                              className="rounded-lg border border-red-500/30 px-3 py-2 text-xs font-medium text-red-300 hover:bg-red-500/10"
                            >
                              Remove
                            </button>
                          </form>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}