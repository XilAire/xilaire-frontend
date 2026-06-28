export default function ExecutionRulesTable({
  rules,
}: {
  rules: any[];
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-slate-900 p-6 lg:col-span-2">
      <h3 className="mb-4 text-lg font-medium text-slate-100">
        Execution Rules
      </h3>

      <table className="w-full text-sm">
        <thead className="border-b border-white/10 text-slate-400">
          <tr>
            <th className="pb-2 text-left">Rule</th>
            <th className="pb-2 text-left">Value</th>
            <th className="pb-2 text-left">Qty</th>
          </tr>
        </thead>

        <tbody>
          {rules.map((r) => (
            <tr key={r.id} className="border-b border-white/5">
              <td className="py-2 capitalize text-slate-200">
                {r.rule_type.replace("_", " ").toLowerCase()}
              </td>
              <td className="py-2 text-slate-300">
                {r.value_pct ? `${r.value_pct}%` : "—"}
              </td>
              <td className="py-2 text-slate-300">
                {r.quantity_pct ? `${r.quantity_pct}%` : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
