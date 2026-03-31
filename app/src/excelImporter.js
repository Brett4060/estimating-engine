// ═══════════════════════════════════════════════════════════════
// EXCEL WORKBOOK IMPORTER — parses GST 17-sheet estimating workbooks
// Reads known cell locations and maps to app data structure
// ═══════════════════════════════════════════════════════════════
import * as XLSX from "xlsx";

// Column offsets for Types A-E (1-indexed column numbers)
// Type A: B=2, E=5  |  Type B: J=10, M=13  |  Type C: R=18, U=21
// Type D: Z=26, AC=29  |  Type E: AH=34, AK=37
const TYPE_OFFSETS = [
  { qty: 2, dim: 5, toggle: 2 },   // A: B, E
  { qty: 10, dim: 13, toggle: 10 }, // B: J, M
  { qty: 18, dim: 21, toggle: 18 }, // C: R, U
  { qty: 26, dim: 29, toggle: 26 }, // D: Z, AC
  { qty: 34, dim: 37, toggle: 34 }, // E: AH, AK
];

function cell(ws, row, col) {
  const addr = XLSX.utils.encode_cell({ r: row - 1, c: col - 1 });
  const c = ws[addr];
  return c ? c.v : null;
}

function cellStr(ws, row, col) {
  const v = cell(ws, row, col);
  return v != null ? String(v).trim() : "";
}

function cellNum(ws, row, col) {
  const v = cell(ws, row, col);
  return typeof v === "number" ? v : (parseFloat(v) || 0);
}

function cellBool(ws, row, col) {
  const v = cellStr(ws, row, col).toLowerCase();
  return v === "yes" || v === "true";
}

// Match a dropdown value to an index in our pricing array
function matchSelect(value, pricingArray) {
  if (!value || value === "None" || value === "None ") return 0;
  const clean = String(value).trim().toLowerCase();
  for (let i = 0; i < pricingArray.length; i++) {
    if (pricingArray[i].label.toLowerCase() === clean) return i;
    // Fuzzy: check if label contains the key part
    if (clean.includes(pricingArray[i].label.toLowerCase().replace(/\s+/g, " "))) return i;
    if (pricingArray[i].label.toLowerCase().includes(clean)) return i;
  }
  return 0;
}

// ═══════════════════════════════════════════════════════════════
// PARSE COVER SUMMARY
// ═══════════════════════════════════════════════════════════════
function parseCoverSummary(ws) {
  return {
    proj: {
      proposal: cellStr(ws, 9, 2),     // B9
      name: cellStr(ws, 10, 2),         // B10
      location: cellStr(ws, 11, 2),     // B11
      salesperson: cellStr(ws, 12, 2),  // B12
      salesDir: cellStr(ws, 13, 2),     // B13
      date: (() => {
        const v = cell(ws, 4, 4);       // D4
        if (v instanceof Date) return v.toISOString().split("T")[0];
        if (typeof v === "number") {
          // Excel serial date
          const d = new Date((v - 25569) * 86400000);
          return d.toISOString().split("T")[0];
        }
        return cellStr(ws, 4, 4);
      })(),
      archFirm: cellStr(ws, 9, 4),     // D9
      archContact: cellStr(ws, 10, 4),  // D10
      archPhone: cellStr(ws, 12, 4),    // D12
      archEmail: cellStr(ws, 13, 4),    // D13
      ownerName: cellStr(ws, 16, 2),    // B16
      ownerContact: cellStr(ws, 17, 2), // B17
      ownerPhone: cellStr(ws, 19, 2),   // B19
      ownerEmail: cellStr(ws, 20, 2),   // B20
    },
    aboveSF: cellNum(ws, 23, 3),        // C23
    belowSF: cellNum(ws, 24, 3),        // C24
    margin: cellNum(ws, 56, 2) * 100 || 30, // B56 (stored as decimal)
    misc: {
      engineering: cellNum(ws, 45, 3),   // C45
      drafting: cellNum(ws, 46, 3),      // C46
      shipping: cellNum(ws, 47, 3),      // C47
      foam: cellNum(ws, 48, 2),          // B48
      foamGun: cellNum(ws, 49, 2),       // B49
      hotKnife: cellNum(ws, 50, 2),      // B50
      tape: cellNum(ws, 51, 2),          // B51
      bugleScrews: cellNum(ws, 52, 2),   // B52
      roofScrews: cellNum(ws, 53, 2),    // B53
    },
    // Cost summary for validation
    summary: {
      windows: { material: cellNum(ws, 30, 2), labor: cellNum(ws, 30, 3) },
      doors: { material: cellNum(ws, 31, 2), labor: cellNum(ws, 31, 3) },
      walls: { material: cellNum(ws, 32, 2), labor: cellNum(ws, 32, 3) },
      shearWalls: { material: cellNum(ws, 33, 2), labor: cellNum(ws, 33, 3) },
      gables: { material: cellNum(ws, 34, 2), labor: cellNum(ws, 34, 3) },
      boxBeams: { material: cellNum(ws, 35, 2), labor: cellNum(ws, 35, 3) },
      singleSlope: { material: cellNum(ws, 36, 2), labor: cellNum(ws, 36, 3) },
      gableRoof: { material: cellNum(ws, 37, 2), labor: cellNum(ws, 37, 3) },
      hipRoof: { material: cellNum(ws, 38, 2), labor: cellNum(ws, 38, 3) },
      skylights: { material: cellNum(ws, 39, 2), labor: cellNum(ws, 39, 3) },
      contractValue: cellNum(ws, 59, 4),
    },
  };
}

