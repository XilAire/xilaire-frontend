export const metadata = {
  title: "Settings | XilAire Platform",
};

export default function SettingsPage() {
  return (
    <div className="space-y-8">
      {/* HEADER */}
      <header>
        <h1 className="text-2xl font-semibold text-slate-50">
          Settings
        </h1>
        <p className="text-sm text-slate-400">
          Workspace defaults, notification rules, and platform integrations.
        </p>
      </header>

      {/* WORKSPACE DEFAULTS */}
      <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 space-y-4">
        <h2 className="text-sm font-semibold text-slate-100">
          Workspace Defaults
        </h2>
        <p className="text-sm text-slate-400">
          Organization-wide configuration applied to bots, tickets, and automation behavior.
        </p>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Primary Bot</span>
            <span className="text-slate-200">RevBot</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Default Timezone</span>
            <span className="text-slate-200">America/New_York</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Ticket Auto-Assignment</span>
            <span className="text-slate-200">Enabled</span>
          </div>
        </div>
      </section>

      {/* NOTIFICATIONS */}
      <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 space-y-4">
        <h2 className="text-sm font-semibold text-slate-100">
          Notifications
        </h2>
        <p className="text-sm text-slate-400">
          Configure how and where the platform sends alerts and system notifications.
        </p>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Email Alerts</span>
            <span className="text-slate-200">Enabled</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Microsoft Teams</span>
            <span className="text-slate-400 italic">Not configured</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Failure Escalation</span>
            <span className="text-slate-200">Admins only</span>
          </div>
        </div>
      </section>

      {/* INTEGRATIONS */}
      <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 space-y-4">
        <h2 className="text-sm font-semibold text-slate-100">
          Integrations & API Access
        </h2>
        <p className="text-sm text-slate-400">
          Manage API keys, bot tokens, and third-party system integrations.
        </p>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Active API Keys</span>
            <span className="text-slate-200">2 keys</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Bot Tokens</span>
            <span className="text-slate-200">Managed by system</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">External Webhooks</span>
            <span className="text-slate-400 italic">None configured</span>
          </div>
        </div>
      </section>

      {/* AUDIT & GOVERNANCE */}
      <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 space-y-4">
        <h2 className="text-sm font-semibold text-slate-100">
          Audit & Governance
        </h2>
        <p className="text-sm text-slate-400">
          Visibility and control over administrative actions and compliance settings.
        </p>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Admin Activity Logging</span>
            <span className="text-emerald-400">Enabled</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Audit Log Retention</span>
            <span className="text-slate-200">365 days</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Critical Action Approval</span>
            <span className="text-slate-400 italic">Planned</span>
          </div>
        </div>
      </section>
    </div>
  );
}