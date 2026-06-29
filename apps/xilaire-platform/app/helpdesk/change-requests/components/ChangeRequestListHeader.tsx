export default function ChangeRequestListHeader() {
  return (
    <div
      className="grid grid-cols-[1fr,150px,150px,180px] px-6 py-3 
      border-b border-slate-200 dark:border-slate-800 
      bg-slate-50 dark:bg-slate-900 text-xs font-semibold 
      text-slate-500 dark:text-slate-400 uppercase tracking-wide"
    >
      <div>Change Request</div>
      <div className="text-center">Type</div>
      <div className="text-center">Status</div>
      <div className="text-right">Created</div>
    </div>
  );
}