// ═══════════════════════════════════════════════════════════════
// PARSE WALLS (also used for SHEAR WALLS with minor differences)
// ═══════════════════════════════════════════════════════════════
function parseWallsType(ws, offset, pricing) {
  const qc = offset.qty;   // qty column (B for Type A)
  const dc = offset.dim;   // dimension column (E for Type A)
  const tc = offset.toggle; // toggle column (same as qty col)

  const qty = cellNum(ws, 3, qc);
  if (qty === 0) return null;

  return {
    qty,
    height: cellNum(ws, 6, dc),
    length: cellNum(ws, 7, dc),
    thickness: cellNum(ws, 8, dc),
    epsThick: cellNum(ws, 9, dc),
    epsDensity: matchSelect(cellStr(ws, 13, tc), pricing.EPS),
    insideStuds: cellBool(ws, 17, tc),
    insideStudType: matchSelect(cellStr(ws, 19, tc), pricing.TUBING),
    outsideStuds: cellBool(ws, 20, tc),
    outsideStudType: matchSelect(cellStr(ws, 22, tc), pricing.TUBING),
    topTrackInstalled: cellBool(ws, 24, tc),
    topTrackShipped: cellBool(ws, 25, tc),
    topTrackType: matchSelect(cellStr(ws, 26, tc), pricing.TRACK),
    bottomTrackInstalled: cellBool(ws, 27, tc),
    bottomTrackShipped: cellBool(ws, 28, tc),
    bottomTrackType: matchSelect(cellStr(ws, 29, tc), pricing.TRACK),
    // Angles (rows 31-36)
    topAngleInstalled: cellBool(ws, 31, tc),
    topAngleShipped: cellBool(ws, 32, tc),
    topAngleType: matchSelect(cellStr(ws, 33, tc), pricing.ANGLES),
    bottomAngleInstalled: cellBool(ws, 34, tc),
    bottomAngleShipped: cellBool(ws, 35, tc),
    bottomAngleType: matchSelect(cellStr(ws, 36, tc), pricing.ANGLES),
    // Wood plates (rows 38-41)
    topPlatesInstalled: cellBool(ws, 38, tc),
    topPlatesType: matchSelect(cellStr(ws, 39, tc), pricing.WOOD),
    topPlatesShipped: cellBool(ws, 40, tc),
    bottomPlatesInstalled: false,
    bottomPlatesShipped: false,
    bottomPlatesType: 0,
    // Sheathing (rows 43-46)
    extSheathing: cellBool(ws, 43, tc),
    sheathingType: matchSelect(cellStr(ws, 44, tc), pricing.SHEATHING),
    moistureBarrier: cellBool(ws, 45, tc),
    moistureBarrierType: matchSelect(cellStr(ws, 46, tc), pricing.SHEATHING),
    // Corners (rows 48-56)
    cornerQty: cellNum(ws, 48, dc) || 5,
    cornerTubeType: matchSelect(cellStr(ws, 51, tc), pricing.TUBING),
    extCornerAngle: cellBool(ws, 52, tc),
    extCornerType: matchSelect(cellStr(ws, 54, tc), pricing.ANGLES),
    intCornerType: matchSelect(cellStr(ws, 56, tc), pricing.ANGLES),
    // End panels & beam supports
    endPanelQty: cellNum(ws, 58, dc),
    endPanelTubeType: matchSelect(cellStr(ws, 61, tc), pricing.TUBING),
    beamSupportQty: cellNum(ws, 63, dc),
    beamSupportTubeType: matchSelect(cellStr(ws, 66, tc), pricing.TUBING),
    // Misc
    cabinetBackingQty: cellNum(ws, 70, dc),
    interiorWallCount: cellNum(ws, 71, dc),
    roofScrewType: matchSelect(cellStr(ws, 74, tc), pricing.RSCREW),
  };
}

