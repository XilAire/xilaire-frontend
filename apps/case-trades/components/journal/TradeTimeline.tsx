import {
  CheckCircle2,
  Circle,
  Clock,
  FileText,
  Sparkles,
  TrendingDown,
  TrendingUp,
} from "lucide-react";

export type TradeTimelineFill = {
  side: string | null;
  contracts: number | null;
  price: number | null;
  created_at: string | null;
};

export type TradeTimelineNotes = {
  notes?: string | null;
  setup?: string | null;
  mistakes?: string | null;
  tags?: string[] | null;
  emotion?: string | null;
  discipline_score?: number | string | null;
  updated_at?: string | null;
};

type TradeTimelineProps = {
  signalCreatedAt?: string | null;
  openedAt?: string | null;
  closedAt?: string | null;
  fills?: TradeTimelineFill[];
  notes?: TradeTimelineNotes | null;
  status?: string | null;
};

type TimelineEvent = {
  id: string;
  label: string;
  description: string;
  timestamp: string | null;
  type: "created" | "open" | "close" | "note" | "status";
  tone: "neutral" | "positive" | "negative" | "warning";
};

function formatDateTime(value: string | null | undefined) {
  if (!value) return "—";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatMoney(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) {
    return "—";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(Number(value));
}

function hasNotes(notes?: TradeTimelineNotes | null) {
  if (!notes) return false;

  return Boolean(
    notes.notes ||
      notes.setup ||
      notes.mistakes ||
      notes.emotion ||
      notes.discipline_score ||
      (Array.isArray(notes.tags) && notes.tags.length > 0)
  );
}

function getFillDescription(fill: TradeTimelineFill) {
  const side = String(fill.side ?? "").toUpperCase();
  const quantity = Number(fill.contracts ?? 0);
  const price = formatMoney(fill.price);

  if (side === "OPEN") {
    return `Opened ${quantity} contract${quantity === 1 ? "" : "s"} at ${price}.`;
  }

  if (side === "CLOSE") {
    return `Closed ${quantity} contract${quantity === 1 ? "" : "s"} at ${price}.`;
  }

  return `${side || "Fill"} ${quantity} contract${
    quantity === 1 ? "" : "s"
  } at ${price}.`;
}

function buildTimelineEvents({
  signalCreatedAt,
  openedAt,
  closedAt,
  fills,
  notes,
  status,
}: TradeTimelineProps): TimelineEvent[] {
  const events: TimelineEvent[] = [];

  if (signalCreatedAt) {
    events.push({
      id: "signal-created",
      label: "Signal Created",
      description: "The trade idea was created in CASE Signals.",
      timestamp: signalCreatedAt,
      type: "created",
      tone: "neutral",
    });
  }

  const sortedFills = [...(fills ?? [])].sort((a, b) => {
    const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
    const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;

    return aTime - bTime;
  });

  sortedFills.forEach((fill, index) => {
    const side = String(fill.side ?? "").toUpperCase();

    events.push({
      id: `fill-${index}-${fill.created_at ?? "unknown"}`,
      label: side === "OPEN" ? "Position Opened" : "Position Closed",
      description: getFillDescription(fill),
      timestamp: fill.created_at,
      type: side === "OPEN" ? "open" : "close",
      tone: side === "OPEN" ? "positive" : "warning",
    });
  });

  if (openedAt && !sortedFills.some((fill) => fill.created_at === openedAt)) {
    events.push({
      id: "opened-at",
      label: "Opened Timestamp",
      description: "Execution open timestamp recorded.",
      timestamp: openedAt,
      type: "open",
      tone: "positive",
    });
  }

  if (closedAt && !sortedFills.some((fill) => fill.created_at === closedAt)) {
    events.push({
      id: "closed-at",
      label: "Closed Timestamp",
      description: "Execution close timestamp recorded.",
      timestamp: closedAt,
      type: "close",
      tone: "warning",
    });
  }

  if (hasNotes(notes)) {
    events.push({
      id: "journal-notes",
      label: "Journal Notes Updated",
      description: "Setup, notes, mistakes, tags, emotion, or discipline score were saved.",
      timestamp: notes?.updated_at ?? null,
      type: "note",
      tone: "neutral",
    });
  }

  if (status) {
    events.push({
      id: "current-status",
      label: "Current Status",
      description: `Trade status is ${status}.`,
      timestamp: closedAt ?? openedAt ?? signalCreatedAt ?? null,
      type: "status",
      tone:
        String(status).toLowerCase() === "closed"
          ? "positive"
          : String(status).toLowerCase() === "expired"
            ? "negative"
            : "neutral",
    });
  }

  return events.sort((a, b) => {
    const aTime = a.timestamp ? new Date(a.timestamp).getTime() : 0;
    const bTime = b.timestamp ? new Date(b.timestamp).getTime() : 0;

    return aTime - bTime;
  });
}

function TimelineIcon({ event }: { event: TimelineEvent }) {
  const className =
    event.tone === "positive"
      ? "text-emerald-400"
      : event.tone === "negative"
        ? "text-red-400"
        : event.tone === "warning"
          ? "text-orange-400"
          : "text-slate-400";

  if (event.type === "open") {
    return <TrendingUp className={`h-4 w-4 ${className}`} />;
  }

  if (event.type === "close") {
    return <TrendingDown className={`h-4 w-4 ${className}`} />;
  }

  if (event.type === "note") {
    return <FileText className={`h-4 w-4 ${className}`} />;
  }

  if (event.type === "status") {
    return <CheckCircle2 className={`h-4 w-4 ${className}`} />;
  }

  return <Circle className={`h-4 w-4 ${className}`} />;
}

export default function TradeTimeline({
  signalCreatedAt,
  openedAt,
  closedAt,
  fills = [],
  notes = null,
  status = null,
}: TradeTimelineProps) {
  const events = buildTimelineEvents({
    signalCreatedAt,
    openedAt,
    closedAt,
    fills,
    notes,
    status,
  });

  return (
    <section className="rounded-xl border border-white/10 bg-slate-900/80 p-6">
      <div className="mb-6 flex items-start gap-3">
        <div className="rounded-xl bg-emerald-500/10 p-3 text-emerald-400">
          <Clock className="h-5 w-5" />
        </div>

        <div>
          <h2 className="text-lg font-semibold text-slate-100">
            Trade Timeline
          </h2>

          <p className="text-sm text-slate-400">
            Signal, fills, close events, notes, and status history for this
            trade.
          </p>
        </div>
      </div>

      {events.length === 0 ? (
        <div className="rounded-lg border border-white/10 bg-slate-950 p-4 text-sm text-slate-500">
          No timeline events found yet.
        </div>
      ) : (
        <div className="relative space-y-4">
          <div className="absolute left-5 top-2 h-[calc(100%-1rem)] w-px bg-white/10" />

          {events.map((event) => (
            <div key={event.id} className="relative flex gap-4">
              <div className="z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-slate-950">
                <TimelineIcon event={event} />
              </div>

              <div className="flex-1 rounded-xl border border-white/10 bg-slate-950 p-4">
                <div className="flex flex-col justify-between gap-2 md:flex-row md:items-start">
                  <div>
                    <h3 className="font-semibold text-slate-100">
                      {event.label}
                    </h3>

                    <p className="mt-1 text-sm text-slate-400">
                      {event.description}
                    </p>
                  </div>

                  <div className="text-xs text-slate-500">
                    {formatDateTime(event.timestamp)}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-5 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-4">
        <div className="flex items-start gap-3">
          <Sparkles className="mt-0.5 h-5 w-5 text-emerald-400" />

          <p className="text-sm leading-6 text-slate-300">
            Next phase: this timeline will include screenshots, AI reviews,
            rule triggers, partial scale-outs, and journal edit history.
          </p>
        </div>
      </div>
    </section>
  );
}