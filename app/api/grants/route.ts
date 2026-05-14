import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

function escapeIlikePattern(value: string) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/%/g, "\\%")
    .replace(/_/g, "\\_")
    .replace(/,/g, "");
}

function quotePostgrestFilterValue(value: string) {
  const escaped = value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  return `"${escaped}"`;
}

function normalizeSupabaseUrl(url: string) {
  return url
    .trim()
    .replace(/\/+$/, "")
    .replace(/\/rest\/v1\/?$/i, "");
}

export async function GET(request: NextRequest) {
  const rawUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? "";
  const supabaseUrl = normalizeSupabaseUrl(rawUrl);
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json(
      {
        error:
          "Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local, then restart the dev server.",
      },
      { status: 500 },
    );
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  const { searchParams } = new URL(request.url);
  const sector = searchParams.get("sector");
  const region = searchParams.get("region");
  const q = searchParams.get("q");

  let query = supabase.from("grants").select("*").eq("status", "approved");

  if (sector && sector.trim()) {
    query = query.contains("sector", [sector.trim()]);
  }

  if (region && region.trim()) {
    query = query.contains("region", [region.trim()]);
  }

  if (q && q.trim()) {
    const term = `%${escapeIlikePattern(q.trim())}%`;
    const quoted = quotePostgrestFilterValue(term);
    query = query.or(
      `title.ilike.${quoted},description.ilike.${quoted},provider.ilike.${quoted}`,
    );
  }

  query = query.order("deadline", { ascending: true });

  const { data, error } = await query;

  if (error) {
    console.error("[api/grants] Supabase error:", error);
    const isBadUrlPath =
      error.code === "PGRST125" ||
      /invalid path/i.test(error.message ?? "");

    return NextResponse.json(
      {
        error: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint ?? (isBadUrlPath ? "Use the Supabase project URL without a /rest/v1 suffix." : undefined),
      },
      { status: 500 },
    );
  }

  return NextResponse.json(data ?? []);
}
