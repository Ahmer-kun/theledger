import Link from "next/link";

export default function SiteHeader() {
  return (
    <header className="border-b border-rule">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link
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
        <nav aria-label="Account" className="flex items-center gap-3">
          <Link
            href="#"
            className="rounded px-2.5 py-1.5 text-sm text-muted transition-colors hover:text-ink"
          >
            Log in
          </Link>
          <Link
            href="#"
            className="rounded-[6px] bg-accent px-3.5 py-1.5 text-sm font-medium text-white transition-colors hover:bg-accent-ink"
          >
            Sign up
          </Link>
        </nav>
      </div>
    </header>
  );
}