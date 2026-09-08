"use client";

import { useState } from "react";
import { hostnameOf } from "@/shared/url";
import { monogramFor } from "./monogram";

/**
 * The publisher's own favicon, over a generated monogram.
 *
 * The monogram renders first and always: it needs no network, is deterministic
 * from the name, and looks intentional rather than like a broken image. The real
 * favicon is layered on top and only becomes visible once it has actually
 * loaded, so a blocked corporate network, an offline publisher or a site with no
 * icon degrades to something designed rather than to an empty box.
 */
export function PublisherMark({ name, url }: { name: string; url: string }) {
  const [iconLoaded, setIconLoaded] = useState(false);
  const host = hostnameOf(url);

  return (
    <span
      aria-hidden="true"
      className="relative inline-flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-md border border-line bg-surface-sunken"
    >
      <span className="meta font-semibold uppercase text-ink-muted">{monogramFor(name)}</span>

      {host ? (
        // A plain <img>, not next/image: these are third-party favicons from
        // dozens of publisher domains. next/image would need every one declared
        // as a remote pattern and would proxy them through our own server, which
        // is more coupling and more egress for a 28px icon that is allowed to
        // fail. Failure is handled by the monogram underneath.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`https://${host}/favicon.ico`}
          alt=""
          width={28}
          height={28}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onLoad={() => setIconLoaded(true)}
          className={`absolute inset-0 h-full w-full bg-surface object-contain p-1 transition-opacity duration-200 ${
            iconLoaded ? "opacity-100" : "opacity-0"
          }`}
        />
      ) : null}
    </span>
  );
}
