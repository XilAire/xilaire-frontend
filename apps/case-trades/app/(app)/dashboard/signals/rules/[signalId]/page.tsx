type RulesPageProps = {
  params: {
    signalId: string;
  };
};

export default function SignalRulesPage({ params }: RulesPageProps) {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-slate-100">
          Signal Execution Rules
        </h1>
        <p className="text-sm text-slate-400">
          Execution rules for signal {params.signalId}
        </p>
      </div>

      <div className="rounded-xl border border-white/10 bg-slate-900/80 p-6 text-sm text-slate-300">
        Execution rules page placeholder.
      </div>
    </div>
  );
}