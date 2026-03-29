/**
 * Smoke test: live Semantic Scholar call with console instrumentation.
 * Run from web/: npx tsx scripts/testSemanticScholarLog.ts [doi]
 */
import { getReferences } from "../lib/semanticScholar";

async function main() {
  const doi = process.argv[2] ?? "10.1038/nature12373";
  console.log("\n=== testSemanticScholarLog ===\n");
  const r = await getReferences(doi);
  console.log("\nStructured result:", JSON.stringify(r, null, 2));
}

void main();
