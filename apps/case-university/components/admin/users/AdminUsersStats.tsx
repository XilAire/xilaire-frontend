import type {
  AdminUniversityUsersStats,
} from "@/lib/university/admin-users";

type AdminUsersStatsProps = {
  stats: AdminUniversityUsersStats;
};

type StatCardProps = {
  label: string;
  value: number;
  helper: string;
};

function StatCard({
  label,
  value,
  helper,
}: StatCardProps) {
  return (
    <div
      className="
        rounded-2xl
        border
        border-[var(--border-default)]
        bg-[var(--surface-default)]
        p-4
        shadow-[var(--shadow-sm)]
        sm:p-5
      "
    >
      <p
        className="
          text-[11px]
          font-extrabold
          uppercase
          tracking-[0.13em]
          text-[var(--text-muted)]
        "
      >
        {label}
      </p>

      <p
        className="
          mt-2
          text-3xl
          font-black
          tracking-tight
          text-[var(--text-primary)]
        "
      >
        {value.toLocaleString()}
      </p>

      <p
        className="
          mt-1
          text-xs
          leading-5
          text-[var(--text-secondary)]
        "
      >
        {helper}
      </p>
    </div>
  );
}

export default function AdminUsersStats({
  stats,
}: AdminUsersStatsProps) {
  return (
    <div
      className="
        grid
        gap-3
        sm:grid-cols-2
        xl:grid-cols-5
      "
    >
      <StatCard
        label="Total Users"
        value={stats.totalUsers}
        helper="All CASE University authentication accounts."
      />

      <StatCard
        label="Active"
        value={stats.activeUsers}
        helper="Accounts with at least one recorded sign-in."
      />

      <StatCard
        label="Never Signed In"
        value={stats.neverSignedInUsers}
        helper="Registered accounts without a recorded sign-in."
      />

      <StatCard
        label="Power Users"
        value={stats.powerUserUsers}
        helper="Rank 1 course-facing users with no Admin-section access."
      />

      <StatCard
        label="Administrators"
        value={
          stats.adminUsers +
          stats.superAdminUsers +
          stats.masterAdminUsers
        }
        helper={`${stats.adminUsers.toLocaleString()} Admin · ${stats.superAdminUsers.toLocaleString()} Super · ${stats.masterAdminUsers.toLocaleString()} Master`}
      />
    </div>
  );
}
