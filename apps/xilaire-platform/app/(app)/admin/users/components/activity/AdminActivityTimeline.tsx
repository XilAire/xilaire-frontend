"use client";

import AdminActivityItem from "./AdminActivityItem";
import type { AdminActivity } from "./adminActivity.types";

interface Props {
  activities?: AdminActivity[]; // ✅ MATCH MODAL PROP
}

export default function AdminActivityTimeline({
  activities = [],
}: Props) {
  // ✅ ALWAYS an array
  if (activities.length === 0) {
    return (
      <div className="text-sm text-muted-foreground">
        No activity recorded yet.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {activities.map((activity) => (
        <AdminActivityItem
          key={activity.id}
          activity={activity}
        />
      ))}
    </div>
  );
}
