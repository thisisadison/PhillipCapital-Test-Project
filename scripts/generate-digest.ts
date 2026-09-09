/**
 * Runs the pipeline from the command line.
 *
 * The scheduled entry point for deployments that run cron outside the web app
 * (a systemd timer, a Kubernetes CronJob, GitHub Actions). Hosts with their own
 * scheduler can call `POST /api/cron` instead — both go through the same
 * `generateDigest`, so there is only ever one pipeline.
 *
 *   npx tsx scripts/generate-digest.ts [--manual]
 */
import "./loadEnvLocal";
import { generateDigest } from "../src/server/service/DigestService";
import { FileDigestRepository } from "../src/server/repository/FileDigestRepository";
import { formatUsageLine, formatUsd } from "../src/server/service/UsageTracking";
import { RESEARCH_MODEL, SYNTHESIS_MODEL } from "../src/server/service/AnthropicClient";

async function main() {
  const trigger = process.argv.includes("--manual") ? "manual" : "scheduled";
  const repository = new FileDigestRepository(process.env.DIGEST_DATA_DIR?.trim() || "./data");

  console.log(`Starting a ${trigger} digest run…`);
  // Per-category and per-synthesis-call lines stream from inside the pipeline
  // as each call completes; this is the final summary once it's all done.
  const { digest, run, usage } = await generateDigest(repository, { trigger });

  console.log(`\nPublished the edition of ${digest.date}:`);
  console.log(`  ${digest.entries.length} entries from ${digest.meta.sourcesConsulted} publishers`);
  console.log(`  ${digest.summary}`);

  if (digest.meta.entriesRejected > 0) {
    console.log(`  ${digest.meta.entriesRejected} draft entries were rejected.`);
  }
  for (const warning of run.warnings) {
    console.warn(`  warning: ${warning}`);
  }

  console.log(`\nUsage:`);
  console.log(`  research   ${formatUsageLine(usage.research, RESEARCH_MODEL)}`);
  console.log(`  synthesis  ${formatUsageLine(usage.synthesis, SYNTHESIS_MODEL)}`);
  console.log(`  total (estimated): ${formatUsd(usage.estimatedCostUsd)} — check the Anthropic Console for the real figure`);
}

main().catch((error) => {
  // The failure is already in the run log; this is for the scheduler's output.
  console.error("\nDigest generation failed:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
