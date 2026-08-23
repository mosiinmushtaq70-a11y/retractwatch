/**
 * Utility functions for extracting and normalizing DOIs from citation text.
 */

export function extractDoiFromText(text: string | undefined | null): string | null {
  if (!text || typeof text !== "string") return null;
  
  // Match standard DOI pattern (10.xxxx/...)
  const match = text.match(/\b(10\.\d{4,9}\/[-._;()/:A-Za-z0-9]+)/i);
  if (!match) return null;
  
  let doi = match[1].trim();
  // Strip trailing punctuation often attached in citations like '.', ';', ')', ']'
  doi = doi.replace(/[.,;:)\]\s]+$/, "");
  return doi || null;
}

export function cleanTitleForCrossRef(raw: string | undefined | null): string {
  if (!raw || typeof raw !== "string") return "";
  let clean = raw.trim();
  
  // Remove leading numbers like "1. ", "[1] ", "1) "
  clean = clean.replace(/^(\[\d+\]|\d+\.|\d+\))\s*/, "");
  
  // Remove embedded DOI strings so CrossRef doesn't search for "doi: 10.xxxx" as title
  clean = clean.replace(/(doi:\s*10\.\d{4,9}\/[^\s]+|https?:\/\/doi\.org\/[^\s]+)/gi, "");
  
  // Remove tags like [RETRACTED], [PREPRINT], etc.
  clean = clean.replace(/\[(retracted|preprint|review|case report)\]/gi, "");
  
  return clean.trim() || raw.trim();
}
