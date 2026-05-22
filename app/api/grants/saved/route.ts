import { NextRequest, NextResponse } from "next/server";
import { applyGrantListFilters } from "@/lib/grants/query";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: bookmarks, error: bookmarkError } = await supabase
    .from("bookmarks")
    .select("grant_id")
    .eq("user_id", user.id);

  if (bookmarkError) {
    return NextResponse.json({ error: bookmarkError.message }, { status: 500 });
  }

  const grantIds = (bookmarks ?? []).map((b) => b.grant_id as string);
  if (grantIds.length === 0) {
    return NextResponse.json([]);
  }

  const { searchParams } = new URL(request.url);
  let query = supabase
    .from("grants")
    .select("*")
    .eq("status", "approved")
    .in("id", grantIds);

  query = applyGrantListFilters(query, searchParams);

  const { data, error } = await query;

  if (error) {
    console.error("[api/grants/saved] error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}
