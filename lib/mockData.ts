/** Frontend-only demo payloads ΓÇö swap for Convex/API later without changing UI. */

export type CitationStatus =
  | "pending"
  | "checking"
  | "clean"
  | "retracted"
  | "cascade"
  | "unverified";

export interface MockCitation {
  id: string;
  title: string;
  authors: string;
  year: number | null;
  doi: string | null;
  status: CitationStatus;
  retractionReason?: string;
  retractionDate?: string;
  retractionCountry?: string;
  retractionJournal?: string;
  cascadeVia?: string;
}

export interface DownstreamRisk {
  retractedCount: number;
  cascadeCount: number;
  flaggedInBibliography: number;
  totalReferences: number;
  estimatedDirectCitations: number;
  estimatedDownstreamPapers: number;
  worstCaseDownstream: number;
  riskLevel: "low" | "moderate" | "high" | "critical";
  explanation: string;
}

export interface MockJob {
  status: string;
  integrityScore: number;
  downstreamRisk: DownstreamRisk;
  processedCount: number;
  totalCitations: number;
}

export const MOCK_JOB: MockJob = {
  status: "complete",
  integrityScore: 61,
  totalCitations: 8,
  processedCount: 8,
  downstreamRisk: {
    retractedCount: 1,
    cascadeCount: 1,
    flaggedInBibliography: 2,
    totalReferences: 8,
    estimatedDirectCitations: 24,
    estimatedDownstreamPapers: 50,
    worstCaseDownstream: 150,
    riskLevel: "moderate",
    explanation:
      "Your bibliography has 2 flagged references (1 retracted, 1 cascade). If this work is cited broadly, roughly 50 downstream papers could be exposed along citation chains (illustrative model).",
  },
};

export const MOCK_CITATIONS: MockCitation[] = [
  {
    id: "1",
    title: "Machine learning for systematic review screening",
    authors: "Lee, J.; Kim, S.",
    year: 2022,
    doi: "10.1000/example.clean1",
    status: "clean",
  },
  {
    id: "2",
    title: "Hydroxychloroquine in hospitalized patients with Covid-19",
    authors: "Mehra, M. R. et al.",
    year: 2020,
    doi: "10.1016/S0140-6736(20)31180-6",
    status: "retracted",
    retractionReason: "Data fabrication ΓÇö fake patient database",
    retractionDate: "2020-06-04",
    retractionCountry: "United States",
    retractionJournal: "The Lancet",
  },
  {
    id: "3",
    title: "Cardiovascular outcomes with drug-eluting stents",
    authors: "Patel, R. et al.",
    year: 2019,
    doi: "10.1000/example.clean2",
    status: "clean",
  },
  {
    id: "4",
    title: "Meta-analysis of antiviral therapies",
    authors: "Chen, L.; Wu, H.",
    year: 2021,
    doi: "10.1000/example.cascade",
    status: "cascade",
    retractionCountry: "United States",
    retractionJournal: "The Lancet",
    retractionReason: "Upstream retracted source in reference list",
    cascadeVia: "Hydroxychloroquine in hospitalized patients with Covid-19",
  },
  {
    id: "5",
    title: "Nutrition guidelines and population health",
    authors: "Adams, K.",
    year: 2018,
    doi: null,
    status: "unverified",
  },
  {
    id: "6",
    title: "Biostatistics in clinical trials",
    authors: "Nguyen, T.",
    year: 2023,
    doi: "10.1000/example.clean3",
    status: "clean",
  },
  {
    id: "7",
    title: "Immunology of respiratory viruses",
    authors: "Okafor, I. et al.",
    year: 2020,
    doi: "10.1000/example.clean4",
    status: "clean",
  },
  {
    id: "8",
    title: "Hospital surge capacity modeling",
    authors: "Brown, D.",
    year: 2021,
    doi: "10.1000/example.clean5",
    status: "clean",
  },
];
