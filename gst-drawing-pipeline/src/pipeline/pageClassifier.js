/**
 * Page classifier - determines the type of drawing from an image.
 *
 * Phase 2 placeholder: currently returns a default classification.
 * TODO: Use Claude Vision to classify the page type.
 *
 * @param {string} imagePath - absolute path to the page image
 * @returns {Promise<{ type: string, confidence: number }>}
 */
async function classifyPage(imagePath) {
  // MVP placeholder - always returns floor_plan with low confidence
  // Phase 2 will use Claude Vision to classify:
  //   - floor_plan
  //   - elevation
  //   - section
  //   - detail
  //   - cover_sheet
  //   - schedule
  //   - site_plan
  return {
    type: "floor_plan",
    confidence: 50,
  };
}

module.exports = { classifyPage };