// ═══════════════════════════════════════════════════════════════
// PARSE SHEAR WALLS
// ═══════════════════════════════════════════════════════════════
function parseShearWallsType(ws, offset, pricing) {
  const qc = offset.qty, dc = offset.dim, tc = offset.toggle;
  const qty = cellNum(ws, 3, qc);
  if (qty === 0) return null;

  return {
    qty,
    height: cellNum(ws, 6, dc),
    length: cellNum(ws, 7, dc),
    thickness: cellNum(ws, 8, dc),
    epsThick: cellNum(ws, 9, dc),
    epsDensity: matchSelect(cellStr(ws, 13, tc), pricing.EPS),
    insideStuds: cellBool(ws, 17, tc),
    insideStudType: matchSelect(cellStr(ws, 19, tc), pricing.TUBING),
    outsideStuds: cellBool(ws, 20, tc),
    outsideStudType: matchSelect(cellStr(ws, 22, tc), pricing.TUBING),
    topTrackInstalled: cellBool(ws, 24, tc),
    topTrackShipped: cellBool(ws, 25, tc),
    topTrackType: matchSelect(cellStr(ws, 26, tc), pricing.TRACK),
    bottomTrackInstalled: cellBool(ws, 27, tc),
    bottomTrackShipped: cellBool(ws, 28, tc),
    bottomTrackType: matchSelect(cellStr(ws, 29, tc), pricing.TRACK),
    topAngleInstalled: cellBool(ws, 31, tc),
    topAngleShipped: cellBool(ws, 32, tc),
    topAngleType: matchSelect(cellStr(ws, 33, tc), pricing.ANGLES),
    bottomAngleInstalled: cellBool(ws, 34, tc),
    bottomAngleShipped: cellBool(ws, 35, tc),
    bottomAngleType: matchSelect(cellStr(ws, 36, tc), pricing.ANGLES),
    topPlatesInstalled: cellBool(ws, 38, tc),
    topPlatesShipped: cellBool(ws, 40, tc),
    topPlatesType: matchSelect(cellStr(ws, 39, tc), pricing.WOOD),
    extSheathing: cellBool(ws, 43, tc),
    sheathingType: matchSelect(cellStr(ws, 44, tc), pricing.SHEATHING),
    intSheathing: cellBool(ws, 45, tc),
    intSheathingType: matchSelect(cellStr(ws, 46, tc), pricing.SHEATHING),
    roofScrewType: matchSelect(cellStr(ws, 65, tc), pricing.RSCREW),
    interiorWallCount: cellNum(ws, 63, dc),
  };
}

