export default function StatusBadge({ status }) {
  const colors = {
    open: "bg-green-700/30 text-green-300 border border-green-700/40",
    in_progress: "bg-yellow-700/30 text-yellow-300 border border-yellow-700/40",
    resolved: "bg-blue-700/30 text-blue-300 border border-blue-700/40",
    closed: "bg-slate-700/30 text-slate-300 border border-slate-700/40",
  };

  return (
    <span
      className={`text-xs px-3 py-1 rounded-md font-medium capitalize ${colors[status]}`}
    >
      {status.replace("_", " ")}
    </span>
  );
}
