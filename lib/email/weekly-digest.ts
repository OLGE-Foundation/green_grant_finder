import { createAdminClient } from "@/lib/supabase/admin";
import { getFromEmail, getResendClient } from "@/lib/email/resend";
import {
  grantMatchesPreferences,
  renderWeeklyDigestHtml,
} from "@/lib/email/templates/weekly-digest";

type DigestResult = {
  usersNotified: number;
  grantsIncluded: number;
  errors: string[];
};

export async function runWeeklyDigest(): Promise<DigestResult> {
  const supabase = createAdminClient();
  const result: DigestResult = {
    usersNotified: 0,
    grantsIncluded: 0,
    errors: [],
  };

  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  const { data: newGrants, error: grantsError } = await supabase
    .from("grants")
    .select("id, title, provider, deadline, url, sector, region, approved_at")
    .eq("status", "approved")
    .gte("approved_at", weekAgo.toISOString());

  if (grantsError) {
    throw new Error(grantsError.message);
  }

  const grants = newGrants ?? [];
  result.grantsIncluded = grants.length;

  if (grants.length === 0) {
    return result;
  }

  const { data: preferences, error: prefsError } = await supabase
    .from("alert_preferences")
    .select("user_id, enabled, sectors, regions")
    .eq("enabled", true);

  if (prefsError) {
    throw new Error(prefsError.message);
  }

  const resend = getResendClient();
  const from = getFromEmail();

  for (const pref of preferences ?? []) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("email")
      .eq("id", pref.user_id)
      .maybeSingle();

    let email = profile?.email ?? null;

    if (!email) {
      const { data: authUser } = await supabase.auth.admin.getUserById(pref.user_id);
      email = authUser.user?.email ?? null;
    }

    if (!email) continue;

    let sectors = (pref.sectors ?? []) as string[];
    let regions = (pref.regions ?? []) as string[];

    if (sectors.length === 0 || regions.length === 0) {
      const { data: bookmarks } = await supabase
        .from("bookmarks")
        .select("grant_id")
        .eq("user_id", pref.user_id);

      const bookmarkIds = (bookmarks ?? []).map((b) => b.grant_id as string);
      if (bookmarkIds.length > 0) {
        const { data: bookmarkedGrants } = await supabase
          .from("grants")
          .select("sector, region")
          .in("id", bookmarkIds);

        const derivedSectors = new Set<string>();
        const derivedRegions = new Set<string>();
        for (const g of bookmarkedGrants ?? []) {
          for (const s of (g.sector as string[]) ?? []) derivedSectors.add(s);
          for (const r of (g.region as string[]) ?? []) derivedRegions.add(r);
        }
        if (sectors.length === 0) sectors = [...derivedSectors];
        if (regions.length === 0) regions = [...derivedRegions];
      }
    }

    if (sectors.length === 0 && regions.length === 0) continue;

    const matching = grants.filter((g) =>
      grantMatchesPreferences(
        {
          id: g.id as string,
          title: g.title as string,
          provider: g.provider as string | null,
          deadline: g.deadline as string | null,
          url: g.url as string | null,
          sector: g.sector as string[] | null,
          region: g.region as string[] | null,
        },
        sectors,
        regions,
      ),
    );

    if (matching.length === 0) continue;

    try {
      await resend.emails.send({
        from,
        to: email,
        subject: `${matching.length} new green grant${matching.length === 1 ? "" : "s"} this week`,
        html: renderWeeklyDigestHtml(
          matching.map((g) => ({
            id: g.id as string,
            title: g.title as string,
            provider: g.provider as string | null,
            deadline: g.deadline as string | null,
            url: g.url as string | null,
            sector: g.sector as string[] | null,
            region: g.region as string[] | null,
          })),
          email,
        ),
      });

      await supabase
        .from("alert_preferences")
        .update({ last_digest_sent_at: new Date().toISOString() })
        .eq("user_id", pref.user_id);

      result.usersNotified += 1;
    } catch (err) {
      result.errors.push(
        `${email}: ${err instanceof Error ? err.message : "send failed"}`,
      );
    }
  }

  return result;
}