// ═══════════════════════════════════════════════════════════════
// PARSE WINDOWS / DOORS
// ═══════════════════════════════════════════════════════════════
function parseWindowsType(ws, offset, pricing) {
  const qc = offset.qty, dc = offset.dim, tc = offset.toggle;
  const qty = cellNum(ws, 3, qc);
  if (qty === 0) return null;

  return {
    qty,
    width: cellNum(ws, 7, qc),       // B7 = width
    height: cellNum(ws, 7, qc + 1),  // C7 = height
    wallHeight: cellNum(ws, 8, dc),
    wallThick: cellNum(ws, 9, dc),
    epsThick: cellNum(ws, 10, dc),
    headerHt: cellNum(ws, 11, dc),
    trackWidth: cellNum(ws, 12, dc),
    epsDensity: matchSelect(cellStr(ws, 15, tc), pricing.EPS),
    king: cellBool(ws, 21, tc),
    kingType: matchSelect(cellStr(ws, 23, tc), pricing.TUBING),
    jack: cellBool(ws, 24, tc),
    jackType: matchSelect(cellStr(ws, 26, tc), pricing.TUBING),
    header: cellBool(ws, 27, tc),
    headerTubeType: matchSelect(cellStr(ws, 29, tc), pricing.TUBING),
    footer: cellBool(ws, 30, tc),
    footerTubeType: matchSelect(cellStr(ws, 32, tc), pricing.TUBING),
    strHeaderType: matchSelect(cellStr(ws, 35, tc), pricing.TUBING),
    headerLength: cellNum(ws, 34, dc) || 8,
    footerAngleType: matchSelect(cellStr(ws, 38, tc), pricing.ANGLES),
    trackPerimeter: cellBool(ws, 40, tc),
    trackType: matchSelect(cellStr(ws, 41, tc), pricing.TRACK),
    woodBucks: cellBool(ws, 43, tc),
    woodBuckType: matchSelect(cellStr(ws, 44, tc), pricing.WOOD),
    roofScrewType: matchSelect(cellStr(ws, 46, tc), pricing.RSCREW),
    insideDeduction: matchSelect(cellStr(ws, 53, tc), pricing.TUBING),
    outsideDeduction: matchSelect(cellStr(ws, 54, tc), pricing.TUBING),
  };
}

function parseDoorsType(ws, offset, pricing) {
  const qc = offset.qty, dc = offset.dim, tc = offset.toggle;
  const qty = cellNum(ws, 3, qc);
  if (qty === 0) return null;

  return {
    qty,
    width: cellNum(ws, 7, qc),
    height: cellNum(ws, 7, qc + 1),
    wallHeight: cellNum(ws, 8, dc),
    wallThick: cellNum(ws, 9, dc),
    epsThick: cellNum(ws, 10, dc),
    headerHt: cellNum(ws, 11, dc),
    trackWidth: cellNum(ws, 12, dc),
    epsDensity: matchSelect(cellStr(ws, 15, tc), pricing.EPS),
    king: cellBool(ws, 19, tc),
    kingType: matchSelect(cellStr(ws, 21, tc), pricing.TUBING),
    jack: cellBool(ws, 22, tc),
    jackType: matchSelect(cellStr(ws, 24, tc), pricing.TUBING),
    header: cellBool(ws, 25, tc),
    headerTubeType: matchSelect(cellStr(ws, 27, tc), pricing.TUBING),
    strHeaderType: matchSelect(cellStr(ws, 30, tc), pricing.TUBING),
    trackPerimeter: cellBool(ws, 32, tc),
    trackType: matchSelect(cellStr(ws, 33, tc), pricing.TRACK),
    woodBucks: cellBool(ws, 35, tc),
    woodBuckType: matchSelect(cellStr(ws, 36, tc), pricing.WOOD),
    screwType: matchSelect(cellStr(ws, 38, tc), pricing.RSCREW),
    insideDeduction: matchSelect(cellStr(ws, 45, tc), pricing.TUBING),
    outsideDeduction: matchSelect(cellStr(ws, 46, tc), pricing.TUBING),
  };
}

