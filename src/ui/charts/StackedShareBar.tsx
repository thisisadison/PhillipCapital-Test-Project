import type { ReactNode } from "react";

export interface ShareSegment {
  key: string;
  label: string;
  count: number;
  /** A CSS colour, normally `var(--series-N)`. */
  color: string;
}

/**
 * A single horizontal stacked bar showing part-to-whole across a few classes.
 *
 * Chosen over a pie or donut because the reader's job is comparing a handful of
 * counts and reading the total, which a length encoding does better than angle.
 *
 * Every segment is separated by a 2px gap in the surface colour rather than a
 * stroke, so neighbouring hues stay distinct without adding ink that is not
 * data. Labels ride below the bar rather than inside it: interior segments have
 * no free end, and a label that has to be clipped to fit is worse than no label.
 * The table underneath carries every value, which is also what discharges the
 * palette's light-mode contrast warning.
 */
export function StackedShareBar({
  segments,
  caption,
  tableCaption,
}: {
  segments: ShareSegment[];
  caption?: ReactNode;
  /** Names the table for screen readers. */
  tableCaption: string;
}) {
  const present = segments.filter((segment) => segment.count > 0);
  const total = present.reduce((sum, segment) => sum + segment.count, 0);

  if (total === 0) {
    return <p className="meta text-ink-faint">Nothing to show yet.</p>;
  }

  return (
    <figure className="m-0">
      <div
        // The bar is decorative once the table exists; the table is the
        // accessible representation, so it is not duplicated to a screen reader.
        aria-hidden="true"
        className="flex h-2.5 w-full gap-[2px] overflow-hidden rounded-full"
      >
        {present.map((segment) => (
          <div
            key={segment.key}
            className="h-full first:rounded-l-full last:rounded-r-full"
            style={{
              width: `${(segment.count / total) * 100}%`,
              backgroundColor: segment.color,
            }}
            title={`${segment.label}: ${segment.count}`}
          />
        ))}
      </div>

      <ul aria-hidden="true" className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
        {present.map((segment) => (
          <li key={segment.key} className="meta flex items-center gap-1.5 text-ink-muted">
            <span
              className="inline-block h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: segment.color }}
            />
            {segment.label}
            <span className="text-ink-faint">{segment.count}</span>
          </li>
        ))}
      </ul>

      {caption ? <figcaption className="meta mt-2 text-ink-faint">{caption}</figcaption> : null}

      <table className="sr-only">
        <caption>{tableCaption}</caption>
        <thead>
          <tr>
            <th scope="col">Category</th>
            <th scope="col">Entries</th>
          </tr>
        </thead>
        <tbody>
          {present.map((segment) => (
            <tr key={segment.key}>
              <th scope="row">{segment.label}</th>
              <td>{segment.count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
