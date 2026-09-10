import { NextResponse } from "next/server";
import { planProgramme } from "@/server/service/programme/ProgrammePipeline";
import { runExclusive } from "@/server/service/runGuard";
import { getProgrammeRepository } from "@/server/repository";
import { riskIntakeSchema, sanitiseIntake } from "@/server/domain/riskIntake";
import "@/server/domain/domains";
import { programmeErrorResponse } from "./errors";

/**
 * Stage one: plan. Runs the Risk, Obligations and Scope agents and stops.
 *
 * It deliberately does not produce a finished programme. The response is a
 * proposed scope for the auditor to approve, and drafting the steps is a
 * separate call to `/api/programme/[id]/approve`.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 800;

/** Planning costs real API spend; this is the anti-spam floor. */
const COOLDOWN_MINUTES = 3;

export async function POST(request: Request) {
  const repository = getProgrammeRepository();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Expected a JSON body." }, { status: 400 });
  }

  const parsed = riskIntakeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "That intake is incomplete." },
      { status: 400 },
    );
  }

  // Shape is valid; now check it against the chosen domain's own rules. A
  // dimension the framework mandates cannot be left blank, and the message
  // names which one rather than saying "incomplete".
  const { problems } = sanitiseIntake(parsed.data);
  const firstProblem = problems[0];
  if (firstProblem) {
    return NextResponse.json({ error: firstProblem.message }, { status: 400 });
  }

  const [latest] = await repository.listSummaries(1);
  if (latest) {
    const elapsedMs = Date.now() - new Date(latest.createdAt).getTime();
    const cooldownMs = COOLDOWN_MINUTES * 60_000;
    if (elapsedMs >= 0 && elapsedMs < cooldownMs) {
      return NextResponse.json(
        {
          error: `A programme was planned ${Math.max(1, Math.round(elapsedMs / 60_000))} minute(s) ago. Wait a few minutes before planning another.`,
        },
        {
          status: 429,
          headers: { "Retry-After": String(Math.ceil((cooldownMs - elapsedMs) / 1000)) },
        },
      );
    }
  }

  try {
    const outcome = await runExclusive(async () => {
      const result = await planProgramme(parsed.data);
      await repository.save(result.programme);
      return result;
    });

    if (outcome.status === "busy") {
      return NextResponse.json(
        { error: "Another run is already in progress. Give it a minute." },
        { status: 409 },
      );
    }

    const { programme, warnings } = outcome.result;
    return NextResponse.json({
      ok: true,
      id: programme.id,
      areas: programme.scopeAreas.length,
      warnings,
    });
  } catch (error) {
    return programmeErrorResponse(error, "planned");
  }
}
