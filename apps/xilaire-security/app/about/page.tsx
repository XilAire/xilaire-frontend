// apps/xilaire-security/app/about/page.tsx

import Link from "next/link";

export default function AboutPage() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-10 space-y-10">
      {/* Hero / intro */}
      <section className="space-y-4 max-w-3xl">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-blue-900/70">
          About XilAire Security
        </p>
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-[#0a233f]">
          Training built for Florida security professionals
        </h1>
        <p className="text-sm md:text-base text-slate-700 leading-relaxed">
          XilAire Security was created to make it easier for working adults to
          complete their Florida Class D and Class G security officer training.
          Our online platform lets you study on your schedule while still
          meeting state-aligned classroom and documentation requirements.
        </p>
      </section>

      {/* 3-column highlights */}
      <section className="grid gap-6 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-[#0a233f]">
            State-aligned curriculum
          </h2>
          <p className="mt-2 text-sm text-slate-700">
            Courses are organized around Florida FDACS requirements for Class D
            and Class G licenses, covering legal standards, use of force,
            report-writing, professionalism, and firearms safety where
            applicable.
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-[#0a233f]">
            Built for busy adults
          </h2>
          <p className="mt-2 text-sm text-slate-700">
            Self-paced modules, progress tracking, and 24/7 access let you work
            around family and job schedules instead of trying to squeeze
            everything into a traditional classroom timetable.
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-[#0a233f]">
            Clear next steps
          </h2>
          <p className="mt-2 text-sm text-slate-700">
            At the end of each course you receive documentation of completion
            plus guidance on fingerprinting, application submission, and other
            steps you&apos;ll need to complete with FDACS.
          </p>
        </div>
      </section>

      {/* Instructor / school section */}
      <section className="grid gap-8 md:grid-cols-[1.7fr,1.3fr] items-start">
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-[#0a233f]">
            Instructors &amp; school leadership
          </h2>
          <p className="text-sm md:text-base text-slate-700">
            XilAire Security partners with experienced Florida security
            instructors and licensed Class K firearms instructors to deliver the
            classroom and live-fire components required for Class G training.
          </p>
          <p className="text-sm md:text-base text-slate-700">
            Our focus is on practical, real-world training that prepares you for
            actual work in the field while maintaining compliance with state
            training standards. You&apos;ll see clear expectations, structured
            modules, and checkpoints that keep you on track.
          </p>
        </div>

        <aside className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-700">
          <h3 className="text-base font-semibold text-[#0a233f]">
            School details
          </h3>
          <p>Location: South Florida (online training platform)</p>
          <p>
            Programs: Class D 40-hour, Class G 28-hour, annual refresher
            courses.
          </p>
          <p>
            Support: Online support for technical issues and course access
            during business hours.
          </p>
          <p className="text-[11px] text-slate-500">
            Licensing note: XilAire Security provides training and documentation
            of completion. Licenses are granted solely by Florida FDACS once all
            requirements are met.
          </p>
        </aside>
      </section>

      {/* CTA */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-base md:text-lg font-semibold text-[#0a233f]">
            Ready to start your Class D or Class G training?
          </h2>
          <p className="text-sm text-slate-700">
            Browse the course catalog or create your student account to begin.
          </p>
        </div>
        <div className="flex flex-wrap gap-3 text-sm">
          <Link
            href="/courses/catalog"
            className="inline-flex items-center justify-center rounded-md bg-[#0a233f] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0f315c]"
          >
            View course catalog
          </Link>
          <Link
            href="/auth/signin"
            className="inline-flex items-center justify-center rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-100"
          >
            Create account / Sign in
          </Link>
        </div>
      </section>
    </main>
  );
}
