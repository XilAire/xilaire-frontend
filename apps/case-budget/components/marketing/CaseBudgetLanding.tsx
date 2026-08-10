export default function CaseBudgetLanding() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-6 py-10 sm:px-8 lg:px-12">
        <header className="flex items-center justify-between border-b border-white/10 pb-6">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-400">
              XilAire Technologies
            </p>

            <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
              CASE Budget
            </h1>
          </div>

          <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-300">
            Development
          </div>
        </header>

        <section className="flex flex-1 items-center py-16">
          <div className="grid w-full gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-400">
                Personal finance, simplified
              </p>

              <h2 className="mt-4 max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
                Manage your money. Build your future.
              </h2>

              <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
                Track spending, plan budgets, pay down debt, grow your savings,
                monitor investments, and understand your complete financial
                picture from one place.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  className="rounded-xl bg-emerald-500 px-6 py-3 font-semibold text-slate-950 transition hover:bg-emerald-400"
                >
                  Start planning
                </button>

                <button
                  type="button"
                  className="rounded-xl border border-white/10 bg-white/5 px-6 py-3 font-semibold text-white transition hover:bg-white/10"
                >
                  View roadmap
                </button>
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl shadow-black/20 backdrop-blur">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm text-slate-400">Monthly budget</p>
                  <p className="mt-1 text-3xl font-bold">$6,450.00</p>
                </div>

                <div className="shrink-0 rounded-full bg-emerald-500/15 px-3 py-1 text-sm font-semibold text-emerald-300">
                  On track
                </div>
              </div>

              <div className="mt-8 space-y-5">
                <div>
                  <div className="mb-2 flex items-center justify-between gap-4 text-sm">
                    <span className="text-slate-300">Planned</span>
                    <span className="font-medium">$5,900.00</span>
                  </div>

                  <div className="h-2 overflow-hidden rounded-full bg-white/10">
                    <div className="h-full w-[91%] rounded-full bg-emerald-500" />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                    <p className="text-sm text-slate-400">Available to plan</p>

                    <p className="mt-2 text-2xl font-bold text-emerald-300">
                      $550.00
                    </p>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                    <p className="text-sm text-slate-400">Bills due</p>
                    <p className="mt-2 text-2xl font-bold">4</p>
                  </div>
                </div>

                <div className="rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4">
                  <p className="text-sm font-semibold text-amber-200">
                    Upcoming reminder
                  </p>

                  <p className="mt-1 text-sm text-amber-100/80">
                    Electric bill is due in 3 days.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}