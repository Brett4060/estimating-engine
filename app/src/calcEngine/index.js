// ═══════════════════════════════════════════════════════════════
// CALC ENGINE — main entry point
// ═══════════════════════════════════════════════════════════════
import { DEFAULT_PRICING, clonePricing } from "./pricing.js";
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

export { DEFAULT_PRICING, clonePricing };
export {
  DEFAULT_EMPLOYEES, DEFAULT_MINUTES_PER_PANEL, DEFAULT_BURDEN_RATE,
  DEFAULT_OVERHEAD_PER_SF, DEFAULT_WASTE_FACTOR,
  PANEL_TYPE_LABELS, calcAvgCostPerHour,
} from "./labor.js";

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

export function calcComponentType(compKey, typeData, pricing = DEFAULT_PRICING) {
  const fn = CALC_MAP[compKey];
  if (!fn) return { sf: 0, material: 0, labor: 0, waste: 0, panels: 0, lineItems: [], total: 0 };
  return fn(typeData, pricing);
}

/**
 * Calculate labor cost for a component
 * @param {object} settings - { costPerHour, minutesPerPanel }
 */
export function calcComponentLabor(compKey, typeData, settings = {}) {
  const qty = Number(typeData.qty) || 0;
  if (qty === 0) return 0;

  const cph = settings.costPerHour || labor.AVG_COST_PER_HOUR;
  const mpp = settings.minutesPerPanel || labor.DEFAULT_MINUTES_PER_PANEL;
  const lc = (type, count) => labor.calcLaborCost(type, count, cph, mpp);

  switch (compKey) {
    case "walls": {
      const h = Number(typeData.height) || 0;
      const l = Number(typeData.length) || 0;
      const sf = h * l;
      return lc("wall", labor.calcWallPanelCount(sf, h, qty)) + lc("corner", labor.calcCornerCount(Number(typeData.cornerQty) || 5, h));
    }
    case "shearWalls": {
      const h = Number(typeData.height) || 0;
      return lc("shear_wall", Math.ceil(qty * labor.heightMultiplier(h)));
    }
    case "windows": {
      const w = Number(typeData.width) || 0;
      return lc(w > 4 ? "window_large" : "window_small", labor.calcWindowPanelCount(w, qty));
    }
    case "doors":
      return lc("door", labor.calcDoorPanelCount(Number(typeData.wallHeight) || 0, qty));
    case "gables":
      return lc("gable", labor.calcGablePanelCount(Number(typeData.gableLength) || 0, qty));
    case "singleSlope":
      return lc("single_slope", qty);
    case "gableRoof":
      return lc("roof_gable", qty);
    case "hipRoof":
      return lc("roof_hip", qty);
    case "boxBeams":
      return lc("box_beam", qty * (Number(typeData.beamLength) || 0));
    case "skylights":
      return lc("skylight", qty);
    default:
      return 0;
  }
}

export function calcOverhead(totalSF, overheadPerSF) {
  return totalSF * (overheadPerSF ?? labor.DEFAULT_OVERHEAD_PER_SF);
}