// ═══════════════════════════════════════════════════════════════
// PARSE GABLES
// ═══════════════════════════════════════════════════════════════
function parseGablesType(ws, offset, pricing) {
  const qc = offset.qty, dc = offset.dim, tc = offset.toggle;
  const qty = cellNum(ws, 3, qc);
  if (qty === 0) return null;

  return {
    qty,
    rise: cellNum(ws, 7, qc),
    run: cellNum(ws, 7, qc + 1) || 12,
    gableLength: cellNum(ws, 8, dc),
    gableThick: cellNum(ws, 11, dc),
    epsThick: cellNum(ws, 12, dc),
    epsDensity: matchSelect(cellStr(ws, 16, tc), pricing.EPS),
    insideStuds: cellBool(ws, 20, tc),
    insideStudType: matchSelect(cellStr(ws, 22, tc), pricing.TUBING),
    outsideStuds: cellBool(ws, 23, tc),
    outsideStudType: matchSelect(cellStr(ws, 25, tc), pricing.TUBING),
    topTrackInstalled: cellBool(ws, 32, tc),
    topTrackShipped: cellBool(ws, 33, tc),
    topTrackType: matchSelect(cellStr(ws, 34, tc), pricing.TRACK),
    bottomTrackInstalled: cellBool(ws, 35, tc),
    bottomTrackShipped: cellBool(ws, 36, tc),
    bottomTrackType: matchSelect(cellStr(ws, 37, tc), pricing.TRACK),
    extSheathing: cellBool(ws, 46, tc),
    sheathingType: matchSelect(cellStr(ws, 47, tc), pricing.SHEATHING),
    intSheathing: cellBool(ws, 48, tc),
    intSheathingType: matchSelect(cellStr(ws, 49, tc), pricing.SHEATHING),
    roofScrewType: matchSelect(cellStr(ws, 55, tc), pricing.RSCREW),
  };
}

// ═══════════════════════════════════════════════════════════════
// PARSE BOX BEAMS
// ═══════════════════════════════════════════════════════════════
function parseBoxBeamsType(ws, offset, pricing) {
  const qc = offset.qty, dc = offset.dim, tc = offset.toggle;
  const qty = cellNum(ws, 3, qc);
  if (qty === 0) return null;

  return {
    qty,
    wallHeight: cellNum(ws, 6, dc),
    wallThick: cellNum(ws, 7, dc),
    beamLength: cellNum(ws, 8, dc),
    beamHeight: cellNum(ws, 9, dc) || 1,
    epsDensity: matchSelect(cellStr(ws, 18, tc), pricing.EPS),
    topPlatesType: matchSelect(cellStr(ws, 11, tc), pricing.WOOD),
    topPlatesQty: cellNum(ws, 10, dc),
    bottomPlatesType: matchSelect(cellStr(ws, 13, tc), pricing.WOOD),
    bottomPlatesQty: cellNum(ws, 12, dc),
    lvlType: matchSelect(cellStr(ws, 15, tc), pricing.LVL),
    lvlQty: cellNum(ws, 14, dc),
    flatPlateQty: cellNum(ws, 16, dc),
    kingStuds: cellBool(ws, 22, tc),
    kingStudType: matchSelect(cellStr(ws, 24, tc), pricing.TUBING),
    jackStuds: cellBool(ws, 25, tc),
    jackStudType: matchSelect(cellStr(ws, 27, tc), pricing.TUBING),
    roofScrewType: matchSelect(cellStr(ws, 29, tc), pricing.RSCREW),
  };
}

