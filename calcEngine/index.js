// ═══════════════════════════════════════════════════════════════
// CALC ENGINE — main entry point
// Replaces the single calcComponentType function in the JSX
// ═══════════════════════════════════════════════════════════════
import { DEFAULT_PRICING, clonePricing, OVERHEAD_PER_SF } from "./pricing.js";
import { calcWalls } from "./walls.js";
import { calcShearWalls } from "./shearWalls.js";
import { calcWindows } from "./windows.js";
import { calcDoors } from "./doors.js";
import { calcGables } from "./gables.js";
import { calcSingleSlope } from "./singleSlope.js";
import { calcGableRoof } from "./gableRoof.js";
import { calcHipRoof } from "./hipRoof.js";
import { calcBoxBeams } from "./boxBeams.js";
import { calcSkylights } from "./skylights.js";
import * as labor from "./labor.js";

export { DEFAULT_PRICING, clonePricing, OVERHEAD_PER_SF };

const CALC_MAP = {
  walls: calcWalls,
  shearWalls: calcShearWalls,
  windows: calcWindows,
  doors: calcDoors,
  gables: calcGables,
  singleSlope: calcSingleSlope,
  gableRoof: calcGableRoof,
  hipRoof: calcHipRoof,
  boxBeams: calcBoxBeams,
  skylights: calcSkylights,
};

/**
 * Calculate material costs for a single component type
 * @param {string} compKey - component key (walls, windows, etc.)
 * @param {object} typeData - form data for this type (A, B, C, D, or E)
 * @param {object} pricing - pricing data (default or user-edited)
 * @returns {{ sf, material, labor, waste, panels, lineItems[], total }}
 */
export function calcComponentType(compKey, typeData, pricing = DEFAULT_PRICING) {
  const fn = CALC_MAP[compKey];
  if (!fn) return { sf: 0, material: 0, labor: 0, waste: 0, panels: 0, lineItems: [], total: 0 };
  return fn(typeData, pricing);
}

/**
 * Calculate labor cost for a component based on its dimensions and panel count
 * This should be called after calcComponentType to add labor costs
 */
export function calcComponentLabor(compKey, typeData) {
  const qty = Number(typeData.qty) || 0;
  if (qty === 0) return 0;

  switch (compKey) {
    case "walls": {
      const h = Number(typeData.height) || 0;
      const l = Number(typeData.length) || 0;
      const sf = h * l;
      const panelCount = labor.calcWallPanelCount(sf, h, qty);
      const cornerCount = labor.calcCornerCount(Number(typeData.cornerQty) || 5, h);
      return labor.calcLaborCost("wall", panelCount) + labor.calcLaborCost("corner", cornerCount);
    }
    case "shearWalls": {
      const h = Number(typeData.height) || 0;
      const panelCount = Math.ceil(qty * labor.heightMultiplier?.(h) || qty);
      return labor.calcLaborCost("shear_wall", qty);
    }
    case "windows": {
      const w = Number(typeData.width) || 0;
      const panelCount = labor.calcWindowPanelCount(w, qty);
      const panelType = w > 4 ? "window_large" : "window_small";
      return labor.calcLaborCost(panelType, panelCount);
    }
    case "doors": {
      const wallHt = Number(typeData.wallHeight) || 0;
      const panelCount = labor.calcDoorPanelCount(wallHt, qty);
      return labor.calcLaborCost("door", panelCount);
    }
    case "gables": {
      const gl = Number(typeData.gableLength) || 0;
      const panelCount = labor.calcGablePanelCount(gl, qty);
      return labor.calcLaborCost("gable", panelCount);
    }
    case "singleSlope":
      return labor.calcLaborCost("single_slope", qty);
    case "gableRoof":
      return labor.calcLaborCost("roof_gable", qty);
    case "hipRoof":
      return labor.calcLaborCost("roof_hip", qty);
    case "boxBeams": {
      const beamLen = Number(typeData.beamLength) || 0;
      return labor.calcLaborCost("box_beam", qty * beamLen);
    }
    case "skylights":
      return labor.calcLaborCost("skylight", qty);
    default:
      return 0;
  }
}

/**
 * Calculate overhead for the entire project
 * Excel: totalSF * $2.59
 * @param {number} totalSF - sum of all wall + roof SF
 */
export function calcOverhead(totalSF) {
  return totalSF * OVERHEAD_PER_SF;
}
