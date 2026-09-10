import { NextResponse } from "next/server";
import { MissingApiKeyError } from "@/server/service/AnthropicClient";

/**
 * Shared failure handling for both programme stages.
 *
 * Lives beside the routes rather than inside one, because a `route.ts` may only
 * export HTTP handlers and route config — anything else there is a build error.
 */
export function programmeErrorResponse(error: unknown, verb: string) {
  console.error(`[programme] The programme could not be ${verb}.`, error);

  if (error instanceof MissingApiKeyError) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY is not set, so nothing can be generated." },
      { status: 503 },
    );
  }

  // The agents throw with messages written for the auditor — "no obligation
  // survived source checking, so there is nothing to test against" says more
  // than a generic failure, and none of them leak internals.
  const message = error instanceof Error ? error.message : "";
  return NextResponse.json(
    { error: message || `The programme could not be ${verb}. Nothing was saved.` },
    { status: 500 },
  );
}
