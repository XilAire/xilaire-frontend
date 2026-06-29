import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

/* =================================================
   ENV VALIDATION
================================================= */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL_PLATFORM!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY_PLATFORM!;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY_PLATFORM!;

if (!SUPABASE_URL) throw new Error("Missing SUPABASE URL");
if (!SERVICE_KEY) throw new Error("Missing SERVICE ROLE KEY");
if (!ANON_KEY) throw new Error("Missing ANON KEY");

/* =================================================
   CLIENTS
================================================= */

const serviceClient = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
});

const authClient = createClient(SUPABASE_URL, ANON_KEY, {
  auth: { persistSession: false },
});

/* =================================================
   TYPES
================================================= */

type ProfileRow = {
  id: string;
  org_id: string | null;
  role: string | null;
  account_type: string | null;
};

/* =================================================
   RESPONSE HEADERS
================================================= */

const NO_STORE_HEADERS: HeadersInit = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0",
  "Surrogate-Control": "no-store",
};

/* =================================================
   AUTH HELPERS
================================================= */

function resolveBearerToken(req: Request) {
  const authHeader = req.headers.get("authorization");

  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.replace("Bearer ", "").trim();
  }

  return null;
}

async function getAuthenticatedUser(req: Request, res: NextResponse) {
  const bearerToken = resolveBearerToken(req);

  if (bearerToken) {
    const {
      data: { user },
      error,
    } = await authClient.auth.getUser(bearerToken);

    if (error || !user) {
      return {
        user: null,
        error: error?.message || "Invalid bearer token",
      };
    }

    return {
      user,
      error: null,
    };
  }

  const cookieStore = await cookies();

  const supabaseSsr = createServerClient(SUPABASE_URL, ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll().map((cookie) => ({
          name: cookie.name,
          value: cookie.value,
        }));
      },
      setAll(cookieList) {
        cookieList.forEach((cookie) => {
          res.cookies.set(cookie.name, cookie.value, cookie.options);
        });
      },
    },
  });

  const {
    data: { user },
    error,
  } = await supabaseSsr.auth.getUser();

  if (error || !user) {
    return {
      user: null,
      error: error?.message || "Auth session missing",
    };
  }

  return {
    user,
    error: null,
  };
}

/* =================================================
   GET PROJECTS
================================================= */

export async function GET(req: Request) {
  const res = NextResponse.json({}, { status: 200, headers: NO_STORE_HEADERS });

  try {
    const { searchParams } = new URL(req.url);
    const requestTs = searchParams.get("_ts");

    const { user, error: authFailure } = await getAuthenticatedUser(req, res);

    if (!user) {
      console.error("PROJECT_LIST_AUTH_MISSING:", authFailure);

      return NextResponse.json(
        { error: authFailure || "Auth session missing!" },
        {
          status: 401,
          headers: res.headers,
        }
      );
    }

    /* ---------------------------------------------
       RESOLVE PROFILE + ORG FROM PROFILES TABLE
    ---------------------------------------------- */

    const {
      data: profile,
      error: profileError,
    } = await serviceClient
      .from("profiles")
      .select("id, org_id, role, account_type")
      .eq("id", user.id)
      .single<ProfileRow>();

    if (profileError || !profile) {
      console.error("PROJECT_LIST_PROFILE_ERROR:", {
        user_id: user.id,
        email: user.email,
        message: profileError?.message || null,
        code: (profileError as any)?.code || null,
        details: (profileError as any)?.details || null,
        hint: (profileError as any)?.hint || null,
      });

      return NextResponse.json(
        { error: "Profile not found" },
        {
          status: 403,
          headers: res.headers,
        }
      );
    }

    const org_id = String(profile.org_id || "").trim();

    if (!org_id) {
      console.error("PROJECT_LIST_ORG_RESOLUTION_FAILED:", {
        user_id: user.id,
        email: user.email,
        profile,
      });

      return NextResponse.json(
        { error: "Missing org_id" },
        {
          status: 403,
          headers: res.headers,
        }
      );
    }

    console.log("PROJECT_LIST_USER:", user.email);
    console.log("PROJECT_LIST_PROFILE_ROLE:", profile.role);
    console.log("PROJECT_LIST_ORG:", org_id);
    console.log("PROJECT_LIST_REQUEST_TS:", requestTs);

    /* ---------------------------------------------
       QUERY PROJECTS
    ---------------------------------------------- */

    const { data, error } = await serviceClient
      .from("infrastructure_projects")
      .select(`
        id,
        org_id,
        client_name,
        project_name,
        project_type,
        project_address,
        permit_required,
        status,
        billing_status,
        project_value,
        electrical_wholesale,
        tech_cost,
        projected_margin,
        created_at,
        updated_at
      `)
      .eq("org_id", org_id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("PROJECT_LIST_QUERY_ERROR:", error);

      return NextResponse.json(
        { error: error.message || "Failed to list projects" },
        {
          status: 500,
          headers: res.headers,
        }
      );
    }

    const projects = (data ?? []).map((row) => ({
      id: row?.id,
      org_id: row?.org_id,
      client_name: row?.client_name ?? "",
      project_name: row?.project_name ?? "",
      project_type: row?.project_type ?? null,
      project_address: row?.project_address ?? null,
      permit_required: Boolean(row?.permit_required),
      status: row?.status ?? "pipeline",
      billing_status: row?.billing_status ?? "inactive",
      project_value: Number(row?.project_value ?? 0),
      electrical_wholesale: Number(row?.electrical_wholesale ?? 0),
      tech_cost: Number(row?.tech_cost ?? 0),
      projected_margin: Number(row?.projected_margin ?? 0),
      created_at: row?.created_at ?? null,
      updated_at: row?.updated_at ?? null,
    }));

    console.log("PROJECT_LIST_RESULT_COUNT:", projects.length);

    return NextResponse.json(
      {
        success: true,
        projects,
      },
      {
        status: 200,
        headers: res.headers,
      }
    );
  } catch (err: any) {
    console.error("LIST_INFRA_PROJECTS_ERROR:", err);

    return NextResponse.json(
      { error: err?.message || "Failed to list projects" },
      {
        status: 500,
        headers: NO_STORE_HEADERS,
      }
    );
  }
}