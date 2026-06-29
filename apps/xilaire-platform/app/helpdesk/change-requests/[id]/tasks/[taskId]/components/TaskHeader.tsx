"use client";

export default function TaskHeader({ task }: { task: any }) {
  return (
    <div>
      <h1 className="text-2xl font-semibold text-white">
        {task.title}
      </h1>

      {task.description && (
        <p className="mt-1 text-sm text-slate-400">
          {task.description}
        </p>
      )}
    </div>
  );
}
