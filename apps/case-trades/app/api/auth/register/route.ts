import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const DEFAULT_AFTER_CONFIRM_PATH =
  "/dashboard/billing?reason=complete_subscription";

function normalizeRedirectPath(value: unknown) {
  if (!value || typeof value !== "string") {
    return DEFAULT_AFTER_CONFIRM_PATH;
  }

  if (!value.startsWith("/")) {
    return DEFAULT_AFTER_CONFIRM_PATH;
  }

  if (value.startsWith("//")) {
    return DEFAULT_AFTER_CONFIRM_PATH;
  }

  return value;
}

function getAppOrigin(req: Request) {
  const envOrigin =
    process.env.NEXT_PUBLIC_CASE_TRADES_APP_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL;

  if (envOrigin) {
    return envOrigin.replace(/\/$/, "");
  }

  return new URL(req.url).origin;
}

export async function POST(req: Request) {
  try {
    const { email, password, fullName, pendingPlan, redirectTo } =
      await req.json();

    if (!email || !password || !fullName) {
      return NextResponse.json(
        { error: "Email, password, and full name are required." },
        { status: 400 }
      );
    }

    const appOrigin = getAppOrigin(req);

    const afterConfirmPath = normalizeRedirectPath(
      redirectTo ||
        (pendingPlan
          ? `/dashboard/billing?plan=${encodeURIComponent(
              pendingPlan
            )}&reason=complete_subscription`
          : DEFAULT_AFTER_CONFIRM_PATH)
    );

    const emailRedirectTo = `${appOrigin}/auth/callback?next=${encodeURIComponent(
      afterConfirmPath
    )}`;

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL_CASE_TRADES!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY_CASE_TRADES!
    );

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo,
        data: {
          full_name: fullName,
          pending_plan: pendingPlan || null,
        },
      },
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (!data.user) {
      return NextResponse.json(
        { error: "Failed to create authentication user." },
        { status: 400 }
      );
    }

    const adminSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL_CASE_TRADES!,
      process.env.SUPABASE_SERVICE_ROLE_KEY_CASE_TRADES!,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );

    const { data: defaultRole, error: roleError } = await adminSupabase
      .from("roles")
      .select("id")
      .eq("name", "user")
      .single();

    if (roleError || !defaultRole) {
      console.error("Default role lookup failed:", roleError);

      await adminSupabase.auth.admin.deleteUser(data.user.id);

      return NextResponse.json(
        { error: "Default user role was not found." },
        { status: 500 }
      );
    }

    const { error: profileError } = await adminSupabase.from("profiles").upsert(
      {
        id: data.user.id,
        email,
        full_name: fullName,
        role_id: defaultRole.id,
        status: "active",
        theme: "light",
      },
      {
        onConflict: "id",
      }
    );

    if (profileError) {
      console.error("Profile creation failed:", profileError);

      await adminSupabase.auth.admin.deleteUser(data.user.id);

      return NextResponse.json(
        { error: "Auth user created, but profile creation failed." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      pendingPlan: pendingPlan || null,
      redirectTo: afterConfirmPath,
      message: "Account created. Check your email to confirm your account.",
    });
  } catch (error) {
    console.error("Register route failed:", error);

    return NextResponse.json(
      { error: "Unexpected registration error." },
      { status: 500 }
    );
  }
}