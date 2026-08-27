import { createBrowserClient } from "@supabase/ssr";
import { readPublicEnv } from "./env";
export function createSupabaseBrowserClient() {
  const env = readPublicEnv();
  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
    throw new Error(
      "Supabase is not configured. Phase 1 uses local demo data only.",
    );
  return createBrowserClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}
