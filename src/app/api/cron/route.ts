import { NextResponse } from "next/server";
import { generateDigest } from "@/server/service/DigestService";
import { runExclusive } from "@/server/service/runGuard";
import { getDigestRepository } from "@/server/repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
/** A full run is three researched categories plus synthesis. */
export const maxDuration = 800;

/**
 * The scheduled entry point. Authenticated with its own bearer secret rather
 * than the shared access code, so the scheduler never needs the team's code and
 * the middleware lets it past the gate.
 */
async function handle(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    console.error("[cron] CRON_SECRET is not set; refusing to expose an unauthenticated trigger.");
    return NextResponse.json({ error: "Scheduler is not configured." }, { status: 503 });
  }

  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const outcome = await runExclusive(() =>
    generateDigest(getDigestRepository(), { trigger: "scheduled" }),
  );

  if (outcome.status === "busy") {
    return NextResponse.json({ error: "A digest run is already in progress." }, { status: 409 });
  }

  const { digest, run } = outcome.result;
  return NextResponse.json({
    ok: true,
    date: digest.date,
    entries: digest.entries.length,
    warnings: run.warnings,
  });
}

export async function POST(request: Request) {
  return runAndReport(request);
}

/** Most hosted schedulers issue a GET. */
export async function GET(request: Request) {
  return runAndReport(request);
}

async function runAndReport(request: Request) {
  try {
    return await handle(request);
  } catch (error) {
    // The failure is already recorded in the run log by the pipeline; this is
    // for the scheduler's own logs and retry behaviour.
    console.error("[cron] Digest generation failed.", error);
    return NextResponse.json({ error: "Digest generation failed." }, { status: 500 });
  }
}
