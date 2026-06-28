import { sendManualDiscordMessage } from "./actions";

const DISCORD_CHANNELS = [
  { label: "q-n-a", value: "1090305629974958151" },
  { label: "read-me-first", value: "925605160548450304" },
  { label: "introduction", value: "925023766755569724" },
  { label: "testimonials", value: "1148240301278896288" },
  { label: "gains", value: "925603320121417859" },
  { label: "announcements", value: "925024057764761600" },
  { label: "chat", value: "1072970073674883205" },
  { label: "earnings", value: "927275236041310218" },
  { label: "news", value: "927275590904586340" },
  { label: "alerts", value: "1077289389274714142" },
  { label: "option-scalps-swings-leaps-watchlist", value: "1076591942957269074" },
  { label: "scalps-swings-leaps-watchlist", value: "925026057877336095" },
  { label: "bot-commands", value: "1148365441287340052" },
  { label: "commands", value: "1148365704790278264" },
  { label: "high-risk-play", value: "1299793932867076177" },
  { label: "small-cap-challenge", value: "1086646963463786496" },
  { label: "stocks", value: "1339691586728230932" },
  { label: "think-or-swim-training", value: "1077342952067707091" },
  { label: "stock-training", value: "1077342997043232778" },
  { label: "options-training", value: "1077343224433225800" },
  { label: "technical-analysis-training", value: "1299181068078813245" },
  { label: "fundamental-analysis-training", value: "1299191484083601488" },
  { label: "chart-training", value: "1078422158214176778" },
  { label: "futures-training", value: "1077343277528924291" },
];

export default async function ManualDiscordPage() {
  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-100">
          Manual Discord Message
        </h1>
        <p className="text-sm text-slate-400">
          Send a manual CASE Trades message to one or more Discord channels.
        </p>
      </div>

      <form
        action={sendManualDiscordMessage}
        className="space-y-6 rounded-xl border border-white/10 bg-slate-900/80 p-6"
      >
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-300">
            Channels
          </label>

          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            {DISCORD_CHANNELS.map((channel) => (
              <label
                key={channel.value}
                className="flex items-center gap-2 rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm text-slate-300"
              >
                <input
                  type="checkbox"
                  name="channelIds"
                  value={channel.value}
                  className="h-4 w-4"
                />
                <span>#{channel.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-300">
            Message
          </label>
          <textarea
            name="message"
            required
            rows={8}
            placeholder="Type your Discord message here..."
            className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            className="rounded-lg bg-emerald-600 px-5 py-2 text-sm font-medium text-white hover:bg-emerald-500"
          >
            Send to Discord
          </button>
        </div>
      </form>
    </div>
  );
}
