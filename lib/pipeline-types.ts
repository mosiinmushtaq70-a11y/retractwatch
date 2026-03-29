/** Shared types for the integrity pipeline (no runtime deps). */

export type RetractionRecord = {
  retractionReason: string;
  retractionDate: string;
  retractionCountry: string;
  retractionJournal: string;
};

export type PipelineCitationStatus =
  | "pending"
  | "checking"
  | "clean"
  | "retracted"
  | "cascade"
  | "cascade-unknown"
  | "unverified";

export type ReferenceRow = {
  title: string;
  doi: string;
  authors: string;
};

export type ReplacementRow = {
  title: string;
  url: string;
  summary: string;
  publishedDate: string;
  relevanceScore: number;
};

export type PipelineCitation = {
  id: string;
  title: string;
  year?: number | string;
  doi?: string;
  authors?: string;
  status: PipelineCitationStatus;
  retraction?: RetractionRecord | null;
  references?: ReferenceRow[];
  replacements?: ReplacementRow[];
  /** Set when status is cascade or cascade-unknown (upstream / API explanation). */
  cascadeVia?: string;
};

export type PipelineUpdateFns = {
  updateCitation: (id: string, updates: unknown) => void | Promise<void>;
  updateJob: (updates: unknown) => void | Promise<void>;
};
