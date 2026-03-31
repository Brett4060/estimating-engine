// ═══════════════════════════════════════════════════════════════
// VALIDATION — test calc engine against Excel formula expectations
// Run: node --experimental-vm-modules validate.js
// ═══════════════════════════════════════════════════════════════

import { calcComponentType, DEFAULT_PRICING } from "./index.js";
import { getPrice, FIXED_PRICES, WASTE_FACTOR } from "./pricing.js";
import { roundUp } from "./helpers.js";

const P = DEFAULT_PRICING;
let passed = 0, failed = 0;

function assert(label, actual, expected, tolerance = 0.01) {
  const diff = Math.abs(actual - expected);
  if (diff <= tolerance) {
    passed++;
    console.log(`  ✓ ${label}: ${actual.toFixed(4)}`);
  } else {
    failed++;
    console.log(`  ✗ ${label}: got ${actual.toFixed(4)}, expected ${expected.toFixed(4)} (diff ${diff.toFixed(4)})`);
  }
}

function findLineItem(result, name) {
  return result.lineItems.find(li => li.name === name);
}

// ═══════════════════════════════════════════════════════════════
console.log("\n=== WALLS TEST ===");
// 10ft high, 100ft long, 6" thick, 4" EPS, EPS 1.0 LB
// 5 corners, inside studs=Yes (600S162-43), outside studs=Yes (600S162-43)
// top track installed=Yes (600T125-43), ext sheathing=Yes (OSB)
{
  const data = {
    qty: 2, height: 10, length: 100, thickness: 6, epsThick: 4,
    epsDensity: 0, // EPS 1.0 LB @ $0.30
    insideStuds: true, insideStudType: 8, // 600S162-43 @ $2.22
    outsideStuds: true, outsideStudType: 8,
    topTrackInstalled: true, topTrackShipped: false, topTrackType: 5, // 600T125-43 @ $1.94
    bottomTrackInstalled: false, bottomTrackShipped: false, bottomTrackType: 0,
    topAngleInstalled: true, topAngleShipped: false, topAngleType: 2, // 1.5"x1.5" 18ga @ $0.88
    bottomAngleInstalled: false, bottomAngleShipped: true, bottomAngleType: 2,
    topPlatesInstalled: true, topPlatesShipped: false, topPlatesType: 1, // 2x4 @ $0.40
    bottomPlatesInstalled: false, bottomPlatesShipped: false, bottomPlatesType: 0,
    extSheathing: true, sheathingType: 1, // OSB @ $0.47
    moistureBarrier: false, moistureBarrierType: 0,
    cornerQty: 5, cornerTubeType: 8, // 600S162-43
    extCornerAngle: true, extCornerType: 2, // 1.5"x1.5" 18ga
    intCornerType: 2,
    endPanelQty: 0, endPanelTubeType: 0,
    beamSupportQty: 0, beamSupportTubeType: 0,
    cabinetBackingQty: 0, interiorWallCount: 0,
    roofScrewType: 2, // 6" @ $0.30
  };

  const r = calcComponentType("walls", data, P);
  const h = 10, l = 100;

  // EPS: SF=1000, BdFt = 1000*4 = 4000, cost = 4000 * 0.30 = $1200
  assert("EPS BdFt", findLineItem(r, "EPS").qty, 4000);
  assert("EPS cost", findLineItem(r, "EPS").cost, 1200);

  // Inside studs: count = ROUNDUP(100/2) = 50, len each = 10, total = 500 LnFt
  // cost = 500 * $2.22 = $1110
  assert("Inside stud LnFt", findLineItem(r, "Inside Studs").qty, 500);
  assert("Inside stud cost", findLineItem(r, "Inside Studs").cost, 1110);

  // Outside studs: same
  assert("Outside stud LnFt", findLineItem(r, "Outside Studs").qty, 500);

  // Top track: installed = 100 LnFt, cost = 100 * $1.94 = $194
  assert("Top track LnFt", findLineItem(r, "Top Track").qty, 100);
  assert("Top track cost", findLineItem(r, "Top Track").cost, 194);

  // Top angles: installed = 100*2 = 200 LnFt, cost = 200 * $0.88 = $176
  assert("Top angles LnFt", findLineItem(r, "Top Angles").qty, 200);
  assert("Top angles cost", findLineItem(r, "Top Angles").cost, 176);

  // Bottom angles: shipped = 100 LnFt, cost = 100 * $0.88 = $88
  assert("Bottom angles LnFt", findLineItem(r, "Bottom Angles").qty, 100);

  // Top plates: installed = 100 LnFt, cost = 100 * $0.40 = $40
  assert("Top plates cost", findLineItem(r, "Top Plates (Inst)").cost, 40);

  // Ext sheathing: 10*100 = 1000 SqFt, cost = 1000 * $0.47 = $470
  assert("Sheathing SF", findLineItem(r, "Ext Sheathing").qty, 1000);
  assert("Sheathing cost", findLineItem(r, "Ext Sheathing").cost, 470);

  // Corners: 5 corners * 6 tubes = 30 tubes, each 10ft = 300 LnFt
  // cost = 300 * $2.22 = $666
  assert("Corner tube LnFt", findLineItem(r, "Corner Tubes").qty, 300);
  assert("Corner tube cost", findLineItem(r, "Corner Tubes").cost, 666);

  // Ext corner angles: 5 corners * 10ft = 50 LnFt * $0.88 = $44
  assert("Ext corner angle LnFt", findLineItem(r, "Ext Corner Angles").qty, 50);
  assert("Ext corner angle cost", findLineItem(r, "Ext Corner Angles").cost, 44);

  // Int corner angles: ROUNDUP(10/3) * 5 = 4 * 5 = 20 each * 1 LnFt = 20
  assert("Int corner angle qty", findLineItem(r, "Int Corner Angles").qty, 20);

  // Lift rings: 100/4 = 25 each * $2 = $50
  assert("Lift rings qty", findLineItem(r, "Lift Rings").qty, 25);
  assert("Lift rings cost", findLineItem(r, "Lift Rings").cost, 50);

  // 3x6 flat metal: 100/4 = 25 * $1.78125 = $44.53
  assert("Flat metal qty", findLineItem(r, "3x6 Flat Metal").qty, 25);

  // Roof screws: ROUNDUP(outsideLnFt + endPanel/2 + corner/2/3 + beamSpt/2/3)
  // = ROUNDUP(500 + 0 + 300/2/3 + 0) = ROUNDUP(500 + 50) = 550
  assert("Roof screw qty", findLineItem(r, "Roof Drill Pt Screws").qty, 550);

  // Wafer head: (50+50+25+25+30+0+5+20)*10 = 205*10 = 2050
  // insideCount=50, outsideCount=50, liftRings=25, flatMetal=25, cornerTubes=30, endPanelTubes=0, extCornerQty=5, intCornerQty=20
  assert("Wafer head qty", findLineItem(r, "Wafer Head Screws").qty, 2050);

  // Bugle head: topPlatesInstalled=Yes, length*2 = 200
  assert("Bugle head qty", findLineItem(r, "Bugle Head Screws").qty, 200);

  // Sheathing fasteners: extSheathing=Yes, 1000 + 0 = 1000
  assert("Sheathing fastener qty", findLineItem(r, "Sheathing Fasteners").qty, 1000);

  // Total SF = 1000 * 2 units = 2000
  assert("Total SF", r.sf, 2000);
}

