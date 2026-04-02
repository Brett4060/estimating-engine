// ═══════════════════════════════════════════════════════════════
// SINGLE SLOPED ROOF — exact Excel formulas
// gableHeight = (rise/run) * gableLength (full, not half)
// Per-connection-point bent metal dropdowns
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
  const gableHt = (rise / run) * gableLen;
  const gableRun = Math.sqrt(gableHt * gableHt + gableLen * gableLen);
  const roofRun = Math.sqrt(gableHt * gableHt + (gableLen + ohRidge + ohEave) ** 2);
  const sf = ridgeLen * roofRun;

  // ── EPS ──
  const epsIdx = n(data, "epsDensity");
  const epsBdFt = sf * epsThick;
  mat += addLineItem(lineItems, "EPS", epsBdFt, "BdFt", getPrice(pricing, "EPS", epsIdx));

  // ── INSIDE RAFTERS ──
  const insideRafterIdx = n(data, "insideRafterType");
  const insideCount = b(data, "insideRafters") ? roundUp(ridgeLen / 2) : 0;
  const insideLen = b(data, "insideRafters") ? gableRun : 0;
  mat += addLineItem(lineItems, "Inside Rafters", insideCount * insideLen, "LnFt", getPrice(pricing, "TUBING", insideRafterIdx));

  // ── OUTSIDE RAFTERS ──
  const outsideRafterIdx = n(data, "outsideRafterType");
  const outsideCount = b(data, "outsideRafters") ? roundUp(ridgeLen / 2) : 0;
  const outsideLen = b(data, "outsideRafters") ? roofRun : 0;
  mat += addLineItem(lineItems, "Outside Rafters", outsideCount * outsideLen, "LnFt", getPrice(pricing, "TUBING", outsideRafterIdx));

  // ── END ROOF PANELS (2 inside + 2 outside per end panel, separate type dropdowns) ──
  const endPanelQty = n(data, "endPanelQty");
  const endInsideIdx = n(data, "endInsideTubeType") || insideRafterIdx;
  const endOutsideIdx = n(data, "endOutsideTubeType") || outsideRafterIdx;
  const endInsideTubes = endPanelQty * 2;
  const endOutsideTubes = endPanelQty * 2;
  mat += addLineItem(lineItems, "End Panel Inside Tubes", endInsideTubes * insideLen, "LnFt", getPrice(pricing, "TUBING", endInsideIdx));
  mat += addLineItem(lineItems, "End Panel Outside Tubes", endOutsideTubes * outsideLen, "LnFt", getPrice(pricing, "TUBING", endOutsideIdx));

  // ── BENT METAL CONNECTIONS (per-connection-point types) ──
  // Gable connections — qty * gableRun
  const insideGableConnQty = n(data, "insideGableConnQty") || 0;
  const outsideGableConnQty = n(data, "outsideGableConnQty") || 0;
  if (b(data, "insideGable")) mat += addLineItem(lineItems, "Inside Gable Conn", insideGableConnQty * gableRun, "LnFt", getPrice(pricing, "BENT", n(data, "insideGableConnType")));
  if (b(data, "outsideGable")) mat += addLineItem(lineItems, "Outside Gable Conn", outsideGableConnQty * gableRun, "LnFt", getPrice(pricing, "BENT", n(data, "outsideGableConnType")));

  // Ridge connections (no overhang) — ridgeLength
  if (b(data, "insideRidge")) mat += addLineItem(lineItems, "Inside Ridge Conn", ridgeLen, "LnFt", getPrice(pricing, "BENT", n(data, "insideRidgeConnType")));
  if (b(data, "outsideRidge")) mat += addLineItem(lineItems, "Outside Ridge Conn", ridgeLen, "LnFt", getPrice(pricing, "BENT", n(data, "outsideRidgeConnType")));

  // Ridge connections (with overhang) — ridgeLength
  if (b(data, "insideRidgeOH")) mat += addLineItem(lineItems, "Inside Ridge OH Conn", ridgeLen, "LnFt", getPrice(pricing, "BENT", n(data, "insideRidgeOHConnType")));

  // Simpson tie-downs
  if (b(data, "simpsonTieDown")) {
    const simpsonQty = outsideCount + endOutsideTubes;
    mat += addLineItem(lineItems, "Simpson Tie-Downs", simpsonQty, "Each", FIXED_PRICES.simpsonTieDown);
  }

  // Facia board — qty * facia length (default to ridgeLen if not set)
  const faciaConnQty = n(data, "faciaConnQty") || 0;
  const faciaLen = n(data, "faciaLen") || ridgeLen;
  if (b(data, "faciaBoard")) mat += addLineItem(lineItems, "Facia Board Conn", faciaConnQty * faciaLen, "LnFt", getPrice(pricing, "BENT", n(data, "faciaConnType")));

  // Purlin connections — qty * purlinLength
  const insidePurlinConnQty = n(data, "insidePurlinConnQty") || 0;
  const outsidePurlinConnQty = n(data, "outsidePurlinConnQty") || 0;
  if (b(data, "insidePurlin")) mat += addLineItem(lineItems, "Inside Purlin Conn", insidePurlinConnQty * purlinLen, "LnFt", getPrice(pricing, "BENT", n(data, "insidePurlinConnType")));
  if (b(data, "outsidePurlin")) mat += addLineItem(lineItems, "Outside Purlin Conn", outsidePurlinConnQty * purlinLen, "LnFt", getPrice(pricing, "BENT", n(data, "outsidePurlinConnType")));

  // Wall connections (no overhang) — qty * eaveLength
  const insideWallConnQty = n(data, "insideWallConnQty") || 0;
  const outsideWallConnQty = n(data, "outsideWallConnQty") || 0;
  if (b(data, "insideWall")) mat += addLineItem(lineItems, "Inside Wall Conn", insideWallConnQty * eaveLen, "LnFt", getPrice(pricing, "BENT", n(data, "insideWallConnType")));
  if (b(data, "outsideWall")) mat += addLineItem(lineItems, "Outside Wall Conn", outsideWallConnQty * eaveLen, "LnFt", getPrice(pricing, "BENT", n(data, "outsideWallConnType")));

  // Wall connections (with overhang) — ridgeLength
  if (b(data, "insideWallOH")) mat += addLineItem(lineItems, "Inside Wall OH Conn", ridgeLen, "LnFt", getPrice(pricing, "BENT", n(data, "insideWallOHConnType")));

  // Gutter board — qty * eaveLength
  const gutterConnQty = n(data, "gutterConnQty") || 0;
  if (b(data, "gutterBoard")) mat += addLineItem(lineItems, "Gutter Board Conn", gutterConnQty * eaveLen, "LnFt", getPrice(pricing, "BENT", n(data, "gutterConnType")));

  // ── INTERIOR SHEATHING ──
  const intSheathIdx = n(data, "intSheathingType");
  const intSheathSF = b(data, "intSheathing") ? ridgeLen * gableRun : 0;
  mat += addLineItem(lineItems, "Int Sheathing", intSheathSF, "SqFt", getPrice(pricing, "SHEATHING", intSheathIdx));

  // ── WALL STRAPPING ──
  const interiorWallCount = n(data, "interiorWallCount");
  mat += addLineItem(lineItems, "Wall Strapping", interiorWallCount * 3, "Each", FIXED_PRICES.wallStrapping);

  // ── LIFT RINGS ──
  mat += addLineItem(lineItems, "Lift Rings", outsideCount + endInsideTubes, "Each", FIXED_PRICES.liftRing);

  // ── SCREWS ──
  const roofScrewIdx = n(data, "roofScrewType");
  const roofScrewQty = roundUp(outsideLen / 3) * outsideCount;
  mat += addLineItem(lineItems, "Roof Drill Pt Screws", roofScrewQty, "Each", getPrice(pricing, "RSCREW", roofScrewIdx));

  const waferQty = (insideCount + outsideCount + (outsideCount + endInsideTubes) + interiorWallCount * 3) * 10;
  mat += addLineItem(lineItems, "Wafer Head Screws", waferQty, "Each", FIXED_PRICES.waferHeadScrew);

  mat += addLineItem(lineItems, "Sheathing Fasteners", intSheathSF, "Each", FIXED_PRICES.sheathingFastener);

  const waste = mat * WASTE_FACTOR;
  const totalMat = (mat + waste) * qty;
  const totalSF = sf * qty;

  return makeResult(totalSF, totalMat - waste * qty, 0, lineItems, waste * qty);
}
