"use client";

import { useRouter } from "next/navigation";
import {
  Play,
  CheckCircle,
  XCircle,
  Trash2,
} from "lucide-react";

import { supabasePlatform } from "@/lib/supabasePlatformClient";

interface Props {
  selected: any[];
  clearSelection: () => void;
}

export default function BulkServiceRequestActions({
  selected,
  clearSelection,
}: Props) {
  const router = useRouter();

  async function bulkUpdate(status: string) {
    const ids = selected.map((r) => r.id);

    const { error } = await supabasePlatform
      .from("service_requests")
      .update({ status })
      .in("id", ids);

    if (error) {
      alert(error.message);
      return;
    }

    clearSelection();
    router.refresh();
  }

  async function bulkDelete() {
    const ok = confirm(
      `Delete ${selected.length} service request(s)?`
    );
    if (!ok) return;

    const ids = selected.map((r) => r.id);

    const { error } = await supabasePlatform
      .from("service_requests")
      .delete()
      .in("id", ids);

    if (error) {
      alert(error.message);
      return;
    }

    clearSelection();
    router.refresh();
  }

  return (
    <div
      className="sticky top-0 z-40 flex items-center gap-3
        px-6 py-3 mb-2
        bg-slate-900 border border-slate-800 rounded-lg"
    >
      <span className="text-sm text-slate-300">
        {selected.length} selected
      </span>

      <button
        onClick={() => bulkUpdate("in_progress")}
        className="inline-flex items-center gap-1
          rounded px-3 py-1 text-xs
          bg-blue-600/20 text-blue-400
          hover:bg-blue-600/30"
      >
        <Play size={14} />
        Start
      </button>

      <button
        onClick={() => bulkUpdate("resolved")}
        className="inline-flex items-center gap-1
          rounded px-3 py-1 text-xs
          bg-emerald-600/20 text-emerald-400
          hover:bg-emerald-600/30"
      >
        <CheckCircle size={14} />
        Resolve
      </button>

      <button
        onClick={() => bulkUpdate("closed")}
        className="inline-flex items-center gap-1
          rounded px-3 py-1 text-xs
          bg-slate-600/20 text-slate-300
          hover:bg-slate-600/30"
      >
        <XCircle size={14} />
        Close
      </button>

      <button
        onClick={bulkDelete}
        className="ml-auto inline-flex items-center gap-1
          rounded px-3 py-1 text-xs
          bg-red-600/20 text-red-400
          hover:bg-red-600/30"
      >
        <Trash2 size={14} />
        Delete
      </button>
    </div>
  );
}
