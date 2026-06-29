"use client";

import { useEffect, useState, useTransition } from "react";
import { Check, X, Calendar } from "lucide-react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

import { updateTaskField } from "@/app/helpdesk/change-requests/actions";
import { supabasePlatform } from "@/lib/supabasePlatformClient";

/* ---------------------------------------------------------
   LOCAL FIELD TYPE (DO NOT IMPORT FROM SERVER ACTIONS)
--------------------------------------------------------- */
type TaskEditableField =
  | "assignedTo"
  | "startDate"
  | "endDate"
  | "outageExpected"
  | "description"
  | "implementationPlan"
  | "preTestPlan"
  | "postTestPlan"
  | "backoutPlan";

type Profile = {
  id: string;
  full_name: string | null;
  email: string | null;
};

export default function InlineField({
  label,
  value,
  field,
  taskId,
}: {
  label: string;
  value: any;
  field: TaskEditableField;
  taskId: string;
}) {
  const supabase = supabasePlatform;

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<any>(value ?? null);
  const [users, setUsers] = useState<Profile[]>([]);
  const [resolvedUser, setResolvedUser] = useState<Profile | null>(null);
  const [isPending, startTransition] = useTransition();

  /* ---------------------------------------------------------
     LOAD USERS FOR ASSIGNMENT
  --------------------------------------------------------- */
  useEffect(() => {
    if (editing && field === "assignedTo") {
      supabase
        .from("profiles")
        .select("id, full_name, email")
        .order("full_name")
        .then(({ data }) => setUsers(data ?? []));
    }
  }, [editing, field, supabase]);

  /* ---------------------------------------------------------
     RESOLVE ASSIGNED USER FOR DISPLAY
  --------------------------------------------------------- */
  useEffect(() => {
    if (field !== "assignedTo") return;

    // Joined object case
    if (value && typeof value === "object" && value.id) {
      setResolvedUser(value);
      return;
    }

    // UUID case
    if (typeof value === "string") {
      supabase
        .from("profiles")
        .select("id, full_name, email")
        .eq("id", value)
        .single()
        .then(({ data }) => setResolvedUser(data ?? null));
    } else {
      setResolvedUser(null);
    }
  }, [value, field, supabase]);

  /* ---------------------------------------------------------
     SAVE
  --------------------------------------------------------- */
  const save = () => {
    startTransition(async () => {
      await updateTaskField({
        taskId,
        field,
        value: draft,
      });
      setEditing(false);
    });
  };

  /* ---------------------------------------------------------
     DISPLAY VALUE
  --------------------------------------------------------- */
  const displayValue = (() => {
    if (!value && field !== "outageExpected") return "—";

    if (field === "assignedTo") {
      return (
        resolvedUser?.full_name ||
        resolvedUser?.email ||
        "Unassigned"
      );
    }

    if (field === "outageExpected") return value ? "Yes" : "No";

    if (field === "startDate" || field === "endDate") {
      return new Date(value).toLocaleString();
    }

    return value;
  })();

  /* ---------------------------------------------------------
     RENDER
  --------------------------------------------------------- */
  return (
    <div className="space-y-1">
      <label className="text-xs text-slate-400">{label}</label>

      {!editing ? (
        <div
          onClick={() => setEditing(true)}
          className="flex items-center gap-2 cursor-pointer rounded
            border border-slate-700 bg-slate-900/40 px-3 py-2
            text-sm hover:bg-slate-800"
        >
          {(field === "startDate" || field === "endDate") && (
            <Calendar size={14} className="text-slate-400" />
          )}
          {displayValue}
        </div>
      ) : (
        <div className="flex gap-2 items-start">
          {field === "assignedTo" ? (
            <select
              className="flex-1 rounded border border-slate-700
                bg-slate-900 px-2 py-1 text-sm"
              value={draft ?? ""}
              onChange={(e) => setDraft(e.target.value || null)}
            >
              <option value="">Unassigned</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.full_name || u.email}
                </option>
              ))}
            </select>
          ) : field === "startDate" || field === "endDate" ? (
            <DatePicker
              selected={draft ? new Date(draft) : null}
              onChange={(date) =>
                setDraft(date ? date.toISOString() : null)
              }
              showTimeSelect
              timeIntervals={15}
              dateFormat="MMM d, yyyy h:mm aa"
              className="w-full rounded border border-slate-700
                bg-slate-900 px-2 py-1 text-sm text-white"
              calendarClassName="!bg-slate-900 !text-white"
              popperClassName="z-50"
            />
          ) : field === "outageExpected" ? (
            <select
              className="flex-1 rounded border border-slate-700
                bg-slate-900 px-2 py-1 text-sm"
              value={draft ? "true" : "false"}
              onChange={(e) =>
                setDraft(e.target.value === "true")
              }
            >
              <option value="false">No</option>
              <option value="true">Yes</option>
            </select>
          ) : field.endsWith("Plan") || field === "description" ? (
            <textarea
              className="flex-1 rounded border border-slate-700
                bg-slate-900 px-2 py-1 text-sm"
              rows={3}
              value={draft ?? ""}
              onChange={(e) => setDraft(e.target.value)}
            />
          ) : (
            <input
              type="text"
              className="flex-1 rounded border border-slate-700
                bg-slate-900 px-2 py-1 text-sm"
              value={draft ?? ""}
              onChange={(e) => setDraft(e.target.value)}
            />
          )}

          <button onClick={save} disabled={isPending}>
            <Check size={16} />
          </button>
          <button onClick={() => setEditing(false)}>
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
