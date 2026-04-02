const path = require("path");
const { runPython } = require("../utils/pythonRunner");

/**
 * Rasterize a PDF into per-page PNG images.
 * (Phase 2 placeholder - calls the Python rasterize_pdf.py script)
 *
 * @param {string} pdfPath - absolute path to the PDF file
 * @param {string} outputDir - absolute path for output page images
 * @param {object} [options]
 * @param {number} [options.dpi=300] - resolution
 * @returns {Promise<{ pages: string[] }>} list of page image filenames
 */
async function rasterizePdf(pdfPath, outputDir, options = {}) {
  const dpi = options.dpi || 300;
  const popplerPath = process.env.POPPLER_PATH || null;

  const scriptPath = path.join(__dirname, "..", "..", "python", "rasterize_pdf.py");

  const args = [
    "--input", pdfPath,
    "--output-dir", outputDir,
    "--dpi", String(dpi),
  ];

  if (popplerPath) {
    args.push("--poppler-path", popplerPath);
  }

  const result = await runPython(scriptPath, args);
  return result;
}

module.exports = { rasterizePdf };
