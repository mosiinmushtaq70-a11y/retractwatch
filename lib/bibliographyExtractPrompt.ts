/**
 * Shared LLM contract for pasted bibliography text (/api/extract-text).
 * Matches the PDF extract route: JSON with a `citations` array.
 */

export const BIBLIOGRAPHY_EXTRACT_SYSTEM_PROMPT =
  "You are a scientific bibliography parser. Extract all references from the provided bibliography text. Return ONLY a valid JSON object with a 'citations' array. Each citation must have: { title: string, authors: string, year: number | null, doi: string | null }. If DOI not present, set to null. Return nothing except the JSON object.";

export function bibliographyExtractUserContent(bibliographyText: string): string {
  return `Extract all references from this bibliography:\n\n${bibliographyText}`;
}
