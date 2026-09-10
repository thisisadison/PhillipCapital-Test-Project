import { type AgentRun } from "@/server/domain/programme";
import { formatUsd } from "@/server/service/UsageTracking";

/**
 * The pipeline, as a record of what actually ran.
 *
 * This is the component that answers "where did this come from". Each agent
 * appears with the job it had, what it produced, how long it took, what it cost
 * and anything it dropped — so the route from a handful of checkboxes to a
 * programme of testing is four readable steps rather than one opaque one.
 *
 * The pending entry matters as much as the completed ones: a planned programme
 * shows the Evidence Agent greyed out and waiting, which is how the approval
 * checkpoint reads as a stage in a process rather than an error.
 */

const AGENTS: { id: AgentRun["agent"]; name: string; job: string }[] = [
  { id: "risk", name: "Risk Agent", job: "Assesses what this firm is exposed to" },
  { id: "mas", name: "MAS Agent", job: "Reads the obligations that apply, with sources" },
  { id: "scope", name: "Scope Agent", job: "Merges risk and obligations into a proposed scope" },
  { id: "evidence", name: "Evidence Agent", job: "Writes testing steps for approved areas only" },
];

export function AgentTimeline({ runs, awaitingApproval }: { runs: AgentRun[]; awaitingApproval: boolean }) {
  const byAgent = new Map(runs.map((run) => [run.agent, run]));
  const total = runs.reduce((sum, run) => sum + run.costUsd, 0);

  return (
    <section className="mt-8 rounded-xl border border-line bg-surface p-5 shadow-[var(--shadow-card)] sm:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="meta uppercase tracking-[0.14em] text-ink">How this was produced</h2>
        <p className="meta text-ink-faint">{formatUsd(total)} so far</p>
      </div>

      <ol className="mt-4">
        {AGENTS.map((agent, index) => {
          const run = byAgent.get(agent.id);
          const parallel = agent.id === "mas";

          return (
            <li
              key={agent.id}
              className={`relative border-line pl-7 ${index === AGENTS.length - 1 ? "" : "border-l pb-5"}`}
            >
              {/* The rail marker: filled for a stage that ran, hollow for one
                  that has not. Shape, not colour, carries the distinction. */}
              <span
                aria-hidden="true"
                className={`absolute -left-[5px] top-1 h-[9px] w-[9px] rounded-full border-2 ${
                  run ? "border-[var(--accent)] bg-[var(--accent)]" : "border-line-strong bg-canvas"
                }`}
              />

              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                <h3 className={`text-[0.9375rem] font-semibold ${run ? "text-ink" : "text-ink-faint"}`}>
                  {agent.name}
                </h3>
                {parallel ? (
                  <span className="meta text-ink-faint">in parallel with the Risk Agent</span>
                ) : null}
              </div>

              <p className="meta mt-0.5 text-ink-faint">{agent.job}</p>

              {run ? (
                <>
                  <p className="mt-1.5 text-[0.9375rem] leading-[1.6] text-ink-muted">
                    {run.produced}
                  </p>
                  <p className="meta mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-ink-faint">
                    <span>{run.model}</span>
                    <Separator />
                    <span>{formatDuration(run.startedAt, run.finishedAt)}</span>
                    <Separator />
                    <span>{formatUsd(run.costUsd)}</span>
                  </p>

                  {/* Dropped and degraded output is shown, not swallowed. An
                      agent that rejected three of its own findings is working
                      correctly, and hiding that would make the output look
                      more authoritative than it is. */}
                  {run.notes.length > 0 ? (
                    <ul className="meta mt-2 space-y-1 border-l-2 border-[var(--warn-line)] pl-2.5 text-[var(--warn-ink)]">
                      {run.notes.map((note) => (
                        <li key={note}>{note}</li>
                      ))}
                    </ul>
                  ) : null}
                </>
              ) : (
                <p className="mt-1.5 text-[0.9375rem] leading-[1.6] text-ink-faint">
                  {agent.id === "evidence" && awaitingApproval
                    ? "Waiting on your approval of the scope below. Nothing is drafted until then."
                    : "Has not run."}
                </p>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function Separator() {
  return (
    <span aria-hidden="true" className="text-line-strong">
      ·
    </span>
  );
}

/** "41s" or "2m 10s" — wall-clock, so a parallel pair visibly overlaps. */
function formatDuration(startedAt: string, finishedAt: string): string {
  const ms = new Date(finishedAt).getTime() - new Date(startedAt).getTime();
  if (!Number.isFinite(ms) || ms < 0) return "unknown";

  const seconds = Math.round(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}
