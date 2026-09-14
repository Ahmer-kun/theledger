import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Supabase environment variables are missing. Copy .env.local.example to .env.local and fill it in."
    );
  }

  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}

export type SupabaseClient = ReturnType<typeof createClient>;