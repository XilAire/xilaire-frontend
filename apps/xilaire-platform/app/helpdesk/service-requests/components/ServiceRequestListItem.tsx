"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle, XCircle } from "lucide-react";

import StatusPill from "./StatusPill";
import { supabasePlatform } from "@/lib/supabasePlatformClient";

interface Props {
  request: any;
  selected: boolean;
  onToggleSelect: (id: string) => void;
}

export default function ServiceRequestListItem({
  request,
  selected,
  onToggleSelect,
}: Props) {
  const router = useRouter();

  async function updateStatus(
    e: React.MouseEvent,
    status: "resolved" | "closed"
  ) {
    e.preventDefault();
    e.stopPropagation();

    const { error } = await supabasePlatform
      .from("service_requests")
      .update({ status })
      .eq("id", request.id);

    if (error) {
      alert(error.message);
      return;
    }

    router.refresh();
  }

  const canResolve =
    request.status === "open" ||
    request.status === "pending" ||
    request.status === "in_progress";

  const canClose = request.status === "resolved";

  return (
    <Link
      href={`/helpdesk/service-requests/${request.id}`}
      className={`grid grid-cols-12 gap-4 px-6 py-4
        border-b border-slate-800 transition
        ${selected ? "bg-slate-900/60" : "hover:bg-slate-900"}`}
    >
      {/* CHECKBOX */}
      <div
        className="col-span-1 flex items-center"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onToggleSelect(request.id);
        }}
      >
        <input
          type="checkbox"
          checked={selected}
          readOnly
          className="h-4 w-4 rounded border-slate-600
                     bg-slate-900 text-blue-500"
        />
      </div>

      {/* TITLE */}
      <div className="col-span-4">
        <p className="font-medium text-white">
          {request.title}
        </p>
        <p className="text-xs text-slate-400 truncate">
          {request.description || "—"}
        </p>
      </div>

      {/* PRIORITY */}
      <div className="col-span-2 capitalize text-slate-300">
        {request.priority ?? "—"}
      </div>

      {/* STATUS */}
      <div className="col-span-2">
        <StatusPill status={request.status} />
      </div>

      {/* INLINE ACTIONS */}
      <div className="col-span-2 flex items-center gap-2">
        {canResolve && (
          <button
            onClick={(e) => updateStatus(e, "resolved")}
            className="inline-flex items-center gap-1
              rounded px-2 py-1 text-xs
              bg-emerald-600/20 text-emerald-400
              hover:bg-emerald-600/30"
          >
            <CheckCircle size={14} />
            Resolve
          </button>
        )}

        {canClose && (
          <button
            onClick={(e) => updateStatus(e, "closed")}
            className="inline-flex items-center gap-1
              rounded px-2 py-1 text-xs
              bg-slate-600/20 text-slate-300
              hover:bg-slate-600/30"
          >
            <XCircle size={14} />
            Close
          </button>
        )}
      </div>

      {/* CREATED */}
      <div className="col-span-1 text-right text-xs text-slate-400">
        {request.created_at
          ? new Date(request.created_at).toLocaleDateString()
          : "—"}
      </div>
    </Link>
  );
}
