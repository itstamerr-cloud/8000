import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Service-role client. SERVER ONLY — bypasses RLS.
 * The `server-only` import makes the build fail if this is ever imported
 * into client code, so the secret key can never reach the browser bundle.
 * Used by the employee token page and its Server Actions.
 *
 * The custom `cache: "no-store"` fetch forces every query to bypass the
 * Next.js Data Cache, so the employee always sees the latest distribution
 * (never a stale "no accounts" result cached from before a distribution).
 */
export function createSupabaseAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        fetch: (input: RequestInfo | URL, init?: RequestInit) =>
          fetch(input, { ...init, cache: "no-store" }),
      },
    }
  );
}
