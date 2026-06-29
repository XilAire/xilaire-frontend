import Link from "next/link";

type PortalPageShellProps = {
  eyebrow: string;
  title: string;
  description: string;
  route: string;
  status?: "Ready" | "Scaffolded" | "In Progress";
  actions?: Array<{
    label: string;
    href: string;
  }>;
  sections?: Array<{
    title: string;
    description: string;
  }>;
};

export default function PortalPageShell({
  eyebrow,
  title,
  description,
  route,
  status = "Scaffolded",
  actions = [],
  sections = [],
}: PortalPageShellProps) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-8 rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-sm">
          <p className="mb-2 text-xs uppercase tracking-[0.2em] text-sky-400">
            {eyebrow}
          </p>

          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-white">
                {title}
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">
                {description}
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-3">
              <span className="rounded-full border border-sky-500/30 bg-sky-500/10 px-3 py-1 text-xs font-medium text-sky-300">
                {status}
              </span>
            </div>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">
                Route
              </p>
              <p className="mt-2 break-all text-sm text-slate-200">{route}</p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">
                Purpose
              </p>
              <p className="mt-2 text-sm text-slate-200">{description}</p>
            </div>
          </div>

          {actions.length > 0 && (
            <div className="mt-5 flex flex-wrap gap-3">
              {actions.map((action) => (
                <Link
                  key={`${action.href}-${action.label}`}
                  href={action.href}
                  className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-sm text-slate-100 transition hover:border-sky-500/40 hover:bg-slate-700"
                >
                  {action.label}
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          {sections.map((section) => (
            <div
              key={section.title}
              className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5"
            >
              <h2 className="text-base font-semibold text-white">
                {section.title}
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                {section.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}