// ═══════════════════════════════════════════════════════════════
console.log("\n=== WINDOWS TEST ===");
// 3ft wide, 4ft high, 10ft wall, 6" thick, 4" EPS, 8ft header height
{
  const data = {
    qty: 4, width: 3, height: 4, wallHeight: 10, wallThick: 6, epsThick: 4,
    headerHt: 8, trackWidth: 6,
    epsDensity: 0, // $0.30
    king: true, kingType: 8, // 600S162-43 @ $2.22
    jack: true, jackType: 8,
    header: true, headerTubeType: 8,
    footer: true, footerTubeType: 8,
    strHeaderType: 0, headerLength: 8,
    footerAngleType: 2, // 1.5"x1.5" 18ga
    trackPerimeter: true, trackType: 5, // 600T125-43 @ $1.94
    woodBucks: true, woodBuckType: 1, // 2x4 @ $0.40
    roofScrewType: 2, // 6" @ $0.30
    insideDeduction: 8, // 600S162-43
    outsideDeduction: 8,
  };

  const r = calcComponentType("windows", data, P);

  // EPS Header: (10-8)*3 = 6 SqFt, BdFt = 6*4 = 24, cost = 24*0.30 = $7.20
  assert("EPS Header BdFt", findLineItem(r, "EPS Header").qty, 24);
  assert("EPS Header cost", findLineItem(r, "EPS Header").cost, 7.20);

  // EPS Footer: (8-4)*3 = 12 SqFt, BdFt = 12*4 = 48, cost = 48*0.30 = $14.40
  assert("EPS Footer BdFt", findLineItem(r, "EPS Footer").qty, 48);
  assert("EPS Footer cost", findLineItem(r, "EPS Footer").cost, 14.40);

  // King studs: 4 * 10ft = 40 LnFt, cost = 40 * $2.22 = $88.80
  assert("King stud LnFt", findLineItem(r, "King Studs").qty, 40);
  assert("King stud cost", findLineItem(r, "King Studs").cost, 88.80);

  // Jack studs: 4 * 8ft = 32 LnFt, cost = 32 * $2.22 = $71.04
  assert("Jack stud LnFt", findLineItem(r, "Jack Studs").qty, 32);
  assert("Jack stud cost", findLineItem(r, "Jack Studs").cost, 71.04);

  // Header tube: 1 * (10-8) = 2 LnFt
  assert("Header tube LnFt", findLineItem(r, "Header Tube").qty, 2);

  // Footer tube: 1 * (8-4) = 4 LnFt
  assert("Footer tube LnFt", findLineItem(r, "Footer Tube").qty, 4);

  // Track perimeter: 2*4 + 3 = 11 LnFt
  assert("Track perimeter LnFt", findLineItem(r, "Track Perimeter").qty, 11);

  // Wood bucks: (3+4)*2 = 14 LnFt
  assert("Wood bucks LnFt", findLineItem(r, "Wood Bucks").qty, 14);

  // Footer angle: (3+1)*2 = 8 LnFt
  assert("Footer angle LnFt", findLineItem(r, "Footer Angle").qty, 8);

  // Roof screws: ROUNDUP(40/2/3) + ROUNDUP(32/2/3) + ROUNDUP(2/2) + ROUNDUP(4/2)
  // = ROUNDUP(6.67) + ROUNDUP(5.33) + ROUNDUP(1) + ROUNDUP(2) = 7 + 6 + 1 + 2 = 16
  assert("Roof screw qty", findLineItem(r, "Roof Drill Pt Screws").qty, 16);

  // Wafer head: (1 + 1 + 4 + 4) * 20 = 200
  assert("Wafer head qty", findLineItem(r, "Wafer Head Screws").qty, 200);

  // Bugle head: woodBucks=Yes, 14*2 = 28
  assert("Bugle head qty", findLineItem(r, "Bugle Head Screws").qty, 28);

  // EPS deduction: -(3*4) * 4 * $0.30 = -$14.40
  const epsDed = findLineItem(r, "EPS Opening Deduction");
  assert("EPS deduction cost", epsDed.cost, -14.40);

  // Inside stud deduction: -(3/2 * 10) * $2.22 = -15 * $2.22 = -$33.30
  const inDed = findLineItem(r, "Inside Stud Deduction");
  assert("Inside stud deduction cost", inDed.cost, -33.30);

  // Total SF = 3*4 * 4 units = 48
  assert("Total SF", r.sf, 48);
}

