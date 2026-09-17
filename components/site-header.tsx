import Link from "next/link";
import { createClient } from "@/lib/supabase-server";
import { signOut } from "@/lib/actions/auth";
import SiteNav from "@/components/site-nav";

export default async function SiteHeader() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }));

  return (
    <header className="border-b border-rule">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-4 sm:px-6">        <Link
          href="/"
          className="flex items-center gap-2"
          aria-label="Ledger home"
        >
          <span
            aria-hidden="true"
            className="inline-block h-2.5 w-2.5 rounded-[2px] bg-accent"
          />
          <span className="font-serif text-xl tracking-tight text-ink">
            Ledger
          </span>
        </Link>
        {user ? (
          <div className="flex items-center gap-4">
            <span className="hidden text-sm text-muted sm:inline">
              {user.email}
            </span>
            <form action={signOut}>
              <button
                type="submit"
                className="rounded px-2.5 py-1.5 text-sm text-muted transition-colors hover:text-ink"
              >
                Sign out
              </button>
            </form>
          </div>
        ) : (
          <nav aria-label="Account" className="flex items-center gap-3">
            <Link
              href="/login"
              className="rounded px-2.5 py-1.5 text-sm text-muted transition-colors hover:text-ink"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="rounded-[6px] bg-accent px-3.5 py-1.5 text-sm font-medium text-white transition-colors hover:bg-accent-ink"
            >
              Sign up
            </Link>
          </nav>
        )}
      </div>
      {user ? <SiteNav /> : null}
    </header>
  );
}