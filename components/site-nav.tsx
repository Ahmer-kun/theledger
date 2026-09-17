"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Overview" },
  { href: "/transactions", label: "Transactions" },
  { href: "/ask", label: "Ask" },
];

export default function SiteNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Sections" className="border-t border-rule">
      <div className="mx-auto flex w-full max-w-6xl items-center gap-1 overflow-x-auto px-4 sm:px-6">
        {LINKS.map(({ href, label }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`-mb-px shrink-0 border-b-2 px-3 py-2.5 text-sm transition-colors ${
                active
                  ? "border-accent font-medium text-ink"
                  : "border-transparent text-muted hover:text-ink"
              }`}
            >
              {label}
            </Link>
          );
        })}
        <Link
          href="/upload"
          className="ml-auto shrink-0 rounded-[6px] px-3 py-1.5 text-sm font-medium text-accent-ink transition-colors hover:bg-accent/10"
        >
          Add receipts
        </Link>
      </div>
    </nav>
  );
}
