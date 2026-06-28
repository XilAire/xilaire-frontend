import { NextResponse } from "next/server";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import { syncUserDiscordRoles } from "@/lib/discord/syncUserDiscordRoles";

export const dynamic = "force-dynamic";

const serviceSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL_CASE_TRADES!,
  process.env.SUPABASE_SERVICE_ROLE_KEY_CASE_TRADES!,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
);

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(
      `${url.origin}/dashboard/billing?discord=missing_code`
    );
  }

  const supabase = createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/signin");
  }

  const clientId = process.env.DISCORD_CLIENT_ID;
  const clientSecret = process.env.DISCORD_CLIENT_SECRET;
  const redirectUri = `${url.origin}/api/auth/discord/callback`;

  if (!clientId || !clientSecret) {
    return NextResponse.json(
      { error: "Missing Discord OAuth env variables." },
      { status: 500 }
    );
  }

  const tokenRes = await fetch("https://discord.com/api/oauth2/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    }),
  });

  if (!tokenRes.ok) {
    const text = await tokenRes.text();
    console.error("Discord token exchange failed", text);

    return NextResponse.redirect(
      `${url.origin}/dashboard/billing?discord=token_failed`
    );
  }

  const tokenData = await tokenRes.json();

  const userRes = await fetch("https://discord.com/api/users/@me", {
    headers: {
      Authorization: `Bearer ${tokenData.access_token}`,
    },
  });

  if (!userRes.ok) {
    const text = await userRes.text();
    console.error("Discord user lookup failed", text);

    return NextResponse.redirect(
      `${url.origin}/dashboard/billing?discord=user_failed`
    );
  }

  const discordUser = await userRes.json();

  const discordUserId = String(discordUser.id);
  const discordUsername =
    discordUser.global_name ??
    discordUser.username ??
    `discord_${discordUserId}`;

  /*
    Enterprise behavior:
    One Discord account can only belong to one CASE Trades profile at a time.

    If this Discord user was previously connected to another CASE Trades user,
    we reassign it to the currently signed-in CASE Trades user instead of failing
    on the unique discord_user_id constraint.
  */
  const { data: existingDiscordAccount, error: existingLookupError } =
    await serviceSupabase
      .from("discord_accounts")
      .select("id, user_id, discord_user_id")
      .eq("discord_user_id", discordUserId)
      .maybeSingle();

  if (existingLookupError) {
    console.error("Discord account lookup failed", existingLookupError);

    return NextResponse.redirect(
      `${url.origin}/dashboard/billing?discord=lookup_failed`
    );
  }

  if (existingDiscordAccount) {
    const previousUserId = existingDiscordAccount.user_id;

    const { error: updateError } = await serviceSupabase
      .from("discord_accounts")
      .update({
        user_id: user.id,
        discord_username: discordUsername,
      })
      .eq("discord_user_id", discordUserId);

    if (updateError) {
      console.error("Discord account reassignment failed", updateError);

      return NextResponse.redirect(
        `${url.origin}/dashboard/billing?discord=save_failed`
      );
    }

    if (previousUserId && previousUserId !== user.id) {
      try {
        await syncUserDiscordRoles(previousUserId);
      } catch (syncPreviousError) {
        console.error(
          "Previous Discord user role cleanup failed",
          syncPreviousError
        );
      }
    }
  } else {
    const { error: insertError } = await serviceSupabase
      .from("discord_accounts")
      .insert({
        user_id: user.id,
        discord_user_id: discordUserId,
        discord_username: discordUsername,
      });

    if (insertError) {
      console.error("Discord account insert failed", insertError);

      return NextResponse.redirect(
        `${url.origin}/dashboard/billing?discord=save_failed`
      );
    }
  }

  try {
    await syncUserDiscordRoles(user.id);
  } catch (syncError) {
    console.error("Discord role sync after connect failed", syncError);

    return NextResponse.redirect(
      `${url.origin}/dashboard/billing?discord=connected_sync_failed`
    );
  }

  return NextResponse.redirect(
    `${url.origin}/dashboard/billing?discord=connected`
  );
}