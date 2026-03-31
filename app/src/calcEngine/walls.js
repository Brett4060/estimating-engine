// ═══════════════════════════════════════════════════════════════
// WALLS — exact Excel formulas from WALLS sheet
// ═══════════════════════════════════════════════════════════════
import { getPrice, FIXED_PRICES, WASTE_FACTOR } from "./pricing.js";
import { n, b, roundUp, addLineItem, makeResult, ZERO_RESULT } from "./helpers.js";

export function calcWalls(data, pricing) {
  const qty = n(data, "qty");
  if (qty === 0) return ZERO_RESULT;

  const h = n(data, "height");       // Wall Height (LnFt)
  const l = n(data, "length");       // Wall Length (LnFt)
  const thick = n(data, "thickness"); // Wall Thickness (Inches)
  const epsThick = n(data, "epsThick"); // EPS Thickness (Inches)

  const lineItems = [];
  let mat = 0;

  // ── SF & Board Footage ──
  const sf = h * l;
  const boardFt = h * l * thick;

  // ── EPS ──
  // Row 14-15: EPS SF = h*l, EPS BdFt = SF * epsThick, cost = BdFt * epsPrice
  const epsIdx = n(data, "epsDensity");
  const epsPrice = getPrice(pricing, "EPS", epsIdx);
  const epsSF = h * l;
  const epsBdFt = epsSF * epsThick;
  mat += addLineItem(lineItems, "EPS", epsBdFt, "BdFt", epsPrice);

  // ── INSIDE STUDS ──
  // Row 17: IF(Yes, ROUNDUP(length/2, 0), 0)
  // Row 18: IF(Yes, wallHeight, 0)
  // Row 19: count * length, priced per LnFt
  const insideStudIdx = n(data, "insideStudType");
  const insideCount = b(data, "insideStuds") ? roundUp(l / 2) : 0;
  const insideLenEach = b(data, "insideStuds") ? h : 0;
  const insideTotalLnFt = insideCount * insideLenEach;
  mat += addLineItem(lineItems, "Inside Studs", insideTotalLnFt, "LnFt", getPrice(pricing, "TUBING", insideStudIdx));

  // ── OUTSIDE STUDS ──
  // Row 20-22: same pattern
  const outsideStudIdx = n(data, "outsideStudType");
  const outsideCount = b(data, "outsideStuds") ? roundUp(l / 2) : 0;
  const outsideLenEach = b(data, "outsideStuds") ? h : 0;
  const outsideTotalLnFt = outsideCount * outsideLenEach;
  mat += addLineItem(lineItems, "Outside Studs", outsideTotalLnFt, "LnFt", getPrice(pricing, "TUBING", outsideStudIdx));

  // ── TRACK — TOP ──
  // Row 24: IF(topInstalled=Yes, length, 0)
  // Row 25: IF(topShipped=Yes, length, 0)
  // Row 26: total = installed + shipped, priced per LnFt
  const topTrackIdx = n(data, "topTrackType");
  const topInstalled = b(data, "topTrackInstalled") ? l : 0;
  const topShipped = b(data, "topTrackShipped") ? l : 0;
  const topTrackTotal = topInstalled + topShipped;
  mat += addLineItem(lineItems, "Top Track", topTrackTotal, "LnFt", getPrice(pricing, "TRACK", topTrackIdx));

  // ── TRACK — BOTTOM ──
  // Row 27-29: same pattern
  const btmTrackIdx = n(data, "bottomTrackType");
  const btmInstalled = b(data, "bottomTrackInstalled") ? l : 0;
  const btmShipped = b(data, "bottomTrackShipped") ? l : 0;
  const btmTrackTotal = btmInstalled + btmShipped;
  mat += addLineItem(lineItems, "Bottom Track", btmTrackTotal, "LnFt", getPrice(pricing, "TRACK", btmTrackIdx));

  // ── ANGLES — TOP ──
  // Row 31: IF(topInstalled=Yes, length*2, 0)  — note: *2 for top angles
  // Row 32: IF(topShipped=Yes, length*2, 0)
  const topAngleIdx = n(data, "topAngleType");
  const topAngleInstalled = b(data, "topAngleInstalled") ? l * 2 : 0;
  const topAngleShipped = b(data, "topAngleShipped") ? l * 2 : 0;
  const topAngleTotal = topAngleInstalled + topAngleShipped;
  mat += addLineItem(lineItems, "Top Angles", topAngleTotal, "LnFt", getPrice(pricing, "ANGLES", topAngleIdx));

  // ── ANGLES — BOTTOM ──
  // Row 34: IF(bottomInstalled=Yes, length, 0)  — note: *1 for bottom angles
  // Row 35: IF(bottomShipped=Yes, length, 0)
  const btmAngleIdx = n(data, "bottomAngleType");
  const btmAngleInstalled = b(data, "bottomAngleInstalled") ? l : 0;
  const btmAngleShipped = b(data, "bottomAngleShipped") ? l : 0;
  const btmAngleTotal = btmAngleInstalled + btmAngleShipped;
  mat += addLineItem(lineItems, "Bottom Angles", btmAngleTotal, "LnFt", getPrice(pricing, "ANGLES", btmAngleIdx));

  // ── TOP WOOD PLATES ──
  // Row 38: IF(installed=Yes, length, 0) — priced per LnFt via wood plate type
  // Row 40: IF(shipped=Yes, length, 0)
  const topPlatesIdx = n(data, "topPlatesType");
  const topPlatesInstalled = b(data, "topPlatesInstalled") ? l : 0;
  const topPlatesShipped = b(data, "topPlatesShipped") ? l : 0;
  mat += addLineItem(lineItems, "Top Plates (Inst)", topPlatesInstalled, "LnFt", getPrice(pricing, "WOOD", topPlatesIdx));
  mat += addLineItem(lineItems, "Top Plates (Ship)", topPlatesShipped, "LnFt", getPrice(pricing, "WOOD", topPlatesIdx));

  // ── BOTTOM WOOD PLATES ──
  const btmPlatesIdx = n(data, "bottomPlatesType");
  const btmPlatesInstalled = b(data, "bottomPlatesInstalled") ? l : 0;
  const btmPlatesShipped = b(data, "bottomPlatesShipped") ? l : 0;
  mat += addLineItem(lineItems, "Btm Plates (Inst)", btmPlatesInstalled, "LnFt", getPrice(pricing, "WOOD", btmPlatesIdx));
  mat += addLineItem(lineItems, "Btm Plates (Ship)", btmPlatesShipped, "LnFt", getPrice(pricing, "WOOD", btmPlatesIdx));

  // ── SHEATHING — EXTERIOR ──
  // Row 43: IF(Yes, h*l, 0) priced per SqFt
  const sheathingIdx = n(data, "sheathingType");
  const extSheathingSF = b(data, "extSheathing") ? h * l : 0;
  mat += addLineItem(lineItems, "Ext Sheathing", extSheathingSF, "SqFt", getPrice(pricing, "SHEATHING", sheathingIdx));

  // ── MOISTURE BARRIER ──
  // Row 45-46: IF(Yes, h*l, 0) priced via dropdown
  const moistureIdx = n(data, "moistureBarrierType");
  const moistureSF = b(data, "moistureBarrier") ? h * l : 0;
  mat += addLineItem(lineItems, "Moisture Barrier", moistureSF, "SqFt", getPrice(pricing, "SHEATHING", moistureIdx));

  // ── CORNERS WITH 6 TUBES ──
  // Row 48: Qty of Corners (user input, default 5)
  // Row 49: totalTubes = cornerQty * 6
  // Row 50: tubeLength = wallHeight
  // Row 51: totalLnFt = tubeLength * totalTubes, priced per LnFt
  const cornerQty = n(data, "cornerQty") || 5;
  const cornerTubeIdx = n(data, "cornerTubeType");
  const cornerTotalTubes = cornerQty * 6;
  const cornerTotalLnFt = cornerTotalTubes * h;
  mat += addLineItem(lineItems, "Corner Tubes", cornerTotalLnFt, "LnFt", getPrice(pricing, "TUBING", cornerTubeIdx));

  // ── EXTERIOR CORNER ANGLE ──
  // Row 52: IF(Yes, cornerQty, 0) — qty of angles
  // Row 53: IF(Yes, wallHeight, 0) — length each
  // Row 54: total = qty * length, priced per LnFt via ANGLES dropdown
  const extCornerAngleIdx = n(data, "extCornerType");
  const extCornerAngleQty = b(data, "extCornerAngle") ? cornerQty : 0;
  const extCornerAngleLenEach = b(data, "extCornerAngle") ? h : 0;
  const extCornerAngleLnFt = extCornerAngleQty * extCornerAngleLenEach;
  mat += addLineItem(lineItems, "Ext Corner Angles", extCornerAngleLnFt, "LnFt", getPrice(pricing, "ANGLES", extCornerAngleIdx));

  // ── INTERIOR CORNER ANGLE ──
  // Row 55: ROUNDUP(height/3, 0) * cornerQty
  // Row 56: total * 1 LnFt each
  const intCornerAngleIdx = n(data, "intCornerType");
  const intCornerAngleQty = roundUp(h / 3) * cornerQty;
  const intCornerAngleLnFt = intCornerAngleQty * 1;
  mat += addLineItem(lineItems, "Int Corner Angles", intCornerAngleLnFt, "LnFt", getPrice(pricing, "ANGLES", intCornerAngleIdx));

  // ── END PANELS WITH 2 TUBES ──
  // Row 58: Qty of End Panels (user input)
  // Row 59: totalTubes = endPanelQty * 2
  // Row 61: totalLnFt = tubeLength * totalTubes
  const endPanelQty = n(data, "endPanelQty");
  const endPanelTubeIdx = n(data, "endPanelTubeType") || cornerTubeIdx;
  const endPanelTotalTubes = endPanelQty * 2;
  const endPanelTotalLnFt = endPanelTotalTubes * h;
  mat += addLineItem(lineItems, "End Panel Tubes", endPanelTotalLnFt, "LnFt", getPrice(pricing, "TUBING", endPanelTubeIdx));

  // ── BEAM SUPPORT COLUMNS WITH 6 TUBES ──
  // Row 63: Qty (user input)
  // Row 64: totalTubes = qty * 6
  // Row 66: totalLnFt = tubeLength * totalTubes
  const beamSupportQty = n(data, "beamSupportQty");
  const beamSupportTubeIdx = n(data, "beamSupportTubeType") || cornerTubeIdx;
  const beamSupportTotalTubes = beamSupportQty * 6;
  const beamSupportTotalLnFt = beamSupportTotalTubes * h;
  mat += addLineItem(lineItems, "Beam Support Tubes", beamSupportTotalLnFt, "LnFt", getPrice(pricing, "TUBING", beamSupportTubeIdx));

  // ── LIFT RINGS ──
  // Row 68: length / 4, priced at $2.00 each
  const liftRingQty = l / 4;
  mat += addLineItem(lineItems, "Lift Rings", liftRingQty, "Each", FIXED_PRICES.liftRing);

  // ── CABINET BACKING ──
  // Row 70: manual entry (qty), priced at flatMetal6x8
  const cabinetBackingQty = n(data, "cabinetBackingQty");
  mat += addLineItem(lineItems, "Cabinet Backing", cabinetBackingQty, "Each", FIXED_PRICES.flatMetal6x8);

  // ── WALL STRAPPING ──
  // Row 71: interior walls intersecting (manual)
  // Row 72: qty * 3, priced at $2.25 each
  const interiorWallCount = n(data, "interiorWallCount");
  const strappingQty = interiorWallCount * 3;
  mat += addLineItem(lineItems, "Wall Strapping", strappingQty, "Each", FIXED_PRICES.wallStrapping);

  // ── 3x6 FLAT METAL ──
  // Row 73: length / 4, priced at $1.78125 each
  const flatMetalQty = l / 4;
  mat += addLineItem(lineItems, "3x6 Flat Metal", flatMetalQty, "Each", FIXED_PRICES.flatMetal3x6);

  // ── ROOF DRILL PT SCREWS ──
  // Row 74: ROUNDUP((outsideLnFt + endPanelLnFt/2 + cornerLnFt/2/3 + beamSupportLnFt/2/3), 0)
  const roofScrewIdx = n(data, "roofScrewType");
  const roofScrewQty = roundUp(
    outsideTotalLnFt +
    (endPanelTotalLnFt / 2) +
    (cornerTotalLnFt / 2 / 3) +
    (beamSupportTotalLnFt / 2 / 3)
  );
  mat += addLineItem(lineItems, "Roof Drill Pt Screws", roofScrewQty, "Each", getPrice(pricing, "RSCREW", roofScrewIdx));

  // ── WAFER HEAD SCREWS ──
  // Row 75: (insideCount + outsideCount + liftRings + flatMetal + cornerTubes + endPanelTubes + extCornerAngle + intCornerAngle) * 10
  const waferQty = (insideCount + outsideCount + liftRingQty + flatMetalQty +
    cornerTotalTubes + endPanelTotalTubes + extCornerAngleQty + intCornerAngleQty) * 10;
  mat += addLineItem(lineItems, "Wafer Head Screws", waferQty, "Each", FIXED_PRICES.waferHeadScrew);

  // ── BUGLE HEAD SCREWS ──
  // Row 76: IF(topPlatesInstalled=Yes, length*2, 0)
  const bugleQty = b(data, "topPlatesInstalled") ? l * 2 : 0;
  mat += addLineItem(lineItems, "Bugle Head Screws", bugleQty, "Each", FIXED_PRICES.bugleHeadScrew);

  // ── SHEATHING FASTENERS ──
  // Row 77: IF(extSheathing=Yes, sheathingSF + moistureSF, 0)
  const sheathingFastenerQty = b(data, "extSheathing") ? extSheathingSF + moistureSF : 0;
  mat += addLineItem(lineItems, "Sheathing Fasteners", sheathingFastenerQty, "Each", FIXED_PRICES.sheathingFastener);

  // ── SUBTOTAL + WASTE ──
  const waste = mat * WASTE_FACTOR;

  // Per-unit cost * qty
  const perUnitMat = mat + waste;
  const totalMat = perUnitMat * qty;
  const totalSF = sf * qty;

  return makeResult(totalSF, totalMat - waste * qty, 0, lineItems, waste * qty);
}
