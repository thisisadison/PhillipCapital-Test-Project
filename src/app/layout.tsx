import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Market & Tech Trends Digest",
    template: "%s · Market & Tech Trends Digest",
  },
  description:
    "A weekly briefing for the PhillipCapital Internal Audit team on audit automation, AI in " +
    "internal audit, and the regulatory developments behind them.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#faf9f7" },
    { media: "(prefers-color-scheme: dark)", color: "#101013" },
  ],
};

/**
 * Applies the stored theme before first paint. Without this the page renders in
 * the system theme for a frame and then flips, which is exactly the kind of
 * flicker a restrained design cannot afford.
 */
const THEME_BOOTSTRAP = `
try {
  var stored = localStorage.getItem("digest-theme");
  if (stored === "light" || stored === "dark") {
    document.documentElement.setAttribute("data-theme", stored);
  }
} catch (error) {}
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-SG" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP }} />
      </head>
      <body className="antialiased">
        <a
          href="#digest"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-surface focus:px-4 focus:py-2 focus:text-sm focus:shadow-md"
        >
          Skip to the digest
        </a>
        {children}
      </body>
    </html>
  );
}
