export default function SignalSummaryCard({ signal }: { signal: any }) {
  return (
    <div className="rounded-xl border border-white/10 bg-slate-900 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-100">
            {signal.action} {signal.underlying}
          </h2>
          <p className="text-sm text-slate-400 capitalize">
            {signal.trade_style} • {signal.instrument_type}
          </p>
        </div>

        <div className="text-right">
          <div className="text-sm text-slate-400">Confidence</div>
          <div className="text-lg font-semibold text-emerald-400">
            {signal.confidence}%
          </div>
        </div>
      </div>
    </div>
  );
}
