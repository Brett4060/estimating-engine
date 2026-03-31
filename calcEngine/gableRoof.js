// ═══════════════════════════════════════════════════════════════
// GABLE ROOF — exact Excel formulas
// Inside rafter count = ROUNDUP(ridgeLen, 0) — 1 per foot!
// SF = ridgeLen * roofRun * 2
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
  // Row 15: gableHeight = (rise/run) * (0.5 * gableLength)
  const gableHt = (rise / run) * (0.5 * gableLen);
  // Row 16: gableRun = SQRT(gableHeight² + (gableLength/2)²) — without overhang
  const gableRun = Math.sqrt(gableHt * gableHt + (gableLen / 2) ** 2);
  // Row 17: roofRun = SQRT(gableHeight² + (gableLength/2 + overhang)²) — with overhang
  const roofRun = Math.sqrt(gableHt * gableHt + (gableLen / 2 + overhang) ** 2);
  // Row 18: SF = ridgeLength * roofRun * 2
  const sf = ridgeLen * roofRun * 2;

  // ── EPS ──
  const epsIdx = n(data, "epsDensity");
  const epsBdFt = sf * epsThick;
  mat += addLineItem(lineItems, "EPS", epsBdFt, "BdFt", getPrice(pricing, "EPS", epsIdx));

  // ── INSIDE RAFTERS ──
  // Row 24: ROUNDUP(ridgeLength, 0) — 1 per foot, NOT /2
  // Row 25: length = gableRun (without overhang)
  const insideIdx = n(data, "insideRafterType");
  const insideCount = b(data, "insideRafters") ? roundUp(ridgeLen) : 0;
  const insideLen = b(data, "insideRafters") ? gableRun : 0;
  mat += addLineItem(lineItems, "Inside Rafters", insideCount * insideLen, "LnFt", getPrice(pricing, "TUBING", insideIdx));

  // ── OUTSIDE RAFTERS ──
  // Row 27: ROUNDUP(ridgeLength, 0)
  // Row 28: length = roofRun (with overhang)
  const outsideIdx = n(data, "outsideRafterType");
  const outsideCount = b(data, "outsideRafters") ? roundUp(ridgeLen) : 0;
  const outsideLen = b(data, "outsideRafters") ? roofRun : 0;
  mat += addLineItem(lineItems, "Outside Rafters", outsideCount * outsideLen, "LnFt", getPrice(pricing, "TUBING", outsideIdx));

  // ── END ROOF PANELS (4 tubes each inside + 4 outside) ──
  const endPanelQty = n(data, "endPanelQty");
  mat += addLineItem(lineItems, "End Inside Tubes", endPanelQty * 4 * insideLen, "LnFt", getPrice(pricing, "TUBING", insideIdx));
  mat += addLineItem(lineItems, "End Outside Tubes", endPanelQty * 4 * outsideLen, "LnFt", getPrice(pricing, "TUBING", outsideIdx));

  // ── BENT METAL CONNECTIONS ──
  const inBentIdx = n(data, "insideConnType");
  const outBentIdx = n(data, "outsideConnType");
  const inPrice = getPrice(pricing, "BENT", inBentIdx);
  const outPrice = getPrice(pricing, "BENT", outBentIdx);

  const gableConnQty = n(data, "gableConnQty") || 4;
  const ridgeConnQty = n(data, "ridgeConnQty") || 1;
  const purlinConnQty = n(data, "purlinConnQty") || 2;

  if (b(data, "insideGable")) mat += addLineItem(lineItems, "Inside Gable Conn", gableConnQty * gableRun, "LnFt", inPrice);
  if (b(data, "outsideGable")) mat += addLineItem(lineItems, "Outside Gable Conn", gableConnQty * gableRun, "LnFt", outPrice);
  if (b(data, "insideRidge")) mat += addLineItem(lineItems, "Inside Ridge Conn", ridgeConnQty * ridgeLen, "LnFt", inPrice);
  if (b(data, "outsideRidge")) mat += addLineItem(lineItems, "Outside Ridge Conn", ridgeConnQty * ridgeLen, "LnFt", outPrice);
  if (b(data, "insidePurlin")) mat += addLineItem(lineItems, "Inside Purlin Conn", purlinConnQty * purlinLen, "LnFt", inPrice);
  if (b(data, "outsidePurlin")) mat += addLineItem(lineItems, "Outside Purlin Conn", purlinConnQty * purlinLen, "LnFt", outPrice);

  // Wall connections (no overhang)
  if (b(data, "insideWall")) mat += addLineItem(lineItems, "Inside Wall Conn", eaveLen, "LnFt", inPrice);
  if (b(data, "outsideWall")) mat += addLineItem(lineItems, "Outside Wall Conn", eaveLen, "LnFt", outPrice);

  // Wall connections (with overhang) — eaveLen * 2
  if (b(data, "insideWallOH")) mat += addLineItem(lineItems, "Inside Wall OH Conn", eaveLen * 2, "LnFt", inPrice);

  // Simpson tie-downs
  if (b(data, "simpsonTieDown")) {
    mat += addLineItem(lineItems, "Simpson Tie-Downs", outsideCount + endPanelQty * 4, "Each", FIXED_PRICES.simpsonTieDown);
  }

  // Gutter board
  const gutterConnQty = n(data, "gutterConnQty") || 2;
  if (b(data, "gutterBoard")) mat += addLineItem(lineItems, "Gutter Board Conn", gutterConnQty * eaveLen, "LnFt", outPrice);

  // ── INTERIOR SHEATHING ──
  const intSheathIdx = n(data, "intSheathingType");
  const intSheathSF = b(data, "intSheathing") ? ridgeLen * gableRun * 2 : 0;
  mat += addLineItem(lineItems, "Int Sheathing", intSheathSF, "SqFt", getPrice(pricing, "SHEATHING", intSheathIdx));

  // ── LIFT RINGS, SCREWS ──
  mat += addLineItem(lineItems, "Lift Rings", outsideCount + endPanelQty * 4, "Each", FIXED_PRICES.liftRing);

  const roofScrewIdx = n(data, "roofScrewType");
  mat += addLineItem(lineItems, "Roof Drill Pt Screws", roundUp(outsideLen / 3) * outsideCount, "Each", getPrice(pricing, "RSCREW", roofScrewIdx));
  mat += addLineItem(lineItems, "Wafer Head Screws", (insideCount + outsideCount + outsideCount + endPanelQty * 4) * 10, "Each", FIXED_PRICES.waferHeadScrew);
  mat += addLineItem(lineItems, "Sheathing Fasteners", intSheathSF, "Each", FIXED_PRICES.sheathingFastener);

  const waste = mat * WASTE_FACTOR;
  const totalMat = (mat + waste) * qty;
  const totalSF = sf * qty;

  return makeResult(totalSF, totalMat - waste * qty, 0, lineItems, waste * qty);
}
