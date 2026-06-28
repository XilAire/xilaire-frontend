type DiscordRole = {
  id: string;
  organization_id: string;
  discord_role_id: string;
  name?: string | null;
  role_name?: string | null;
  color?: string | null;
  position?: number | null;
  managed?: boolean | null;
  active?: boolean | null;
  created_at?: string | null;
};

type DiscordRolesProps = {
  roles: DiscordRole[];
};

export default function DiscordRoles({ roles }: DiscordRolesProps) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5 shadow-sm">
      <div className="mb-5">
        <h2 className="text-lg font-semibold text-white">Discord Roles</h2>
        <p className="mt-1 text-sm text-slate-400">
          Roles available for product and subscription access.
        </p>
      </div>

      {roles.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-800 bg-slate-900/40 p-6 text-center">
          <p className="text-sm font-medium text-slate-300">
            No Discord roles found.
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Sync roles after connecting Discord.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {roles.map((role) => {
            const displayName = role.role_name || role.name || "Unnamed role";

            return (
              <div
                key={role.id}
                className="rounded-xl border border-slate-800 bg-slate-900/60 p-4"
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-white">
                        {displayName}
                      </h3>

                      {role.managed ? (
                        <span className="rounded-full border border-blue-900/60 bg-blue-950/40 px-2 py-0.5 text-xs text-blue-300">
                          Managed
                        </span>
                      ) : null}

                      {role.active === false ? (
                        <span className="rounded-full border border-red-900/60 bg-red-950/40 px-2 py-0.5 text-xs text-red-300">
                          Inactive
                        </span>
                      ) : (
                        <span className="rounded-full border border-emerald-900/60 bg-emerald-950/40 px-2 py-0.5 text-xs text-emerald-300">
                          Active
                        </span>
                      )}
                    </div>

                    <p className="mt-1 text-sm text-slate-400">
                      Position:{" "}
                      <span className="text-slate-300">
                        {role.position ?? "Unknown"}
                      </span>
                    </p>
                  </div>

                  <div className="text-left md:text-right">
                    <p className="text-xs text-slate-500">Color</p>
                    <p className="text-sm font-medium text-slate-300">
                      {role.color || "Not set"}
                    </p>
                  </div>
                </div>

                <div className="mt-4 rounded-lg bg-slate-950/70 p-3 text-xs">
                  <p className="text-slate-500">Discord Role ID</p>
                  <p className="mt-1 break-all font-medium text-slate-300">
                    {role.discord_role_id}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}