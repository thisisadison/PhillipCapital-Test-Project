import { formatShortDate } from "@/shared/dates";
import type { TrendPoint } from "@/shared/digestStats";

const WIDTH = 320;
const HEIGHT = 56;
const PADDING = 6;

/**
 * Entries per edition over time.
 *
 * A line, because the job is reading the shape of a series over time rather than
 * comparing individual editions. One series, so no legend — the heading names
 * what is plotted — and only the final point is labelled: a value on every point
 * is noise, and the table underneath carries the rest.
 */
export function TrendSparkline({ points }: { points: TrendPoint[] }) {
  if (points.length < 2) return null;

  const counts = points.map((point) => point.count);
  const max = Math.max(...counts, 1);
  const step = points.length > 1 ? (WIDTH - PADDING * 2) / (points.length - 1) : 0;

  const coordinates = points.map((point, index) => ({
    ...point,
    x: PADDING + index * step,
    // Anchor the scale at zero so the shape reflects the counts, not a
    // magnified slice of them.
    y: HEIGHT - PADDING - (point.count / max) * (HEIGHT - PADDING * 2),
  }));

  const path = coordinates
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`)
    .join(" ");

  const last = coordinates[coordinates.length - 1]!;
  const first = coordinates[0]!;

  return (
    <figure className="m-0">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="h-14 w-full"
        role="img"
        aria-label={`Entries per edition, ${points.length} editions from ${formatShortDate(first.date)} to ${formatShortDate(last.date)}.`}
      >
        <line
          x1={PADDING}
          y1={HEIGHT - PADDING}
          x2={WIDTH - PADDING}
          y2={HEIGHT - PADDING}
          stroke="var(--chart-axis)"
          strokeWidth="1"
        />
        <path d={path} fill="none" stroke="var(--series-1)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {/* A 2px ring in the surface colour keeps the end marker legible where
            it sits on the line. */}
        <circle cx={last.x} cy={last.y} r="4" fill="var(--series-1)" stroke="var(--surface)" strokeWidth="2" />
      </svg>

      <table className="sr-only">
        <caption>Entries published in each edition</caption>
        <thead>
          <tr>
            <th scope="col">Edition</th>
            <th scope="col">Entries</th>
          </tr>
        </thead>
        <tbody>
          {points.map((point) => (
            <tr key={point.date}>
              <th scope="row">{formatShortDate(point.date)}</th>
              <td>{point.count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
