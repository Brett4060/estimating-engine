#!/usr/bin/env node
/**
 * Batch Compare — scans client folders for estimating workbooks,
 * imports each through the calc engine, and compares against
 * the Excel's stored Cover Summary totals.
 *
 * Usage: node scripts/batchCompare.js
 * Output: scripts/comparison_report.json + console summary
 */

const fs = require("fs");
const path = require("path");
const XLSX = require("xlsx");

// Note: calc engine is ESM, so we just read Excel data here
// Full calc comparison will happen in the app itself

const CLIENT_DIR = "G:/Documents - Client Files";
const REPORT_PATH = path.join(__dirname, "comparison_report.json");

// Find all Cost Estimate xlsx files
function findEstimateFiles(baseDir) {
  const results = [];
  try {
    const clients = fs.readdirSync(baseDir);
    for (const client of clients) {
      const clientPath = path.join(baseDir, client);
      if (!fs.statSync(clientPath).isDirectory()) continue;
      if (client.startsWith("00") || client.startsWith("~")) continue;

      const costDir = path.join(clientPath, "COSTING-QUOTE-CONTRACT");
      if (!fs.existsSync(costDir)) continue;

      try {
        const files = fs.readdirSync(costDir);
        for (const f of files) {
          if (f.startsWith("~$")) continue;
          if (!f.endsWith(".xlsx")) continue;
          if (f.toLowerCase().includes("cost") && f.toLowerCase().includes("estim")) {
            results.push({ client, file: f, path: path.join(costDir, f) });
          }
          // Also check for "GUARDIAN - Estimating Work sheet" pattern
          if (f.toLowerCase().includes("guardian") && f.toLowerCase().includes("estimat")) {
            // Avoid duplicates
            if (!results.find(r => r.path === path.join(costDir, f))) {
              results.push({ client, file: f, path: path.join(costDir, f) });
            }
          }
        }
      } catch (e) { /* skip unreadable dirs */ }
    }
  } catch (e) {
    console.error("Error scanning:", e.message);
  }
  return results;
}

// Read Cover Summary totals from Excel
function readCoverSummary(wb) {
  const ws = wb.Sheets["Cover Summary"];
  if (!ws) return null;

  const cell = (r, c) => {
    const addr = XLSX.utils.encode_cell({ r: r - 1, c: c - 1 });
    const v = ws[addr];
    return v ? (typeof v.v === "number" ? v.v : parseFloat(v.v) || 0) : 0;
  };

  return {
    walls: { material: cell(32, 2), labor: cell(32, 3) },
    windows: { material: cell(30, 2), labor: cell(30, 3) },
    doors: { material: cell(31, 2), labor: cell(31, 3) },
    shearWalls: { material: cell(33, 2), labor: cell(33, 3) },
    gables: { material: cell(34, 2), labor: cell(34, 3) },
    boxBeams: { material: cell(35, 2), labor: cell(35, 3) },
    singleSlope: { material: cell(36, 2), labor: cell(36, 3) },
    gableRoof: { material: cell(37, 2), labor: cell(37, 3) },
    hipRoof: { material: cell(38, 2), labor: cell(38, 3) },
    skylights: { material: cell(39, 2), labor: cell(39, 3) },
    contractValue: cell(59, 4),
  };
}

// Get sheet names
function getSheetNames(wb) {
  return wb.SheetNames;
}

// Main
function main() {
  console.log("Scanning client folders...");
  const files = findEstimateFiles(CLIENT_DIR);
  console.log(`Found ${files.length} estimating workbooks.\n`);

  const report = [];

  for (const entry of files) {
    console.log(`Processing: ${entry.client} / ${entry.file}`);
    try {
      const wb = XLSX.readFile(entry.path, { type: "file" });
      const sheets = getSheetNames(wb);
      const summary = readCoverSummary(wb);

      if (!summary) {
        console.log("  -> No Cover Summary sheet, skipping.\n");
        continue;
      }

      const hasRoofSheets = {
        gableRoof: sheets.includes("GABLE ROOF"),
        hipRoof: sheets.includes("HIP ROOF"),
        singleSlope: sheets.includes("SINGLE SLOPED ROOF"),
        gables: sheets.includes("GABLES"),
      };

      // Check which components have data (non-zero material in Cover Summary)
      const activeComponents = {};
      for (const [key, vals] of Object.entries(summary)) {
        if (key === "contractValue") continue;
        if (vals.material > 0 || vals.labor > 0) {
          activeComponents[key] = vals;
        }
      }

      const result = {
        client: entry.client,
        file: entry.file,
        sheets: sheets.length,
        contractValue: summary.contractValue,
        activeComponents: Object.keys(activeComponents),
        componentTotals: activeComponents,
        hasRoofSheets,
      };

      report.push(result);

      // Print summary
      const active = Object.keys(activeComponents);
      console.log(`  Sheets: ${sheets.length} | Contract: $${(summary.contractValue || 0).toLocaleString()}`);
      console.log(`  Active: ${active.join(", ") || "(none)"}`);
      console.log();

    } catch (e) {
      console.log(`  -> ERROR: ${e.message}\n`);
      report.push({ client: entry.client, file: entry.file, error: e.message });
    }
  }

  // Write report
  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2));
  console.log(`\nReport written to: ${REPORT_PATH}`);

  // Summary stats
  const valid = report.filter(r => !r.error);
  const withRoof = valid.filter(r => r.activeComponents.includes("gableRoof") || r.activeComponents.includes("hipRoof") || r.activeComponents.includes("singleSlope"));
  const withGables = valid.filter(r => r.activeComponents.includes("gables"));
  const totalContract = valid.reduce((s, r) => s + (r.contractValue || 0), 0);

  console.log("\n=== SUMMARY ===");
  console.log(`Total workbooks: ${files.length}`);
  console.log(`Valid with Cover Summary: ${valid.length}`);
  console.log(`With roof data: ${withRoof.length}`);
  console.log(`With gable data: ${withGables.length}`);
  console.log(`Total contract value: $${totalContract.toLocaleString()}`);
}

main();