// ═══════════════════════════════════════════════════════════════
// PARSE GABLE ROOF
// ═══════════════════════════════════════════════════════════════
function parseGableRoofType(ws, offset, pricing) {
  const qc = offset.qty, dc = offset.dim, tc = offset.toggle;
  const qty = cellNum(ws, 3, qc);
  if (qty === 0) return null;

  return {
    qty,
    rise: cellNum(ws, 7, qc),
    run: cellNum(ws, 7, qc + 1) || 12,
    ridgeLen: cellNum(ws, 8, dc),
    purlinLen: cellNum(ws, 9, dc),
    eaveLen: cellNum(ws, 10, dc),
    overhang: cellNum(ws, 11, dc),
    roofThick: cellNum(ws, 12, dc),
    epsThick: cellNum(ws, 13, dc),
    gableLen: cellNum(ws, 14, dc),
    epsDensity: matchSelect(cellStr(ws, 20, tc), pricing.EPS),
    insideRafters: cellBool(ws, 24, tc),
    insideRafterType: matchSelect(cellStr(ws, 26, tc), pricing.TUBING),
    outsideRafters: cellBool(ws, 27, tc),
    outsideRafterType: matchSelect(cellStr(ws, 29, tc), pricing.TUBING),
    insideGable: cellBool(ws, 39, tc),
    outsideGable: cellBool(ws, 42, tc),
    insideRidge: cellBool(ws, 46, tc),
    outsideRidge: cellBool(ws, 49, tc),
    insidePurlin: cellBool(ws, 53, tc),
    outsidePurlin: cellBool(ws, 56, tc),
    insideWall: cellBool(ws, 60, tc),
    outsideWall: cellBool(ws, 63, tc),
    insideWallOH: cellBool(ws, 67, tc),
    simpsonTieDown: cellBool(ws, 70, tc),
    gutterBoard: cellBool(ws, 72, tc),
    insideConnType: matchSelect(cellStr(ws, 41, tc), pricing.BENT),
    outsideConnType: matchSelect(cellStr(ws, 44, tc), pricing.BENT),
    gableConnQty: cellNum(ws, 39, dc) || 4,
    ridgeConnQty: cellNum(ws, 46, dc) || 1,
    purlinConnQty: cellNum(ws, 53, dc) || 2,
    gutterConnQty: cellNum(ws, 72, dc) || 2,
    endPanelQty: cellNum(ws, 31, dc),
    roofScrewType: matchSelect(cellStr(ws, 83, tc), pricing.RSCREW),
    intSheathing: cellBool(ws, 76, tc),
    intSheathingType: matchSelect(cellStr(ws, 77, tc), pricing.SHEATHING),
  };
}

// ═══════════════════════════════════════════════════════════════
// PARSE HIP ROOF
// ═══════════════════════════════════════════════════════════════
function parseHipRoofType(ws, offset, pricing) {
  const qc = offset.qty, dc = offset.dim, tc = offset.toggle;
  const qty = cellNum(ws, 3, qc);
  if (qty === 0) return null;

  return {
    qty,
    rise: cellNum(ws, 7, qc),
    run: cellNum(ws, 7, qc + 1) || 12,
    ridgeLen: cellNum(ws, 8, dc),
    purlinParallel: cellNum(ws, 9, dc),
    purlinPerp: cellNum(ws, 10, dc),
    eaveParallel: cellNum(ws, 11, dc),
    eavePerp: cellNum(ws, 12, dc),
    overhang: cellNum(ws, 13, dc),
    roofThick: cellNum(ws, 14, dc),
    epsThick: cellNum(ws, 15, dc),
    epsDensity: matchSelect(cellStr(ws, 23, tc), pricing.EPS),
    insideRafters: cellBool(ws, 27, tc),
    insideRafterType: matchSelect(cellStr(ws, 29, tc), pricing.TUBING),
    outsideRafters: cellBool(ws, 30, tc),
    outsideRafterType: matchSelect(cellStr(ws, 32, tc), pricing.TUBING),
    insideRafters2: cellBool(ws, 33, tc),
    outsideRafters2: cellBool(ws, 36, tc),
    insideRidge: cellBool(ws, 40, tc),
    outsideRidge: cellBool(ws, 43, tc),
    insidePurlinPar: cellBool(ws, 47, tc),
    insidePurlinPerp: cellBool(ws, 49, tc),
    outsidePurlinPar: cellBool(ws, 52, tc),
    outsidePurlinPerp: cellBool(ws, 54, tc),
    insideHip: cellBool(ws, 58, tc),
    outsideHip: cellBool(ws, 61, tc),
    insideWallPar: cellBool(ws, 65, tc),
    insideWallPerp: cellBool(ws, 68, tc),
    outsideWallPar: cellBool(ws, 71, tc),
    outsideWallPerp: cellBool(ws, 74, tc),
    insideWallPar2: cellBool(ws, 78, tc),
    insideWallPerp2: cellBool(ws, 81, tc),
    simpsonTieDown: cellBool(ws, 84, tc),
    gutterBoardPar: cellBool(ws, 86, tc),
    gutterBoardPerp: cellBool(ws, 89, tc),
    insideConnType: matchSelect(cellStr(ws, 42, tc), pricing.BENT),
    outsideConnType: matchSelect(cellStr(ws, 45, tc), pricing.BENT),
    roofScrewType: matchSelect(cellStr(ws, 100, tc), pricing.RSCREW),
  };
}

