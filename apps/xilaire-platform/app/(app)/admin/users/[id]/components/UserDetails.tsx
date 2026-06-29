"use client";

interface Props {
  userId: string;
}

export default function UserDetails({ userId }: Props) {
  return (
    <div className="w-full bg-slate-900 border border-slate-700 rounded-md p-6">
      <h2 className="mb-4 text-sm font-semibold text-slate-100">
        User Details
      </h2>

      <div className="grid grid-cols-1 gap-6 text-sm md:grid-cols-2">
        <div className="space-y-1">
          <p className="text-slate-400">User ID</p>
          <p className="font-mono text-slate-100">{userId}</p>
        </div>

        <div className="space-y-1">
          <p className="text-slate-400">Status</p>
          <p className="font-medium text-emerald-400">Active</p>
        </div>

        <div className="space-y-1">
          <p className="text-slate-400">Role</p>
          <p className="text-slate-100">User</p>
        </div>

        <div className="space-y-1">
          <p className="text-slate-400">Organization</p>
          <p className="text-slate-100">XilAire Technologies</p>
        </div>

        <div className="space-y-1">
          <p className="text-slate-400">Created</p>
          <p className="text-slate-100">Dec 3, 2025, 3:09 PM</p>
        </div>

        <div className="space-y-1">
          <p className="text-slate-400">Last Login</p>
          <p className="text-slate-100">Dec 27, 2025, 9:12 AM</p>
        </div>
      </div>
    </div>
  );
}