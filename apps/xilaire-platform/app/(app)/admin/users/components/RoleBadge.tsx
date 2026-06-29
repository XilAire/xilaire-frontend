export function RoleBadge({ role }: { role: string }) {
  const styles = {
    master_admin: "bg-purple-100 text-purple-700",
    admin: "bg-blue-100 text-blue-700",
    user: "bg-slate-100 text-slate-700",
  };

  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${styles[role]}`}>
      {role.replace("_", " ")}
    </span>
  );
}
