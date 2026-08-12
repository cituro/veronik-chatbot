// Extrage text simplu din fisiere de documentatie incarcate (txt, md, pdf, docx).

const path = require("path");
const fs = require("fs");

async function parseDocument(filePath, originalName) {
  const ext = path.extname(originalName).toLowerCase();
  const buffer = fs.readFileSync(filePath);

  if (ext === ".txt" || ext === ".md" || ext === ".csv") {
    return buffer.toString("utf-8");
  }

  if (ext === ".pdf") {
    const pdfParse = require("pdf-parse");
    const result = await pdfParse(buffer);
    return result.text;
  }

  if (ext === ".docx") {
    const mammoth = require("mammoth");
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }

  throw new Error(`Tip de fisier neacceptat: ${ext || "necunoscut"}. Foloseste .txt, .md, .csv, .pdf sau .docx`);
}

module.exports = { parseDocument };
