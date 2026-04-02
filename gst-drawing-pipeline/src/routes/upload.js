const { v4: uuidv4 } = require("uuid");
const path = require("path");
const fs = require("fs");
const { ensureJobDirs } = require("../utils/fileStore");
const { processJob } = require("../pipeline/orchestrator");

/**
 * POST /api/upload
 * Accepts a multipart file upload, creates a job, and kicks off the pipeline.
 */
async function uploadHandler(req, res, next) {
  try {
    // Validate file
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const jobId = uuidv4();

    // Create job directories
    ensureJobDirs(jobId);

    // Copy uploaded file into the job's upload directory
    const destDir = path.join(__dirname, "..", "..", "uploads", jobId);
    fs.mkdirSync(destDir, { recursive: true });
    const destPath = path.join(destDir, req.file.originalname);
    fs.copyFileSync(req.file.path, destPath);

    // Start pipeline asynchronously (fire-and-forget)
    processJob(jobId, destPath).catch((err) => {
      console.error(`Pipeline failed for job ${jobId}:`, err);
    });

    return res.status(202).json({
      jobId,
      status: "processing",
    });
  } catch (err) {
    next(err);
  }
}

module.exports = uploadHandler;
