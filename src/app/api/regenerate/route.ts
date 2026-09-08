import { NextResponse } from "next/server";
import { MissingApiKeyError } from "@/lib/digest/client";
import { generateDigest } from "@/lib/digest/pipeline";
import { runExclusive } from "@/lib/digest/runGuard";
import { evaluateManualTrigger } from "@/lib/rateLimit";
import { getDigestStore } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 800;

/** How much of the run log the rate limiter needs to see. */
const RUN_HISTORY_WINDOW = 40;

/**
 * The manual "regenerate now" trigger, for demos and for recovering from a
 * failed scheduled run.
 *
 * Reaching this route already required the shared access code (the middleware
 * enforces it). The rate limit on top is not about authorisation — it is
 * because this is a shared tool and each run costs real API spend.
 */
export async function POST() {
  const store = getDigestStore();

  const decision = evaluateManualTrigger(await store.listRuns(RUN_HISTORY_WINDOW));
  if (!decision.allowed) {
    return NextResponse.json(
      { error: decision.reason, retryAfterSeconds: decision.retryAfterSeconds },
      { status: 429, headers: { "Retry-After": String(decision.retryAfterSeconds) } },
    );
  }

  try {
    const outcome = await runExclusive(() => generateDigest(store, { trigger: "manual" }));

    if (outcome.status === "busy") {
      return NextResponse.json(
        { error: "A digest run is already in progress. Give it a minute." },
        { status: 409 },
      );
    }

    const { digest, run } = outcome.result;
    return NextResponse.json({
      ok: true,
      date: digest.date,
      entries: digest.entries.length,
      warnings: run.warnings,
    });
  } catch (error) {
    console.error("[regenerate] Digest generation failed.", error);

    if (error instanceof MissingApiKeyError) {
      return NextResponse.json(
        { error: "The research pipeline is not configured — ANTHROPIC_API_KEY is missing." },
        { status: 503 },
      );
    }

    // The reason is in the run log, and the page will surface it as a failed
    // refresh on reload. Keep the response itself free of internal detail.
    return NextResponse.json(
      { error: "The run failed. The digest on screen is unchanged." },
      { status: 500 },
    );
  }
}
