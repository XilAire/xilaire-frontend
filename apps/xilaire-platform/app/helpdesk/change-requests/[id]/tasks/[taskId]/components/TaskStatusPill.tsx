"use client";

const colors: Record<string, string> = {
  open: "bg-slate-600",
  in_progress: "bg-blue-600",
  completed: "bg-green-600",
  blocked: "bg-yellow-600",
};

export default function TaskStatusPill({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center px-3 py-1 rounded-full text-xs text-white ${
        colors[status] ?? "bg-slate-500"
      }`}
    >
      {status.replace("_", " ")}
    </span>
  );
}
