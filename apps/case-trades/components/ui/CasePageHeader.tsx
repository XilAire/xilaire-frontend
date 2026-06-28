interface Props {
  title: string;
  subtitle?: string;
}

export default function CasePageHeader({ title, subtitle }: Props) {
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-semibold tracking-tight">
        {title}
      </h1>

      {subtitle && (
        <p className="mt-1 text-sm text-slate-500">
          {subtitle}
        </p>
      )}
    </div>
  );
}
