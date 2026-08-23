# RetractWatch Verification & Testing Guide

This guide outlines verification procedures for running analysis jobs, testing sample manuscripts, and validating results across the system.

## Available Sample Test Fixtures

Test fixtures are located in the `samples/` directory:

- `samples/sample_manuscript_with_retractions.pdf`: PDF manuscript containing 2 retracted citations (Wakefield MMR, Mehra COVID Hydroxychloroquine), 2 clean citations (Attention is All You Need, XGBoost), and 1 unverified citation.
- `samples/sample_retracted_paper.pdf`: Standalone PDF paper with retracted bibliography entries.
- `samples/attention_is_all_you_need.pdf`: Clean control PDF without retraction contamination.
- `samples/sample_bibliography.txt`: Plaintext references ready for direct copy-paste verification.

## Testing via UI

1. Open `http://localhost:3000` (or `https://retractwatch.vercel.app`).
2. **File Upload Tab**: Drag and drop `samples/sample_manuscript_with_retractions.pdf`.
3. **Paste Text Tab**: Paste the content of `samples/sample_bibliography.txt`.
4. Click **Analyze Bibliography** to launch the real-time pipeline.

## Verification Checklist

- [x] Gauge displays clean citation ratio (`X / N CLEAN`).
- [x] Four-way category breakdown grid (🔴 Retracted, 🟠 Cascade, ⚪ Unverified, 🟢 Clean).
- [x] Replacement literature engine returns verified alternatives for flagged citations.
- [x] Citation cascade network renders nodes with interactive links.
- [x] PDF/HTML report exports generate formatted audit documents.
