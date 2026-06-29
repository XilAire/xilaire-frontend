import Link from "next/link";
import { notFound } from "next/navigation";
import { cookies, headers } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type LayoutProps = {
  children: React.ReactNode;
  params: {
    id: string;
  };
};

type VaultMessageShellRow = {
  id: string;
  org_id: string;
  subject: string | null;
  sender_name: string | null;
  sender_email: string | null;
  received_at: string | null;
  has_attachments: boolean | null;
  attachment_count: number | null;
  on_hold: boolean | null;
  export_count: number | null;
};

function getSupabaseServerClient(
  cookieStore: Awaited<ReturnType<typeof cookies>>
) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL_PLATFORM;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY_PLATFORM;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing Supabase environment variables for platform.");
  }

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(_name: string, _value: string, _options: CookieOptions) {},
      remove(_name: string, _options: CookieOptions) {},
    },
  });
}

async function resolveOrgContext() {
  const cookieStore = await cookies();
  const supabase = getSupabaseServerClient(cookieStore);

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    notFound();
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("org_id")
    .eq("id", user.id)
    .maybeSingle<{ org_id: string | null }>();

  if (profileError || !profile?.org_id) {
    notFound();
  }

  return {
    supabase,
    orgId: profile.org_id,
  };
}

async function getMessageShell(messageId: string) {
  const { supabase, orgId } = await resolveOrgContext();

  const { data, error } = await supabase
    .from("vault_messages")
    .select(`
      id,
      org_id,
      subject,
      sender_name,
      sender_email,
      received_at,
      has_attachments,
      attachment_count,
      on_hold,
      export_count
    `)
    .eq("org_id", orgId)
    .eq("id", messageId)
    .maybeSingle<VaultMessageShellRow>();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    notFound();
  }

  const { count: occurrenceCount, error: occurrenceCountError } = await supabase
    .from("vault_message_occurrences")
    .select("id", { count: "exact", head: true })
    .eq("org_id", orgId)
    .eq("message_id", messageId);

  if (occurrenceCountError) {
    throw new Error(occurrenceCountError.message);
  }

  const { count: holdCount, error: holdCountError } = await supabase
    .from("vault_hold_messages")
    .select("id", { count: "exact", head: true })
    .eq("org_id", orgId)
    .eq("message_id", messageId);

  if (holdCountError) {
    throw new Error(holdCountError.message);
  }

  return {
    message: data,
    occurrenceCount: occurrenceCount ?? 0,
    holdCount: holdCount ?? 0,
  };
}

