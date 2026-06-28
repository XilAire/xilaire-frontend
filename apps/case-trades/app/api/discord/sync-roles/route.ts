import { NextResponse } from "next/server";
import { syncUserDiscordRoles } from "@/lib/discord/syncUserDiscordRoles";
import { provisionUserOrganizationAccess } from "@/lib/orgs/provisionUserOrganizationAccess";

export const dynamic = "force-dynamic";

const CASE_TRADES_ORG_ID = "491f385c-04e5-4446-97d1-457e5ce15d9d";

function getBaseUrl(req: Request) {
  const url = new URL(req.url);
  return `${url.protocol}//${url.host}`;
}

function getBillingRedirectUrl(
  req: Request,
  status: "success" | "failed",
  organizationSlug?: string | null
) {
  const url = new URL(`${getBaseUrl(req)}/dashboard/billing`);

  url.searchParams.set("sync", status);

  if (organizationSlug) {
    url.searchParams.set("org", organizationSlug);
  }

  return url.toString();
}

function getOrganizationFromRequest(req: Request, body?: Record<string, any>) {
  const url = new URL(req.url);

  return {
    organizationId:
      body?.organization_id ??
      body?.organizationId ??
      url.searchParams.get("organization_id") ??
      CASE_TRADES_ORG_ID,

    organizationSlug:
      body?.organization_slug ??
      body?.organizationSlug ??
      url.searchParams.get("org") ??
      url.searchParams.get("organization_slug") ??
      "case-trades",
  };
}

async function syncAndProvisionUserAccess({
  userId,
  organizationId,
}: {
  userId: string;
  organizationId: string;
}) {
  const syncResult = await syncUserDiscordRoles(userId);

  const provisionResult = await provisionUserOrganizationAccess({
    userId,
    organizationId,
    role: "member",
    subscriptionStatus: "active",
    discordStatus: "active",
    discordRoleId: null,
  });

  if (!provisionResult.success) {
    throw new Error(provisionResult.error);
  }

  return {
    syncResult,
    provisionResult,
  };
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const userId = body.user_id ?? body.userId;

    if (!userId || typeof userId !== "string") {
      return NextResponse.json({ error: "Missing user_id." }, { status: 400 });
    }

    const { organizationId, organizationSlug } = getOrganizationFromRequest(
      req,
      body
    );

    const result = await syncAndProvisionUserAccess({
      userId,
      organizationId,
    });

    return NextResponse.json({
      ok: true,
      user_id: userId,
      organization_id: organizationId,
      organization_slug: organizationSlug,
      result,
    });
  } catch (error) {
    console.error("Discord role sync failed", error);

    return NextResponse.json(
      { error: "Discord role sync failed." },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const userId = url.searchParams.get("user_id");
  const responseMode = url.searchParams.get("response");

  if (!userId) {
    return NextResponse.json({ error: "Missing user_id." }, { status: 400 });
  }

  const { organizationId, organizationSlug } = getOrganizationFromRequest(req);

  try {
    const result = await syncAndProvisionUserAccess({
      userId,
      organizationId,
    });

    if (responseMode === "json") {
      return NextResponse.json({
        ok: true,
        user_id: userId,
        organization_id: organizationId,
        organization_slug: organizationSlug,
        result,
      });
    }

    return NextResponse.redirect(
      getBillingRedirectUrl(req, "success", organizationSlug)
    );
  } catch (error) {
    console.error("Discord role sync failed", error);

    if (responseMode === "json") {
      return NextResponse.json(
        { error: "Discord role sync failed." },
        { status: 500 }
      );
    }

    return NextResponse.redirect(
      getBillingRedirectUrl(req, "failed", organizationSlug)
    );
  }
}