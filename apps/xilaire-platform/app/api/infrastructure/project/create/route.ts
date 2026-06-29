import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export const runtime = "nodejs";

/* =================================================
   ENV VALIDATION
================================================= */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL_PLATFORM;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY_PLATFORM;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY_PLATFORM;

if (!SUPABASE_URL) throw new Error("Missing SUPABASE URL");
if (!SUPABASE_SERVICE_KEY) throw new Error("Missing SUPABASE SERVICE KEY");
if (!SUPABASE_ANON_KEY) throw new Error("Missing SUPABASE ANON KEY");

/* =================================================
   TYPES
================================================= */

type ProfileRow = {
  id: string;
  org_id: string | null;
  role: string | null;
  account_type: string | null;
};

type CreateProjectBody = {
  client_name?: string;
  project_name?: string;
  project_type?: string | null;
  project_address?: string | null;
  permit_required?: boolean | null;
};

/* =================================================
   CLIENTS
================================================= */

function getServiceClient() {
  return createClient(SUPABASE_URL!, SUPABASE_SERVICE_KEY!, {
    auth: { persistSession: false },
  });
}

function getAuthClient() {
  return createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
    auth: { persistSession: false },
  });
}

/* =================================================
   HEADERS
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
  const authClient = getAuthClient();
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

  const supabaseSsr = createServerClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
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
   POST /api/infrastructure/project/create
================================================= */

export async function POST(req: Request) {
  const res = NextResponse.json({}, { status: 200, headers: NO_STORE_HEADERS });

  try {
    const supabase = getServiceClient();

    const body = (await req.json()) as CreateProjectBody;

    /* -------------------------------------------------
       AUTH VALIDATION
    ------------------------------------------------- */

    const { user, error: authFailure } = await getAuthenticatedUser(req, res);

    if (!user) {
      return NextResponse.json(
        { error: authFailure || "Unauthorized" },
        { status: 401, headers: res.headers }
      );
    }

    /* -------------------------------------------------
       PROFILE + ORG RESOLUTION
    ------------------------------------------------- */

    const {
      data: profile,
      error: profileError,
    } = await supabase
      .from("profiles")
      .select("id, org_id, role, account_type")
      .eq("id", user.id)
      .single<ProfileRow>();

    if (profileError || !profile) {
      console.error("CREATE_INFRA_PROJECT_PROFILE_ERROR:", {
        user_id: user.id,
        email: user.email,
        message: profileError?.message || null,
        code: (profileError as any)?.code || null,
        details: (profileError as any)?.details || null,
        hint: (profileError as any)?.hint || null,
      });

      return NextResponse.json(
        { error: "Profile not found" },
        { status: 403, headers: res.headers }
      );
    }

    const org_id = String(profile.org_id || "").trim();

    if (!org_id) {
      return NextResponse.json(
        { error: "Missing org_id" },
        { status: 403, headers: res.headers }
      );
    }

    /* -------------------------------------------------
       INPUT VALIDATION
    ------------------------------------------------- */

    const clientName = String(body?.client_name || "").trim();
    const projectName = String(body?.project_name || "").trim();
    const projectType = String(body?.project_type || "").trim() || null;
    const projectAddress = String(body?.project_address || "").trim() || null;
    const permitRequired = Boolean(body?.permit_required);

    if (!clientName || !projectName) {
      return NextResponse.json(
        { error: "client_name and project_name are required" },
        { status: 400, headers: res.headers }
      );
    }

    /* -------------------------------------------------
       INSERT PROJECT
    ------------------------------------------------- */

    const now = new Date().toISOString();

    const { data: project, error: insertError } = await supabase
      .from("infrastructure_projects")
      .insert([
        {
          org_id,
          client_name: clientName,
          project_name: projectName,
          project_type: projectType,
          project_address: projectAddress,
          permit_required: permitRequired,
          status: "pipeline",
          billing_status: "inactive",
          project_value: 0,
          electrical_wholesale: 0,
          tech_cost: 0,
          projected_margin: 0,
          created_at: now,
          updated_at: now,
        },
      ])
      .select()
      .single();

    if (insertError) {
      console.error("CREATE_INFRA_PROJECT_INSERT_ERROR:", insertError);

      return NextResponse.json(
        { error: insertError.message || "Failed to create project" },
        { status: 500, headers: res.headers }
      );
    }

    /* -------------------------------------------------
       CREATE INITIAL PROJECT LOG
    ------------------------------------------------- */

    const { error: logError } = await supabase
      .from("infrastructure_project_logs")
      .insert([
        {
          project_id: project.id,
          log_type: "project_created",
          message: `Project created for ${clientName}`,
          created_at: now,
        },
      ]);

    if (logError) {
      console.error("CREATE_INFRA_PROJECT_LOG_ERROR:", logError);
    }

    /* -------------------------------------------------
       RESPONSE
    ------------------------------------------------- */

    return NextResponse.json(
      {
        success: true,
        project,
      },
      {
        status: 200,
        headers: res.headers,
      }
    );
  } catch (err: any) {
    console.error("CREATE_INFRA_PROJECT_ERROR:", err);

    return NextResponse.json(
      { error: err?.message || "Failed to create project" },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}