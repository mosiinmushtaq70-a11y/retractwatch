import fs from "fs";
import path from "path";

const samplesDir = path.join(process.cwd(), "samples");
if (!fs.existsSync(samplesDir)) {
  fs.mkdirSync(samplesDir, { recursive: true });
}

// 1. Create a ready-to-paste bibliography text file
const bibliographyText = `
REFERENCES

1. Vaswani, A., Shazeer, N., Parmar, N., Uszkoreit, J., Jones, L., Gomez, A. N., Kaiser, L., & Polosukhin, I. (2017). Attention is all you need. Advances in Neural Information Processing Systems, 30. doi:10.48550/arXiv.1706.03762

2. Mehra, M. R., Desai, S. S., Ruschitzka, F., & Patel, A. N. (2020). Hydroxychloroquine or chloroquine with or without a macrolide for treatment of COVID-19: a multinational registry analysis. The Lancet. doi:10.1016/S0140-6736(20)31180-6

3. Wakefield, A. J., Murch, S. H., Anthony, A., Linnell, J., Casson, D. M., Malik, M., Berelowitz, M., Dhillon, A. P., Thomson, M. A., Harvey, P., Valentine, A., Davies, S. E., & Walker-Smith, J. A. (1998). Ileal-lymphoid-nodular hyperplasia, non-specific colitis, and pervasive developmental disorder in children. The Lancet, 351(9103), 637-641. doi:10.1016/S0140-6736(97)11096-0

4. Obokata, H., Sasai, Y., Niwa, H., Kadota, M., Andrabi, M., Takata, N., Tokuzawa, Y., Takeichi, M., & Vacanti, C. A. (2014). Stimulus-triggered fate conversion of somatic cells into pluripotency. Nature, 505(7485), 641-647. doi:10.1038/nature12968

5. Chen, L., & Wu, H. (2021). Systematic review and meta-analysis of antiviral therapies in hospitalized patients. Journal of Medical Virology, 93(4), 1882-1891.
`.trim();

fs.writeFileSync(path.join(samplesDir, "sample_bibliography.txt"), bibliographyText, "utf8");

// 2. Generate a valid, parseable PDF file containing this text
function createSimplePdf(textContent) {
  const lines = textContent.split("\n");
  let streamContent = "BT\n/F1 10 Tf\n20 750 Td\n14 TL\n";
  for (const line of lines) {
    const escaped = line.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
    streamContent += `(${escaped}) '\n`;
  }
  streamContent += "ET";

  const streamLength = Buffer.byteLength(streamContent, "utf8");

  const pdf = `%PDF-1.4
1 0 obj
<<
  /Type /Catalog
  /Pages 2 0 R
>>
endobj
2 0 obj
<<
  /Type /Pages
  /Kids [3 0 R]
  /Count 1
>>
endobj
3 0 obj
<<
  /Type /Page
  /Parent 2 0 R
  /Resources <<
    /Font <<
      /F1 <<
        /Type /Font
        /Subtype /Type1
        /BaseFont /Helvetica
      >>
    >>
  >>
  /MediaBox [0 0 612 792]
  /Contents 4 0 R
>>
endobj
4 0 obj
<<
  /Length ${streamLength}
>>
stream
${streamContent}
endstream
endobj
xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000300 00000 n 
trailer
<<
  /Size 5
  /Root 1 0 R
>>
startxref
${400 + streamLength}
%%EOF`;

  return Buffer.from(pdf, "utf8");
}

const pdfBuffer = createSimplePdf(bibliographyText);
fs.writeFileSync(path.join(samplesDir, "sample_retracted_paper.pdf"), pdfBuffer);

console.log("✅ Successfully created:");
console.log("  - samples/sample_retracted_paper.pdf (Ready to drop into PDF uploader)");
console.log("  - samples/sample_bibliography.txt (Ready to paste into text box)");
