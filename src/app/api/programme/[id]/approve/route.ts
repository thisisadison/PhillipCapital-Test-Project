import { NextResponse } from "next/server";
import { z } from "zod";
import { draftApprovedSteps } from "@/server/service/programme/ProgrammePipeline";
import { runExclusive } from "@/server/service/runGuard";
import { getProgrammeRepository } from "@/server/repository";
import { programmeErrorResponse } from "../../errors";

/**
 * Stage two: the approval checkpoint.
 *
 * This is the only route that runs the Evidence Agent, and it runs it over the
 * areas named in the request body — nothing else. An auditor who unticks half
 * the scope pays for half the drafting, and no procedure is ever written for
 * something they declined.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 800;

const bodySchema = z.object({
  approvedAreaIds: z.array(z.string().min(1)).min(1, "Approve at least one control area."),
});

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const repository = getProgrammeRepository();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Expected a JSON body." }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "That approval is not valid." },
      { status: 400 },
    );
  }

  const programme = await repository.findById(id);
  if (!programme) {
    return NextResponse.json({ error: "That programme no longer exists." }, { status: 404 });
  }

  // Ids the stored programme doesn't contain are rejected outright rather than
  // ignored: silently dropping one would mean drafting a narrower scope than
  // the auditor believes they approved.
  const known = new Set(programme.scopeAreas.map((area) => area.id));
  const unknown = parsed.data.approvedAreaIds.filter((areaId) => !known.has(areaId));
  if (unknown.length > 0) {
    return NextResponse.json(
      { error: "That approval refers to control areas this programme does not contain." },
      { status: 400 },
    );
  }

  try {
    const outcome = await runExclusive(async () => {
      const result = await draftApprovedSteps(programme, parsed.data.approvedAreaIds);
      await repository.save(result.programme);
      return result;
    });

    if (outcome.status === "busy") {
      return NextResponse.json(
        { error: "Another run is already in progress. Give it a minute." },
        { status: 409 },
      );
    }

    return NextResponse.json({
      ok: true,
      id: outcome.result.programme.id,
      warnings: outcome.result.warnings,
    });
  } catch (error) {
    return programmeErrorResponse(error, "completed");
  }
}
