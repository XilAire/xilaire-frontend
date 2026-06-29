"use client";

interface DetailsLeftProps {
  change: any;
}

export default function DetailsLeft({ change }: DetailsLeftProps) {
  const {
    title,
    description,
    implementation_plan,
    rollback_plan,
  } = change;

  return (
    <div className="space-y-6">
      {/* SUMMARY */}
      <CardBlock title="Summary">
        <p className="text-slate-300">{title || "No summary provided."}</p>
      </CardBlock>

      {/* DESCRIPTION */}
      <CardBlock title="Description">
        <p className="text-slate-300 whitespace-pre-line">
          {description || "No description provided."}
        </p>
      </CardBlock>

      {/* IMPLEMENTATION PLAN */}
      <CardBlock title="Implementation Plan">
        <p className="text-slate-300 whitespace-pre-line">
          {implementation_plan || "No implementation plan provided."}
        </p>
      </CardBlock>

      {/* ROLLBACK PLAN */}
      <CardBlock title="Rollback Plan">
        <p className="text-slate-300 whitespace-pre-line">
          {rollback_plan || "No rollback plan provided."}
        </p>
      </CardBlock>
    </div>
  );
}

/* --------------------------------------------------------
   Reusable Card Block Component
-------------------------------------------------------- */
function CardBlock({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-white mb-3">{title}</h2>
      {children}
    </div>
  );
}
