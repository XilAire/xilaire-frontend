export const CHANGE_STATUS_MAP: Record<
  string,
  { label: string; color: string }
> = {
  draft: {
    label: "Draft",
    color: "gray",
  },
  planned: {
    label: "Planning",
    color: "blue",
  },
  pending_approval: {
    label: "Pending Approval",
    color: "amber",
  },
  approved: {
    label: "Approved",
    color: "green",
  },
  scheduled: {
    label: "Scheduled",
    color: "purple",
  },
  in_progress: {
    label: "In Progress",
    color: "cyan",
  },
  completed: {
    label: "Completed",
    color: "emerald",
  },
  cancelled: {
    label: "Cancelled",
    color: "red",
  },
};
