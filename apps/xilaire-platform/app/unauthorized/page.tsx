import Link from "next/link";

export const dynamic = "force-dynamic";

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex min-h-screen max-w-3xl items-center justify-center px-6 py-16">
        <div className="w-full rounded-2xl border border-slate-800 bg-slate-900 p-8 shadow-2xl">
          <div className="space-y-4">
            <p className="text-sm uppercase tracking-[0.2em] text-rose-400">
              Access Restricted
            </p>

            <h1 className="text-3xl font-semibold text-slate-100">
              You do not have permission to access this page
            </h1>

            <p className="text-base leading-7 text-slate-400">
              Your account is signed in, but it does not currently have access
              to the destination you were trying to reach. This can happen if
              your role, account type, vendor assignment, or org context does
              not match the page requirements.
            </p>
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center rounded-xl border border-cyan-700 bg-cyan-950 px-4 py-3 text-sm font-medium text-cyan-200 transition hover:bg-cyan-900"
            >
              Go to Dashboard
            </Link>

            <Link
              href="/auth/signin"
              className="inline-flex items-center justify-center rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm font-medium text-slate-200 transition hover:bg-slate-800"
            >
              Return to Sign In
            </Link>
          </div>

          <div className="mt-8 rounded-xl border border-slate-800 bg-slate-950 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">
              Common causes
            </p>

            <div className="mt-3 space-y-2 text-sm text-slate-400">
              <p>• Your profile is missing org_id.</p>
              <p>• Your role does not match the page access policy.</p>
              <p>• Your vendor login is not linked to infrastructure_vendors.email.</p>
              <p>• Your account is being routed to a page outside its allowed scope.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}