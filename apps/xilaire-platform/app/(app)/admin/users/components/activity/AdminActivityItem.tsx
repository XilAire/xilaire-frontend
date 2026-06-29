import { ACTION_LABELS } from "./actionLabels";
import AdminActivityDiff from "./AdminActivityDiff";
import type { AdminAuditLog } from "./adminActivity.types";

interface Props {
  activity: AdminAuditLog;
}

/* ---------------------------------------------
   HELPERS
--------------------------------------------- */
function toDisplayString(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean")
    return String(value);
  if (typeof value === "object") return JSON.stringify(value);
  return "";
}

function titleCase(value: string) {
  return value.replace(/^\w/, (c) => c.toUpperCase());
}

function getHumanLabel(activity: AdminAuditLog) {
  const { action, old_value, new_value } = activity;

  const oldVal = toDisplayString(old_value).replace("_", " ");
  const newVal = toDisplayString(new_value).replace("_", " ");

  /* -------- ROLE CHANGES -------- */
  if (action === "role_change" && oldVal && newVal && oldVal !== newVal) {
    const direction =
      oldVal === "user" && newVal !== "user"
        ? "Promoted to"
        : newVal === "user"
        ? "Demoted to"
        : "Role changed to";

    return `${direction} ${titleCase(newVal)}`;
  }

  /* -------- STATUS CHANGES -------- */
  if (action === "status_change" && oldVal && newVal && oldVal !== newVal) {
    return `Status changed to ${titleCase(newVal)}`;
  }

  /* -------- FALLBACK -------- */
  return (
    ACTION_LABELS[action] ??
    action
      ?.split("_")
      .join(" ")
      .toLowerCase()
      .replace(/^\w/, (c) => c.toUpperCase()) ??
    "Activity"
  );
}

/* ---------------------------------------------
   COMPONENT
--------------------------------------------- */
export default function AdminActivityItem({ activity }: Props) {
  const label = getHumanLabel(activity);

  const timestamp = activity.created_at
    ? new Date(activity.created_at)
    : null;

  const formattedTime =
    timestamp && !isNaN(timestamp.getTime())
      ? timestamp.toLocaleString()
      : "Unknown time";

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-2">
      <div>
        <p className="text-sm font-semibold text-slate-900">
          {label}
        </p>
        <p className="text-xs text-slate-500">
          {formattedTime}
        </p>
      </div>

      {(activity.old_value !== null ||
        activity.new_value !== null) && (
        <AdminActivityDiff
          oldValue={activity.old_value}
          newValue={activity.new_value}
        />
      )}
    </div>
  );
}
