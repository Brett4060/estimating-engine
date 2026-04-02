// ═══════════════════════════════════════════════════════════════
// HIP ROOF — exact Excel formulas
// 4 rafter sets: inside/outside wall-to-ridge + inside/outside wall-to-hip
// Hip rafters use AVERAGE length (roofRun/2)
// Per-connection-point bent metal dropdowns
// ═══════════════════════════════════════════════════════════════
import { getPrice, FIXED_PRICES, WASTE_FACTOR } from "./pricing.js";
import { n, b, roundUp, addLineItem, makeResult, ZERO_RESULT } from "./helpers.js";

export function calcHipRoof(data, pricing) {
  const qty = n(data, "qty");
  if (qty === 0) return ZERO_RESULT;

  const rise = n(data, "rise");
  const run = n(data, "run") || 12;
  const ridgeLen = n(data, "ridgeLen");
  const purlinPar = n(data, "purlinParallel");
  const purlinPerp = n(data, "purlinPerp");
  const eavePar = n(data, "eaveParallel");
  const eavePerp = n(data, "eavePerp");
  const overhang = n(data, "overhang");
  const roofThick = n(data, "roofThick");
  const epsThick = n(data, "epsThick");

  const lineItems = [];
  let mat = 0;

  // ── Geometry ──
  const ridgeHt = (rise / run) * (0.5 * eavePerp);
  const hipRoofRun = Math.sqrt(ridgeHt * ridgeHt + (eavePerp / 2) ** 2);
  const roofRunOH = Math.sqrt(ridgeHt * ridgeHt + (eavePerp / 2 + overhang) ** 2);
  const hipLength = Math.sqrt(roofRunOH * roofRunOH + (eavePerp / 2) ** 2);
  const sf = (eavePerp / 2 * roofRunOH * 4) + (ridgeLen * roofRunOH * 2);

  // ── EPS ──
  const epsIdx = n(data, "epsDensity");
  const epsBdFt = sf * epsThick;
  mat += addLineItem(lineItems, "EPS", epsBdFt, "BdFt", getPrice(pricing, "EPS", epsIdx));

  // ── INSIDE RAFTERS (wall-to-ridge) ──
  const insideIdx = n(data, "insideRafterType");
  const insideCountRidge = b(data, "insideRafters") ? roundUp(ridgeLen) : 0;
  const insideLenRidge = b(data, "insideRafters") ? hipRoofRun : 0;
  mat += addLineItem(lineItems, "Inside Rafters (Ridge)", insideCountRidge * insideLenRidge, "LnFt", getPrice(pricing, "TUBING", insideIdx));

  // ── OUTSIDE RAFTERS (wall-to-ridge) ──
  const outsideIdx = n(data, "outsideRafterType");
  const outsideCountRidge = b(data, "outsideRafters") ? roundUp(ridgeLen) : 0;
  const outsideLenRidge = b(data, "outsideRafters") ? roofRunOH : 0;
  mat += addLineItem(lineItems, "Outside Rafters (Ridge)", outsideCountRidge * outsideLenRidge, "LnFt", getPrice(pricing, "TUBING", outsideIdx));

  // ── INSIDE RAFTERS (wall-to-hip) ──
  const insideCountHip = b(data, "insideRafters2") ? roundUp(eavePerp) : 0;
  const insideLenHip = b(data, "insideRafters2") ? hipRoofRun / 2 : 0;
  mat += addLineItem(lineItems, "Inside Rafters (Hip)", insideCountHip * insideLenHip, "LnFt", getPrice(pricing, "TUBING", insideIdx));

  // ── OUTSIDE RAFTERS (wall-to-hip) ──
  const outsideCountHip = b(data, "outsideRafters2") ? roundUp(eavePerp) : 0;
  const outsideLenHip = b(data, "outsideRafters2") ? roofRunOH / 2 : 0;
  mat += addLineItem(lineItems, "Outside Rafters (Hip)", outsideCountHip * outsideLenHip, "LnFt", getPrice(pricing, "TUBING", outsideIdx));

  // ── BENT METAL CONNECTIONS (per-connection-point types) ──
  // Ridge
  if (b(data, "insideRidge")) mat += addLineItem(lineItems, "Inside Ridge Conn", ridgeLen, "LnFt", getPrice(pricing, "BENT", n(data, "insideRidgeConnType")));
  if (b(data, "outsideRidge")) mat += addLineItem(lineItems, "Outside Ridge Conn", ridgeLen, "LnFt", getPrice(pricing, "BENT", n(data, "outsideRidgeConnType")));

  // Purlin parallel
  const insidePurlinParConnQty = n(data, "insidePurlinParConnQty") || 2;
  const outsidePurlinParConnQty = n(data, "outsidePurlinParConnQty") || 2;
  if (b(data, "insidePurlinPar")) mat += addLineItem(lineItems, "Inside Purlin Par", insidePurlinParConnQty * purlinPar, "LnFt", getPrice(pricing, "BENT", n(data, "insidePurlinParConnType")));
  if (b(data, "outsidePurlinPar")) mat += addLineItem(lineItems, "Outside Purlin Par", outsidePurlinParConnQty * purlinPar, "LnFt", getPrice(pricing, "BENT", n(data, "outsidePurlinParConnType")));

  // Purlin perpendicular
  const insidePurlinPerpConnQty = n(data, "insidePurlinPerpConnQty") || 2;
  const outsidePurlinPerpConnQty = n(data, "outsidePurlinPerpConnQty") || 2;
  if (b(data, "insidePurlinPerp")) mat += addLineItem(lineItems, "Inside Purlin Perp", insidePurlinPerpConnQty * purlinPerp, "LnFt", getPrice(pricing, "BENT", n(data, "insidePurlinPerpConnType")));
  if (b(data, "outsidePurlinPerp")) mat += addLineItem(lineItems, "Outside Purlin Perp", outsidePurlinPerpConnQty * purlinPerp, "LnFt", getPrice(pricing, "BENT", n(data, "outsidePurlinPerpConnType")));

  // Hip connections — hipLength
  if (b(data, "insideHip")) mat += addLineItem(lineItems, "Inside Hip Conn", hipLength, "LnFt", getPrice(pricing, "BENT", n(data, "insideHipConnType")));
  if (b(data, "outsideHip")) mat += addLineItem(lineItems, "Outside Hip Conn", hipLength, "LnFt", getPrice(pricing, "BENT", n(data, "outsideHipConnType")));

  // Wall parallel (no OH)
  if (b(data, "insideWallPar")) mat += addLineItem(lineItems, "Inside Wall Par", eavePar, "LnFt", getPrice(pricing, "BENT", n(data, "insideWallParConnType")));
  if (b(data, "outsideWallPar")) mat += addLineItem(lineItems, "Outside Wall Par", eavePar, "LnFt", getPrice(pricing, "BENT", n(data, "outsideWallParConnType")));

  // Wall perpendicular (no OH)
  if (b(data, "insideWallPerp")) mat += addLineItem(lineItems, "Inside Wall Perp", eavePerp, "LnFt", getPrice(pricing, "BENT", n(data, "insideWallPerpConnType")));
  if (b(data, "outsideWallPerp")) mat += addLineItem(lineItems, "Outside Wall Perp", eavePerp, "LnFt", getPrice(pricing, "BENT", n(data, "outsideWallPerpConnType")));

  // Wall parallel (with OH)
  if (b(data, "insideWallPar2")) mat += addLineItem(lineItems, "Inside Wall Par OH", eavePar, "LnFt", getPrice(pricing, "BENT", n(data, "insideWallParOHConnType")));
  // Wall perpendicular (with OH)
  if (b(data, "insideWallPerp2")) mat += addLineItem(lineItems, "Inside Wall Perp OH", eavePerp, "LnFt", getPrice(pricing, "BENT", n(data, "insideWallPerpOHConnType")));

  // Simpson tie-downs
  if (b(data, "simpsonTieDown")) {
    const totalRafters = outsideCountRidge + outsideCountHip + insideCountHip + insideCountRidge;
    mat += addLineItem(lineItems, "Simpson Tie-Downs", totalRafters, "Each", FIXED_PRICES.simpsonTieDown);
  }

  // Gutter boards (per-connection-point types)
  if (b(data, "gutterBoardPar")) mat += addLineItem(lineItems, "Gutter Board Par", eavePar, "LnFt", getPrice(pricing, "BENT", n(data, "gutterParConnType")));
  if (b(data, "gutterBoardPerp")) mat += addLineItem(lineItems, "Gutter Board Perp", eavePerp, "LnFt", getPrice(pricing, "BENT", n(data, "gutterPerpConnType")));

  // ── INTERIOR SHEATHING ──
  const intSheathIdx = n(data, "intSheathingType");
  const intSheathSF = b(data, "intSheathing") ? ridgeLen * hipRoofRun * 2 : 0;
  mat += addLineItem(lineItems, "Int Sheathing", intSheathSF, "SqFt", getPrice(pricing, "SHEATHING", intSheathIdx));

  // ── WALL STRAPPING ──
  const interiorWallCount = n(data, "interiorWallCount");
  mat += addLineItem(lineItems, "Wall Strapping", interiorWallCount * 3, "Each", FIXED_PRICES.wallStrapping);

  // ── LIFT RINGS ──
  const totalRafterCount = outsideCountRidge + outsideCountHip + insideCountHip + insideCountRidge;
  mat += addLineItem(lineItems, "Lift Rings", totalRafterCount, "Each", FIXED_PRICES.liftRing);

  // ── SCREWS ──
  const roofScrewIdx = n(data, "roofScrewType");
  mat += addLineItem(lineItems, "Roof Drill Pt Screws", roundUp(outsideLenRidge / 3) * outsideCountRidge, "Each", getPrice(pricing, "RSCREW", roofScrewIdx));
  mat += addLineItem(lineItems, "Wafer Head Screws", (insideCountRidge + outsideCountRidge + totalRafterCount + interiorWallCount * 3) * 10, "Each", FIXED_PRICES.waferHeadScrew);
  mat += addLineItem(lineItems, "Sheathing Fasteners", intSheathSF, "Each", FIXED_PRICES.sheathingFastener);

  const waste = mat * WASTE_FACTOR;
  const totalMat = (mat + waste) * qty;
  const totalSF = sf * qty;

  return makeResult(totalSF, totalMat - waste * qty, 0, lineItems, waste * qty);
}
