import Link from "next/link";
import { ThemeToggle } from "./ThemeToggle";

const LINKS = [
  { href: "/", label: "This week" },
  { href: "/programme", label: "Programme" },
  { href: "/archive", label: "Archive" },
  { href: "/method", label: "Method" },
];

/**
 * The running head. Deliberately quiet — the masthead below is the page's focal
 * point, and two competing titles would blunt it.
 */
export function SiteHeader({ current }: { current?: string }) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-b border-line py-5">
      <Link
        href="/"
        className="meta font-semibold uppercase tracking-[0.16em] text-ink transition-opacity duration-200 hover:opacity-70"
      >
        Internal Audit · Trends Digest
      </Link>

      <div className="flex items-center gap-5">
        <nav aria-label="Sections">
          <ul className="flex items-center gap-5">
            {LINKS.map((link) => {
              const active = link.href === current;
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    aria-current={active ? "page" : undefined}
                    className={`meta uppercase tracking-[0.1em] underline-offset-4 transition-colors duration-200 hover:text-ink ${
                      active ? "text-ink underline" : "text-ink-faint"
                    }`}
                  >
                    {link.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <ThemeToggle />
      </div>
    </header>
  );
}
