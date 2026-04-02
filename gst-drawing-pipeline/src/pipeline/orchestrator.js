const path = require("path");
const fs = require("fs");
const { createJobLogger } = require("../utils/logger");
const { ensureJobDirs, getJobPath, writeStatus } = require("../utils/fileStore");
const { detectHighlights } = require("./highlightDetector");
const { extractGeometry } = require("./visionExtractor");
const { mapToEstimatingForm } = require("./fieldMapper");

// Image extensions we handle directly
const IMAGE_EXTS = [".png", ".jpg", ".jpeg", ".tiff", ".tif"];
const PDF_EXTS = [".pdf"];

/**
 * Main pipeline coordinator. Runs all processing steps for a job.
 *
 * @param {string} jobId
 * @param {string} filePath - absolute path to the uploaded file
 */
async function processJob(jobId, filePath) {
  const outputDir = getJobPath(jobId);
  const logger = createJobLogger(jobId, outputDir);

  try {
    // Step 1: file_received
    const fileName = path.basename(filePath);
    const fileSize = fs.statSync(filePath).size;
    writeStatus(jobId, {
      jobId,
      status: "processing",
      step: "file_received",
      updatedAt: new Date().toISOString(),
    });
    logger.logStep("file_received", `Received ${fileName} (${(fileSize / 1024).toFixed(1)} KB)`, null, {
      fileName,
      fileSize,
    });

    // Step 2: detect file type
    const ext = path.extname(filePath).toLowerCase();
    const isImage = IMAGE_EXTS.includes(ext);
    const isPdf = PDF_EXTS.includes(ext);

    logger.logStep("detect_type", `File type: ${ext} (image=${isImage}, pdf=${isPdf})`, null, {
      ext,
      isImage,
      isPdf,
    });

    if (isPdf) {
      // PDF support is a phase 2 placeholder
      writeStatus(jobId, {
        jobId,
        status: "error",
        step: "detect_type",
        error: "PDF processing not yet implemented. Please upload an image (PNG, JPG, TIFF).",
        updatedAt: new Date().toISOString(),
      });
      logger.logStep("detect_type", "PDF support not yet implemented", null, null);
      return;
    }

    if (!isImage) {
      writeStatus(jobId, {
        jobId,
        status: "error",
        step: "detect_type",
        error: `Unsupported file type: ${ext}`,
        updatedAt: new Date().toISOString(),
      });
      logger.logStep("detect_type", `Unsupported file type: ${ext}`, null, null);
      return;
    }

    // Step 3: highlight detection
    writeStatus(jobId, {
      jobId,
      status: "processing",
      step: "highlight_detection",
      updatedAt: new Date().toISOString(),
    });

    const overlaysDir = getJobPath(jobId, "overlays");
    const highlightResult = await detectHighlights(filePath, overlaysDir);
    logger.logStep(
      "highlight_detection",
      `Detected ${highlightResult.highlight_count} highlighted regions`,
      null,
      highlightResult
    );

    // Step 4: vision extraction
    writeStatus(jobId, {
      jobId,
      status: "processing",
      step: "vision_extraction",
      updatedAt: new Date().toISOString(),
    });

    // Use cleaned image if highlights were found, otherwise use original
    const imageForVision =
      highlightResult.highlight_count > 0 && highlightResult.cleaned_path
        ? highlightResult.cleaned_path
        : filePath;

    const extractionResult = await extractGeometry(imageForVision, highlightResult);
    logger.logStep(
      "vision_extraction",
      `Extracted ${(extractionResult.walls || []).length} walls, ${(extractionResult.windows || []).length} windows, ${(extractionResult.doors || []).length} doors`,
      null,
      { wallCount: (extractionResult.walls || []).length }
    );

    // Step 5: field mapping
    writeStatus(jobId, {
      jobId,
      status: "processing",
      step: "field_mapping",
      updatedAt: new Date().toISOString(),
    });

    const mapped = mapToEstimatingForm(extractionResult);
    logger.logStep(
      "field_mapping",
      `Mapped to estimating form: ${mapped.flags.length} flags`,
      null,
      { flagCount: mapped.flags.length, flags: mapped.flags }
    );

    // Step 6: write result.json
    const overlayUrl = highlightResult.overlay_path
      ? `/output/${jobId}/overlays/scope_overlay.png`
      : null;

    const result = {
      jobId,
      formData: mapped.formData,
      confidence: mapped.confidence,
      flags: mapped.flags,
      overlayUrl,
      extraction: extractionResult,
      traceLog: logger.getTrace(),
      completedAt: new Date().toISOString(),
    };

    const resultPath = getJobPath(jobId, "result.json");
    fs.writeFileSync(resultPath, JSON.stringify(result, null, 2), "utf-8");
    logger.logStep("write_result", "Result written to result.json", null, null);

    // Step 7: update status to complete
    writeStatus(jobId, {
      jobId,
      status: "complete",
      step: "done",
      updatedAt: new Date().toISOString(),
    });
    logger.logStep("complete", "Pipeline finished successfully", null, null);
  } catch (err) {
    console.error(`[orchestrator] Job ${jobId} failed:`, err);

    writeStatus(jobId, {
      jobId,
      status: "error",
      step: "pipeline_error",
      error: err.message,
      updatedAt: new Date().toISOString(),
    });

    logger.logStep("error", err.message, null, { stack: err.stack });
  }
}

module.exports = { processJob };
