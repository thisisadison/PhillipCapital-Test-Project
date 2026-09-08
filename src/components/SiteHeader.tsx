import Link from "next/link";
import { ThemeToggle } from "./ThemeToggle";

/**
 * The running head. Deliberately quiet — the masthead below it is the page's
 * focal point, and two competing titles would blunt it.
 */
export function SiteHeader({ showArchiveLink = true }: { showArchiveLink?: boolean }) {
  return (
    <header className="flex items-center justify-between gap-4 py-6">
      <Link
        href="/"
        className="meta font-semibold uppercase tracking-[0.16em] text-ink-muted transition-colors duration-200 hover:text-ink"
      >
        Internal Audit · Trends Digest
      </Link>

      <nav className="flex items-center gap-4">
        {showArchiveLink ? (
          <Link
            href="/archive"
            className="meta uppercase tracking-[0.1em] text-ink-muted underline-offset-4 transition-colors duration-200 hover:text-ink hover:underline"
          >
            Archive
          </Link>
        ) : null}
        <ThemeToggle />
      </nav>
    </header>
  );
}
