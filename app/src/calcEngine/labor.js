// ═══════════════════════════════════════════════════════════════
// LABOR — exact Excel formulas from Labor sheet
// All constants are now exported as defaults so they can be
// overridden via the Settings tab.
// ═══════════════════════════════════════════════════════════════

export const DEFAULT_EMPLOYEES = [
  { name: "SR", rate: 30 },
  { name: "JS", rate: 32 },
  { name: "TS", rate: 23 },
  { name: "PC", rate: 23 },
  { name: "MB", rate: 31 },
  { name: "CU", rate: 26 },
  { name: "RH", rate: 23 },
];

export const DEFAULT_MINUTES_PER_PANEL = {
  wall:         100.25,
  corner:        53.5,
  window_small:  95.0,
  window_large: 120.0,
  door:          60.0,
  gable:         55.0,
  box_beam:       1.5,
  roof_hip:     160.0,
  roof_gable:   155.0,
  roof_end:      90.0,
  single_slope: 130.0,
  shear_wall:    80.0,
  skylight:       6.0,
};

export const PANEL_TYPE_LABELS = {
  wall: "Wall Panels",
  corner: "Corners",
  window_small: "Windows (0-4')",
  window_large: "Windows (>4')",
  door: "Doors",
  gable: "Gables (per 4ft)",
  box_beam: "Box Beams (per LnFt)",
  roof_hip: "Hip Roof Panels",
  roof_gable: "Gable Roof Panels",
  roof_end: "Roof End Panels",
  single_slope: "Single Slope Panels",
  shear_wall: "Shear Wall Panels",
  skylight: "Skylights",
};

export const DEFAULT_BURDEN_RATE = 1.15;
export const DEFAULT_OVERHEAD_PER_SF = 2.59;
export const DEFAULT_WASTE_FACTOR = 0.05;

export function calcAvgCostPerHour(employees, burdenRate) {
  const total = employees.reduce((s, e) => s + e.rate, 0);
  const burdened = total * burdenRate;
  return employees.length > 0 ? burdened / employees.length : 0;
}

export const AVG_COST_PER_HOUR = calcAvgCostPerHour(DEFAULT_EMPLOYEES, DEFAULT_BURDEN_RATE);

function hoursPerPanel(minutesPerPanel) {
  const hpp = {};
  Object.keys(minutesPerPanel).forEach(k => {
    hpp[k] = minutesPerPanel[k] / 60;
  });
  hpp.box_beam = minutesPerPanel.box_beam / 4;
  hpp.roof_hip = 2.5;
  hpp.skylight = 6.0;
  return hpp;
}

export function heightMultiplier(height) {
  if (height <= 8) return 1.0;
  if (height <= 12) return 1.07;
  if (height <= 14) return 1.15;
  if (height <= 16) return 1.4;
  if (height <= 20) return 1.6;
  return 1.8;
}

function windowWidthMultiplier(width) {
  if (width <= 4) return 1.0;
  if (width <= 8) return 1.3;
  if (width <= 12) return 1.6;
  if (width <= 16) return 2.0;
  if (width <= 20) return 2.3;
  return 2.6;
}

export function calcWallPanelCount(sf, height, totalUnits) {
  if (height <= 0 || totalUnits <= 0) return 0;
  const basePanels = Math.ceil(sf / 8 / height);
  return Math.ceil(basePanels * heightMultiplier(height)) * totalUnits;
}

export function calcCornerCount(cornerQty, height) {
  return Math.ceil(cornerQty * heightMultiplier(height));
}

export function calcWindowPanelCount(width, totalUnits) {
  if (totalUnits <= 0) return 0;
  return Math.ceil(totalUnits * windowWidthMultiplier(width));
}

export function calcDoorPanelCount(wallHeight, totalUnits) {
  if (totalUnits <= 0) return 0;
  return Math.ceil(totalUnits * heightMultiplier(wallHeight));
}

export function calcGablePanelCount(gableLength, totalUnits) {
  if (totalUnits <= 0) return 0;
  let mult = 1.0;
  if (gableLength > 12) mult = 1.3;
  else if (gableLength > 8) mult = 1.2;
  else if (gableLength > 4) mult = 1.1;
  return Math.ceil(gableLength / 4 * totalUnits * mult);
}

export function calcLaborCost(panelType, panelCount, costPerHour, minutesMap) {
  const hpp = hoursPerPanel(minutesMap || DEFAULT_MINUTES_PER_PANEL);
  const h = hpp[panelType] || 0;
  return panelCount * h * (costPerHour || AVG_COST_PER_HOUR);
}
