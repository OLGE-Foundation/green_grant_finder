import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

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
    .from("bookmarks")
    .select("grant_id")
    .eq("user_id", user.id);

  if (error) {
    console.error("[api/bookmarks] GET error:", error);
    return NextResponse.json(
      { error: "Failed to load bookmarks" },
      { status: 500 },
    );
  }

  return NextResponse.json({
    grantIds: (data ?? []).map((row) => row.grant_id as string),
  });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { grantId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const grantId = body.grantId?.trim();
  if (!grantId) {
    return NextResponse.json({ error: "grantId is required" }, { status: 400 });
  }

  const { data: existing, error: checkError } = await supabase
    .from("bookmarks")
    .select("grant_id")
    .eq("user_id", user.id)
    .eq("grant_id", grantId)
    .maybeSingle();

  if (checkError) {
    console.error("[api/bookmarks] check error:", checkError);
    return NextResponse.json(
      { error: "Failed to update bookmark" },
      { status: 500 },
    );
  }

  if (existing) {
    const { error: deleteError } = await supabase
      .from("bookmarks")
      .delete()
      .eq("user_id", user.id)
      .eq("grant_id", grantId);

    if (deleteError) {
      console.error("[api/bookmarks] delete error:", deleteError);
      return NextResponse.json(
        { error: "Failed to update bookmark" },
        { status: 500 },
      );
    }
    return NextResponse.json({ saved: false });
  }

  const { error: insertError } = await supabase.from("bookmarks").insert({
    user_id: user.id,
    grant_id: grantId,
  });

  if (insertError) {
    console.error("[api/bookmarks] insert error:", insertError);
    return NextResponse.json(
      { error: "Failed to update bookmark" },
      { status: 500 },
    );
  }

  return NextResponse.json({ saved: true });
}
