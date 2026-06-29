import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { REGION_OPTIONS, SECTOR_OPTIONS } from "@/lib/grants/constants";

const SECTOR_SET = new Set<string>(SECTOR_OPTIONS);
const REGION_SET = new Set<string>(REGION_OPTIONS);

// Keep only known option values, drop everything else (caps array size too).
function sanitizeOptions(input: unknown, allowed: Set<string>): string[] {
  if (!Array.isArray(input)) return [];
  return input.filter(
    (v): v is string => typeof v === "string" && allowed.has(v),
  );
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("alert_preferences")
    .select("enabled, sectors, regions")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    console.error("[api/alerts/preferences] GET error:", error);
    return NextResponse.json(
      { error: "Failed to load preferences" },
      { status: 500 },
    );
  }

  return NextResponse.json({
    enabled: data?.enabled ?? true,
    sectors: data?.sectors ?? [],
    regions: data?.regions ?? [],
  });
}

export async function PUT(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { enabled?: boolean; sectors?: unknown; regions?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { error } = await supabase.from("alert_preferences").upsert(
    {
      user_id: user.id,
      enabled: typeof body.enabled === "boolean" ? body.enabled : true,
      sectors: sanitizeOptions(body.sectors, SECTOR_SET),
      regions: sanitizeOptions(body.regions, REGION_SET),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  if (error) {
    console.error("[api/alerts/preferences] PUT error:", error);
    return NextResponse.json(
      { error: "Failed to save preferences" },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
