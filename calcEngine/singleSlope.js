// ═══════════════════════════════════════════════════════════════
// SINGLE SLOPED ROOF — exact Excel formulas
// gableHeight = (rise/run) * gableLength (full, not half)
// ═══════════════════════════════════════════════════════════════
import { getPrice, FIXED_PRICES, WASTE_FACTOR } from "./pricing.js";
import { n, b, roundUp, addLineItem, makeResult, ZERO_RESULT } from "./helpers.js";

export function calcSingleSlope(data, pricing) {
  const qty = n(data, "qty");
  if (qty === 0) return ZERO_RESULT;

  const rise = n(data, "rise");
  const run = n(data, "run") || 12;
  const ridgeLen = n(data, "ridgeLen");
  const purlinLen = n(data, "purlinLen");
  const eaveLen = n(data, "eaveLen");
  const ohRidge = n(data, "overhangRidge");
  const ohEave = n(data, "overhangEave");
  const roofThick = n(data, "roofThick");
  const epsThick = n(data, "epsThick");
  const gableLen = n(data, "gableLen");

  const lineItems = [];
  let mat = 0;

  // ── Geometry ──
  // Row 16: gableHeight = (rise/run) * gableLength — FULL gable, not half
  const gableHt = (rise / run) * gableLen;
  // Row 17: gableRun = SQRT(gableHeight² + gableLength²) — without overhang
  const gableRun = Math.sqrt(gableHt * gableHt + gableLen * gableLen);
  // Row 18: roofRun = SQRT(gableHeight² + (gableLength + ridgeOH + eaveOH)²)
  const roofRun = Math.sqrt(gableHt * gableHt + (gableLen + ohRidge + ohEave) ** 2);
  // Row 19: SF = ridgeLength * roofRun
  const sf = ridgeLen * roofRun;

  // ── EPS ──
  const epsIdx = n(data, "epsDensity");
  const epsBdFt = sf * epsThick;
  mat += addLineItem(lineItems, "EPS", epsBdFt, "BdFt", getPrice(pricing, "EPS", epsIdx));

  // ── INSIDE RAFTERS ──
  // Row 25: ROUNDUP(ridgeLen/2, 0), length = gableRun (without OH)
  const insideRafterIdx = n(data, "insideRafterType");
  const insideCount = b(data, "insideRafters") ? roundUp(ridgeLen / 2) : 0;
  const insideLen = b(data, "insideRafters") ? gableRun : 0;
  mat += addLineItem(lineItems, "Inside Rafters", insideCount * insideLen, "LnFt", getPrice(pricing, "TUBING", insideRafterIdx));

  // ── OUTSIDE RAFTERS ──
  // Row 28: ROUNDUP(ridgeLen/2, 0), length = roofRun (with OH)
  const outsideRafterIdx = n(data, "outsideRafterType");
  const outsideCount = b(data, "outsideRafters") ? roundUp(ridgeLen / 2) : 0;
  const outsideLen = b(data, "outsideRafters") ? roofRun : 0;
  mat += addLineItem(lineItems, "Outside Rafters", outsideCount * outsideLen, "LnFt", getPrice(pricing, "TUBING", outsideRafterIdx));

  // ── END ROOF PANELS (4 tubes each: 2 inside + 2 outside) ──
  const endPanelQty = n(data, "endPanelQty");
  const endInsideTubes = endPanelQty * 2;
  const endOutsideTubes = endPanelQty * 2;
  mat += addLineItem(lineItems, "End Panel Inside Tubes", endInsideTubes * insideLen, "LnFt", getPrice(pricing, "TUBING", insideRafterIdx));
  mat += addLineItem(lineItems, "End Panel Outside Tubes", endOutsideTubes * outsideLen, "LnFt", getPrice(pricing, "TUBING", outsideRafterIdx));

  // ── BENT METAL CONNECTIONS ──
  const insideBentIdx = n(data, "insideConnType");
  const outsideBentIdx = n(data, "outsideConnType");
  const insideBentPrice = getPrice(pricing, "BENT", insideBentIdx);
  const outsideBentPrice = getPrice(pricing, "BENT", outsideBentIdx);

  // Gable connections — qty * gableRun
  const gableConnQty = n(data, "gableConnQty") || 0;
  if (b(data, "insideGable")) mat += addLineItem(lineItems, "Inside Gable Conn", gableConnQty * gableRun, "LnFt", insideBentPrice);
  if (b(data, "outsideGable")) mat += addLineItem(lineItems, "Outside Gable Conn", gableConnQty * gableRun, "LnFt", outsideBentPrice);

  // Ridge connections (no overhang) — ridgeLength
  if (b(data, "insideRidge")) mat += addLineItem(lineItems, "Inside Ridge Conn", ridgeLen, "LnFt", insideBentPrice);
  if (b(data, "outsideRidge")) mat += addLineItem(lineItems, "Outside Ridge Conn", ridgeLen, "LnFt", outsideBentPrice);

  // Ridge connections (with overhang) — ridgeLength
  if (b(data, "insideRidgeOH")) mat += addLineItem(lineItems, "Inside Ridge OH Conn", ridgeLen, "LnFt", insideBentPrice);

  // Simpson tie-downs
  if (b(data, "simpsonTieDown")) {
    const simpsonQty = outsideCount + endOutsideTubes;
    mat += addLineItem(lineItems, "Simpson Tie-Downs", simpsonQty, "Each", FIXED_PRICES.simpsonTieDown);
  }

  // Facia board — qty * facia length
  const faciaConnQty = n(data, "faciaConnQty") || 0;
  const faciaLen = n(data, "faciaLen") || 0;
  if (b(data, "faciaBoard")) mat += addLineItem(lineItems, "Facia Board Conn", faciaConnQty * faciaLen, "LnFt", outsideBentPrice);

  // Purlin connections — qty * purlinLength
  const purlinConnQty = n(data, "purlinConnQty") || 0;
  if (b(data, "insidePurlin")) mat += addLineItem(lineItems, "Inside Purlin Conn", purlinConnQty * purlinLen, "LnFt", insideBentPrice);
  if (b(data, "outsidePurlin")) mat += addLineItem(lineItems, "Outside Purlin Conn", purlinConnQty * purlinLen, "LnFt", outsideBentPrice);

  // Wall connections (no overhang) — eaveLength
  const wallConnQty = n(data, "wallConnQty") || 0;
  if (b(data, "insideWall")) mat += addLineItem(lineItems, "Inside Wall Conn", wallConnQty * eaveLen, "LnFt", insideBentPrice);
  if (b(data, "outsideWall")) mat += addLineItem(lineItems, "Outside Wall Conn", wallConnQty * eaveLen, "LnFt", outsideBentPrice);

  // Wall connections (with overhang) — ridgeLength
  if (b(data, "insideWallOH")) mat += addLineItem(lineItems, "Inside Wall OH Conn", ridgeLen, "LnFt", insideBentPrice);

  // Gutter board — eaveLength
  const gutterConnQty = n(data, "gutterConnQty") || 0;
  if (b(data, "gutterBoard")) mat += addLineItem(lineItems, "Gutter Board Conn", gutterConnQty * eaveLen, "LnFt", outsideBentPrice);

  // ── INTERIOR SHEATHING ──
  const intSheathIdx = n(data, "intSheathingType");
  const intSheathSF = b(data, "intSheathing") ? ridgeLen * gableRun * 2 : 0;
  mat += addLineItem(lineItems, "Int Sheathing", intSheathSF, "SqFt", getPrice(pricing, "SHEATHING", intSheathIdx));

  // ── LIFT RINGS ──
  mat += addLineItem(lineItems, "Lift Rings", outsideCount + endInsideTubes, "Each", FIXED_PRICES.liftRing);

  // ── SCREWS ──
  const roofScrewIdx = n(data, "roofScrewType");
  const roofScrewQty = roundUp(outsideLen / 3) * outsideCount;
  mat += addLineItem(lineItems, "Roof Drill Pt Screws", roofScrewQty, "Each", getPrice(pricing, "RSCREW", roofScrewIdx));

  const waferQty = (insideCount + outsideCount + (outsideCount + endInsideTubes) + n(data, "interiorWallCount") * 3) * 10;
  mat += addLineItem(lineItems, "Wafer Head Screws", waferQty, "Each", FIXED_PRICES.waferHeadScrew);

  mat += addLineItem(lineItems, "Sheathing Fasteners", intSheathSF, "Each", FIXED_PRICES.sheathingFastener);

  const waste = mat * WASTE_FACTOR;
  const totalMat = (mat + waste) * qty;
  const totalSF = sf * qty;

  return makeResult(totalSF, totalMat - waste * qty, 0, lineItems, waste * qty);
}
