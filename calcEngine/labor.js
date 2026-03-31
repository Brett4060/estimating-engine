// ═══════════════════════════════════════════════════════════════
// LABOR — exact Excel formulas from Labor sheet
//
// Labor = panelCount * hoursPerPanel * avgCostPerHour
// avgCostPerHour = $30.91 (7 employees, rates summed * 1.15 burden / 7)
//
// Panel counts use height-based multipliers:
//   <=8ft: 1.0x, 8-12ft: 1.07x, 12-14ft: 1.15x,
//   14-16ft: 1.4x, 16-20ft: 1.6x, >20ft: 1.8x
// ═══════════════════════════════════════════════════════════════

// Employee rates from Labor sheet R5:S11
const EMPLOYEES = [
  { name: "SR", rate: 30 },
  { name: "JS", rate: 32 },
  { name: "TS", rate: 23 },
  { name: "PC", rate: 23 },
  { name: "MB", rate: 31 },
  { name: "CU", rate: 26 },
  { name: "RH", rate: 23 },
];

const TOTAL_RATE = EMPLOYEES.reduce((s, e) => s + e.rate, 0); // 188
const BURDENED_RATE = TOTAL_RATE * 1.15; // 216.2
export const AVG_COST_PER_HOUR = BURDENED_RATE / EMPLOYEES.length; // ~30.89

// Minutes per panel by type — summed from all production stages
// These are the totals from row 52 of the Labor sheet
const MINUTES_PER_PANEL = {
  wall:         100.25,  // D52: prep+router+cutter+metalFab+tubing+assembly
  corner:        53.5,   // E52
  window_small:  95.0,   // F52 (width <= 4ft)
  window_large: 120.0,   // G52 (width > 4ft)
  door:          60.0,   // H52
  gable:         55.0,   // I52 (per 4ft of gable)
  box_beam:       1.5,   // J52 (per linear foot)
  roof_hip:     160.0,   // K52
  roof_gable:   155.0,   // L52
  roof_end:      90.0,   // M52
  single_slope: 130.0,   // N52
  shear_wall:    80.0,   // O52
  skylight:       6.0,   // P54 (hours, not minutes — per unit)
};

// Hours per 8ft panel (row 54 = minutes/60)
const HOURS_PER_PANEL = {};
Object.keys(MINUTES_PER_PANEL).forEach(k => {
  HOURS_PER_PANEL[k] = MINUTES_PER_PANEL[k] / 60;
});
// Special cases from Excel
HOURS_PER_PANEL.box_beam = MINUTES_PER_PANEL.box_beam / 4; // per 4 LnFt
HOURS_PER_PANEL.roof_hip = 2.5; // hardcoded in Excel K54
HOURS_PER_PANEL.skylight = 6.0; // hardcoded in Excel P54

// Height multiplier for wall-like panels
function heightMultiplier(height) {
  if (height <= 8) return 1.0;
  if (height <= 12) return 1.07;
  if (height <= 14) return 1.15;
  if (height <= 16) return 1.4;
  if (height <= 20) return 1.6;
  return 1.8;
}

// Window width multiplier
function windowWidthMultiplier(width) {
  if (width <= 4) return 1.0;
  if (width <= 8) return 1.3;
  if (width <= 12) return 1.6;
  if (width <= 16) return 2.0;
  if (width <= 20) return 2.3;
  return 2.6;
}

/**
 * Calculate wall panel count for labor
 * Excel: ROUNDUP(SF/8/height, 0) * heightMultiplier * totalUnits
 */
export function calcWallPanelCount(sf, height, totalUnits) {
  if (height <= 0 || totalUnits <= 0) return 0;
  const basePanels = Math.ceil(sf / 8 / height);
  return Math.ceil(basePanels * heightMultiplier(height)) * totalUnits;
}

/**
 * Calculate corner count for labor
 * Excel: ROUNDUP(cornerQty * heightMultiplier, 0)
 */
export function calcCornerCount(cornerQty, height) {
  return Math.ceil(cornerQty * heightMultiplier(height));
}

/**
 * Calculate window panel count for labor
 * Excel uses width to determine small/large and multiplier
 */
export function calcWindowPanelCount(width, totalUnits) {
  if (totalUnits <= 0) return 0;
  return Math.ceil(totalUnits * windowWidthMultiplier(width));
}

/**
 * Calculate door panel count for labor
 * Uses wall height multiplier
 */
export function calcDoorPanelCount(wallHeight, totalUnits) {
  if (totalUnits <= 0) return 0;
  return Math.ceil(totalUnits * heightMultiplier(wallHeight));
}

/**
 * Calculate gable panel count for labor
 * Excel: ROUNDUP(gableLength/4 * totalUnits * gableLengthMultiplier, 0)
 */
export function calcGablePanelCount(gableLength, totalUnits) {
  if (totalUnits <= 0) return 0;
  let mult = 1.0;
  if (gableLength > 12) mult = 1.3;
  else if (gableLength > 8) mult = 1.2;
  else if (gableLength > 4) mult = 1.1;
  return Math.ceil(gableLength / 4 * totalUnits * mult);
}

/**
 * Calculate labor cost for a component
 * @param {string} panelType - key from HOURS_PER_PANEL
 * @param {number} panelCount - number of panels
 * @returns {number} labor cost in dollars
 */
export function calcLaborCost(panelType, panelCount) {
  const hoursPerPanel = HOURS_PER_PANEL[panelType] || 0;
  return panelCount * hoursPerPanel * AVG_COST_PER_HOUR;
}
