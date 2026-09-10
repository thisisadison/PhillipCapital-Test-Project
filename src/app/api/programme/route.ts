import { NextResponse } from "next/server";
import { MissingApiKeyError } from "@/server/service/AnthropicClient";
import { generateProgramme } from "@/server/service/programme/ProgrammeService";
import { runExclusive } from "@/server/service/runGuard";
import { getProgrammeRepository } from "@/server/repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 800;

const MIN_CONTEXT_CHARS = 40;
const MAX_CONTEXT_CHARS = 4000;
/** Generating a programme costs real API spend; this is the anti-spam floor. */
const COOLDOWN_MINUTES = 5;

export async function POST(request: Request) {
  const repository = getProgrammeRepository();

  let riskContext: unknown;
  try {
    ({ riskContext } = await request.json());
  } catch {
    return NextResponse.json({ error: "Expected a JSON body." }, { status: 400 });
  }

  if (typeof riskContext !== "string" || riskContext.trim().length < MIN_CONTEXT_CHARS) {
    return NextResponse.json(
      {
        error:
          `Describe the firm's risk context in at least ${MIN_CONTEXT_CHARS} characters — the ` +
          `programme is only risk-based if it has a risk assessment to work from.`,
      },
      { status: 400 },
    );
  }
  if (riskContext.length > MAX_CONTEXT_CHARS) {
    return NextResponse.json({ error: "That risk context is too long." }, { status: 400 });
  }

  const [latest] = await repository.listSummaries(1);
  if (latest) {
    const elapsedMs = Date.now() - new Date(latest.generatedAt).getTime();
    const cooldownMs = COOLDOWN_MINUTES * 60_000;
    if (elapsedMs >= 0 && elapsedMs < cooldownMs) {
      return NextResponse.json(
        {
          error: `A programme was generated ${Math.max(1, Math.round(elapsedMs / 60_000))} minute(s) ago. Wait a few minutes before generating another.`,
        },
        { status: 429, headers: { "Retry-After": String(Math.ceil((cooldownMs - elapsedMs) / 1000)) } },
      );
    }
  }

  try {
    const outcome = await runExclusive(() =>
      generateProgramme(repository, { riskContext: riskContext as string }),
    );

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
      sections: programme.sections.length,
      warnings,
    });
  } catch (error) {
    console.error("[programme] Generation failed.", error);

    if (error instanceof MissingApiKeyError) {
      return NextResponse.json(
        { error: "ANTHROPIC_API_KEY is not set, so nothing can be generated." },
        { status: 503 },
      );
    }
    return NextResponse.json(
      { error: "The programme could not be generated. Nothing was saved." },
      { status: 500 },
    );
  }
}
