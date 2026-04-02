const path = require("path");
const { runPython } = require("../utils/pythonRunner");

/**
 * Detect highlighted regions in an architectural drawing image.
 *
 * @param {string} imagePath - absolute path to the input image
 * @param {string} outputDir - absolute path to write detection outputs
 * @returns {Promise<object>} detection result with highlights array, paths, counts
 */
async function detectHighlights(imagePath, outputDir) {
  const scriptPath = path.join(__dirname, "..", "..", "python", "detect_highlights.py");

  const result = await runPython(scriptPath, [
    "--input", imagePath,
    "--output-dir", outputDir,
  ]);

  return result;
}

module.exports = { detectHighlights };
