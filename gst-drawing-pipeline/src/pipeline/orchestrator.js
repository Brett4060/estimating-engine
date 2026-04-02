const path = require("path");
const fs = require("fs");
const { createJobLogger } = require("../utils/logger");
const { ensureJobDirs, getJobPath, writeStatus } = require("../utils/fileStore");
const { detectHighlights } = require("./highlightDetector");
const { extractGeometry } = require("./visionExtractor");
const { mapToEstimatingForm } = require("./fieldMapper");

/**
 * Merge extraction results from multiple pages.
 * Combines walls, windows, doors, gables from all pages.
 */
function mergeExtractions(extractions) {
  const merged = { walls: [], windows: [], doors: [], gables: [], metadata: { notes: [], confidence: "medium" } };
  for (const ext of extractions) {
    if (ext.walls) merged.walls.push(...ext.walls);
    if (ext.windows) merged.windows.push(...ext.windows);
    if (ext.doors) merged.doors.push(...ext.doors);
    if (ext.gables) merged.gables.push(...ext.gables);
    if (ext.metadata?.notes) merged.metadata.notes.push(...ext.metadata.notes);
  }
  return merged;
}

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

    // Collect pages to process
    let pagesToProcess = [];

    if (isPdf) {
      // Step 2b: Rasterize PDF to page images
      writeStatus(jobId, { jobId, status: "processing", step: "pdf_rasterize", updatedAt: new Date().toISOString() });
      const { rasterizePdf } = require("./pdfRasterizer");
      const pagesDir = getJobPath(jobId, "pages");
      const rasterResult = await rasterizePdf(filePath, pagesDir);
      const pageFiles = rasterResult.pages || [];
      logger.logStep("pdf_rasterize", `Rasterized ${pageFiles.length} pages`, null, { pageCount: pageFiles.length });

      if (pageFiles.length === 0) {
        writeStatus(jobId, { jobId, status: "error", step: "pdf_rasterize", error: "No pages extracted from PDF.", updatedAt: new Date().toISOString() });
        return;
      }

      // For MVP: process first 5 pages max (floor plans are usually near the front)
      for (const pageFile of pageFiles.slice(0, 5)) {
        pagesToProcess.push(path.join(pagesDir, pageFile));
      }
    }

    if (!isImage && !isPdf) {
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

    // For single images, just process the one file
    if (isImage) {
      pagesToProcess.push(filePath);
    }

    // Step 3: process each page — highlight detection + vision extraction
    const overlaysDir = getJobPath(jobId, "overlays");
    const allExtractions = [];

    for (let pi = 0; pi < pagesToProcess.length; pi++) {
      const pageImage = pagesToProcess[pi];
      const pageLabel = pagesToProcess.length > 1 ? ` (page ${pi + 1}/${pagesToProcess.length})` : "";

      // Highlight detection
      writeStatus(jobId, { jobId, status: "processing", step: `highlight_detection${pageLabel}`, updatedAt: new Date().toISOString() });
      const highlightResult = await detectHighlights(pageImage, overlaysDir);
      logger.logStep("highlight_detection", `${pageLabel} Detected ${highlightResult.highlight_count} highlighted regions`, null, highlightResult);

      // Vision extraction
      writeStatus(jobId, { jobId, status: "processing", step: `vision_extraction${pageLabel}`, updatedAt: new Date().toISOString() });
      const imageForVision = highlightResult.highlight_count > 0 && highlightResult.cleaned_path ? highlightResult.cleaned_path : pageImage;
      const extractionResult = await extractGeometry(imageForVision, highlightResult);
      logger.logStep("vision_extraction", `${pageLabel} Extracted ${(extractionResult.walls || []).length} walls, ${(extractionResult.windows || []).length} windows`, null, { wallCount: (extractionResult.walls || []).length });

      allExtractions.push(extractionResult);
    }

    // Merge extractions from all pages
    const extractionResult = mergeExtractions(allExtractions);
    logger.logStep("merge", `Merged ${allExtractions.length} page(s) of results`, null, null);

    // Step 5: field mapping
    writeStatus(jobId, { jobId, status: "processing", step: "field_mapping", updatedAt: new Date().toISOString() });
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
