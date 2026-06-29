import Link from "next/link";

export const dynamic = "force-dynamic";

type LayoutContext = {
  children: React.ReactNode;
  params: Promise<{
    id: string;
  }>;
};

const caseTabs = [
  {
    label: "Overview",
    hrefSuffix: "",
  },
  {
    label: "Summary",
    hrefSuffix: "/summary",
  },
  {
    label: "Activity",
    hrefSuffix: "/activity",
  },
  {
    label: "Search",
    hrefSuffix: "/search",
  },
  {
    label: "Holds",
    hrefSuffix: "/holds",
  },
  {
    label: "Exports",
    hrefSuffix: "/exports",
  },
];

export default async function VaultCaseLayout({
  children,
  params,
}: LayoutContext) {
  const { id: caseId } = await params;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="border-b border-zinc-800 bg-zinc-950/95 px-6 py-3">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <Link href="/vault/cases" className="text-zinc-400 hover:text-zinc-100">
              Cases
            </Link>
            <span className="text-zinc-700">/</span>
            <span className="font-medium text-zinc-200">Case Workspace</span>
          </div>

          <nav className="flex flex-wrap gap-2">
            {caseTabs.map((tab) => (
              <Link
                key={tab.hrefSuffix || "overview"}
                href={`/vault/cases/${caseId}${tab.hrefSuffix}`}
                className="rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-sm text-zinc-300 transition hover:border-blue-500/40 hover:bg-blue-500/10 hover:text-blue-200"
              >
                {tab.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>

      {children}
    </div>
  );
}