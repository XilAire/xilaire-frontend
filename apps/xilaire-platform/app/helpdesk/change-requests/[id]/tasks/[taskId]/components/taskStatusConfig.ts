export const TASK_STATUS_TRANSITIONS: Record<string, string[]> = {
  open: ["in_progress", "blocked"],
  in_progress: ["completed", "blocked"],
  blocked: ["open"],
  completed: [],
};

export const TASK_STATUS_LABELS: Record<string, string> = {
  open: "Open",
  in_progress: "In Progress",
  completed: "Completed",
  blocked: "Blocked",
};
