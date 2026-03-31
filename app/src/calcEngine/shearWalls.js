// ═══════════════════════════════════════════════════════════════
// SHEAR WALLS — exact Excel formulas
// Differences from walls: length/2 (no roundup), X bracing, saddles, 8-tube end panels
// ═══════════════════════════════════════════════════════════════
import { getPrice, FIXED_PRICES, WASTE_FACTOR } from "./pricing.js";
import { n, b, roundUp, addLineItem, makeResult, ZERO_RESULT } from "./helpers.js";

export function calcShearWalls(data, pricing) {
  const qty = n(data, "qty");
  if (qty === 0) return ZERO_RESULT;

  const h = n(data, "height");
  const l = n(data, "length");
  const thick = n(data, "thickness");
  const epsThick = n(data, "epsThick");

  const lineItems = [];
  let mat = 0;
  const sf = h * l;

  // ── EPS ──
  const epsIdx = n(data, "epsDensity");
  const epsPrice = getPrice(pricing, "EPS", epsIdx);
  const epsBdFt = sf * epsThick;
  mat += addLineItem(lineItems, "EPS", epsBdFt, "BdFt", epsPrice);

  // ── INSIDE STUDS — length/2 (NOT roundup like walls) ──
  const insideIdx = n(data, "insideStudType");
  const insideCount = b(data, "insideStuds") ? l / 2 : 0;
  const insideLnFt = insideCount * (b(data, "insideStuds") ? h : 0);
  mat += addLineItem(lineItems, "Inside Studs", insideLnFt, "LnFt", getPrice(pricing, "TUBING", insideIdx));

  // ── OUTSIDE STUDS ──
  const outsideIdx = n(data, "outsideStudType");
  const outsideCount = b(data, "outsideStuds") ? l / 2 : 0;
  const outsideLenEach = b(data, "outsideStuds") ? h : 0;
  const outsideLnFt = outsideCount * outsideLenEach;
  mat += addLineItem(lineItems, "Outside Studs", outsideLnFt, "LnFt", getPrice(pricing, "TUBING", outsideIdx));

  // ── TRACK TOP ──
  const topTrackIdx = n(data, "topTrackType");
  const topInstalled = b(data, "topTrackInstalled") ? l : 0;
  const topShipped = b(data, "topTrackShipped") ? l : 0;
  mat += addLineItem(lineItems, "Top Track", topInstalled + topShipped, "LnFt", getPrice(pricing, "TRACK", topTrackIdx));

  // ── TRACK BOTTOM ──
  const btmTrackIdx = n(data, "bottomTrackType");
  const btmInstalled = b(data, "bottomTrackInstalled") ? l : 0;
  const btmShipped = b(data, "bottomTrackShipped") ? l : 0;
  mat += addLineItem(lineItems, "Bottom Track", btmInstalled + btmShipped, "LnFt", getPrice(pricing, "TRACK", btmTrackIdx));

  // ── ANGLES TOP — length * 2 ──
  const topAngleIdx = n(data, "topAngleType");
  const topAngleInstalled = b(data, "topAngleInstalled") ? l * 2 : 0;
  const topAngleShipped = b(data, "topAngleShipped") ? l * 2 : 0;
  mat += addLineItem(lineItems, "Top Angles", topAngleInstalled + topAngleShipped, "LnFt", getPrice(pricing, "ANGLES", topAngleIdx));

  // ── ANGLES BOTTOM — length ──
  const btmAngleIdx = n(data, "bottomAngleType");
  const btmAngleInstalled = b(data, "bottomAngleInstalled") ? l : 0;
  const btmAngleShipped = b(data, "bottomAngleShipped") ? l : 0;
  mat += addLineItem(lineItems, "Bottom Angles", btmAngleInstalled + btmAngleShipped, "LnFt", getPrice(pricing, "ANGLES", btmAngleIdx));

  // ── TOP WOOD PLATES ──
  const topPlatesIdx = n(data, "topPlatesType");
  const topPlatesInst = b(data, "topPlatesInstalled") ? l : 0;
  const topPlatesShip = b(data, "topPlatesShipped") ? l : 0;
  mat += addLineItem(lineItems, "Top Plates (Inst)", topPlatesInst, "LnFt", getPrice(pricing, "WOOD", topPlatesIdx));
  mat += addLineItem(lineItems, "Top Plates (Ship)", topPlatesShip, "LnFt", getPrice(pricing, "WOOD", topPlatesIdx));

  // ── SHEATHING EXTERIOR ──
  const sheathIdx = n(data, "sheathingType");
  const extSheathSF = b(data, "extSheathing") ? sf : 0;
  mat += addLineItem(lineItems, "Ext Sheathing", extSheathSF, "SqFt", getPrice(pricing, "SHEATHING", sheathIdx));

  // ── SHEATHING INTERIOR ──
  const intSheathIdx = n(data, "intSheathingType");
  const intSheathSF = b(data, "intSheathing") ? sf : 0;
  mat += addLineItem(lineItems, "Int Sheathing", intSheathSF, "SqFt", getPrice(pricing, "SHEATHING", intSheathIdx));

  // ── X BRACING ──
  // 4 per shear wall, length = SQRT(height² + length²)
  const xBraceCount = 4 * qty;  // uses total qty not per-unit
  const xBraceLen = Math.sqrt(h * h + l * l);
  // Strapping priced from Drop Downs F50 (currently 0 in Excel)
  mat += addLineItem(lineItems, "X Bracing Strap", xBraceCount * xBraceLen, "LnFt", 0);

  // ── SADDLE CONNECTIONS ──
  // 2 saddles per shear wall
  const saddleCount = 2 * qty;
  // 100 fasteners per saddle
  const saddleFasteners = 100 * saddleCount;
  mat += addLineItem(lineItems, "Saddle Fasteners", saddleFasteners, "Each", 0); // price from F55
  // Threaded rod — 1 per saddle
  mat += addLineItem(lineItems, "Saddle Thd Rod", saddleCount, "Each", 0); // price from F56
  // HILTI epoxy — ROUNDUP(saddleCount / 2)
  mat += addLineItem(lineItems, "HILTI Epoxy", roundUp(saddleCount / 2), "Each", 0); // price from F57

  // ── END PANELS WITH 8 TUBES ──
  const endPanelTubes = 8 * qty;
  const endPanelLnFt = endPanelTubes * h;
  const endPanelTubeIdx = n(data, "endPanelTubeType") || outsideIdx;
  mat += addLineItem(lineItems, "End Panel Tubes", endPanelLnFt, "LnFt", getPrice(pricing, "TUBING", endPanelTubeIdx));

  // ── LIFT RINGS ──
  const liftRingQty = outsideCount;  // Row 61: = outsideStudCount
  mat += addLineItem(lineItems, "Lift Rings", liftRingQty, "Each", FIXED_PRICES.liftRing);

  // ── WALL STRAPPING ──
  const intWallCount = n(data, "interiorWallCount");
  mat += addLineItem(lineItems, "Wall Strapping", intWallCount * 3, "Each", FIXED_PRICES.wallStrapping);

  // ── ROOF DRILL PT SCREWS ──
  // Row 65: ROUNDUP(outsideLenEach/3, 0) * (outsideCount + endPanelTubes/2)
  const roofScrewIdx = n(data, "roofScrewType");
  const roofScrewQty = roundUp(outsideLenEach / 3) * (outsideCount + endPanelTubes / 2);
  mat += addLineItem(lineItems, "Roof Drill Pt Screws", roofScrewQty, "Each", getPrice(pricing, "RSCREW", roofScrewIdx));

  // ── WAFER HEAD SCREWS ──
  // Row 66: (insideCount + outsideCount + liftRings + strapping + endPanelTubes) * 10
  const waferQty = (insideCount + outsideCount + liftRingQty + intWallCount * 3 + endPanelTubes) * 10;
  mat += addLineItem(lineItems, "Wafer Head Screws", waferQty, "Each", FIXED_PRICES.waferHeadScrew);

  // ── BUGLE HEAD SCREWS ──
  // Row 67: height * 2
  const bugleQty = h * 2;
  mat += addLineItem(lineItems, "Bugle Head Screws", bugleQty, "Each", FIXED_PRICES.bugleHeadScrew);

  // ── SHEATHING FASTENERS ──
  // Row 69: extSheathSF + intSheathSF
  mat += addLineItem(lineItems, "Sheathing Fasteners", extSheathSF + intSheathSF, "Each", FIXED_PRICES.sheathingFastener);

  const waste = mat * WASTE_FACTOR;
  const perUnit = mat + waste;
  const totalMat = perUnit * qty;
  const totalSF = sf * qty;

  return makeResult(totalSF, totalMat - waste * qty, 0, lineItems, waste * qty);
}
