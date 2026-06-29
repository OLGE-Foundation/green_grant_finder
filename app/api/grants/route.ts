import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { PUBLIC_GRANT_COLUMNS } from "@/lib/grants/constants";
import { applyGrantListFilters } from "@/lib/grants/query";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase/config";

export function createAnonSupabaseClient() {
  const supabaseUrl = getSupabaseUrl();
  const supabaseKey = getSupabaseAnonKey();

  if (!supabaseUrl || !supabaseKey) {
    return null;
  }

  return createClient(supabaseUrl, supabaseKey);
}

export async function GET(request: NextRequest) {
  const supabase = createAnonSupabaseClient();

  if (!supabase) {
    return NextResponse.json(
      {
        error:
          "Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local, then restart the dev server.",
      },
      { status: 500 },
    );
  }

  const { searchParams } = new URL(request.url);
  let query = supabase
    .from("grants")
    .select(PUBLIC_GRANT_COLUMNS)
    .eq("status", "approved");
  query = applyGrantListFilters(query, searchParams);

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
        hint:
          error.hint ??
          (isBadUrlPath
            ? "Use the Supabase project URL without a /rest/v1 suffix."
            : undefined),
      },
      { status: 500 },
    );
  }

  return NextResponse.json(data ?? []);
}
