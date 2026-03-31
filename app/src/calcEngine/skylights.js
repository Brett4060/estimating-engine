// ═══════════════════════════════════════════════════════════════
// SKYLIGHTS — exact Excel formulas
// EPS = (roofRun - height)/2 * width for BOTH header and footer (symmetric)
// ═══════════════════════════════════════════════════════════════
import { getPrice, FIXED_PRICES, WASTE_FACTOR } from "./pricing.js";
import { n, b, roundUp, addLineItem, makeResult, ZERO_RESULT } from "./helpers.js";

export function calcSkylights(data, pricing) {
  const qty = n(data, "qty");
  if (qty === 0) return ZERO_RESULT;

  const w = n(data, "width");
  const h = n(data, "height");
  const roofRun = n(data, "roofRun");
  const roofThick = n(data, "roofThick");
  const epsThick = n(data, "epsThick");
  const trackWidth = n(data, "trackWidth");

  const lineItems = [];
  let mat = 0;
  const openingSF = w * h;
  const perimeter = (w + h) * 2;

  // ── EPS ──
  // Row 15: header SF = (roofRun - height)/2 * width
  // Row 17: footer SF = same (symmetric)
  const epsIdx = n(data, "epsDensity");
  const epsPrice = getPrice(pricing, "EPS", epsIdx);
  const epsPieceSF = (roofRun - h) / 2 * w;
  mat += addLineItem(lineItems, "EPS Header", epsPieceSF * epsThick, "BdFt", epsPrice);
  mat += addLineItem(lineItems, "EPS Footer", epsPieceSF * epsThick, "BdFt", epsPrice);

  // ── KING STUDS ──
  // Row 20: IF(Yes, 4, 0), length = roofRun
  const kingIdx = n(data, "kingType");
  const kingCount = b(data, "king") ? 4 : 0;
  const kingLnFt = kingCount * roofRun;
  mat += addLineItem(lineItems, "King Studs", kingLnFt, "LnFt", getPrice(pricing, "TUBING", kingIdx));

  // ── HEADER TUBE ──
  // Row 23: qty = ROUNDUP(width, 0), length = (roofRun - height)/2
  const headerTubeIdx = n(data, "headerTubeType");
  const headerCount = b(data, "header") ? roundUp(w) : 0;
  const headerLenEach = b(data, "header") ? (roofRun - h) / 2 : 0;
  const headerLnFt = headerCount * headerLenEach;
  mat += addLineItem(lineItems, "Header Tubes", headerLnFt, "LnFt", getPrice(pricing, "TUBING", headerTubeIdx));

  // ── FOOTER TUBE ──
  // Row 26: same dimensions as header
  const footerTubeIdx = n(data, "footerTubeType");
  const footerCount = b(data, "footer") ? roundUp(w) : 0;
  const footerLenEach = b(data, "footer") ? (roofRun - h) / 2 : 0;
  const footerLnFt = footerCount * footerLenEach;
  mat += addLineItem(lineItems, "Footer Tubes", footerLnFt, "LnFt", getPrice(pricing, "TUBING", footerTubeIdx));

  // ── STRUCTURAL HEADERS ──
  // Row 30-31: (width + 1) * 2
  const strHeaderIdx = n(data, "strHeaderType");
  const strHeaderLnFt = (w + 1) * 2;
  mat += addLineItem(lineItems, "Structural Headers", strHeaderLnFt, "LnFt", getPrice(pricing, "TUBING", strHeaderIdx));

  // ── ANGLE ON FOOTER ──
  // Row 33-34: (totalUnits + 1) * 2 — Note: uses B3 (total units) not width
  const footerAngleIdx = n(data, "footerAngleType");
  const footerAngleLnFt = (qty + 1) * 2;
  mat += addLineItem(lineItems, "Footer Angle", footerAngleLnFt, "LnFt", getPrice(pricing, "ANGLES", footerAngleIdx));

  // ── TRACK PERIMETER ──
  // Row 37: IF(Yes, fullPerimeter, 0)
  const trackIdx = n(data, "trackType");
  const trackLnFt = b(data, "trackPerimeter") ? perimeter : 0;
  mat += addLineItem(lineItems, "Track Perimeter", trackLnFt, "LnFt", getPrice(pricing, "TRACK", trackIdx));

  // ── WOOD BUCKS ──
  const woodBuckIdx = n(data, "woodBuckType");
  const woodBuckLnFt = b(data, "woodBucks") ? perimeter : 0;
  mat += addLineItem(lineItems, "Wood Bucks", woodBuckLnFt, "LnFt", getPrice(pricing, "WOOD", woodBuckIdx));

  // ── SCREWS ──
  const roofScrewIdx = n(data, "roofScrewType");
  const roofScrewQty = roundUp(kingLnFt / 2 / 3) + roundUp(headerLnFt / 2) + roundUp(footerLnFt / 2);
  mat += addLineItem(lineItems, "Roof Drill Pt Screws", roofScrewQty, "Each", getPrice(pricing, "RSCREW", roofScrewIdx));

  const waferQty = (footerCount + headerCount + kingCount) * 20;
  mat += addLineItem(lineItems, "Wafer Head Screws", waferQty, "Each", FIXED_PRICES.waferHeadScrew);

  const bugleQty = b(data, "woodBucks") ? woodBuckLnFt * 2 : 0;
  mat += addLineItem(lineItems, "Bugle Head Screws", bugleQty, "Each", FIXED_PRICES.bugleHeadScrewWB);

  // ── DEDUCTIONS ──
  const epsBasePrice = getPrice(pricing, "EPS", 0);
  const epsDeduction = -(w * h) * epsThick * 0.22; // Row 48: uses hardcoded 0.22 in Excel
  const insideDeductIdx = n(data, "insideDeduction");
  const insideDeduction = -(w / 2 * roofRun) * getPrice(pricing, "TUBING", insideDeductIdx);
  const outsideDeductIdx = n(data, "outsideDeduction");
  const outsideDeduction = -(w / 2 * roofRun) * getPrice(pricing, "TUBING", outsideDeductIdx);
  const totalDeduction = epsDeduction + insideDeduction + outsideDeduction;

  if (epsDeduction !== 0) lineItems.push({ name: "EPS Deduction", qty: -(w * h * epsThick), unit: "BdFt", unitPrice: 0.22, cost: epsDeduction });
  if (insideDeduction !== 0) lineItems.push({ name: "Inside Stud Deduction", qty: -(w / 2 * roofRun), unit: "LnFt", unitPrice: getPrice(pricing, "TUBING", insideDeductIdx), cost: insideDeduction });
  if (outsideDeduction !== 0) lineItems.push({ name: "Outside Stud Deduction", qty: -(w / 2 * roofRun), unit: "LnFt", unitPrice: getPrice(pricing, "TUBING", outsideDeductIdx), cost: outsideDeduction });

  const waste = mat * WASTE_FACTOR;
  const perUnit = mat + totalDeduction + waste;
  const totalMat = perUnit * qty;
  const totalSF = openingSF * qty;

  return makeResult(totalSF, totalMat - waste * qty, 0, lineItems, waste * qty);
}