// ═══════════════════════════════════════════════════════════════
console.log("\n=== DOORS TEST ===");
// 3ft wide, 7ft high, 10ft wall, no footer (key difference)
{
  const data = {
    qty: 2, width: 3, height: 7, wallHeight: 10, wallThick: 6, epsThick: 4,
    headerHt: 8, trackWidth: 6,
    epsDensity: 0,
    king: true, kingType: 8,
    jack: true, jackType: 8,
    header: true, headerTubeType: 8,
    strHeaderType: 8,
    trackPerimeter: true, trackType: 5,
    woodBucks: true, woodBuckType: 1,
    screwType: 2,
    insideDeduction: 8, outsideDeduction: 8,
  };

  const r = calcComponentType("doors", data, P);

  // EPS Header only: (10-8)*3 = 6 SF, BdFt = 24
  assert("EPS Header BdFt", findLineItem(r, "EPS Header").qty, 24);

  // Door perimeter = 2*7 + 3 = 17 (NOT 2*(3+7)=20)
  assert("Track perimeter", findLineItem(r, "Track Perimeter").qty, 17);

  // Structural headers: (3+1)*2 = 8 LnFt
  assert("Str header LnFt", findLineItem(r, "Structural Headers").qty, 8);
}

// ═══════════════════════════════════════════════════════════════
console.log("\n=== GABLES TEST ===");
// 6/12 pitch, 20ft gable length
{
  const data = {
    qty: 2, rise: 6, run: 12, gableLength: 20, gableThick: 6, epsThick: 4,
    epsDensity: 0,
    insideStuds: true, insideStudType: 8,
    outsideStuds: true, outsideStudType: 8,
    topTrackInstalled: true, topTrackShipped: false, topTrackType: 5,
    bottomTrackInstalled: true, bottomTrackShipped: false, bottomTrackType: 5,
    topAngleInstalled: false, topAngleShipped: false, topAngleType: 0,
    bottomAngleInstalled: false, bottomAngleShipped: false, bottomAngleType: 0,
    extSheathing: true, sheathingType: 1,
    intSheathing: false, intSheathingType: 0,
    beamSupportQty: 0, beamSupportTubeType: 0,
    roofScrewType: 2,
    interiorWallCount: 0,
  };

  const r = calcComponentType("gables", data, P);

  // gableHeight = (6/12) * (0.5*20) = 0.5 * 10 = 5
  // gableRun = SQRT(5² + 10²) = SQRT(125) = 11.18
  // SF = 0.5 * 20 * 5 = 50
  assert("Gable SF (per unit)", r.sf / 2, 50);

  // Inside studs: count = 20/2 = 10, AVERAGE length = 5/2 = 2.5
  // total LnFt = 10 * 2.5 = 25
  assert("Inside stud LnFt", findLineItem(r, "Inside Studs").qty, 25);

  // Top track: gableRun*2 = 11.18*2 = 22.36
  const gableRun = Math.sqrt(25 + 100);
  assert("Top track LnFt", findLineItem(r, "Top Track").qty, gableRun * 2);

  // Bottom track: gableLength = 20
  assert("Bottom track LnFt", findLineItem(r, "Bottom Track").qty, 20);

  // Ext sheathing = 50 SqFt (triangle area)
  assert("Ext sheathing SF", findLineItem(r, "Ext Sheathing").qty, 50);
}

