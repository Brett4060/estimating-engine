// ═══════════════════════════════════════════════════════════════
// DOORS — exact Excel formulas from DOORS sheet
// Key differences from windows: no footer, perimeter = 2*h + w (no bottom)
// ═══════════════════════════════════════════════════════════════
import { getPrice, FIXED_PRICES, WASTE_FACTOR } from "./pricing.js";
import { n, b, roundUp, addLineItem, makeResult, ZERO_RESULT } from "./helpers.js";

export function calcDoors(data, pricing) {
  const qty = n(data, "qty");
  if (qty === 0) return ZERO_RESULT;

  const w = n(data, "width");
  const h = n(data, "height");
  const wallHt = n(data, "wallHeight");
  const wallThick = n(data, "wallThick");
  const epsThick = n(data, "epsThick");
  const headerHt = n(data, "headerHt");
  const trackWidth = n(data, "trackWidth");

  const lineItems = [];
  let mat = 0;

  const openingSF = w * h;
  const perimeter = (h * 2) + w;  // Row 13: doors = 2*height + width (no bottom)

  // ── EPS — Header only (no footer for doors) ──
  // Row 16-17: (wallHeight - headerHeight) * width
  const epsIdx = n(data, "epsDensity");
  const epsPrice = getPrice(pricing, "EPS", epsIdx);
  const headerEpsSF = (wallHt - headerHt) * w;
  const headerEpsBdFt = headerEpsSF * epsThick;
  mat += addLineItem(lineItems, "EPS Header", headerEpsBdFt, "BdFt", epsPrice);

  // ── KING STUDS ──
  const kingIdx = n(data, "kingType");
  const kingCount = b(data, "king") ? 4 : 0;
  const kingLenEach = b(data, "king") ? wallHt : 0;
  const kingLnFt = kingCount * kingLenEach;
  mat += addLineItem(lineItems, "King Studs", kingLnFt, "LnFt", getPrice(pricing, "TUBING", kingIdx));

  // ── JACK STUDS ──
  const jackIdx = n(data, "jackType");
  const jackCount = b(data, "jack") ? 4 : 0;
  const jackLenEach = b(data, "jack") ? headerHt : 0;
  const jackLnFt = jackCount * jackLenEach;
  mat += addLineItem(lineItems, "Jack Studs", jackLnFt, "LnFt", getPrice(pricing, "TUBING", jackIdx));

  // ── HEADER TUBE ──
  // Row 25-27: IF(Yes, 1, 0), length = wallHeight - headerHeight
  const headerTubeIdx = n(data, "headerTubeType");
  const headerTubeCount = b(data, "header") ? 1 : 0;
  const headerTubeLenEach = b(data, "header") ? wallHt - headerHt : 0;
  const headerTubeLnFt = headerTubeCount * headerTubeLenEach;
  mat += addLineItem(lineItems, "Header Tube", headerTubeLnFt, "LnFt", getPrice(pricing, "TUBING", headerTubeIdx));

  // ── STRUCTURAL HEADERS ──
  // Row 29-30: (width + 1) * 2 LnFt
  const strHeaderIdx = n(data, "strHeaderType");
  const strHeaderLen = w + 1;
  const strHeaderLnFt = strHeaderLen * 2;
  mat += addLineItem(lineItems, "Structural Headers", strHeaderLnFt, "LnFt", getPrice(pricing, "TUBING", strHeaderIdx));

  // ── PERIMETER TRACK ──
  // Row 33: IF(Yes, 2*height + width, 0)
  const trackIdx = n(data, "trackType");
  const trackLnFt = b(data, "trackPerimeter") ? perimeter : 0;
  mat += addLineItem(lineItems, "Track Perimeter", trackLnFt, "LnFt", getPrice(pricing, "TRACK", trackIdx));

  // ── WOOD BUCKS ──
  // Row 36: IF(Yes, perimeter, 0)
  const woodBuckIdx = n(data, "woodBuckType");
  const woodBuckLnFt = b(data, "woodBucks") ? perimeter : 0;
  mat += addLineItem(lineItems, "Wood Bucks", woodBuckLnFt, "LnFt", getPrice(pricing, "WOOD", woodBuckIdx));

  // ── DRILL PT SCREWS ──
  // Row 38: ROUNDUP(kingLnFt/2/3) + ROUNDUP(jackLnFt/2/3) + ROUNDUP(headerTubeLnFt/2)
  const screwIdx = n(data, "screwType");
  const screwQty = roundUp(kingLnFt / 2 / 3) +
    roundUp(jackLnFt / 2 / 3) +
    roundUp(headerTubeLnFt / 2);
  mat += addLineItem(lineItems, "Drill Pt Screws", screwQty, "Each", getPrice(pricing, "RSCREW", screwIdx));

  // ── WAFER HEAD SCREWS ──
  // Row 39: (headerCount + jackCount + kingCount) * 20
  const waferQty = (headerTubeCount + jackCount + kingCount) * 20;
  mat += addLineItem(lineItems, "Wafer Head Screws", waferQty, "Each", FIXED_PRICES.waferHeadScrew);

  // ── BUGLE HEAD SCREWS ──
  // Row 40: IF(woodBucks=Yes, woodBuckLnFt * 2, 0)
  const bugleQty = b(data, "woodBucks") ? woodBuckLnFt * 2 : 0;
  mat += addLineItem(lineItems, "Bugle Head Screws", bugleQty, "Each", FIXED_PRICES.bugleHeadScrewWB);

  // ── DEDUCTIONS ──
  const epsBasePrice = getPrice(pricing, "EPS", 0);
  const epsDeduction = -(w * h) * epsThick * epsBasePrice;

  const insideDeductIdx = n(data, "insideDeduction");
  const insideDeduction = -(w / 2 * wallHt) * getPrice(pricing, "TUBING", insideDeductIdx);

  const outsideDeductIdx = n(data, "outsideDeduction");
  const outsideDeduction = -(w / 2 * wallHt) * getPrice(pricing, "TUBING", outsideDeductIdx);

  const totalDeduction = epsDeduction + insideDeduction + outsideDeduction;

  if (epsDeduction !== 0) lineItems.push({ name: "EPS Opening Deduction", qty: -(w * h * epsThick), unit: "BdFt", unitPrice: epsBasePrice, cost: epsDeduction });
  if (insideDeduction !== 0) lineItems.push({ name: "Inside Stud Deduction", qty: -(w / 2 * wallHt), unit: "LnFt", unitPrice: getPrice(pricing, "TUBING", insideDeductIdx), cost: insideDeduction });
  if (outsideDeduction !== 0) lineItems.push({ name: "Outside Stud Deduction", qty: -(w / 2 * wallHt), unit: "LnFt", unitPrice: getPrice(pricing, "TUBING", outsideDeductIdx), cost: outsideDeduction });

  const waste = mat * WASTE_FACTOR;
  const perUnit = mat + totalDeduction + waste;
  const totalMat = perUnit * qty;
  const totalSF = openingSF * qty;

  return makeResult(totalSF, totalMat - waste * qty, 0, lineItems, waste * qty);
}