function formatDateTime(value?: string | null) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function StatPill({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string | number;
  tone?: "default" | "cyan" | "amber" | "green";
}) {
  const toneClass =
    tone === "cyan"
      ? "border-cyan-500/30 bg-cyan-500/10 text-cyan-200"
      : tone === "amber"
      ? "border-amber-500/30 bg-amber-500/10 text-amber-200"
      : tone === "green"
      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
      : "border-slate-700 bg-slate-900/70 text-slate-200";

  return (
    <div
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs ${toneClass}`}
    >
      <span className="uppercase tracking-[0.14em]">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}

function WorkspaceTab({
  href,
  label,
  count,
  active,
}: {
  href: string;
  label: string;
  count?: number;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={[
        "inline-flex items-center gap-2 rounded-2xl border px-4 py-2 text-sm font-medium transition",
        active
          ? "border-cyan-500/40 bg-cyan-500/10 text-cyan-200 shadow-[inset_0_0_0_1px_rgba(34,211,238,0.08)]"
          : "border-slate-700 bg-slate-900/70 text-slate-200 hover:border-cyan-500/30 hover:bg-slate-800 hover:text-white",
      ].join(" ")}
    >
      <span>{label}</span>
      {typeof count === "number" ? (
        <span
          className={[
            "inline-flex min-w-[1.5rem] items-center justify-center rounded-full px-2 py-0.5 text-xs",
            active
              ? "border border-cyan-400/30 bg-cyan-400/10 text-cyan-100"
              : "border border-slate-600 bg-slate-950/80 text-slate-300",
          ].join(" ")}
        >
          {count}
        </span>
      ) : null}
    </Link>
  );
}

function normalizePathname(value: string) {
  if (!value) return "";

  const withoutQuery = value.split("?")[0].split("#")[0].trim();
  if (!withoutQuery) return "";

  if (withoutQuery.length > 1 && withoutQuery.endsWith("/")) {
    return withoutQuery.slice(0, -1);
  }

  return withoutQuery;
}

function resolveCurrentPath(headerList: Awaited<ReturnType<typeof headers>>) {
  const candidates = [
    headerList.get("x-invoke-path"),
    headerList.get("x-matched-path"),
    headerList.get("next-url"),
    headerList.get("x-pathname"),
    headerList.get("x-url"),
  ];

  for (const candidate of candidates) {
    const normalized = normalizePathname(candidate || "");
    if (normalized) {
      return normalized;
    }
  }

  return "";
}

function isActivePath(pathname: string, href: string) {
  const normalizedPathname = normalizePathname(pathname);
  const normalizedHref = normalizePathname(href);

  if (!normalizedPathname || !normalizedHref) {
    return false;
  }

  if (normalizedPathname === normalizedHref) {
    return true;
  }

  if (normalizedHref.endsWith("/attachments")) {
    return normalizedPathname === normalizedHref;
  }

  if (normalizedHref.endsWith("/occurrences")) {
    return normalizedPathname === normalizedHref;
  }

  if (normalizedHref.endsWith("/holds")) {
    return normalizedPathname === normalizedHref;
  }

  return false;
}

export default async function VaultMessageLayout({
  children,
  params,
}: LayoutProps) {
  const { message, occurrenceCount, holdCount } = await getMessageShell(params.id);

  const headerList = await headers();
  const pathname = resolveCurrentPath(headerList);

  const sender =
    message.sender_name && message.sender_email
      ? `${message.sender_name} <${message.sender_email}>`
      : message.sender_email || message.sender_name || "—";

  const attachmentCount = message.attachment_count ?? 0;

  const overviewHref = `/vault/messages/${message.id}`;
  const attachmentsHref = `/vault/messages/${message.id}/attachments`;
  const occurrencesHref = `/vault/messages/${message.id}/occurrences`;
  const holdsHref = `/vault/messages/${message.id}/holds`;

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-800 bg-[#071224] p-6 shadow-[0_10px_30px_rgba(0,0,0,0.25)]">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
          <div className="space-y-4">
            <div className="flex flex-wrap gap-3">
              <Link
                href="/vault/messages"
                className="inline-flex text-sm text-cyan-300 transition hover:text-cyan-200"
              >
                ← Back to Vault Messages
              </Link>

              <Link
                href="/vault/search"
                className="inline-flex text-sm text-slate-400 transition hover:text-slate-200"
              >
                Back to Search
              </Link>
            </div>

            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-white">
                {message.subject || "(No Subject)"}
              </h1>
              <p className="mt-2 text-sm text-slate-300">{sender}</p>
              <p className="mt-1 text-sm text-slate-500">
                Received: {formatDateTime(message.received_at)}
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Message ID: {message.id}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <StatPill
                label="Attachments"
                value={attachmentCount}
                tone={message.has_attachments ? "cyan" : "default"}
              />
              <StatPill
                label="Occurrences"
                value={occurrenceCount}
                tone={occurrenceCount > 0 ? "cyan" : "default"}
              />
              <StatPill
                label="Hold"
                value={message.on_hold ? "Yes" : "No"}
                tone={message.on_hold ? "amber" : "default"}
              />
              <StatPill
                label="Exports"
                value={message.export_count ?? 0}
                tone={(message.export_count ?? 0) > 0 ? "green" : "default"}
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-3 xl:max-w-[420px] xl:justify-end">
            <WorkspaceTab
              href={overviewHref}
              label="Overview"
              active={isActivePath(pathname, overviewHref)}
            />
            <WorkspaceTab
              href={attachmentsHref}
              label="Attachments"
              count={attachmentCount}
              active={isActivePath(pathname, attachmentsHref)}
            />
            <WorkspaceTab
              href={occurrencesHref}
              label="Occurrences"
              count={occurrenceCount}
              active={isActivePath(pathname, occurrencesHref)}
            />
            <WorkspaceTab
              href={holdsHref}
              label="Holds"
              count={holdCount}
              active={isActivePath(pathname, holdsHref)}
            />
          </div>
        </div>
      </section>

      <div>{children}</div>
    </div>
  );
}