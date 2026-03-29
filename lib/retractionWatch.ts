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

    for (const row of parsed.data ?? []) {
      if (!row || typeof row !== "object") continue;
      const doiRaw = pick(row, "OriginalPaperDOI", "DOI");
      if (!doiRaw) continue;
      const doi = normalizeDoi(doiRaw);
      if (!doi) continue;

      const rec = rowToRecord(row);
      if (!rec) continue;
      map.set(doi, rec);
    }

    cachedMap = map;
    devLog(`Retraction Watch database loaded: ${map.size} records`);
    return cachedMap;
  } catch {
    cachedMap = empty;
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
