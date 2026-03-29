import { notFound } from "next/navigation";
import { ResultsPageClient } from "./ResultsPageClient";

export default async function ResultsPage({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  const { jobId } = await params;
  if (jobId === "demo") {
    notFound();
  }
  return <ResultsPageClient jobId={jobId} />;
}
