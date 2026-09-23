/**
 * Split a metric value into a leading numeric part and its unit, so the number can be
 * rendered in tabular mono and the unit in a lighter weight. Values are never rewritten -
 * the two halves always concatenate back to the verbatim source string.
 */
export function splitMetric(value: string): { head: string; tail: string } {
  const m = value.match(/^([\d.,]+(?:\s*[→/×x±]\s*[\d.,]+)*)(.*)$/u);
  if (!m) return { head: value, tail: '' };
  return { head: m[1].trim(), tail: m[2] };
}

/** Quick check used by tests: the two halves must always rebuild the verbatim string. */
export function metricRoundTrips(value: string): boolean {
  const { head, tail } = splitMetric(value);
  return (head + tail).replace(/\s+/g, ' ') === value.replace(/\s+/g, ' ');
}

/** Provenance line under a metric: only the fields that were actually supplied. */
export function provenance(m: {
  hardware?: string;
  dataset?: string;
  n?: string;
  illustrative?: boolean;
}): string[] {
  const out: string[] = [];
  if (m.illustrative) out.push('illustrative — not a measurement');
  if (m.hardware) out.push(m.hardware);
  if (m.dataset) out.push(m.dataset);
  if (m.n) out.push(m.n);
  return out;
}

export function dateRange(start: string, end: string | null): string {
  return end === null ? `${start} – present` : start === end ? start : `${start} – ${end}`;
}
