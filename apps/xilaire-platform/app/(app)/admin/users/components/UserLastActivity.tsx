"use client";

import { formatDistanceToNow } from "date-fns";

interface Props {
  lastActivity?: string | null;
}

export default function UserLastActivity({ lastActivity }: Props) {
  if (!lastActivity) {
    return (
      <span className="text-xs text-muted-foreground italic">
        No activity yet
      </span>
    );
  }

  let formatted = "Unknown";

  try {
    formatted = formatDistanceToNow(new Date(lastActivity), {
      addSuffix: true,
    });
  } catch {
    // noop — fallback text already set
  }

  return (
    <span
      className="text-xs text-muted-foreground"
      title={new Date(lastActivity).toLocaleString()}
    >
      {formatted}
    </span>
  );
}
