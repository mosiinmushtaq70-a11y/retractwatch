import fs from "fs";
import path from "path";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

async function createManuscript() {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const page = pdfDoc.addPage([595.28, 841.89]); // A4
  const { height } = page.getSize();

  let y = height - 50;

  // Title
  page.drawText("A Comprehensive Review of Antiviral Therapies and Cellular Reprogramming", {
    x: 50,
    y,
    size: 14,
    font: boldFont,
    color: rgb(0.1, 0.1, 0.1),
  });

  y -= 25;
  page.drawText("Mosin Mushtaq et al. — Department of Research & Computational Science (2024)", {
    x: 50,
    y,
    size: 9,
    font,
    color: rgb(0.4, 0.4, 0.4),
  });

  y -= 30;
  page.drawText("Abstract", {
    x: 50,
    y,
    size: 11,
    font: boldFont,
    color: rgb(0.15, 0.15, 0.15),
  });

  y -= 15;
  const abstractText =
    "In this survey, we evaluate machine learning architectures, historical antiviral interventions, and stimulus-triggered pluripotency mechanisms in modern biological workflows. We summarize citations across primary registries.";
  page.drawText(abstractText, {
    x: 50,
    y,
    size: 9.5,
    font,
    color: rgb(0.25, 0.25, 0.25),
    maxWidth: 495,
    lineHeight: 14,
  });

  y -= 50;
  page.drawText("References", {
    x: 50,
    y,
    size: 12,
    font: boldFont,
    color: rgb(0.1, 0.1, 0.1),
  });

  y -= 20;

  const references = [
    "[1] Vaswani, A., Shazeer, N., Parmar, N., Uszkoreit, J., Jones, L., Gomez, A. N., Kaiser, L., & Polosukhin, I. (2017). Attention is all you need. Advances in Neural Information Processing Systems, 30. doi:10.48550/arXiv.1706.03762",
    "[2] Mehra, M. R., Desai, S. S., Ruschitzka, F., & Patel, A. N. (2020). Hydroxychloroquine or chloroquine with or without a macrolide for treatment of COVID-19: a multinational registry analysis. The Lancet. doi:10.1016/S0140-6736(20)31180-6",
    "[3] Wakefield, A. J., Murch, S. H., Anthony, A., Linnell, J., Casson, D. M., et al. (1998). Ileal-lymphoid-nodular hyperplasia, non-specific colitis, and pervasive developmental disorder in children. The Lancet, 351(9103), 637-641. doi:10.1016/S0140-6736(97)11096-0",
    "[4] Obokata, H., Sasai, Y., Niwa, H., Kadota, M., Andrabi, M., Takata, N., et al. (2014). Stimulus-triggered fate conversion of somatic cells into pluripotency. Nature, 505(7485), 641-647. doi:10.1038/nature12968",
    "[5] Chen, L., & Wu, H. (2021). Systematic review and meta-analysis of antiviral therapies in hospitalized patients. Journal of Medical Virology, 93(4), 1882-1891.",
  ];

  for (const ref of references) {
    page.drawText(ref, {
      x: 50,
      y,
      size: 8.5,
      font,
      color: rgb(0.2, 0.2, 0.2),
      maxWidth: 495,
      lineHeight: 12,
    });
    y -= 38;
  }

  const pdfBytes = await pdfDoc.save();
  const samplesDir = path.join(process.cwd(), "samples");
  fs.writeFileSync(path.join(samplesDir, "sample_manuscript_with_retractions.pdf"), pdfBytes);
  console.log("✅ Created samples/sample_manuscript_with_retractions.pdf");
}

createManuscript();
