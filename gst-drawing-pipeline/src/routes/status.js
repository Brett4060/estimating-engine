const path = require("path");
const fs = require("fs");
const { readStatus, getJobPath } = require("../utils/fileStore");

/**
 * Route handler that dispatches based on the request path:
 *   GET /api/jobs/:id          -> job status
 *   GET /api/jobs/:id/result   -> result.json
 *   GET /api/jobs/:id/scope-drawing -> overlay PNG
 */
function statusHandler(req, res, next) {
  try {
    const jobId = req.params.id;

    // Determine which sub-route was matched
    const urlPath = req.path;

    // --- GET /api/jobs/:id/result ---
    if (urlPath.endsWith("/result")) {
      const resultPath = getJobPath(jobId, "result.json");
      if (!fs.existsSync(resultPath)) {
        return res.status(404).json({ error: "Result not ready or job not found" });
      }
      const result = JSON.parse(fs.readFileSync(resultPath, "utf-8"));
      return res.json(result);
    }

    // --- GET /api/jobs/:id/scope-drawing ---
    if (urlPath.endsWith("/scope-drawing")) {
      const overlayPath = getJobPath(jobId, "overlays", "scope_overlay.png");
      if (!fs.existsSync(overlayPath)) {
        return res.status(404).json({ error: "Scope drawing not ready or job not found" });
      }
      return res.sendFile(overlayPath);
    }

    // --- GET /api/jobs/:id ---
    const status = readStatus(jobId);
    if (!status) {
      return res.status(404).json({ error: "Job not found" });
    }
    return res.json(status);
  } catch (err) {
    next(err);
  }
}

module.exports = statusHandler;
