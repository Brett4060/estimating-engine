const winston = require("winston");
const path = require("path");
const fs = require("fs");

/**
 * Creates a per-job logger that writes to both console and
 * output/{jobId}/trace.json (array of step entries).
 *
 * @param {string} jobId
 * @param {string} outputDir - absolute path to output/{jobId}
 * @returns {{ logStep: Function, getTrace: Function }}
 */
function createJobLogger(jobId, outputDir) {
  const tracePath = path.join(outputDir, "trace.json");
  const trace = [];

  // Ensure output dir exists
  fs.mkdirSync(outputDir, { recursive: true });

  const winstonLogger = winston.createLogger({
    level: process.env.LOG_LEVEL || "debug",
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    ),
    defaultMeta: { jobId },
    transports: [
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.printf(({ timestamp, level, message, jobId, step }) => {
            return `${timestamp} [${level}] [${jobId}] ${step || ""}: ${message}`;
          })
        ),
      }),
    ],
  });

  /**
   * Log a pipeline step.
   *
   * @param {string} stepName
   * @param {string|object} detail
   * @param {number|null} conf - confidence 0-100 or null
   * @param {object|null} output - any output payload to record
   */
  function logStep(stepName, detail, conf, output) {
    const startTime = Date.now();
    const entry = {
      step: stepName,
      status: "ok",
      timestamp: new Date().toISOString(),
      duration_ms: 0,
      detail: typeof detail === "object" ? JSON.stringify(detail) : detail,
      conf: conf != null ? conf : null,
      output: output || null,
    };

    // duration_ms is recorded as 0 for instantaneous log entries.
    // Callers that need elapsed time can compute from timestamps.
    trace.push(entry);

    // Persist trace to disk after every step
    try {
      fs.writeFileSync(tracePath, JSON.stringify(trace, null, 2), "utf-8");
    } catch (err) {
      winstonLogger.error("Failed to write trace file", { error: err.message });
    }

    winstonLogger.info(entry.detail, { step: stepName });

    return entry;
  }

  /**
   * Returns the full trace array.
   */
  function getTrace() {
    return trace;
  }

  return { logStep, getTrace };
}

module.exports = { createJobLogger };
