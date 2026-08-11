/**
 * Sanitizes user-supplied text before it is interpolated into a PostgREST
 * `.or(...)` filter string. PostgREST treats commas, parentheses, periods,
 * quotes and backslashes as structural characters, so they must be stripped
 * to prevent filter-syntax injection. `%` and `_` are LIKE wildcards and are
 * removed so the term is matched literally.
 */
export function sanitizeSearchTerm(input: string, maxLength = 80): string {
  return (input ?? "")
    .replace(/[,().*%_\\"'`\[\]{}:]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

/** Builds a safe `ilike` OR filter across the given columns. */
export function buildIlikeOrFilter(columns: string[], input: string): string | null {
  const term = sanitizeSearchTerm(input);
  if (!term) return null;
  return columns.map((c) => `${c}.ilike.%${term}%`).join(",");
}
