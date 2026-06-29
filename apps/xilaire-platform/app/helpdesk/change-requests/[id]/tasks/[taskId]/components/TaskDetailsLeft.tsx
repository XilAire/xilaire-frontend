import InlineField from "./InlineField";

export default function TaskDetailsLeft({
  task,
}: {
  task: any;
}) {
  return (
    <div className="space-y-4 rounded-xl border border-slate-700 bg-slate-900/40 p-4">

      {/* ASSIGNED TO (UUID-based, saves correctly) */}
      <InlineField
        label="Assigned To"
        field="assignedTo"
        value={task.assigned_to}
        taskId={task.id}
      />

      {/* START DATE */}
      <InlineField
        label="Start Date"
        field="startDate"
        value={task.start_date}
        taskId={task.id}
      />

      {/* END DATE */}
      <InlineField
        label="End Date"
        field="endDate"
        value={task.end_date}
        taskId={task.id}
      />

      {/* IMPLEMENTATION PLAN */}
      <InlineField
        label="Implementation Plan"
        field="implementationPlan"
        value={task.implementation_plan}
        taskId={task.id}
      />

      {/* PRE-TEST PLAN */}
      <InlineField
        label="Pre-Test Plan"
        field="preTestPlan"
        value={task.pre_test_plan}
        taskId={task.id}
      />

      {/* POST-TEST PLAN */}
      <InlineField
        label="Post-Test Plan"
        field="postTestPlan"
        value={task.post_test_plan}
        taskId={task.id}
      />

      {/* BACKOUT PLAN */}
      <InlineField
        label="Backout Plan"
        field="backoutPlan"
        value={task.backout_plan}
        taskId={task.id}
      />

    </div>
  );
}
