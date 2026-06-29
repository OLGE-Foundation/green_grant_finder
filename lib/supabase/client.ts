import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseAnonKey, getSupabaseUrl } from "./config";

export function createClient() {
  const url = getSupabaseUrl();
  const key = getSupabaseAnonKey();

  // Static prerender of pages that mount <AuthProvider> runs this on the server.
  // createBrowserClient throws when URL/key are empty, which breaks `next build`
  // in environments without env vars (e.g. CI). Fall back to a harmless
  // placeholder so the build can complete; real deployments inline the
  // NEXT_PUBLIC_* values at build time and use them.
  if (!url || !key) {
    if (typeof window !== "undefined") {
      console.warn(
        "[supabase] NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY are not set — auth is disabled.",
      );
    }
    return createBrowserClient(
      "https://placeholder.supabase.co",
      "placeholder-anon-key",
    );
  }

  return createBrowserClient(url, key);
}