// ═══════════════════════════════════════════════════════════════
// PARSE SINGLE SLOPED ROOF
// ═══════════════════════════════════════════════════════════════
function parseSingleSlopeType(ws, offset, pricing) {
  const qc = offset.qty, dc = offset.dim, tc = offset.toggle;
  const qty = cellNum(ws, 3, qc);
  if (qty === 0) return null;

  return {
    qty,
    rise: cellNum(ws, 7, qc),
    run: cellNum(ws, 7, qc + 1) || 12,
    ridgeLen: cellNum(ws, 8, dc),
    purlinLen: cellNum(ws, 9, dc),
    eaveLen: cellNum(ws, 10, dc),
    overhangRidge: cellNum(ws, 11, dc),
    overhangEave: cellNum(ws, 12, dc),
    roofThick: cellNum(ws, 13, dc),
    epsThick: cellNum(ws, 14, dc),
    gableLen: cellNum(ws, 15, dc),
    epsDensity: matchSelect(cellStr(ws, 21, tc), pricing.EPS),
    insideRafters: cellBool(ws, 25, tc),
    insideRafterType: matchSelect(cellStr(ws, 27, tc), pricing.TUBING),
    outsideRafters: cellBool(ws, 28, tc),
    outsideRafterType: matchSelect(cellStr(ws, 30, tc), pricing.TUBING),
    insideGable: cellBool(ws, 40, tc),
    outsideGable: cellBool(ws, 43, tc),
    insidePurlin: cellBool(ws, 63, tc),
    outsidePurlin: cellBool(ws, 66, tc),
    insideWall: cellBool(ws, 70, tc),
    outsideWall: cellBool(ws, 73, tc),
    simpsonTieDown: cellBool(ws, 57, tc),
    gutterBoard: cellBool(ws, 82, tc),
    faciaBoard: cellBool(ws, 59, tc),
    insideConnType: matchSelect(cellStr(ws, 42, tc), pricing.BENT),
    outsideConnType: matchSelect(cellStr(ws, 45, tc), pricing.BENT),
    roofScrewType: matchSelect(cellStr(ws, 93, tc), pricing.RSCREW),
    gableConnQty: cellNum(ws, 40, dc) || 2,
    purlinConnQty: cellNum(ws, 63, dc) || 2,
    wallConnQty: cellNum(ws, 70, dc) || 2,
    endPanelQty: cellNum(ws, 32, dc),
    intSheathing: cellBool(ws, 86, tc),
    intSheathingType: matchSelect(cellStr(ws, 87, tc), pricing.SHEATHING),
  };
}

// ═══════════════════════════════════════════════════════════════
// PARSE SKYLIGHTS
// ═══════════════════════════════════════════════════════════════
function parseSkylightsType(ws, offset, pricing) {
  const qc = offset.qty, dc = offset.dim, tc = offset.toggle;
  const qty = cellNum(ws, 3, qc);
  if (qty === 0) return null;

  return {
    qty,
    width: cellNum(ws, 7, qc),
    height: cellNum(ws, 7, qc + 1),
    roofRun: cellNum(ws, 8, dc),
    roofThick: cellNum(ws, 9, dc),
    epsThick: cellNum(ws, 10, dc),
    trackWidth: cellNum(ws, 11, dc),
    epsDensity: matchSelect(cellStr(ws, 14, tc), pricing.EPS),
    king: cellBool(ws, 20, tc),
    kingType: matchSelect(cellStr(ws, 22, tc), pricing.TUBING),
    header: cellBool(ws, 23, tc),
    headerTubeType: matchSelect(cellStr(ws, 25, tc), pricing.TUBING),
    footer: cellBool(ws, 26, tc),
    footerTubeType: matchSelect(cellStr(ws, 28, tc), pricing.TUBING),
    strHeaderType: matchSelect(cellStr(ws, 31, tc), pricing.TUBING),
    footerAngleType: matchSelect(cellStr(ws, 34, tc), pricing.ANGLES),
    trackPerimeter: cellBool(ws, 36, tc),
    trackType: matchSelect(cellStr(ws, 37, tc), pricing.TRACK),
    woodBucks: cellBool(ws, 39, tc),
    woodBuckType: matchSelect(cellStr(ws, 40, tc), pricing.WOOD),
    roofScrewType: matchSelect(cellStr(ws, 42, tc), pricing.RSCREW),
    insideDeduction: matchSelect(cellStr(ws, 49, tc), pricing.TUBING),
    outsideDeduction: matchSelect(cellStr(ws, 50, tc), pricing.TUBING),
  };
}

