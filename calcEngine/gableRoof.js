// ═══════════════════════════════════════════════════════════════
// GABLE ROOF — exact Excel formulas
// Inside rafter count = ROUNDUP(ridgeLen, 0) — 1 per foot!
// SF = ridgeLen * roofRun * 2
// Per-connection-point bent metal dropdowns
// ═══════════════════════════════════════════════════════════════
import { getPrice, FIXED_PRICES, WASTE_FACTOR } from "./pricing.js";
import { n, b, roundUp, addLineItem, makeResult, ZERO_RESULT } from "./helpers.js";

export function calcGableRoof(data, pricing) {
  const qty = n(data, "qty");
  if (qty === 0) return ZERO_RESULT;

  const rise = n(data, "rise");
  const run = n(data, "run") || 12;
  const ridgeLen = n(data, "ridgeLen");
  const purlinLen = n(data, "purlinLen");
  const eaveLen = n(data, "eaveLen");
  const overhang = n(data, "overhang");
  const roofThick = n(data, "roofThick");
  const epsThick = n(data, "epsThick");
  const gableLen = n(data, "gableLen");

  const lineItems = [];
  let mat = 0;

  // ── Geometry ──
  const gableHt = (rise / run) * (0.5 * gableLen);
  const gableRun = Math.sqrt(gableHt * gableHt + (gableLen / 2) ** 2);
  const roofRun = Math.sqrt(gableHt * gableHt + (gableLen / 2 + overhang) ** 2);
  const sf = ridgeLen * roofRun * 2;

  // ── EPS ──
  const epsIdx = n(data, "epsDensity");
  const epsBdFt = sf * epsThick;
  mat += addLineItem(lineItems, "EPS", epsBdFt, "BdFt", getPrice(pricing, "EPS", epsIdx));

  // ── INSIDE RAFTERS ──
  const insideIdx = n(data, "insideRafterType");
  const insideCount = b(data, "insideRafters") ? roundUp(ridgeLen) : 0;
  const insideLen = b(data, "insideRafters") ? gableRun : 0;
  mat += addLineItem(lineItems, "Inside Rafters", insideCount * insideLen, "LnFt", getPrice(pricing, "TUBING", insideIdx));

  // ── OUTSIDE RAFTERS ──
  const outsideIdx = n(data, "outsideRafterType");
  const outsideCount = b(data, "outsideRafters") ? roundUp(ridgeLen) : 0;
  const outsideLen = b(data, "outsideRafters") ? roofRun : 0;
  mat += addLineItem(lineItems, "Outside Rafters", outsideCount * outsideLen, "LnFt", getPrice(pricing, "TUBING", outsideIdx));

  // ── END ROOF PANELS (4 tubes each inside + 4 outside, separate type dropdowns) ──
  const endPanelQty = n(data, "endPanelQty");
  const endInsideIdx = n(data, "endInsideTubeType") || insideIdx;
  const endOutsideIdx = n(data, "endOutsideTubeType") || outsideIdx;
  mat += addLineItem(lineItems, "End Inside Tubes", endPanelQty * 4 * insideLen, "LnFt", getPrice(pricing, "TUBING", endInsideIdx));
  mat += addLineItem(lineItems, "End Outside Tubes", endPanelQty * 4 * outsideLen, "LnFt", getPrice(pricing, "TUBING", endOutsideIdx));

  // ── BENT METAL CONNECTIONS (per-connection-point types) ──
  const insideGableConnQty = n(data, "insideGableConnQty") || 4;
  const outsideGableConnQty = n(data, "outsideGableConnQty") || 4;
  const insideRidgeConnQty = n(data, "insideRidgeConnQty") || 1;
  const outsideRidgeConnQty = n(data, "outsideRidgeConnQty") || 1;
  const insidePurlinConnQty = n(data, "insidePurlinConnQty") || 2;

  if (b(data, "insideGable")) mat += addLineItem(lineItems, "Inside Gable Conn", insideGableConnQty * gableRun, "LnFt", getPrice(pricing, "BENT", n(data, "insideGableConnType")));
  if (b(data, "outsideGable")) mat += addLineItem(lineItems, "Outside Gable Conn", outsideGableConnQty * gableRun, "LnFt", getPrice(pricing, "BENT", n(data, "outsideGableConnType")));
  if (b(data, "insideRidge")) mat += addLineItem(lineItems, "Inside Ridge Conn", insideRidgeConnQty * ridgeLen, "LnFt", getPrice(pricing, "BENT", n(data, "insideRidgeConnType")));
  if (b(data, "outsideRidge")) mat += addLineItem(lineItems, "Outside Ridge Conn", outsideRidgeConnQty * ridgeLen, "LnFt", getPrice(pricing, "BENT", n(data, "outsideRidgeConnType")));
  if (b(data, "insidePurlin")) mat += addLineItem(lineItems, "Inside Purlin Conn", insidePurlinConnQty * purlinLen, "LnFt", getPrice(pricing, "BENT", n(data, "insidePurlinConnType")));
  if (b(data, "outsidePurlin")) mat += addLineItem(lineItems, "Outside Purlin Conn", insidePurlinConnQty * purlinLen, "LnFt", getPrice(pricing, "BENT", n(data, "outsidePurlinConnType")));

  // Wall connections (no overhang)
  if (b(data, "insideWall")) mat += addLineItem(lineItems, "Inside Wall Conn", eaveLen, "LnFt", getPrice(pricing, "BENT", n(data, "insideWallConnType")));
  if (b(data, "outsideWall")) mat += addLineItem(lineItems, "Outside Wall Conn", eaveLen, "LnFt", getPrice(pricing, "BENT", n(data, "outsideWallConnType")));

  // Wall connections (with overhang) — eaveLen * insideWallOHConnQty
  const insideWallOHConnQty = n(data, "insideWallOHConnQty") || 1;
  if (b(data, "insideWallOH")) mat += addLineItem(lineItems, "Inside Wall OH Conn", insideWallOHConnQty * eaveLen * 2, "LnFt", getPrice(pricing, "BENT", n(data, "insideWallOHConnType")));

  // Simpson tie-downs
  if (b(data, "simpsonTieDown")) {
    mat += addLineItem(lineItems, "Simpson Tie-Downs", outsideCount + endPanelQty * 4, "Each", FIXED_PRICES.simpsonTieDown);
  }

  // Gutter board
  const gutterConnQty = n(data, "gutterConnQty") || 2;
  if (b(data, "gutterBoard")) mat += addLineItem(lineItems, "Gutter Board Conn", gutterConnQty * eaveLen, "LnFt", getPrice(pricing, "BENT", n(data, "gutterConnType")));

  // ── INTERIOR SHEATHING ──
  const intSheathIdx = n(data, "intSheathingType");
  const intSheathSF = b(data, "intSheathing") ? ridgeLen * gableRun * 2 : 0;
  mat += addLineItem(lineItems, "Int Sheathing", intSheathSF, "SqFt", getPrice(pricing, "SHEATHING", intSheathIdx));

  // ── WALL STRAPPING ──
  const interiorWallCount = n(data, "interiorWallCount");
  mat += addLineItem(lineItems, "Wall Strapping", interiorWallCount * 3, "Each", FIXED_PRICES.wallStrapping);

  // ── LIFT RINGS, SCREWS ──
  mat += addLineItem(lineItems, "Lift Rings", outsideCount + endPanelQty * 4, "Each", FIXED_PRICES.liftRing);

  const roofScrewIdx = n(data, "roofScrewType");
  mat += addLineItem(lineItems, "Roof Drill Pt Screws", roundUp(outsideLen / 3) * outsideCount, "Each", getPrice(pricing, "RSCREW", roofScrewIdx));
  mat += addLineItem(lineItems, "Wafer Head Screws", (insideCount + outsideCount + outsideCount + endPanelQty * 4 + interiorWallCount * 3) * 10, "Each", FIXED_PRICES.waferHeadScrew);
  mat += addLineItem(lineItems, "Sheathing Fasteners", intSheathSF, "Each", FIXED_PRICES.sheathingFastener);

  const waste = mat * WASTE_FACTOR;
  const totalMat = (mat + waste) * qty;
  const totalSF = sf * qty;

  return makeResult(totalSF, totalMat - waste * qty, 0, lineItems, waste * qty);
}
