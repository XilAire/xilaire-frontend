type AuditPageProps = {
  params: {
    signalId: string;
  };
};

export default function SignalAuditPage({ params }: AuditPageProps) {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-slate-100">
          Signal Audit
        </h1>
        <p className="text-sm text-slate-400">
          Audit trail for signal {params.signalId}
        </p>
      </div>

      <div className="rounded-xl border border-white/10 bg-slate-900/80 p-6 text-sm text-slate-300">
        Audit history page placeholder.
      </div>
    </div>
  );
}