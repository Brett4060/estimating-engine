// ═══════════════════════════════════════════════════════════════
// WINDOWS — exact Excel formulas from WINDOWS sheet
// ═══════════════════════════════════════════════════════════════
import { getPrice, FIXED_PRICES, WASTE_FACTOR } from "./pricing.js";
import { n, b, roundUp, addLineItem, makeResult, ZERO_RESULT } from "./helpers.js";

export function calcWindows(data, pricing) {
  const qty = n(data, "qty");
  if (qty === 0) return ZERO_RESULT;

  const w = n(data, "width");          // Opening Width (LnFt)
  const h = n(data, "height");         // Opening Height (LnFt)
  const wallHt = n(data, "wallHeight"); // Wall Height (LnFt)
  const wallThick = n(data, "wallThick"); // Wall Thickness (Inches)
  const epsThick = n(data, "epsThick");   // EPS Thickness (Inches)
  const headerHt = n(data, "headerHt");   // Window Header Height (LnFt)
  const trackWidth = n(data, "trackWidth"); // Width of Track (Inches)

  const lineItems = [];
  let mat = 0;

  // ── Opening SF ──
  const openingSF = w * h;
  const perimeter = (w + h) * 2;  // Row 13

  // ── EPS ──
  // Row 16: EPS Header SqFt = (wallHeight - headerHeight) * width
  // Row 17: EPS Header BdFt = headerSF * epsThick
  const epsIdx = n(data, "epsDensity");
  const epsPrice = getPrice(pricing, "EPS", epsIdx);
  const headerEpsSF = (wallHt - headerHt) * w;
  const headerEpsBdFt = headerEpsSF * epsThick;
  mat += addLineItem(lineItems, "EPS Header", headerEpsBdFt, "BdFt", epsPrice);

  // Row 18-19: EPS Footer SqFt = (headerHeight - openingHeight) * width
  const footerEpsSF = (headerHt - h) * w;
  const footerEpsBdFt = footerEpsSF * epsThick;
  mat += addLineItem(lineItems, "EPS Footer", footerEpsBdFt, "BdFt", epsPrice);

  // ── KING STUDS ──
  // Row 21: IF(Yes, 4, 0) — always 4 kings per window
  // Row 22: IF(Yes, wallHeight, 0)
  // Row 23: count * length, priced per LnFt
  const kingIdx = n(data, "kingType");
  const kingCount = b(data, "king") ? 4 : 0;
  const kingLenEach = b(data, "king") ? wallHt : 0;
  const kingLnFt = kingCount * kingLenEach;
  mat += addLineItem(lineItems, "King Studs", kingLnFt, "LnFt", getPrice(pricing, "TUBING", kingIdx));

  // ── JACK STUDS ──
  // Row 24: IF(Yes, 4, 0) — always 4 jacks
  // Row 25: IF(Yes, headerHeight, 0)
  const jackIdx = n(data, "jackType");
  const jackCount = b(data, "jack") ? 4 : 0;
  const jackLenEach = b(data, "jack") ? headerHt : 0;
  const jackLnFt = jackCount * jackLenEach;
  mat += addLineItem(lineItems, "Jack Studs", jackLnFt, "LnFt", getPrice(pricing, "TUBING", jackIdx));

  // ── HEADER TUBE ──
  // Row 27: IF(Yes, 1, 0)
  // Row 28: IF(Yes, wallHeight - headerHeight, 0)
  const headerTubeIdx = n(data, "headerTubeType");
  const headerTubeCount = b(data, "header") ? 1 : 0;
  const headerTubeLenEach = b(data, "header") ? wallHt - headerHt : 0;
  const headerTubeLnFt = headerTubeCount * headerTubeLenEach;
  mat += addLineItem(lineItems, "Header Tube", headerTubeLnFt, "LnFt", getPrice(pricing, "TUBING", headerTubeIdx));

  // ── FOOTER TUBE ──
  // Row 30: IF(Yes, 1, 0)
  // Row 31: IF(Yes, headerHeight - openingHeight, 0)
  const footerTubeIdx = n(data, "footerTubeType");
  const footerTubeCount = b(data, "footer") ? 1 : 0;
  const footerTubeLenEach = b(data, "footer") ? headerHt - h : 0;
  const footerTubeLnFt = footerTubeCount * footerTubeLenEach;
  mat += addLineItem(lineItems, "Footer Tube", footerTubeLnFt, "LnFt", getPrice(pricing, "TUBING", footerTubeIdx));

  // ── STRUCTURAL HEADERS ──
  // Row 34: headerLength (user input, e.g. 8 LnFt)
  // Row 35: headerLength * 2 LnFt, priced per LnFt
  //         Price = VLOOKUP - angleLHdr deduction (1.5"x1.5" 18ga = $0.88)
  const strHeaderIdx = n(data, "strHeaderType");
  const strHeaderLen = n(data, "headerLength") || 8;
  const strHeaderLnFt = strHeaderLen * 2;
  const strHeaderPrice = getPrice(pricing, "TUBING", strHeaderIdx) - FIXED_PRICES.angleLHdr;
  mat += addLineItem(lineItems, "Structural Headers", strHeaderLnFt, "LnFt", Math.max(0, strHeaderPrice));

  // ── ANGLE ON TOP OF FOOTER ──
  // Row 37: width + 1
  // Row 38: (width+1) * 2, priced via ANGLES dropdown
  const footerAngleIdx = n(data, "footerAngleType");
  const footerAngleLen = (w + 1) * 2;
  mat += addLineItem(lineItems, "Footer Angle", footerAngleLen, "LnFt", getPrice(pricing, "ANGLES", footerAngleIdx));

  // ── PERIMETER TRACK ──
  // Row 41: IF(Yes, 2*height + width, 0) — sides & bottom
  const trackIdx = n(data, "trackType");
  const trackLnFt = b(data, "trackPerimeter") ? 2 * h + w : 0;
  mat += addLineItem(lineItems, "Track Perimeter", trackLnFt, "LnFt", getPrice(pricing, "TRACK", trackIdx));

  // ── WOOD BUCKS ──
  // Row 44: IF(Yes, fullPerimeter, 0)
  const woodBuckIdx = n(data, "woodBuckType");
  const woodBuckLnFt = b(data, "woodBucks") ? perimeter : 0;
  mat += addLineItem(lineItems, "Wood Bucks", woodBuckLnFt, "LnFt", getPrice(pricing, "WOOD", woodBuckIdx));

  // ── ROOF DRILL PT SCREWS ──
  // Row 46: ROUNDUP(kingLnFt/2/3) + ROUNDUP(jackLnFt/2/3) + ROUNDUP(headerTubeLnFt/2) + ROUNDUP(footerTubeLnFt/2)
  const roofScrewIdx = n(data, "roofScrewType");
  const roofScrewQty = roundUp(kingLnFt / 2 / 3) +
    roundUp(jackLnFt / 2 / 3) +
    roundUp(headerTubeLnFt / 2) +
    roundUp(footerTubeLnFt / 2);
  mat += addLineItem(lineItems, "Roof Drill Pt Screws", roofScrewQty, "Each", getPrice(pricing, "RSCREW", roofScrewIdx));

  // ── WAFER HEAD SCREWS ──
  // Row 47: (footerCount + headerCount + jackCount + kingCount) * 20
  const waferQty = (footerTubeCount + headerTubeCount + jackCount + kingCount) * 20;
  mat += addLineItem(lineItems, "Wafer Head Screws", waferQty, "Each", FIXED_PRICES.waferHeadScrew);

  // ── BUGLE HEAD SCREWS ──
  // Row 48: IF(woodBucks=Yes, woodBuckLnFt * 2, 0) — priced at bugleHeadScrewWB
  const bugleQty = b(data, "woodBucks") ? woodBuckLnFt * 2 : 0;
  mat += addLineItem(lineItems, "Bugle Head Screws", bugleQty, "Each", FIXED_PRICES.bugleHeadScrewWB);

  // ── SUBTOTAL (before deductions) ──
  const subtotal = mat;

  // ── DEDUCTIONS ──
  // Row 51-52: EPS deduction = -(width * height) * epsThick * epsBasePrice
  const epsBasePrice = getPrice(pricing, "EPS", 0); // always uses 1.0 LB for deduction
  const epsDeduction = -(w * h) * epsThick * epsBasePrice;

  // Row 53: Inside stud deduction = -(width/2 * wallHeight) * insideStudPrice
  const insideDeductIdx = n(data, "insideDeduction");
  const insideDeduction = -(w / 2 * wallHt) * getPrice(pricing, "TUBING", insideDeductIdx);

  // Row 54: Outside stud deduction = -(width/2 * wallHeight) * outsideStudPrice
  const outsideDeductIdx = n(data, "outsideDeduction");
  const outsideDeduction = -(w / 2 * wallHt) * getPrice(pricing, "TUBING", outsideDeductIdx);

  const totalDeduction = epsDeduction + insideDeduction + outsideDeduction;

  // ── WASTE ──
  const waste = subtotal * WASTE_FACTOR;

  // ── PER UNIT TOTAL ──
  const perUnit = subtotal + totalDeduction + waste;
  const totalMat = perUnit * qty;
  const totalSF = openingSF * qty;

  // Add deduction line items for visibility
  if (epsDeduction !== 0) lineItems.push({ name: "EPS Opening Deduction", qty: -(w * h * epsThick), unit: "BdFt", unitPrice: epsBasePrice, cost: epsDeduction });
  if (insideDeduction !== 0) lineItems.push({ name: "Inside Stud Deduction", qty: -(w / 2 * wallHt), unit: "LnFt", unitPrice: getPrice(pricing, "TUBING", insideDeductIdx), cost: insideDeduction });
  if (outsideDeduction !== 0) lineItems.push({ name: "Outside Stud Deduction", qty: -(w / 2 * wallHt), unit: "LnFt", unitPrice: getPrice(pricing, "TUBING", outsideDeductIdx), cost: outsideDeduction });

  return makeResult(totalSF, totalMat - waste * qty, 0, lineItems, waste * qty);
}
