"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  MoreVertical,
  Play,
  CheckCircle,
  RotateCcw,
  Lock,
  Trash2,
  UserPlus,
} from "lucide-react";

import { supabasePlatform } from "@/lib/supabasePlatformClient";

interface ServiceRequestActionPillProps {
  id: string;
  request: any;
}

export default function ServiceRequestActionPill({
  id,
  request,
}: ServiceRequestActionPillProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function run(action: () => Promise<void>) {
    startTransition(async () => {
      await action();
      setOpen(false);
      router.refresh();
    });
  }

  async function updateStatus(status: string) {
    const { error } = await supabasePlatform
      .from("service_requests")
      .update({ status })
      .eq("id", id);

    if (error) {
      console.error("Status update failed:", error);
      alert(error.message);
    }
  }

  async function deleteRequest() {
    const ok = confirm("Permanently delete this service request?");
    if (!ok) return;

    const { error } = await supabasePlatform
      .from("service_requests")
      .delete()
      .eq("id", id);

    if (error) {
      alert(error.message);
      return;
    }

    router.push("/helpdesk/service-requests");
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="px-3 py-1.5 flex items-center gap-2 rounded-lg
          bg-slate-800 border border-slate-700 text-slate-200
          hover:bg-slate-700 text-sm"
      >
        <MoreVertical size={16} />
        {isPending ? "Working…" : "Actions"}
      </button>

      {open && (
        <div
          className="absolute right-0 mt-2 w-56 bg-slate-900
            border border-slate-700 rounded-xl shadow-xl
            z-50 overflow-hidden"
          onMouseLeave={() => setOpen(false)}
        >
          {/* OPEN */}
          {request.status === "open" && (
            <>
              <button
                onClick={() => run(() => updateStatus("in_progress"))}
                className="w-full flex items-center gap-2 px-3 py-2
                  hover:bg-slate-800 text-slate-200 text-sm"
              >
                <Play size={16} />
                Start Work
              </button>

              <button
                className="w-full flex items-center gap-2 px-3 py-2
                  hover:bg-slate-800 text-slate-200 text-sm"
                disabled
              >
                <UserPlus size={16} />
                Assign (coming next)
              </button>

              <Divider />
            </>
          )}

          {/* IN PROGRESS */}
          {request.status === "in_progress" && (
            <>
              <button
                onClick={() => run(() => updateStatus("resolved"))}
                className="w-full flex items-center gap-2 px-3 py-2
                  hover:bg-emerald-900/40 text-emerald-400 text-sm"
              >
                <CheckCircle size={16} />
                Resolve
              </button>

              <button
                className="w-full flex items-center gap-2 px-3 py-2
                  hover:bg-slate-800 text-slate-200 text-sm"
                disabled
              >
                <UserPlus size={16} />
                Assign (coming next)
              </button>

              <Divider />
            </>
          )}

          {/* RESOLVED */}
          {request.status === "resolved" && (
            <>
              <button
                onClick={() => run(() => updateStatus("in_progress"))}
                className="w-full flex items-center gap-2 px-3 py-2
                  hover:bg-slate-800 text-slate-200 text-sm"
              >
                <RotateCcw size={16} />
                Reopen
              </button>

              <button
                onClick={() => run(() => updateStatus("closed"))}
                className="w-full flex items-center gap-2 px-3 py-2
                  hover:bg-green-900/40 text-green-400 text-sm"
              >
                <Lock size={16} />
                Close
              </button>

              <Divider />
            </>
          )}

          {/* CLOSED */}
          {request.status === "closed" && (
            <div className="px-3 py-2 text-xs text-slate-500">
              This request is closed
              <Divider />
            </div>
          )}

          {/* DELETE (ALWAYS AVAILABLE) */}
          <button
            onClick={() => run(deleteRequest)}
            className="w-full flex items-center gap-2 px-3 py-2
              hover:bg-red-900/40 text-red-400 text-sm"
          >
            <Trash2 size={16} />
            Delete Request
          </button>
        </div>
      )}
    </div>
  );
}

function Divider() {
  return <div className="border-t border-slate-700 my-1" />;
}
