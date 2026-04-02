const { spawn } = require("child_process");
const path = require("path");

const PIPELINE_ROOT = path.resolve(__dirname, "..", "..");

/**
 * Run a Python script using the project venv interpreter.
 *
 * Captures stdout (expects JSON), logs stderr.
 * Throws on non-zero exit or timeout.
 *
 * @param {string} scriptPath - path to .py script (relative to pipeline root or absolute)
 * @param {string[]} args - CLI arguments to pass
 * @param {object} [options]
 * @param {number} [options.timeout=120000] - timeout in ms
 * @param {string} [options.cwd] - working directory
 * @returns {Promise<object>} parsed JSON from stdout
 */
function runPython(scriptPath, args, options = {}) {
  const timeout = options.timeout || 120000;
  const cwd = options.cwd || PIPELINE_ROOT;

  // Resolve python interpreter path
  const pythonVenv = process.env.PYTHON_VENV || "./python/venv/Scripts/python";
  const pythonExe = path.resolve(PIPELINE_ROOT, pythonVenv);

  // Resolve script path
  const resolvedScript = path.isAbsolute(scriptPath)
    ? scriptPath
    : path.resolve(PIPELINE_ROOT, scriptPath);

  return new Promise((resolve, reject) => {
    let stdout = "";
    let stderr = "";
    let killed = false;

    const proc = spawn(pythonExe, [resolvedScript, ...args], {
      cwd,
      timeout,
      env: { ...process.env },
    });

    proc.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    proc.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    proc.on("error", (err) => {
      reject(new Error(`Python process error: ${err.message}`));
    });

    proc.on("close", (code) => {
      if (stderr) {
        console.error(`[pythonRunner] stderr from ${path.basename(resolvedScript)}:\n${stderr}`);
      }

      if (code !== 0) {
        reject(
          new Error(
            `Python script ${path.basename(resolvedScript)} exited with code ${code}.\nstderr: ${stderr}\nstdout: ${stdout}`
          )
        );
        return;
      }

      // Parse JSON from stdout
      try {
        const result = JSON.parse(stdout.trim());
        resolve(result);
      } catch (parseErr) {
        reject(
          new Error(
            `Failed to parse JSON from Python stdout.\nstdout: ${stdout}\nparse error: ${parseErr.message}`
          )
        );
      }
    });

    // Handle timeout
    const timer = setTimeout(() => {
      killed = true;
      proc.kill("SIGTERM");
      reject(
        new Error(
          `Python script ${path.basename(resolvedScript)} timed out after ${timeout}ms`
        )
      );
    }, timeout);

    proc.on("close", () => clearTimeout(timer));
  });
}

module.exports = { runPython };