// ═══════════════════════════════════════════════════════════════
console.log("\n=== BOX BEAMS TEST ===");
{
  const data = {
    qty: 1, wallHeight: 10, wallThick: 6, beamLength: 12, beamHeight: 1,
    epsDensity: 0,
    topPlatesType: 1, topPlatesQty: 2,    // 2x4 @ $0.40
    bottomPlatesType: 1, bottomPlatesQty: 2,
    lvlType: 4, lvlQty: 2, // LVL 1-3/4 x 11-7/8 @ $7.609
    flatPlateQty: 4,
    kingStuds: true, kingStudType: 8,
    jackStuds: true, jackStudType: 8,
    roofScrewType: 2,
  };

  const r = calcComponentType("boxBeams", data, P);

  // Top plates: 2 * 12 = 24 LnFt * $0.40 = $9.60
  assert("Top plates LnFt", findLineItem(r, "Top Wood Plates").qty, 24);
  assert("Top plates cost", findLineItem(r, "Top Wood Plates").cost, 9.60);

  // LVL: 2 * 12 = 24 LnFt * $7.609 = $182.616
  assert("LVL LnFt", findLineItem(r, "LVL").qty, 24);
  assert("LVL cost", findLineItem(r, "LVL").cost, 182.616);

  // EPS: 12*1 = 12 SF, BdFt = 12*6 = 72
  assert("EPS BdFt", findLineItem(r, "EPS").qty, 72);

  // King studs: 4 * 10 = 40 LnFt
  assert("King stud LnFt", findLineItem(r, "King Studs").qty, 40);

  // Jack studs: 4 * (10-1) = 36 LnFt
  assert("Jack stud LnFt", findLineItem(r, "Jack Studs").qty, 36);

  // Wafer head: 4 * 20 = 80
  assert("Wafer head qty", findLineItem(r, "Wafer Head Screws").qty, 80);

  // Bugle head: 12 * 4 = 48
  assert("Bugle head qty", findLineItem(r, "Bugle Head Screws").qty, 48);
}

