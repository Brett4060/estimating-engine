// ═══════════════════════════════════════════════════════════════
// BOX BEAMS — exact Excel formulas
// EPS = beamLength * beamHeight * wallThickness
// ═══════════════════════════════════════════════════════════════
import { getPrice, FIXED_PRICES, WASTE_FACTOR } from "./pricing.js";
import { n, b, roundUp, addLineItem, makeResult, ZERO_RESULT } from "./helpers.js";

export function calcBoxBeams(data, pricing) {
  const qty = n(data, "qty");
  if (qty === 0) return ZERO_RESULT;

  const wallHt = n(data, "wallHeight");
  const wallThick = n(data, "wallThick");
  const beamLen = n(data, "beamLength");
  const beamHt = n(data, "beamHeight") || 1;

  const lineItems = [];
  let mat = 0;
  const sf = beamLen * beamHt;

  // ── TOP WOOD PLATES ──
  // Row 10-11: qty * beamLength
  const topPlatesIdx = n(data, "topPlatesType");
  const topPlatesQty = n(data, "topPlatesQty");
  mat += addLineItem(lineItems, "Top Wood Plates", topPlatesQty * beamLen, "LnFt", getPrice(pricing, "WOOD", topPlatesIdx));

  // ── BOTTOM WOOD PLATES ──
  const btmPlatesIdx = n(data, "bottomPlatesType");
  const btmPlatesQty = n(data, "bottomPlatesQty");
  mat += addLineItem(lineItems, "Bottom Wood Plates", btmPlatesQty * beamLen, "LnFt", getPrice(pricing, "WOOD", btmPlatesIdx));

  // ── LVL ──
  // Row 14-15: qty * beamLength, priced via LVL dropdown
  const lvlIdx = n(data, "lvlType");
  const lvlQty = n(data, "lvlQty");
  mat += addLineItem(lineItems, "LVL", lvlQty * beamLen, "LnFt", getPrice(pricing, "LVL", lvlIdx));

  // ── FLAT METAL PLATE ──
  // Row 16: qty * price (each)
  const flatPlateQty = n(data, "flatPlateQty");
  mat += addLineItem(lineItems, "Flat Metal Plate", flatPlateQty, "Each", FIXED_PRICES.flatPlate16x6);

  // ── EPS ──
  // Row 19-20: SF = beamLength * beamHeight, BdFt = SF * wallThickness
  const epsIdx = n(data, "epsDensity");
  const epsPrice = getPrice(pricing, "EPS", epsIdx);
  const epsSF = beamLen * beamHt;
  const epsBdFt = epsSF * wallThick;
  mat += addLineItem(lineItems, "EPS", epsBdFt, "BdFt", epsPrice);

  // ── KING STUDS ──
  // Row 22-24: IF(Yes, 4, 0), length = wallHeight
  const kingIdx = n(data, "kingStudType");
  const kingCount = b(data, "kingStuds") ? 4 : 0;
  const kingLnFt = kingCount * wallHt;
  mat += addLineItem(lineItems, "King Studs", kingLnFt, "LnFt", getPrice(pricing, "TUBING", kingIdx));

  // ── JACK STUDS ──
  // Row 25-27: IF(Yes, 4, 0), length = wallHeight - beamHeight
  const jackIdx = n(data, "jackStudType");
  const jackCount = b(data, "jackStuds") ? 4 : 0;
  const jackLnFt = jackCount * (wallHt - beamHt);
  mat += addLineItem(lineItems, "Jack Studs", jackLnFt, "LnFt", getPrice(pricing, "TUBING", jackIdx));

  // ── ROOF DRILL PT SCREWS ──
  // Row 29: ROUNDUP(kingLen/3 * kingCount) + ROUNDUP(jackLen/3 * jackCount)
  const roofScrewIdx = n(data, "roofScrewType");
  const roofScrewQty = roundUp(wallHt / 3 * kingCount) + roundUp((wallHt - beamHt) / 3 * jackCount);
  mat += addLineItem(lineItems, "Roof Drill Pt Screws", roofScrewQty, "Each", getPrice(pricing, "RSCREW", roofScrewIdx));

  // ── WAFER HEAD SCREWS ──
  // Row 30: flatPlateQty * 20
  mat += addLineItem(lineItems, "Wafer Head Screws", flatPlateQty * 20, "Each", FIXED_PRICES.waferHeadScrew);

  // ── BUGLE HEAD SCREWS ──
  // Row 31: beamLength * 4
  mat += addLineItem(lineItems, "Bugle Head Screws", beamLen * 4, "Each", FIXED_PRICES.bugleHeadScrew);

  const waste = mat * WASTE_FACTOR;
  const totalMat = (mat + waste) * qty;
  const totalSF = sf * qty;

  return makeResult(totalSF, totalMat - waste * qty, 0, lineItems, waste * qty);
}
