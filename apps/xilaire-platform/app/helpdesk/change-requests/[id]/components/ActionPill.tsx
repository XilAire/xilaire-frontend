"use client";

import { useState, useTransition } from "react";
import {
  MoreVertical,
  Trash2,
  Edit,
  CheckCircle,
  Clock,
  XCircle,
  Ban,
} from "lucide-react";

import { useRouter } from "next/navigation";
import { supabasePlatform } from "@/lib/supabasePlatformClient";

import EditChangeRequestModal from "./EditChangeRequestModal";

export default function ActionPill({
  id,
  change,
}: {
  id: string;
  change: any;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const isServiceRequest = change.request_type === "service";
  const table = isServiceRequest ? "service_requests" : "change_requests";

  /** 🔒 ONLY change requests have tasks */
  const openTaskCount =
    !isServiceRequest
      ? change.tasks?.filter((t: any) => t.status !== "completed").length ?? 0
      : 0;

  const canComplete = isServiceRequest || openTaskCount === 0;

  function run(action: () => Promise<void>) {
    startTransition(async () => {
      await action();
      setOpen(false);
      router.refresh();
    });
  }

  async function updateStatus(status: string) {
    const { error } = await supabasePlatform
      .from(table)
      .update({ status })
      .eq("id", id);

    if (error) {
      console.error("Status update failed:", error);
      alert(error.message);
    }
  }

  async function deleteRequest() {
    const ok = confirm("Permanently delete this request?");
    if (!ok) return;

    const { error } = await supabasePlatform
      .from(table)
      .delete()
      .eq("id", id);

    if (error) {
      alert(error.message);
      return;
    }

    router.push(
      isServiceRequest
        ? "/helpdesk/service-requests"
        : "/helpdesk/change-requests"
    );
  }

  return (
    <>
      {/* EDIT MODAL — CHANGE REQUESTS ONLY */}
      {!isServiceRequest && (
        <EditChangeRequestModal
          open={editOpen}
          onClose={() => setEditOpen(false)}
          change={change}
        />
      )}

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
            {/* EDIT — CHANGE REQUESTS ONLY */}
            {!isServiceRequest && (
              <>
                <button
                  onClick={() => setEditOpen(true)}
                  className="w-full flex items-center gap-2 px-3 py-2 
                    hover:bg-slate-800 text-slate-200 text-sm"
                >
                  <Edit size={16} />
                  Edit Request
                </button>

                <div className="border-t border-slate-700 my-1" />
              </>
            )}

            {/* STATUS ACTIONS */}
            {change.status === "open" && (
              <button
                onClick={() => run(() => updateStatus("in_progress"))}
                className="w-full flex items-center gap-2 px-3 py-2 
                  hover:bg-slate-800 text-slate-200 text-sm"
              >
                <Clock size={16} />
                Start
              </button>
            )}

            {change.status === "in_progress" && (
              <button
                onClick={() => run(() => updateStatus("resolved"))}
                className="w-full flex items-center gap-2 px-3 py-2 
                  hover:bg-slate-800 text-emerald-400 text-sm"
              >
                <CheckCircle size={16} />
                Resolve
              </button>
            )}

            {change.status === "resolved" && (
              <>
                <div className="border-t border-slate-700 my-1" />

                {canComplete ? (
                  <button
                    onClick={() => run(() => updateStatus("closed"))}
                    className="w-full flex items-center gap-2 px-3 py-2 
                      hover:bg-green-900/40 text-green-400 text-sm"
                  >
                    <CheckCircle size={16} />
                    Close
                  </button>
                ) : (
                  <div
                    className="w-full flex items-start gap-2 px-3 py-2 
                      text-slate-400 text-xs cursor-not-allowed"
                    title="All tasks must be completed first"
                  >
                    <Ban size={16} className="mt-0.5" />
                    <div>
                      Cannot close
                      <div className="text-[11px] text-slate-500">
                        {openTaskCount} open task
                        {openTaskCount !== 1 ? "s" : ""} remaining
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            <div className="border-t border-slate-700 my-1" />

            {/* DELETE */}
            <button
              onClick={() => run(deleteRequest)}
              className="w-full flex items-center gap-2 px-3 py-2 
                hover:bg-red-900/40 text-red-400 text-sm"
            >
              <Trash2 size={16} />
              Delete
            </button>
          </div>
        )}
      </div>
    </>
  );
}
