"use client";

export default function TaskDetailsRight({ task }: { task: any }) {
  return (
    <div className="rounded-lg border border-slate-700 bg-slate-900/50 p-4 space-y-4">
      <Section title="Implementation Plan" text={task.implementation_plan} />
      <Section title="Pre-Test Plan" text={task.pre_test_plan} />
      <Section title="Post-Test Plan" text={task.post_test_plan} />
      <Section title="Backout Plan" text={task.backout_plan} />
    </div>
  );
}

function Section({ title, text }: { title: string; text?: string }) {
  return (
    <div>
      <p className="text-xs text-slate-400">{title}</p>
      <p className="text-sm text-slate-200 whitespace-pre-wrap">
        {text || "—"}
      </p>
    </div>
  );
}
