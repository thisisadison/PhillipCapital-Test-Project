/**
 * The publisher reduced to a mark.
 *
 * A short acronym is already the mark and is kept whole — "MAS" cut to "MA"
 * reads as a rendering bug rather than as a logo. Anything longer falls back to
 * initials.
 */
export function monogramFor(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";

  const first = words[0]!;
  if (words.length === 1) {
    const isShortAcronym = first.length <= 3 && first === first.toUpperCase();
    return (isShortAcronym ? first : first.slice(0, 2)).toUpperCase();
  }

  // Skip a leading article: "The IIA" should read as "IIA", not "TI".
  const meaningful = first.toLowerCase() === "the" ? words.slice(1) : words;
  const lead = meaningful[0] ?? first;
  if (meaningful.length === 1 && lead.length <= 3 && lead === lead.toUpperCase()) {
    return lead.toUpperCase();
  }

  return `${lead[0] ?? ""}${meaningful[1]?.[0] ?? ""}`.toUpperCase();
}
