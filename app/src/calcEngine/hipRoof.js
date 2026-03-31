// ═══════════════════════════════════════════════════════════════
// HIP ROOF — exact Excel formulas
// 4 rafter sets: inside/outside wall-to-ridge + inside/outside wall-to-hip
// Hip rafters use AVERAGE length (roofRun/2)
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
  // Row 16: gableLength = eavePerp
  // Row 17: ridgeHeight = (rise/run) * (0.5 * eavePerp)
  const ridgeHt = (rise / run) * (0.5 * eavePerp);
  // Row 18: hipRoofRun = SQRT(ridgeHt² + (eavePerp/2)²) — without overhang
  const hipRoofRun = Math.sqrt(ridgeHt * ridgeHt + (eavePerp / 2) ** 2);
  // Row 19: roofRunOH = SQRT(ridgeHt² + (eavePerp/2 + overhang)²)
  const roofRunOH = Math.sqrt(ridgeHt * ridgeHt + (eavePerp / 2 + overhang) ** 2);
  // Row 20: hipLength = SQRT(roofRunOH² + (eavePerp/2)²)
  const hipLength = Math.sqrt(roofRunOH * roofRunOH + (eavePerp / 2) ** 2);
  // Row 21: SF = (eavePerp/2 * roofRunOH * 4) + (ridgeLen * roofRunOH * 2)
  const sf = (eavePerp / 2 * roofRunOH * 4) + (ridgeLen * roofRunOH * 2);

  // ── EPS ──
  const epsIdx = n(data, "epsDensity");
  const epsBdFt = sf * epsThick;
  mat += addLineItem(lineItems, "EPS", epsBdFt, "BdFt", getPrice(pricing, "EPS", epsIdx));

  // ── INSIDE RAFTERS (wall-to-ridge) ──
  // Row 27: ROUNDUP(ridgeLen, 0), length = hipRoofRun (without OH)
  const insideIdx = n(data, "insideRafterType");
  const insideCountRidge = b(data, "insideRafters") ? roundUp(ridgeLen) : 0;
  const insideLenRidge = b(data, "insideRafters") ? hipRoofRun : 0;
  mat += addLineItem(lineItems, "Inside Rafters (Ridge)", insideCountRidge * insideLenRidge, "LnFt", getPrice(pricing, "TUBING", insideIdx));

  // ── OUTSIDE RAFTERS (wall-to-ridge) ──
  // Row 30: ROUNDUP(ridgeLen, 0), length = roofRunOH (with OH)
  const outsideIdx = n(data, "outsideRafterType");
  const outsideCountRidge = b(data, "outsideRafters") ? roundUp(ridgeLen) : 0;
  const outsideLenRidge = b(data, "outsideRafters") ? roofRunOH : 0;
  mat += addLineItem(lineItems, "Outside Rafters (Ridge)", outsideCountRidge * outsideLenRidge, "LnFt", getPrice(pricing, "TUBING", outsideIdx));

  // ── INSIDE RAFTERS (wall-to-hip) ──
  // Row 33: ROUNDUP(eavePerp, 0), AVERAGE length = hipRoofRun/2
  const insideCountHip = b(data, "insideRafters2") ? roundUp(eavePerp) : 0;
  const insideLenHip = b(data, "insideRafters2") ? hipRoofRun / 2 : 0;
  mat += addLineItem(lineItems, "Inside Rafters (Hip)", insideCountHip * insideLenHip, "LnFt", getPrice(pricing, "TUBING", insideIdx));

  // ── OUTSIDE RAFTERS (wall-to-hip) ──
  // Row 36: ROUNDUP(eavePerp, 0), AVERAGE length = roofRunOH/2
  const outsideCountHip = b(data, "outsideRafters2") ? roundUp(eavePerp) : 0;
  const outsideLenHip = b(data, "outsideRafters2") ? roofRunOH / 2 : 0;
  mat += addLineItem(lineItems, "Outside Rafters (Hip)", outsideCountHip * outsideLenHip, "LnFt", getPrice(pricing, "TUBING", outsideIdx));

  // ── BENT METAL CONNECTIONS ──
  const inBentIdx = n(data, "insideConnType");
  const outBentIdx = n(data, "outsideConnType");
  const inPrice = getPrice(pricing, "BENT", inBentIdx);
  const outPrice = getPrice(pricing, "BENT", outBentIdx);

  // Ridge
  if (b(data, "insideRidge")) mat += addLineItem(lineItems, "Inside Ridge Conn", ridgeLen, "LnFt", inPrice);
  if (b(data, "outsideRidge")) mat += addLineItem(lineItems, "Outside Ridge Conn", ridgeLen, "LnFt", outPrice);

  // Purlin parallel
  if (b(data, "insidePurlinPar")) mat += addLineItem(lineItems, "Inside Purlin Par", purlinPar, "LnFt", inPrice);
  if (b(data, "outsidePurlinPar")) mat += addLineItem(lineItems, "Outside Purlin Par", purlinPar, "LnFt", outPrice);

  // Purlin perpendicular
  if (b(data, "insidePurlinPerp")) mat += addLineItem(lineItems, "Inside Purlin Perp", purlinPerp, "LnFt", inPrice);
  if (b(data, "outsidePurlinPerp")) mat += addLineItem(lineItems, "Outside Purlin Perp", purlinPerp, "LnFt", outPrice);

  // Hip connections — hipLength
  if (b(data, "insideHip")) mat += addLineItem(lineItems, "Inside Hip Conn", hipLength, "LnFt", inPrice);
  if (b(data, "outsideHip")) mat += addLineItem(lineItems, "Outside Hip Conn", hipLength, "LnFt", outPrice);

  // Wall parallel (no OH)
  if (b(data, "insideWallPar")) mat += addLineItem(lineItems, "Inside Wall Par", eavePar, "LnFt", inPrice);
  if (b(data, "outsideWallPar")) mat += addLineItem(lineItems, "Outside Wall Par", eavePar, "LnFt", outPrice);

  // Wall perpendicular (no OH)
  if (b(data, "insideWallPerp")) mat += addLineItem(lineItems, "Inside Wall Perp", eavePerp, "LnFt", inPrice);
  if (b(data, "outsideWallPerp")) mat += addLineItem(lineItems, "Outside Wall Perp", eavePerp, "LnFt", outPrice);

  // Wall parallel (with OH)
  if (b(data, "insideWallPar2")) mat += addLineItem(lineItems, "Inside Wall Par OH", eavePar, "LnFt", inPrice);
  // Wall perpendicular (with OH)
  if (b(data, "insideWallPerp2")) mat += addLineItem(lineItems, "Inside Wall Perp OH", eavePerp, "LnFt", inPrice);

  // Simpson tie-downs
  if (b(data, "simpsonTieDown")) {
    const totalRafters = outsideCountRidge + outsideCountHip + insideCountHip + insideCountRidge;
    mat += addLineItem(lineItems, "Simpson Tie-Downs", totalRafters, "Each", FIXED_PRICES.simpsonTieDown);
  }

  // Gutter boards
  if (b(data, "gutterBoardPar")) mat += addLineItem(lineItems, "Gutter Board Par", eavePar, "LnFt", outPrice);
  if (b(data, "gutterBoardPerp")) mat += addLineItem(lineItems, "Gutter Board Perp", eavePerp, "LnFt", outPrice);

  // ── LIFT RINGS ──
  const totalRafterCount = outsideCountRidge + outsideCountHip + insideCountHip + insideCountRidge;
  mat += addLineItem(lineItems, "Lift Rings", totalRafterCount, "Each", FIXED_PRICES.liftRing);

  // ── SCREWS ──
  const roofScrewIdx = n(data, "roofScrewType");
  mat += addLineItem(lineItems, "Roof Drill Pt Screws", roundUp(outsideLenRidge / 3) * outsideCountRidge, "Each", getPrice(pricing, "RSCREW", roofScrewIdx));
  mat += addLineItem(lineItems, "Wafer Head Screws", (insideCountRidge + outsideCountRidge + totalRafterCount) * 10, "Each", FIXED_PRICES.waferHeadScrew);

  const waste = mat * WASTE_FACTOR;
  const totalMat = (mat + waste) * qty;
  const totalSF = sf * qty;

  return makeResult(totalSF, totalMat - waste * qty, 0, lineItems, waste * qty);
}