// ═══════════════════════════════════════════════════════════════
console.log("\n=== GABLE ROOF TEST ===");
// 6/12 pitch, 40ft ridge, 30ft gable, 2ft overhang
{
  const data = {
    qty: 1, rise: 6, run: 12, ridgeLen: 40, purlinLen: 40,
    eaveLen: 30, overhang: 2, roofThick: 8, epsThick: 4, gableLen: 30,
    epsDensity: 0,
    insideRafters: true, insideRafterType: 8,
    outsideRafters: true, outsideRafterType: 8,
    insideConnType: 3, outsideConnType: 3, // 8" bent @ $4.60
    insideRidge: true, outsideRidge: true,
    insideGable: true, outsideGable: true,
    insidePurlin: false, outsidePurlin: false,
    insideWall: false, outsideWall: false,
    simpsonTieDown: false, gutterBoard: false,
    intSheathing: false, intSheathingType: 0,
    endPanelQty: 0,
    gableConnQty: 4, ridgeConnQty: 1, purlinConnQty: 2, gutterConnQty: 2,
    roofScrewType: 0,
    interiorWallCount: 0,
  };

  const r = calcComponentType("gableRoof", data, P);

  // gableHt = (6/12) * (0.5*30) = 7.5
  // gableRun = SQRT(7.5² + 15²) = SQRT(56.25+225) = SQRT(281.25) = 16.77
  // roofRun = SQRT(7.5² + (15+2)²) = SQRT(56.25+289) = SQRT(345.25) = 18.58
  const gableHt = 7.5;
  const gableRun = Math.sqrt(gableHt ** 2 + 15 ** 2);
  const roofRun = Math.sqrt(gableHt ** 2 + 17 ** 2);
  const expectedSF = 40 * roofRun * 2;

  assert("Gable height", gableHt, 7.5);
  assert("Gable run", gableRun, 16.77, 0.01);
  assert("Roof run", roofRun, 18.58, 0.01);
  assert("Roof SF", r.sf, expectedSF, 1);

  // Inside rafter count = ROUNDUP(40) = 40 (1 per foot!)
  // Inside length = gableRun = 16.77
  assert("Inside rafter LnFt", findLineItem(r, "Inside Rafters").qty, 40 * gableRun, 0.5);

  // Outside rafter count = 40, length = roofRun = 18.58
  assert("Outside rafter LnFt", findLineItem(r, "Outside Rafters").qty, 40 * roofRun, 0.5);

  // Ridge conn: 1 * 40 = 40 LnFt each (inside + outside)
  assert("Inside ridge conn LnFt", findLineItem(r, "Inside Ridge Conn").qty, 40);
  assert("Outside ridge conn LnFt", findLineItem(r, "Outside Ridge Conn").qty, 40);

  // Gable conn: 4 * gableRun each
  assert("Inside gable conn LnFt", findLineItem(r, "Inside Gable Conn").qty, 4 * gableRun, 0.1);
}

// ═══════════════════════════════════════════════════════════════
console.log("\n=== HIP ROOF TEST ===");
// 6/12 pitch, 20ft ridge, 40ft eave parallel, 30ft eave perp, 2ft overhang
{
  const data = {
    qty: 1, rise: 6, run: 12, ridgeLen: 20,
    purlinParallel: 40, purlinPerp: 30,
    eaveParallel: 40, eavePerp: 30, overhang: 2,
    roofThick: 8, epsThick: 4,
    epsDensity: 0,
    insideRafters: true, insideRafterType: 8,
    outsideRafters: true, outsideRafterType: 8,
    insideRafters2: true, outsideRafters2: true,
    insideConnType: 3, outsideConnType: 3,
    insideRidge: true, outsideRidge: false,
    insidePurlinPar: false, insidePurlinPerp: false,
    outsidePurlinPar: false, outsidePurlinPerp: false,
    insideHip: false, outsideHip: false,
    insideWallPar: false, outsideWallPar: false,
    insideWallPerp: false, outsideWallPerp: false,
    insideWallPar2: false, insideWallPerp2: false,
    simpsonTieDown: false,
    gutterBoardPar: false, gutterBoardPerp: false,
    roofScrewType: 0,
  };

  const r = calcComponentType("hipRoof", data, P);

  // ridgeHt = (6/12) * (0.5*30) = 7.5
  // hipRoofRun = SQRT(7.5² + 15²) = 16.77
  // roofRunOH = SQRT(7.5² + 17²) = 18.58
  // hipLength = SQRT(18.58² + 15²) = SQRT(345.25 + 225) = SQRT(570.25) = 23.88
  // SF = (15 * 18.58 * 4) + (20 * 18.58 * 2) = 1114.8 + 743.2 = 1858
  const ridgeHt = 7.5;
  const hipRoofRun = Math.sqrt(ridgeHt ** 2 + 15 ** 2);
  const roofRunOH = Math.sqrt(ridgeHt ** 2 + 17 ** 2);
  const expectedSF = (15 * roofRunOH * 4) + (20 * roofRunOH * 2);

  assert("Ridge height", ridgeHt, 7.5);
  assert("Hip roof SF", r.sf, expectedSF, 1);

  // Inside rafters (ridge): ROUNDUP(20) = 20, length = hipRoofRun
  assert("Inside rafter ridge LnFt", findLineItem(r, "Inside Rafters (Ridge)").qty, 20 * hipRoofRun, 0.5);

  // Inside rafters (hip): ROUNDUP(30) = 30, AVERAGE length = hipRoofRun/2
  assert("Inside rafter hip LnFt", findLineItem(r, "Inside Rafters (Hip)").qty, 30 * hipRoofRun / 2, 0.5);

  // Ridge conn: 20 LnFt
  assert("Inside ridge conn LnFt", findLineItem(r, "Inside Ridge Conn").qty, 20);
}