// ═══════════════════════════════════════════════════════════════
// MAIN IMPORT FUNCTION
// ═══════════════════════════════════════════════════════════════
const SHEET_PARSERS = {
  "WALLS": { parser: parseWallsType, key: "walls" },
  "SHEAR WALLS": { parser: parseShearWallsType, key: "shearWalls" },
  "WINDOWS": { parser: parseWindowsType, key: "windows" },
  "DOORS": { parser: parseDoorsType, key: "doors" },
  "GABLES": { parser: parseGablesType, key: "gables" },
  "SINGLE SLOPED ROOF": { parser: parseSingleSlopeType, key: "singleSlope" },
  "GABLE ROOF": { parser: parseGableRoofType, key: "gableRoof" },
  "HIP ROOF": { parser: parseHipRoofType, key: "hipRoof" },
  "BOX BEAMS": { parser: parseBoxBeamsType, key: "boxBeams" },
  "SKYLIGHTS": { parser: parseSkylightsType, key: "skylights" },
};

/**
 * Import a GST Excel workbook and return app-compatible data
 * @param {ArrayBuffer} fileBuffer - the .xlsx file as ArrayBuffer
 * @param {object} pricing - current pricing tables for dropdown matching
 * @param {function} makeBlankType - function to create blank type state for a component
 * @returns {{ data, summary, isGST, sheetNames }}
 */
export function importGSTWorkbook(fileBuffer, pricing, makeBlankType) {
  const wb = XLSX.read(fileBuffer, { type: "array", cellDates: true });
  const sheetNames = wb.SheetNames;

  const isGST = sheetNames.includes("Cover Summary") &&
    (sheetNames.includes("WALLS") || sheetNames.includes("WINDOWS"));

  if (!isGST) {
    return { data: null, summary: null, isGST: false, sheetNames, error: "Not a GST estimating workbook. Expected 'Cover Summary' and component sheets." };
  }

  // Parse Cover Summary
  const coverWs = wb.Sheets["Cover Summary"];
  const cover = parseCoverSummary(coverWs);

  // Parse each component sheet
  const comps = {};
  const importLog = [];

  for (const [sheetName, { parser, key }] of Object.entries(SHEET_PARSERS)) {
    if (!wb.Sheets[sheetName]) {
      importLog.push({ sheet: sheetName, status: "missing" });
      comps[key] = [0, 1, 2, 3, 4].map(() => makeBlankType(key));
      continue;
    }

    const ws = wb.Sheets[sheetName];
    const types = [];

    for (let i = 0; i < 5; i++) {
      try {
        const parsed = parser(ws, TYPE_OFFSETS[i], pricing);
        if (parsed) {
          types.push(parsed);
          importLog.push({ sheet: sheetName, type: "ABCDE"[i], status: "imported", qty: parsed.qty });
        } else {
          types.push(makeBlankType(key));
        }
      } catch (e) {
        types.push(makeBlankType(key));
        importLog.push({ sheet: sheetName, type: "ABCDE"[i], status: "error", error: e.message });
      }
    }

    comps[key] = types;
  }

  const data = {
    proj: cover.proj,
    aboveSF: cover.aboveSF,
    belowSF: cover.belowSF,
    margin: cover.margin,
    misc: cover.misc,
    comps,
  };

  return {
    data,
    summary: cover.summary,
    isGST: true,
    sheetNames,
    importLog,
  };
}
