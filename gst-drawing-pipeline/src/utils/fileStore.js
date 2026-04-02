const fs = require("fs");
const path = require("path");

// Pipeline root directory (two levels up from src/utils/)
const PIPELINE_ROOT = path.resolve(__dirname, "..", "..");

/**
 * Ensure all job directories exist.
 * Creates: uploads/{jobId}/, output/{jobId}/pages/, output/{jobId}/overlays/
 *
 * @param {string} jobId
 */
function ensureJobDirs(jobId) {
  const dirs = [
    path.join(PIPELINE_ROOT, "uploads", jobId),
    path.join(PIPELINE_ROOT, "output", jobId, "pages"),
    path.join(PIPELINE_ROOT, "output", jobId, "overlays"),
  ];
  for (const dir of dirs) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * Resolve an absolute path under output/{jobId}.
 *
 * @param {string} jobId
 * @param {string} [subpath] - optional subpath within the job output dir
 * @returns {string} absolute path
 */
function getJobPath(jobId, subpath) {
  if (subpath) {
    return path.join(PIPELINE_ROOT, "output", jobId, subpath);
  }
  return path.join(PIPELINE_ROOT, "output", jobId);
}

/**
 * Write or update the status.json for a job.
 *
 * @param {string} jobId
 * @param {object} statusObj
 */
function writeStatus(jobId, statusObj) {
  const statusPath = path.join(PIPELINE_ROOT, "output", jobId, "status.json");
  fs.mkdirSync(path.dirname(statusPath), { recursive: true });
  fs.writeFileSync(statusPath, JSON.stringify(statusObj, null, 2), "utf-8");
}

/**
 * Read the status.json for a job.
 *
 * @param {string} jobId
 * @returns {object|null} parsed status or null if not found
 */
function readStatus(jobId) {
  const statusPath = path.join(PIPELINE_ROOT, "output", jobId, "status.json");
  try {
    const data = fs.readFileSync(statusPath, "utf-8");
    return JSON.parse(data);
  } catch (err) {
    return null;
  }
}

module.exports = {
  PIPELINE_ROOT,
  ensureJobDirs,
  getJobPath,
  writeStatus,
  readStatus,
};