// ═══════════════════════════════════════════════════════════════
console.log("\n=== SKYLIGHTS TEST ===");
// 3ft wide, 3ft high, 12ft roof run, 8" thick, 4" EPS
{
  const data = {
    qty: 2, width: 3, height: 3, roofRun: 12, roofThick: 8, epsThick: 4,
    trackWidth: 6,
    epsDensity: 0,
    king: true, kingType: 8,
    header: true, headerTubeType: 8,
    footer: true, footerTubeType: 8,
    strHeaderType: 0,
    footerAngleType: 2,
    trackPerimeter: true, trackType: 5,
    woodBucks: true, woodBuckType: 1,
    roofScrewType: 2,
    insideDeduction: 8, outsideDeduction: 8,
  };

  const r = calcComponentType("skylights", data, P);

  // EPS header = (12-3)/2 * 3 = 4.5 * 3 = 13.5 SF, BdFt = 13.5*4 = 54
  assert("EPS Header BdFt", findLineItem(r, "EPS Header").qty, 54);
  // EPS footer = same (symmetric)
  assert("EPS Footer BdFt", findLineItem(r, "EPS Footer").qty, 54);

  // King studs: 4 * 12 = 48 LnFt
  assert("King stud LnFt", findLineItem(r, "King Studs").qty, 48);

  // Header tubes: ROUNDUP(3) = 3, length = (12-3)/2 = 4.5, total = 13.5
  assert("Header tube LnFt", findLineItem(r, "Header Tubes").qty, 13.5);

  // Footer tubes: same
  assert("Footer tube LnFt", findLineItem(r, "Footer Tubes").qty, 13.5);
}

// ═══════════════════════════════════════════════════════════════
console.log("\n=== LABOR TEST ===");
{
  // Import labor functions
  const { calcWallPanelCount, calcCornerCount, calcWindowPanelCount,
          calcGablePanelCount, calcLaborCost, AVG_COST_PER_HOUR } = await import("./labor.js");

  assert("Avg cost/hr", AVG_COST_PER_HOUR, 30.886, 0.01);

  // Wall panels: 10ft high, 100ft long = 1000 SF, 2 units
  // basePanels = ceil(1000/8/10) = ceil(12.5) = 13
  // height <=8: mult=1.0 → 13 panels. BUT height=10, so 8-12 range: 1.07
  // ceil(13 * 1.07) = ceil(13.91) = 14 per unit, * 2 = 28
  assert("Wall panel count", calcWallPanelCount(1000, 10, 2), 28);

  // Corner count: 5 corners, 10ft high → mult=1.07 → ceil(5*1.07) = 6
  assert("Corner count", calcCornerCount(5, 10), 6);

  // Window panels: 3ft wide (<=4ft, mult=1.0), 4 units → 4
  assert("Window panel count (small)", calcWindowPanelCount(3, 4), 4);

  // Window panels: 6ft wide (>4 <=8, mult=1.3), 4 units → ceil(5.2) = 6
  assert("Window panel count (large)", calcWindowPanelCount(6, 4), 6);

  // Gable panels: 20ft gable, 2 units
  // 20/4 * 2 = 10, mult for >12ft = 1.3 → ceil(13) = 13
  assert("Gable panel count", calcGablePanelCount(20, 2), 13);
}

// ═══════════════════════════════════════════════════════════════
console.log(`\n${"═".repeat(50)}`);
console.log(`RESULTS: ${passed} passed, ${failed} failed out of ${passed + failed} tests`);
console.log(`${"═".repeat(50)}\n`);

if (failed > 0) process.exit(1);
