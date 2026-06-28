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

type DiscordChannelsProps = {
  channels: DiscordChannel[];
};

export default function DiscordChannels({ channels }: DiscordChannelsProps) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5 shadow-sm">
      <div className="mb-5">
        <h2 className="text-lg font-semibold text-white">Discord Channels</h2>
        <p className="mt-1 text-sm text-slate-400">
          Channels connected to this organization.
        </p>
      </div>

      {channels.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-800 bg-slate-900/40 p-6 text-center">
          <p className="text-sm font-medium text-slate-300">
            No Discord channels found.
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Sync or add channels after connecting Discord.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {channels.map((channel) => {
            const displayName =
              channel.channel_name || channel.name || "Unnamed channel";

            return (
              <div
                key={channel.id}
                className="rounded-xl border border-slate-800 bg-slate-900/60 p-4"
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-white">
                        #{displayName}
                      </h3>

                      {channel.active === false ? (
                        <span className="rounded-full border border-red-900/60 bg-red-950/40 px-2 py-0.5 text-xs text-red-300">
                          Inactive
                        </span>
                      ) : (
                        <span className="rounded-full border border-emerald-900/60 bg-emerald-950/40 px-2 py-0.5 text-xs text-emerald-300">
                          Active
                        </span>
                      )}
                    </div>

                    <p className="mt-1 text-sm text-slate-400">
                      {channel.purpose || "No purpose set."}
                    </p>
                  </div>

                  <div className="text-left md:text-right">
                    <p className="text-xs text-slate-500">Type</p>
                    <p className="text-sm font-medium text-slate-300">
                      {channel.type || "Unknown"}
                    </p>
                  </div>
                </div>

                <div className="mt-4 rounded-lg bg-slate-950/70 p-3 text-xs">
                  <p className="text-slate-500">Discord Channel ID</p>
                  <p className="mt-1 break-all font-medium text-slate-300">
                    {channel.discord_channel_id}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}