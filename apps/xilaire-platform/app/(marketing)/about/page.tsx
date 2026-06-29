export const metadata = {
  title: "About | XilAire Technologies",
  description:
    "Learn about XilAire Technologies—our mission, team, and commitment to delivering reliable managed IT, cloud infrastructure, security, and automation solutions.",
};

export default function AboutPage() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16">
      <h1 className="mb-4 text-3xl font-bold text-slate-900">About XilAire</h1>

      <p className="mb-6 max-w-3xl text-slate-600">
        XilAire Technologies was built for teams that want predictable IT,
        strong security, and automation that actually ties everything together.
        We combine cloud, managed services, and AI into a single operating
        platform for your business.
      </p>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">Who we serve</h2>
          <p className="mt-2 text-sm text-slate-600">
            Growing businesses, distributed teams, and organizations that need
            enterprise-grade reliability without enterprise overhead.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">How we work</h2>
          <p className="mt-2 text-sm text-slate-600">
            Clear SLAs, transparent reporting, and a platform-first approach so
            you can always see what&apos;s happening in your environment.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">Why XilAire</h2>
          <p className="mt-2 text-sm text-slate-600">
            Deep Microsoft 365, cloud, and automation experience, plus a roadmap
            that keeps layering new AI capabilities into your stack.
          </p>
        </div>
      </div>
    </section>
  );
}
