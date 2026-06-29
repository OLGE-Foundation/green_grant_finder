import { NextResponse } from "next/server";
import { mapSubmitGrantToRow, submitGrantSchema } from "@/lib/validation/submit-grant";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = submitGrantSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Validation failed",
        details: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  try {
    const supabase = createAdminClient();
    const row = mapSubmitGrantToRow(parsed.data);

    const { data, error } = await supabase
      .from("grants")
      .insert(row)
      .select("id")
      .single();

    if (error) {
      console.error("[api/grants/submit] insert error:", error);
      return NextResponse.json(
        { error: "Failed to submit grant" },
        { status: 500 },
      );
    }

    return NextResponse.json({ id: data.id }, { status: 201 });
  } catch (err) {
    console.error("[api/grants/submit] error:", err);
    return NextResponse.json(
      { error: "Failed to submit grant" },
      { status: 500 },
    );
  }
}
