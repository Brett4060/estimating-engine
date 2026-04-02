// ═══════════════════════════════════════════════════════════════
// GABLES — exact Excel formulas
// Key: stud length = gableHeight/2 (average), track top = gableRun*2
// ═══════════════════════════════════════════════════════════════
import { getPrice, FIXED_PRICES, WASTE_FACTOR } from "./pricing.js";
import { n, b, roundUp, addLineItem, makeResult, ZERO_RESULT } from "./helpers.js";

export function calcGables(data, pricing) {
  const qty = n(data, "qty");
  if (qty === 0) return ZERO_RESULT;

  const rise = n(data, "rise");
  const run = n(data, "run") || 12;
  const gableLen = n(data, "gableLength");
  const gableThick = n(data, "gableThick");
  const epsThick = n(data, "epsThick");

  const lineItems = [];
  let mat = 0;

  // ── Geometry ──
  const gableHeight = (rise / run) * (0.5 * gableLen);
  const gableRun = Math.sqrt(gableHeight * gableHeight + (gableLen / 2) * (gableLen / 2));
  const sf = 0.5 * gableLen * gableHeight;

  // ── EPS ──
  const epsIdx = n(data, "epsDensity");
  const epsPrice = getPrice(pricing, "EPS", epsIdx);
  const epsBdFt = sf * epsThick;
  mat += addLineItem(lineItems, "EPS", epsBdFt, "BdFt", epsPrice);

  // ── INSIDE STUDS ──
  const insideIdx = n(data, "insideStudType");
  const insideCount = b(data, "insideStuds") ? gableLen / 2 : 0;
  const insideLenAvg = b(data, "insideStuds") ? gableHeight / 2 : 0;
  const insideLnFt = insideCount * insideLenAvg;
  mat += addLineItem(lineItems, "Inside Studs", insideLnFt, "LnFt", getPrice(pricing, "TUBING", insideIdx));

  // ── OUTSIDE STUDS ──
  const outsideIdx = n(data, "outsideStudType");
  const outsideCount = b(data, "outsideStuds") ? gableLen / 2 : 0;
  const outsideLenAvg = b(data, "outsideStuds") ? gableHeight / 2 : 0;
  const outsideLnFt = outsideCount * outsideLenAvg;
  mat += addLineItem(lineItems, "Outside Studs", outsideLnFt, "LnFt", getPrice(pricing, "TUBING", outsideIdx));

  // ── BEAM SUPPORT COLUMNS ──
  const beamSptQty = n(data, "beamSupportQty");
  const beamSptTubeIdx = n(data, "beamSupportTubeType");
  const beamSptTubes = beamSptQty * 6;
  const beamSptLnFt = beamSptTubes * gableHeight;
  mat += addLineItem(lineItems, "Beam Support Tubes", beamSptLnFt, "LnFt", getPrice(pricing, "TUBING", beamSptTubeIdx));

  // ── TRACK TOP — gableRun * 2 (both slopes) ──
  const topTrackIdx = n(data, "topTrackType");
  const topInstalled = b(data, "topTrackInstalled") ? gableRun * 2 : 0;
  const topShipped = b(data, "topTrackShipped") ? gableRun * 2 : 0;
  mat += addLineItem(lineItems, "Top Track", topInstalled + topShipped, "LnFt", getPrice(pricing, "TRACK", topTrackIdx));

  // ── TRACK BOTTOM — gableLength ──
  const btmTrackIdx = n(data, "bottomTrackType");
  const btmInstalled = b(data, "bottomTrackInstalled") ? gableLen : 0;
  const btmShipped = b(data, "bottomTrackShipped") ? gableLen : 0;
  mat += addLineItem(lineItems, "Bottom Track", btmInstalled + btmShipped, "LnFt", getPrice(pricing, "TRACK", btmTrackIdx));

  // ── ANGLES TOP — gableRun * 4 ──
  const topAngleIdx = n(data, "topAngleType");
  const topAngleInst = b(data, "topAngleInstalled") ? gableRun * 4 : 0;
  const topAngleShip = b(data, "topAngleShipped") ? gableRun * 4 : 0;
  mat += addLineItem(lineItems, "Top Angles", topAngleInst + topAngleShip, "LnFt", getPrice(pricing, "ANGLES", topAngleIdx));

  // ── ANGLES BOTTOM — gableLength ──
  const btmAngleIdx = n(data, "bottomAngleType");
  const btmAngleInst = b(data, "bottomAngleInstalled") ? gableLen : 0;
  const btmAngleShip = b(data, "bottomAngleShipped") ? gableLen : 0;
  mat += addLineItem(lineItems, "Bottom Angles", btmAngleInst + btmAngleShip, "LnFt", getPrice(pricing, "ANGLES", btmAngleIdx));

  // ── SHEATHING ──
  const extSheathIdx = n(data, "sheathingType");
  const extSheathSF = b(data, "extSheathing") ? sf : 0;
  mat += addLineItem(lineItems, "Ext Sheathing", extSheathSF, "SqFt", getPrice(pricing, "SHEATHING", extSheathIdx));

  const intSheathIdx = n(data, "intSheathingType");
  const intSheathSF = b(data, "intSheathing") ? sf : 0;
  mat += addLineItem(lineItems, "Int Sheathing", intSheathSF, "SqFt", getPrice(pricing, "SHEATHING", intSheathIdx));

  // ── WALL STRAPPING ──
  const interiorWallCount = n(data, "interiorWallCount");
  mat += addLineItem(lineItems, "Wall Strapping", interiorWallCount * 3, "Each", FIXED_PRICES.wallStrapping);

  // ── LIFT RINGS ──
  mat += addLineItem(lineItems, "Lift Rings", insideCount, "Each", FIXED_PRICES.liftRing);

  // ── SCREWS ──
  const roofScrewIdx = n(data, "roofScrewType");
  const roofScrewQty = roundUp(outsideLenAvg / 3) * (outsideCount + beamSptTubes / 2);
  mat += addLineItem(lineItems, "Roof Drill Pt Screws", roofScrewQty, "Each", getPrice(pricing, "RSCREW", roofScrewIdx));

  const waferQty = (insideCount + outsideCount + insideCount + interiorWallCount * 3) * 10;
  mat += addLineItem(lineItems, "Wafer Head Screws", waferQty, "Each", FIXED_PRICES.waferHeadScrew);

  mat += addLineItem(lineItems, "Sheathing Fasteners", extSheathSF + intSheathSF, "Each", FIXED_PRICES.sheathingFastener);

  const waste = mat * WASTE_FACTOR;
  const totalMat = (mat + waste) * qty;
  const totalSF = sf * qty;

  return makeResult(totalSF, totalMat - waste * qty, 0, lineItems, waste * qty);
}
