"use client";

interface SRHeaderProps {
  request: any;
}

export default function SRHeader({ request }: SRHeaderProps) {
  return (
    <div className="space-y-1">
      <h1 className="text-2xl font-semibold text-white">
        {request.title}
      </h1>

      <p className="text-sm text-slate-400">
        Requested by {request.requesterName}
      </p>
    </div>
  );
}
