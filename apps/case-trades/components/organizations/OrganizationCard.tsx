import DiscordChannels from "./DiscordChannels";
import DiscordRoles from "./DiscordRoles";
import OrganizationProducts from "./OrganizationProducts";

type OrganizationProduct = {
  id: string;
  organization_id: string;
  product_key: string;
  name: string;
  description?: string | null;
  feature_key?: string | null;
  amount?: number | null;
  currency?: string | null;
  billing_interval?: string | null;
  discord_role_id?: string | null;
  stripe_product_id?: string | null;
  stripe_price_id?: string | null;
  active?: boolean | null;
  created_at?: string | null;
};

type DiscordChannel = {
  id: string;
  organization_id: string;
  discord_channel_id: string;
  name?: string | null;
  channel_name?: string | null;
  type?: string | null;
  purpose?: string | null;
  active?: boolean | null;
  created_at?: string | null;
};

type DiscordRole = {
  id: string;
  organization_id: string;
  discord_role_id: string;
  name?: string | null;
  role_name?: string | null;
  color?: string | null;
  position?: number | null;
  managed?: boolean | null;
  active?: boolean | null;
  created_at?: string | null;
};

type Organization = {
  id: string;
  name: string;
  slug?: string | null;
  discord_invite_url?: string | null;
  discord_guild_id?: string | null;
  created_at?: string | null;
};

type OrganizationCardProps = {
  organization: Organization;
  products: OrganizationProduct[];
  channels: DiscordChannel[];
  roles: DiscordRole[];
};

export default function OrganizationCard({
  organization,
  products,
  channels,
  roles,
}: OrganizationCardProps) {
  const discordConnected = Boolean(
    organization.discord_guild_id || organization.discord_invite_url
  );

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold text-white">
                {organization.name}
              </h1>

              {discordConnected ? (
                <span className="rounded-full border border-emerald-900/60 bg-emerald-950/40 px-2.5 py-1 text-xs font-medium text-emerald-300">
                  Discord Connected
                </span>
              ) : (
                <span className="rounded-full border border-red-900/60 bg-red-950/40 px-2.5 py-1 text-xs font-medium text-red-300">
                  Discord Not Connected
                </span>
              )}
            </div>

            <p className="mt-1 text-sm text-slate-400">
              Manage this organization&apos;s products, Stripe billing, and
              Discord access.
            </p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/70 px-4 py-3 text-sm">
            <p className="text-xs text-slate-500">Organization ID</p>
            <p className="mt-1 max-w-[260px] break-all font-medium text-slate-300">
              {organization.id}
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <p className="text-xs text-slate-500">Slug</p>
            <p className="mt-1 font-medium text-slate-300">
              {organization.slug || "Not set"}
            </p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <p className="text-xs text-slate-500">Discord Guild</p>
            <p className="mt-1 break-all font-medium text-slate-300">
              {organization.discord_guild_id || "Not connected"}
            </p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <p className="text-xs text-slate-500">Discord Invite</p>
            <p className="mt-1 break-all font-medium text-slate-300">
              {organization.discord_invite_url || "Not set"}
            </p>
          </div>
        </div>
      </div>

      <OrganizationProducts
        organizationId={organization.id}
        products={products}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <DiscordChannels channels={channels} />
        <DiscordRoles roles={roles} />
      </div>
    </div>
  );
}