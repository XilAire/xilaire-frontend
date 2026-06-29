import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function POST(req: NextRequest) {
  try {
    /* -------------------------------------------------
       AUTH — AGENT TOKEN
    ------------------------------------------------- */
    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Missing or invalid Authorization header" },
        { status: 401 }
      );
    }

    const agentToken = authHeader.replace("Bearer ", "").trim();

    /* -------------------------------------------------
       SUPABASE (SERVICE ROLE)
    ------------------------------------------------- */
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL_PLATFORM!,
      process.env.SUPABASE_SERVICE_ROLE_KEY_PLATFORM!,
      {
        cookies: {
          getAll: () => [],
          setAll: () => {},
        },
      }
    );

    /* -------------------------------------------------
       ENDPOINT LOOKUP
    ------------------------------------------------- */
    const { data: endpoint, error: endpointError } = await supabase
      .from("endpoints")
      .select("id, org_id")
      .eq("agent_token", agentToken)
      .single();

    if (endpointError || !endpoint) {
      return NextResponse.json(
        { error: "Invalid agent token" },
        { status: 403 }
      );
    }

    /* -------------------------------------------------
       BODY
    ------------------------------------------------- */
    const body = await req.json();
    const inventory = body.endpoint;
    const telemetry = body.telemetry ?? [];

    if (!inventory || !inventory.hostname) {
      return NextResponse.json(
        { error: "Invalid payload" },
        { status: 400 }
      );
    }

    /* -------------------------------------------------
       UPDATE ENDPOINT (HEARTBEAT)
    ------------------------------------------------- */
    const { error: updateError } = await supabase
      .from("endpoints")
      .update({
        hostname: inventory.hostname,
        device_type: inventory.device_type,
        os: inventory.os,
        os_version: inventory.os_version,
        architecture: inventory.architecture,
        manufacturer: inventory.manufacturer,
        model: inventory.model,
        serial_number: inventory.serial_number,
        cpu_model: inventory.cpu_model,
        cpu_cores: inventory.cpu_cores,
        cpu_threads: inventory.cpu_threads,
        ram_gb: inventory.ram_gb,
        disk_total_gb: inventory.disk_total_gb,
        disk_type: inventory.disk_type,
        agent_version: inventory.agent_version,
        agent_status: "online",
        last_seen_at: new Date().toISOString(),
      })
      .eq("id", endpoint.id);

    if (updateError) {
      return NextResponse.json(
        { error: "Failed to update endpoint" },
        { status: 500 }
      );
    }

    /* -------------------------------------------------
       INSERT TELEMETRY (TIME-SERIES)
    ------------------------------------------------- */
    if (Array.isArray(telemetry) && telemetry.length > 0) {
      const rows = telemetry.map((t: any) => ({
        org_id: endpoint.org_id,
        endpoint_id: endpoint.id,
        metric: t.metric,
        value: t.value,
        unit: t.unit ?? null,
      }));

      const { error: telemetryError } = await supabase
        .from("endpoint_metrics")
        .insert(rows);

      if (telemetryError) {
        return NextResponse.json(
          { error: "Failed to store telemetry" },
          { status: 500 }
        );
      }
    }

    /* -------------------------------------------------
       SUCCESS
    ------------------------------------------------- */
    return NextResponse.json({ status: "ok" });
  } catch (err) {
    console.error("Telemetry ingest failed:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
