import { randomInt } from "node:crypto";
import type { User } from "@supabase/supabase-js";
import { createAdminClient } from "../lib/supabase/admin";

// This script runs outside Next.js, which would otherwise load .env for us.
// createAdminClient() reads SUPABASE_SERVICE_ROLE_KEY / NEXT_PUBLIC_SUPABASE_URL
// from process.env, so load the env file first (ignored if it doesn't exist —
// the vars may already be set in the environment).
try {
  process.loadEnvFile(".env");
} catch {
  // .env not present; rely on existing process environment
}

type AdminClient = ReturnType<typeof createAdminClient>;

// Strong random password drawn with a CSPRNG. Charset avoids ambiguous glyphs
// (0/O, 1/l/I) and shell-hostile characters so it can be pasted safely.
function generatePassword(length = 24): string {
  const charset =
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*-_=+?";
  let out = "";
  for (let i = 0; i < length; i++) {
    out += charset[randomInt(charset.length)];
  }
  return out;
}

// listUsers() is paginated (50/page by default); page through so an existing
// user is never missed and we don't wrongly try to re-create them.
async function findUserByEmail(
  supabase: AdminClient,
  email: string,
): Promise<User | null> {
  const target = email.toLowerCase();
  for (let page = 1; ; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: 200,
    });
    if (error) {
      console.error(error.message);
      process.exit(1);
    }
    const match = data.users.find((u) => u.email?.toLowerCase() === target);
    if (match) return match;
    if (data.users.length < 200) return null;
  }
}

async function setAdmin(email: string, isAdmin: boolean) {
  if (!email) {
    console.error(
      "Usage: npm run make-admin -- your@email.com [--revoke]",
    );
    process.exit(1);
  }

  const supabase = createAdminClient();
  const existing = await findUserByEmail(supabase, email);

  // Revoking from a user that doesn't exist is a no-op worth flagging.
  if (!existing && !isAdmin) {
    console.error(`No user with email: ${email} — nothing to revoke.`);
    process.exit(1);
  }

  // Create the account if it doesn't exist yet (grant path only).
  if (!existing) {
    const password = generatePassword();
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      app_metadata: { is_admin: true },
    });

    if (error || !data.user) {
      console.error(error?.message ?? "Failed to create user");
      process.exit(1);
    }

    console.log(`✓ Created ${email} (${data.user.id}) as an admin.`);
    console.log("");
    console.log("  Generated password (store it now — not shown again):");
    console.log(`  ${password}`);
    return;
  }

  // Otherwise update the flag on the existing user, preserving other metadata.
  const { error: updateError } = await supabase.auth.admin.updateUserById(
    existing.id,
    {
      app_metadata: { ...existing.app_metadata, is_admin: isAdmin },
    },
  );

  if (updateError) {
    console.error(updateError.message);
    process.exit(1);
  }

  console.log(
    isAdmin
      ? `✓ ${email} (${existing.id}) is now an admin.`
      : `✓ ${email} (${existing.id}) is no longer an admin.`,
  );
}

const args = process.argv.slice(2);
const revoke = args.includes("--revoke");
const email = args.find((a) => !a.startsWith("--")) ?? "";

setAdmin(email, !revoke);
