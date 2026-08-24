// DOCUMENTATION NOTE: Local Retraction Watch CSV lookup — no network calls.

import fs from "fs";
import path from "path";
import Papa from "papaparse";

export interface RetractionRecord {
  retractionReason: string;
  retractionDate: string;
  retractionCountry: string;
  retractionJournal: string;
}

let cachedMap: Map<string, RetractionRecord> | null = null;
let titleMap: Map<string, RetractionRecord> | null = null;
let authorMap: Map<string, number> | null = null;
let loadAttempted = false;

function devLog(...args: unknown[]): void {
  if (process.env.NODE_ENV === "development") console.log(...args);
}

function devWarn(...args: unknown[]): void {
  if (process.env.NODE_ENV === "development") console.warn(...args);
}

function normalizeDoi(doi: string): string {
  try {
    return String(doi ?? "")
      .trim()
      .toLowerCase()
      .replace(/^\s*https?:\/\/doi\.org\//i, "");
  } catch {
    return "";
  }
}

export function normalizeTitle(t: string | undefined): string {
  return String(t || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeAuthor(a: string | undefined): string {
  // Extract just alphanumeric parts for a coarse author-name key
  // E.g., "Jan Hendrik Schön" -> "jan hendrik schon"
  const clean = String(a || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // strip diacritics
    .replace(/[^a-z]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return clean;
}

function csvPath(): string {
  try {
    const filePath = path.resolve(process.cwd(), "data", "retraction_watch.csv");
    console.log("[retractionWatch] retraction_watch.csv path:", filePath);
    return filePath;
  } catch {
    const fallback = path.resolve(process.cwd(), "data", "retraction_watch.csv");
    console.log("[retractionWatch] retraction_watch.csv path (fallback):", fallback);
    return fallback;
  }
}

function pick(row: Record<string, string>, ...keys: string[]): string {
  try {
    for (const key of keys) {
      const v = row[key];
      if (v != null && String(v).trim() !== "") return String(v).trim();
    }
  } catch {
    /* ignore */
  }
  return "";
}

function rowToRecord(row: Record<string, string>): RetractionRecord | null {
  try {
    const retractionReason = pick(row, "Reason", "RetractionReason");
    const retractionDate = pick(row, "RetractionDate");
    const retractionCountry = pick(row, "Country");
    const retractionJournal = pick(row, "Journal");
    return {
      retractionReason,
      retractionDate,
      retractionCountry,
      retractionJournal,
    };
  } catch {
    return null;
  }
}

function loadDatabase(): Map<string, RetractionRecord> {
  if (cachedMap !== null) return cachedMap;
  if (loadAttempted) {
    return cachedMap ?? new Map();
  }
  loadAttempted = true;

  const empty = new Map<string, RetractionRecord>();

  try {
    const filePath = csvPath();
    if (!fs.existsSync(filePath)) {
      devWarn(`[retractionWatch] CSV not found at ${filePath} — using empty database.`);
      cachedMap = empty;
      return cachedMap;
    }

    const text = fs.readFileSync(filePath, "utf8");
    const parsed = Papa.parse<Record<string, string>>(text, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => String(h).trim(),
    });

    const map = new Map<string, RetractionRecord>();
    const tMap = new Map<string, RetractionRecord>();
    const aMap = new Map<string, number>();

    for (const row of parsed.data ?? []) {
      if (!row || typeof row !== "object") continue;
      
      const rec = rowToRecord(row);
      if (!rec) continue;

      const authorStr = pick(row, "Author", "Authors");
      if (authorStr) {
        // Split by semicolon, as RW uses "Author1; Author2"
        const authors = authorStr.split(";");
        for (const auth of authors) {
          const normAuth = normalizeAuthor(auth);
          if (normAuth.length > 3) {
            aMap.set(normAuth, (aMap.get(normAuth) || 0) + 1);
          }
        }
      }

      const titleRaw = pick(row, "Title", "ArticleTitle");
      if (titleRaw) {
        const normTitle = normalizeTitle(titleRaw);
        if (normTitle.length > 20) {
          tMap.set(normTitle, rec);
        }
      }

      const doiRaw = pick(row, "OriginalPaperDOI", "DOI");
      if (!doiRaw) continue;
      const doi = normalizeDoi(doiRaw);
      if (!doi) continue;

      map.set(doi, rec);
    }

    cachedMap = map;
    titleMap = tMap;
    authorMap = aMap;
    devLog(`Retraction Watch database loaded: ${map.size} DOI records, ${tMap.size} title records`);
    return cachedMap;
  } catch {
    cachedMap = empty;
    titleMap = new Map();
    authorMap = new Map();
    devWarn("[retractionWatch] Failed to load CSV — using empty database.");
    return cachedMap;
  }
}

/** Returns `null` if the DOI is not listed as retracted in the local CSV. */
export function isRetracted(doi: string): RetractionRecord | null {
  try {
    const key = normalizeDoi(doi);
    if (!key) return null;
    const db = loadDatabase();
    return db.get(key) ?? null;
  } catch {
    return null;
  }
}

/** Fallback check for exact normalized title match, followed by substring and word-overlap check */
export function isRetractedByTitle(title: string): RetractionRecord | null {
  try {
    loadDatabase();
    const key = normalizeTitle(title);
    if (!key || key.length < 15 || !titleMap) return null;
    
    // 1. Exact match
    if (titleMap.has(key)) return titleMap.get(key) ?? null;

    // 2. Substring match for longer titles (> 25 chars)
    if (key.length > 25) {
      for (const [tKey, rec] of titleMap.entries()) {
        if (tKey.length > 25 && (tKey.includes(key) || key.includes(tKey))) {
          return rec;
        }
      }
    }

    // 3. Significant word overlap matching (handles title variations like "crystal" vs "semiconductors")
    const queryWords = new Set(key.split(/\s+/).filter((w) => w.length > 3));
    if (queryWords.size >= 4) {
      for (const [tKey, rec] of titleMap.entries()) {
        const targetWords = new Set(tKey.split(/\s+/).filter((w) => w.length > 3));
        if (targetWords.size < 4) continue;

        let intersect = 0;
        for (const w of queryWords) {
          if (targetWords.has(w)) intersect++;
        }

        const overlap = intersect / Math.min(queryWords.size, targetWords.size);
        if (overlap >= 0.75 && intersect >= 4) {
          return rec;
        }
      }
    }

    return null;
  } catch {
    return null;
  }
}

/** Get number of retractions associated with an author string. */
export function getAuthorRetractionCount(authorString: string | undefined): number {
  if (!authorString) return 0;
  loadDatabase();
  if (!authorMap) return 0;

  // Split on common author list separators: commas, semicolons, ampersands, 'and'
  const authors = authorString.split(/[,;&]|\band\b/i);
  let maxCount = 0;
  for (const a of authors) {
    const clean = normalizeAuthor(a);
    if (clean.length >= 3) {
      const exact = authorMap.get(clean) || 0;
      if (exact > maxCount) maxCount = exact;
      
      // Also check if any key in authorMap matches this author surname/name
      if (clean.length >= 5) {
        for (const [authKey, count] of authorMap.entries()) {
          if (authKey.includes(clean) || clean.includes(authKey)) {
            if (count > maxCount) maxCount = count;
          }
        }
      }
    }
  }
  
  return maxCount;
}
