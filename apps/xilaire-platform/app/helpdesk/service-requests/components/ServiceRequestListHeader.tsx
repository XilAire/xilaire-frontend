"use client";

interface Props {
  allSelected?: boolean;
  someSelected?: boolean;
  onToggleAll?: () => void;
}

export default function ServiceRequestListHeader({
  allSelected = false,
  someSelected = false,
  onToggleAll,
}: Props) {
  return (
    <div
      className="grid grid-cols-12 gap-4 px-6 py-3
                 border-b border-slate-800
                 text-xs uppercase tracking-wide text-slate-400"
    >
      {/* SELECT ALL */}
      <div className="col-span-1 flex items-center">
        <input
          type="checkbox"
          checked={allSelected}
          ref={(el) => {
            if (el) el.indeterminate = someSelected && !allSelected;
          }}
          onChange={onToggleAll}
          className="h-4 w-4 rounded border-slate-600
                     bg-slate-900 text-blue-500"
        />
      </div>

      <div className="col-span-4">Request</div>
      <div className="col-span-2">Priority</div>
      <div className="col-span-2">Status</div>
      <div className="col-span-2">Actions</div>
      <div className="col-span-1 text-right">Created</div>
    </div>
  );
}
