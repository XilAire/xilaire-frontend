import Link from "next/link";

export default function HomePage() {
  return (
    <main className="w-full max-w-6xl mx-auto px-6 py-12 space-y-16">
      {/* HERO */}
      <section className="grid gap-10 md:grid-cols-2 items-center">
        <div className="space-y-6">
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-900/70">
            Florida State-Aligned Security Officer Training
          </p>

          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-[#0a233f]">
            Get Certified.
            <span className="block text-[#D4A017]">
              Train. Certify. Protect.
            </span>
          </h1>

          <p className="text-base md:text-lg text-slate-700 leading-relaxed">
            XilAire Security offers modern, fully online Class D and Class G
            security officer training built for busy adults. Learn at your
            own pace, track your progress, and generate certificates ready
            for your Florida license applications.
          </p>

          <div className="flex flex-wrap gap-4">
            <Link
              href="/auth/signin"
              className="inline-flex items-center justify-center rounded-md bg-[#0a233f] px-5 py-2.5 text-sm font-semibold text-white shadow hover:bg-[#0f315c]"
            >
              Start my training
            </Link>

            <Link
              href="/courses/catalog"   // ✅ Updated public courses link
              className="inline-flex items-center justify-center rounded-md border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-100"
            >
              View all courses
            </Link>
          </div>

          <p className="text-xs text-slate-500">
            100% online course modules. In-person firearms qualification for
            Class G is completed with a licensed K-instructor.
          </p>
        </div>

        {/* Right-side info card */}
        <div className="space-y-4 rounded-2xl bg-white shadow-sm border border-slate-100 p-6">
          <h2 className="text-lg font-semibold text-[#0a233f]">
            Learn on your schedule
          </h2>
          <ul className="space-y-2 text-sm text-slate-700">
            <li>✔ Self-paced, online D &amp; G curriculum</li>
            <li>✔ Progress tracking and certificates built in</li>
            <li>✔ Mobile-friendly player for on-the-go study</li>
            <li>✔ Clear next steps for FDACS licensing</li>
          </ul>

          <div className="mt-4 grid grid-cols-3 gap-3 text-center text-xs">
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="uppercase tracking-wide text-slate-500">Courses</p>
              <p className="mt-1 text-base font-bold text-[#0a233f]">
                D • G • Refreshers
              </p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="uppercase tracking-wide text-slate-500">Format</p>
              <p className="mt-1 text-base font-bold text-[#0a233f]">
                100% Online*
              </p>
              <p className="mt-1 text-[10px] text-slate-500">
                *G includes in-person live-fire
              </p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="uppercase tracking-wide text-slate-500">Access</p>
              <p className="mt-1 text-base font-bold text-[#0a233f]">24/7</p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
