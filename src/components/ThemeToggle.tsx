"use client";

const STORAGE_KEY = "digest-theme";

/**
 * Light/dark switch.
 *
 * Which icon shows is decided in CSS from the resolved theme, not from React
 * state. That keeps this correct in the case that trips most theme toggles: a
 * reader on the system default, where the server has no idea which theme will
 * apply. There is no state to hydrate, so there is nothing to mismatch and no
 * flash of the wrong icon.
 */
export function ThemeToggle() {
  function toggle() {
    const root = document.documentElement;
    const next = resolveTheme(root) === "dark" ? "light" : "dark";

    root.setAttribute("data-theme", next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // A blocked storage write costs the preference on the next visit, nothing more.
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Switch between the light and dark theme"
      title="Switch theme"
      className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-line text-ink-muted transition-colors duration-200 hover:border-line-strong hover:text-ink"
    >
      <span aria-hidden="true" className="light-only block">
        <MoonIcon />
      </span>
      <span aria-hidden="true" className="dark-only block">
        <SunIcon />
      </span>
    </button>
  );
}

/** An explicit choice wins; otherwise fall back to what the OS asked for. */
function resolveTheme(root: HTMLElement): "light" | "dark" {
  const attribute = root.getAttribute("data-theme");
  if (attribute === "light" || attribute === "dark") return attribute;

  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function SunIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 14.3A8.2 8.2 0 0 1 9.7 4a8.5 8.5 0 1 0 10.3 10.3Z" />
    </svg>
  );
}
