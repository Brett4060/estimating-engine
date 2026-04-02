import { useState, useMemo, useCallback, useEffect } from "react";
import {
  calcComponentType, calcComponentLabor, calcOverhead,
  DEFAULT_PRICING, clonePricing,
  DEFAULT_EMPLOYEES, DEFAULT_MINUTES_PER_PANEL, DEFAULT_BURDEN_RATE,
  DEFAULT_OVERHEAD_PER_SF, DEFAULT_WASTE_FACTOR,
  PANEL_TYPE_LABELS, calcAvgCostPerHour,
} from "./calcEngine/index.js";
import { importGSTWorkbook } from "./excelImporter.js";
import { GST_LOGO, GST_FAVICON } from "./logoData.js";

// ═══════════════════════════════════════════════════════════════
// COMPONENT DEFINITIONS — inputs per Excel tab
// ═══════════════════════════════════════════════════════════════
const OPT_MAP_KEYS = { EPS: "EPS", TUBING: "TUBING", TRACK: "TRACK", HEADERS: "HEADERS", SHEATHING: "SHEATHING", ANGLES: "ANGLES", BENT: "BENT", RSCREW: "RSCREW", WOOD: "WOOD", LVL: "LVL" };

const COMP = {
  walls: {
    label: "WALLS", icon: "W",
    dims: [
      { key: "height", label: "Wall Height", unit: "ft" },
      { key: "length", label: "Wall Length", unit: "ft" },
      { key: "thickness", label: "Wall Thickness", unit: "in" },
      { key: "epsThick", label: "EPS Thickness", unit: "in" },
    ],
    toggles: [
      { section: "Studs", items: [
        { key: "insideStuds", label: "Inside Studs" },
        { key: "outsideStuds", label: "Outside Studs" },
      ]},
      { section: "Track - Top", items: [
        { key: "topTrackInstalled", label: "Top Installed" },
        { key: "topTrackShipped", label: "Top Shipped" },
      ]},
      { section: "Track - Bottom", items: [
        { key: "bottomTrackInstalled", label: "Bottom Installed" },
        { key: "bottomTrackShipped", label: "Bottom Shipped" },
      ]},
      { section: "Angles - Top", items: [
        { key: "topAngleInstalled", label: "Top Installed" },
        { key: "topAngleShipped", label: "Top Shipped" },
      ]},
      { section: "Angles - Bottom", items: [
        { key: "bottomAngleInstalled", label: "Bottom Installed" },
        { key: "bottomAngleShipped", label: "Bottom Shipped" },
      ]},
      { section: "Wood Plates - Top", items: [
        { key: "topPlatesInstalled", label: "Top Installed" },
        { key: "topPlatesShipped", label: "Top Shipped" },
      ]},
      { section: "Wood Plates - Bottom", items: [
        { key: "bottomPlatesInstalled", label: "Bottom Installed" },
        { key: "bottomPlatesShipped", label: "Bottom Shipped" },
      ]},
      { section: "Sheathing & Barrier", items: [
        { key: "extSheathing", label: "Exterior Sheathing" },
        { key: "moistureBarrier", label: "Moisture Barrier" },
      ]},
      { section: "Corners", items: [
        { key: "extCornerAngle", label: "Ext Corner Angle" },
      ]},
    ],
    selects: [
      { key: "epsDensity", label: "EPS Density", opts: "EPS" },
      { key: "insideStudType", label: "Inside Stud Type", opts: "TUBING" },
      { key: "outsideStudType", label: "Outside Stud Type", opts: "TUBING" },
      { key: "topTrackType", label: "Top Track Type", opts: "TRACK" },
      { key: "bottomTrackType", label: "Bottom Track Type", opts: "TRACK" },
      { key: "topAngleType", label: "Top Angle Type", opts: "ANGLES" },
      { key: "bottomAngleType", label: "Bottom Angle Type", opts: "ANGLES" },
      { key: "topPlatesType", label: "Top Plates Type", opts: "WOOD" },
      { key: "bottomPlatesType", label: "Bottom Plates Type", opts: "WOOD" },
      { key: "sheathingType", label: "Sheathing Type", opts: "SHEATHING" },
      { key: "moistureBarrierType", label: "Moisture Barrier Type", opts: "SHEATHING" },
      { key: "cornerTubeType", label: "Corner Tube Type", opts: "TUBING" },
      { key: "extCornerType", label: "Ext Corner Angle Type", opts: "ANGLES" },
      { key: "intCornerType", label: "Int Corner Angle Type", opts: "ANGLES" },
      { key: "roofScrewType", label: "Roof Drill Pt Screws", opts: "RSCREW" },
    ],
    extras: [
      { key: "cornerQty", label: "Qty of Corners", type: "number", def: 5 },
      { key: "endPanelQty", label: "End Panels", type: "number", def: 0 },
      { key: "beamSupportQty", label: "Beam Supports", type: "number", def: 0 },
      { key: "cabinetBackingQty", label: "Cabinet Backing", type: "number", def: 0 },
      { key: "interiorWallCount", label: "Interior Walls", type: "number", def: 0 },
    ],
  },
  windows: {
    label: "WINDOWS", icon: "Wi",
    dims: [
      { key: "width", label: "Opening Width", unit: "ft" },
      { key: "height", label: "Opening Height", unit: "ft" },
      { key: "wallHeight", label: "Wall Height", unit: "ft" },
      { key: "wallThick", label: "Wall Thickness", unit: "in" },
      { key: "epsThick", label: "EPS Thickness", unit: "in" },
      { key: "headerHt", label: "Header Height", unit: "ft" },
      { key: "trackWidth", label: "Track Width", unit: "in" },
    ],
    toggles: [
      { section: "Studs", items: [
        { key: "king", label: "King Studs" },
        { key: "jack", label: "Jack Studs" },
      ]},
      { section: "Header / Footer", items: [
        { key: "header", label: "Header" },
        { key: "footer", label: "Footer" },
      ]},
      { section: "Perimeter", items: [
        { key: "trackPerimeter", label: "Track Sides & Bottom" },
        { key: "woodBucks", label: "Wood Bucks" },
      ]},
    ],
    selects: [
      { key: "epsDensity", label: "EPS Density", opts: "EPS" },
      { key: "kingType", label: "King Stud Type", opts: "TUBING" },
      { key: "jackType", label: "Jack Stud Type", opts: "TUBING" },
      { key: "headerTubeType", label: "Header Tube Type", opts: "TUBING" },
      { key: "footerTubeType", label: "Footer Tube Type", opts: "TUBING" },
      { key: "strHeaderType", label: "Structural Header", opts: "TUBING" },
      { key: "footerAngleType", label: "Footer Angle", opts: "ANGLES" },
      { key: "trackType", label: "Track Type", opts: "TRACK" },
      { key: "woodBuckType", label: "Wood Buck Type", opts: "WOOD" },
      { key: "roofScrewType", label: "Roof Screws", opts: "RSCREW" },
      { key: "insideDeduction", label: "Inside Deduction", opts: "TUBING" },
      { key: "outsideDeduction", label: "Outside Deduction", opts: "TUBING" },
    ],
    extras: [{ key: "headerLength", label: "Str. Header Length", type: "number", def: 8 }],
  },
  doors: {
    label: "DOORS", icon: "D",
    dims: [
      { key: "width", label: "Opening Width", unit: "ft" },
      { key: "height", label: "Opening Height", unit: "ft" },
      { key: "wallHeight", label: "Wall Height", unit: "ft" },
      { key: "wallThick", label: "Wall Thickness", unit: "in" },
      { key: "epsThick", label: "EPS Thickness", unit: "in" },
      { key: "headerHt", label: "Header Height", unit: "ft" },
      { key: "trackWidth", label: "Track Width", unit: "in" },
    ],
    toggles: [
      { section: "Studs", items: [{ key: "king", label: "King" }, { key: "jack", label: "Jack" }]},
      { section: "Header", items: [{ key: "header", label: "Header" }]},
      { section: "Perimeter", items: [{ key: "trackPerimeter", label: "Track" }, { key: "woodBucks", label: "Wood Bucks" }]},
    ],
    selects: [
      { key: "epsDensity", label: "EPS Density", opts: "EPS" },
      { key: "kingType", label: "King Type", opts: "TUBING" },
      { key: "jackType", label: "Jack Type", opts: "TUBING" },
      { key: "headerTubeType", label: "Header Tube", opts: "TUBING" },
      { key: "strHeaderType", label: "Str. Header", opts: "TUBING" },
      { key: "trackType", label: "Track Type", opts: "TRACK" },
      { key: "woodBuckType", label: "Wood Buck", opts: "WOOD" },
      { key: "screwType", label: "Drill Pt Screws", opts: "RSCREW" },
      { key: "insideDeduction", label: "Inside Deduction", opts: "TUBING" },
      { key: "outsideDeduction", label: "Outside Deduction", opts: "TUBING" },
    ],
    extras: [],
  },
  gables: {
    label: "GABLES", icon: "G",
    dims: [
      { key: "rise", label: "Rise", unit: "" },
      { key: "run", label: "Run", unit: "", def: 12 },
      { key: "gableLength", label: "Gable Length", unit: "ft" },
      { key: "gableThick", label: "Thickness", unit: "in" },
      { key: "epsThick", label: "EPS Thickness", unit: "in" },
    ],
    toggles: [
      { section: "Studs", items: [{ key: "insideStuds", label: "Inside" }, { key: "outsideStuds", label: "Outside" }]},
      { section: "Track Top", items: [{ key: "topTrackInstalled", label: "Installed" }, { key: "topTrackShipped", label: "Shipped" }]},
      { section: "Track Bottom", items: [{ key: "bottomTrackInstalled", label: "Installed" }, { key: "bottomTrackShipped", label: "Shipped" }]},
      { section: "Sheathing", items: [{ key: "extSheathing", label: "Exterior" }, { key: "intSheathing", label: "Interior" }]},
    ],
    selects: [
      { key: "epsDensity", label: "EPS Density", opts: "EPS" },
      { key: "insideStudType", label: "Inside Stud", opts: "TUBING" },
      { key: "outsideStudType", label: "Outside Stud", opts: "TUBING" },
      { key: "topTrackType", label: "Top Track", opts: "TRACK" },
      { key: "bottomTrackType", label: "Bottom Track", opts: "TRACK" },
      { key: "sheathingType", label: "Sheathing", opts: "SHEATHING" },
      { key: "intSheathingType", label: "Int Sheathing", opts: "SHEATHING" },
      { key: "roofScrewType", label: "Roof Screws", opts: "RSCREW" },
    ],
    extras: [],
  },
  boxBeams: {
    label: "BOX BEAMS", icon: "BB",
    dims: [
      { key: "wallHeight", label: "Wall Height", unit: "ft" },
      { key: "wallThick", label: "Wall Thickness", unit: "in" },
      { key: "beamLength", label: "Beam Length", unit: "ft" },
      { key: "beamHeight", label: "Beam Height", unit: "ft", def: 1 },
    ],
    toggles: [
      { section: "Studs", items: [{ key: "kingStuds", label: "King" }, { key: "jackStuds", label: "Jack" }]},
    ],
    selects: [
      { key: "epsDensity", label: "EPS Density", opts: "EPS" },
      { key: "topPlatesType", label: "Top Plates", opts: "WOOD" },
      { key: "bottomPlatesType", label: "Bottom Plates", opts: "WOOD" },
      { key: "lvlType", label: "LVL Type", opts: "LVL" },
      { key: "kingStudType", label: "King Stud", opts: "TUBING" },
      { key: "jackStudType", label: "Jack Stud", opts: "TUBING" },
      { key: "roofScrewType", label: "Roof Screws", opts: "RSCREW" },
    ],
    extras: [
      { key: "topPlatesQty", label: "Top Plates Qty", type: "number" },
      { key: "bottomPlatesQty", label: "Bottom Plates Qty", type: "number" },
      { key: "lvlQty", label: "LVL Qty", type: "number" },
      { key: "flatPlateQty", label: "Flat Plate Qty", type: "number" },
    ],
  },
  gableRoof: {
    label: "GABLE ROOF", icon: "GR",
    dims: [
      { key: "rise", label: "Rise", unit: "" },
      { key: "run", label: "Run", unit: "", def: 12 },
      { key: "ridgeLen", label: "Ridge Length", unit: "ft" },
      { key: "purlinLen", label: "Purlin Length", unit: "ft" },
      { key: "eaveLen", label: "Eave Length", unit: "ft" },
      { key: "overhang", label: "Overhang", unit: "ft" },
      { key: "roofThick", label: "Roof Thickness", unit: "in" },
      { key: "epsThick", label: "EPS Thickness", unit: "in" },
      { key: "gableLen", label: "Gable Length", unit: "ft" },
    ],
    toggles: [
      { section: "Rafters", items: [{ key: "insideRafters", label: "Inside" }, { key: "outsideRafters", label: "Outside" }]},
      { section: "Ridge", items: [{ key: "insideRidge", label: "Inside" }, { key: "outsideRidge", label: "Outside" }]},
      { section: "Gable", items: [{ key: "insideGable", label: "Inside" }, { key: "outsideGable", label: "Outside" }]},
      { section: "Purlin", items: [{ key: "insidePurlin", label: "Inside" }, { key: "outsidePurlin", label: "Outside" }]},
      { section: "Wall", items: [{ key: "insideWall", label: "Inside" }, { key: "outsideWall", label: "Outside" }]},
      { section: "Misc", items: [{ key: "simpsonTieDown", label: "Simpson" }, { key: "gutterBoard", label: "Gutter" }]},
    ],
    selects: [
      { key: "epsDensity", label: "EPS", opts: "EPS" },
      { key: "insideRafterType", label: "Inside Rafter", opts: "TUBING" },
      { key: "outsideRafterType", label: "Outside Rafter", opts: "TUBING" },
      { key: "insideConnType", label: "Inside Conn", opts: "BENT" },
      { key: "outsideConnType", label: "Outside Conn", opts: "BENT" },
      { key: "roofScrewType", label: "Roof Screws", opts: "RSCREW" },
    ],
    extras: [
      { key: "gableConnQty", label: "Gable Conn Qty", type: "number", def: 4 },
      { key: "ridgeConnQty", label: "Ridge Conn Qty", type: "number", def: 1 },
      { key: "purlinConnQty", label: "Purlin Conn Qty", type: "number", def: 2 },
      { key: "gutterConnQty", label: "Gutter Conn Qty", type: "number", def: 2 },
      { key: "endPanelQty", label: "End Panel Qty", type: "number", def: 0 },
    ],
  },
  hipRoof: {
    label: "HIP ROOF", icon: "HR",
    dims: [
      { key: "rise", label: "Rise", unit: "" },
      { key: "run", label: "Run", unit: "", def: 12 },
      { key: "ridgeLen", label: "Ridge Length", unit: "ft" },
      { key: "purlinParallel", label: "Purlin ||", unit: "ft" },
      { key: "purlinPerp", label: "Purlin perp", unit: "ft" },
      { key: "eaveParallel", label: "Eave ||", unit: "ft" },
      { key: "eavePerp", label: "Eave perp", unit: "ft" },
      { key: "overhang", label: "Overhang", unit: "ft" },
      { key: "roofThick", label: "Thickness", unit: "in" },
      { key: "epsThick", label: "EPS Thickness", unit: "in" },
    ],
    toggles: [
      { section: "Rafters", items: [{ key: "insideRafters", label: "In Ridge" }, { key: "outsideRafters", label: "Out Ridge" }, { key: "insideRafters2", label: "In Hip" }, { key: "outsideRafters2", label: "Out Hip" }]},
      { section: "Ridge", items: [{ key: "insideRidge", label: "Inside" }, { key: "outsideRidge", label: "Outside" }]},
      { section: "Purlin", items: [{ key: "insidePurlinPar", label: "In ||" }, { key: "insidePurlinPerp", label: "In perp" }, { key: "outsidePurlinPar", label: "Out ||" }, { key: "outsidePurlinPerp", label: "Out perp" }]},
      { section: "Hip", items: [{ key: "insideHip", label: "Inside" }, { key: "outsideHip", label: "Outside" }]},
      { section: "Wall", items: [{ key: "insideWallPar", label: "In ||" }, { key: "outsideWallPar", label: "Out ||" }, { key: "insideWallPerp", label: "In perp" }, { key: "outsideWallPerp", label: "Out perp" }]},
      { section: "Misc", items: [{ key: "simpsonTieDown", label: "Simpson" }, { key: "gutterBoardPar", label: "Gutter ||" }, { key: "gutterBoardPerp", label: "Gutter perp" }]},
    ],
    selects: [
      { key: "epsDensity", label: "EPS", opts: "EPS" },
      { key: "insideRafterType", label: "In Rafter", opts: "TUBING" },
      { key: "outsideRafterType", label: "Out Rafter", opts: "TUBING" },
      { key: "insideConnType", label: "In Conn", opts: "BENT" },
      { key: "outsideConnType", label: "Out Conn", opts: "BENT" },
      { key: "roofScrewType", label: "Roof Screws", opts: "RSCREW" },
    ],
    extras: [],
  },
  singleSlope: {
    label: "SINGLE SLOPE", icon: "SS",
    dims: [
      { key: "rise", label: "Rise", unit: "" },
      { key: "run", label: "Run", unit: "", def: 12 },
      { key: "ridgeLen", label: "Ridge Length", unit: "ft" },
      { key: "purlinLen", label: "Purlin Length", unit: "ft" },
      { key: "eaveLen", label: "Eave Length", unit: "ft" },
      { key: "overhangRidge", label: "OH Ridge", unit: "ft" },
      { key: "overhangEave", label: "OH Eave", unit: "ft" },
      { key: "roofThick", label: "Thickness", unit: "in" },
      { key: "epsThick", label: "EPS Thickness", unit: "in" },
      { key: "gableLen", label: "Gable Length", unit: "ft" },
    ],
    toggles: [
      { section: "Rafters", items: [{ key: "insideRafters", label: "Inside" }, { key: "outsideRafters", label: "Outside" }]},
      { section: "Gable", items: [{ key: "insideGable", label: "Inside" }, { key: "outsideGable", label: "Outside" }]},
      { section: "Purlin", items: [{ key: "insidePurlin", label: "Inside" }, { key: "outsidePurlin", label: "Outside" }]},
      { section: "Wall", items: [{ key: "insideWall", label: "Inside" }, { key: "outsideWall", label: "Outside" }]},
      { section: "Misc", items: [{ key: "simpsonTieDown", label: "Simpson" }, { key: "gutterBoard", label: "Gutter" }, { key: "faciaBoard", label: "Facia" }]},
    ],
    selects: [
      { key: "epsDensity", label: "EPS", opts: "EPS" },
      { key: "insideRafterType", label: "In Rafter", opts: "TUBING" },
      { key: "outsideRafterType", label: "Out Rafter", opts: "TUBING" },
      { key: "insideConnType", label: "In Conn", opts: "BENT" },
      { key: "outsideConnType", label: "Out Conn", opts: "BENT" },
      { key: "roofScrewType", label: "Roof Screws", opts: "RSCREW" },
    ],
    extras: [
      { key: "gableConnQty", label: "Gable Conn", type: "number", def: 2 },
      { key: "purlinConnQty", label: "Purlin Conn", type: "number", def: 2 },
      { key: "wallConnQty", label: "Wall Conn", type: "number", def: 2 },
      { key: "endPanelQty", label: "End Panels", type: "number", def: 0 },
    ],
  },
  shearWalls: {
    label: "SHEAR WALLS", icon: "SW",
    dims: [
      { key: "height", label: "Height", unit: "ft" },
      { key: "length", label: "Length", unit: "ft" },
      { key: "thickness", label: "Thickness", unit: "in" },
      { key: "epsThick", label: "EPS Thickness", unit: "in" },
    ],
    toggles: [
      { section: "Studs", items: [{ key: "insideStuds", label: "Inside" }, { key: "outsideStuds", label: "Outside" }]},
      { section: "Track Top", items: [{ key: "topTrackInstalled", label: "Installed" }, { key: "topTrackShipped", label: "Shipped" }]},
      { section: "Track Bottom", items: [{ key: "bottomTrackInstalled", label: "Installed" }, { key: "bottomTrackShipped", label: "Shipped" }]},
      { section: "Sheathing", items: [{ key: "extSheathing", label: "Exterior" }, { key: "intSheathing", label: "Interior" }]},
    ],
    selects: [
      { key: "epsDensity", label: "EPS", opts: "EPS" },
      { key: "insideStudType", label: "Inside Stud", opts: "TUBING" },
      { key: "outsideStudType", label: "Outside Stud", opts: "TUBING" },
      { key: "topTrackType", label: "Top Track", opts: "TRACK" },
      { key: "bottomTrackType", label: "Bottom Track", opts: "TRACK" },
      { key: "topPlatesType", label: "Top Plates", opts: "WOOD" },
      { key: "sheathingType", label: "Ext Sheathing", opts: "SHEATHING" },
      { key: "intSheathingType", label: "Int Sheathing", opts: "SHEATHING" },
      { key: "roofScrewType", label: "Roof Screws", opts: "RSCREW" },
    ],
    extras: [{ key: "interiorWallCount", label: "Int. Walls", type: "number", def: 0 }],
  },
  skylights: {
    label: "SKYLIGHTS", icon: "SL",
    dims: [
      { key: "width", label: "Width", unit: "ft" },
      { key: "height", label: "Height", unit: "ft" },
      { key: "roofRun", label: "Roof Run w/ OH", unit: "ft" },
      { key: "roofThick", label: "Thickness", unit: "in" },
      { key: "epsThick", label: "EPS Thickness", unit: "in" },
      { key: "trackWidth", label: "Track Width", unit: "in" },
    ],
    toggles: [
      { section: "Components", items: [{ key: "king", label: "King" }, { key: "header", label: "Header" }, { key: "footer", label: "Footer" }]},
      { section: "Perimeter", items: [{ key: "trackPerimeter", label: "Track" }, { key: "woodBucks", label: "Bucks" }]},
    ],
    selects: [
      { key: "epsDensity", label: "EPS", opts: "EPS" },
      { key: "kingType", label: "King Stud", opts: "TUBING" },
      { key: "headerTubeType", label: "Header Tube", opts: "TUBING" },
      { key: "footerTubeType", label: "Footer Tube", opts: "TUBING" },
      { key: "strHeaderType", label: "Str Header", opts: "TUBING" },
      { key: "footerAngleType", label: "Footer Angle", opts: "ANGLES" },
      { key: "trackType", label: "Track", opts: "TRACK" },
      { key: "woodBuckType", label: "Wood Buck", opts: "WOOD" },
      { key: "roofScrewType", label: "Roof Screws", opts: "RSCREW" },
      { key: "insideDeduction", label: "In Deduction", opts: "TUBING" },
      { key: "outsideDeduction", label: "Out Deduction", opts: "TUBING" },
    ],
    extras: [],
  },
};

const COMP_KEYS = Object.keys(COMP);
const TYPE_LABELS = ["A", "B", "C", "D", "E"];
const fmt = (n) => "$" + (n || 0).toLocaleString("en-US", { maximumFractionDigits: 0 });
const fmtDec = (n) => "$" + (n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// ═══════════════════════════════════════════════════════════════
// MATERIAL → TOGGLE MAPPING
// When a material dropdown is selected, auto-set the related toggle
// ═══════════════════════════════════════════════════════════════
const SELECT_TO_TOGGLE = {
  insideStudType: "insideStuds", outsideStudType: "outsideStuds",
  topTrackType: ["topTrackInstalled"], bottomTrackType: ["bottomTrackInstalled"],
  topAngleType: ["topAngleInstalled"], bottomAngleType: ["bottomAngleInstalled"],
  topPlatesType: ["topPlatesInstalled"], bottomPlatesType: ["bottomPlatesInstalled"],
  sheathingType: "extSheathing", moistureBarrierType: "moistureBarrier",
  intSheathingType: "intSheathing",
  cornerTubeType: "extCornerAngle",
  kingType: "king", jackType: "jack",
  headerTubeType: "header", footerTubeType: "footer",
  insideRafterType: "insideRafters", outsideRafterType: "outsideRafters",
  kingStudType: "kingStuds", jackStudType: "jackStuds",
};

function getRelatedToggles(selectKey) {
  const v = SELECT_TO_TOGGLE[selectKey];
  if (!v) return [];
  return Array.isArray(v) ? v : [v];
}

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════
function makeTypeState(compDef) {
  const s = { qty: "", label: "" };
  compDef.dims.forEach(d => { s[d.key] = d.def ?? ""; });
  compDef.toggles.forEach(g => g.items.forEach(t => { s[t.key] = null; })); // null = unset
  compDef.selects.forEach(sel => { s[sel.key] = null; }); // null = not chosen
  (compDef.extras || []).forEach(e => { s[e.key] = e.def ?? ""; });
  return s;
}

// Validate a single type — returns array of issues
function validateType(compKey, data) {
  const def = COMP[compKey];
  if (!def) return [];
  const qty = Number(data.qty) || 0;
  if (qty === 0) return []; // no data = nothing to validate

  const issues = [];

  // All dimensions must be filled (not empty, not 0 for required ones)
  def.dims.forEach(d => {
    const v = data[d.key];
    if (v === "" || v === null || v === undefined) {
      issues.push({ field: d.key, label: d.label, type: "dim", msg: "Required" });
    }
  });

  // All toggles must be explicitly set (not null)
  def.toggles.forEach(g => {
    g.items.forEach(t => {
      if (data[t.key] === null || data[t.key] === undefined) {
        issues.push({ field: t.key, label: `${g.section}: ${t.label}`, type: "toggle", msg: "Must select Yes or No" });
      }
    });
  });

  // All selects must be explicitly chosen (not null)
  def.selects.forEach(sel => {
    if (data[sel.key] === null || data[sel.key] === undefined) {
      issues.push({ field: sel.key, label: sel.label, type: "select", msg: "Must make a selection" });
    }
  });

  return issues;
}

// Validate entire project
function validateProject(comps, proj) {
  const allIssues = {};
  let totalIssues = 0;

  COMP_KEYS.forEach(k => {
    comps[k].forEach((td, i) => {
      const qty = Number(td.qty) || 0;
      if (qty === 0) return;
      const issues = validateType(k, td);
      if (issues.length > 0) {
        const key = `${k}-${i}`;
        allIssues[key] = { compKey: k, typeIdx: i, label: `${COMP[k].label} Type ${TYPE_LABELS[i]}`, issues };
        totalIssues += issues.length;
      }
    });
  });

  return { allIssues, totalIssues, isValid: totalIssues === 0 };
}

// ═══════════════════════════════════════════════════════════════
// UI COMPONENTS
// ═══════════════════════════════════════════════════════════════
// 3-state toggle: null=unset, true=Yes, false=No
// Clicking cycles: null->true->false->true (once set, no going back to null)
function Toggle({ label, value, onChange }) {
  const isUnset = value === null || value === undefined;
  const handleClick = () => {
    if (isUnset) onChange(true);
    else onChange(!value);
  };
  return (
    <label className="flex items-center gap-2 py-0.5 cursor-pointer">
      <div onClick={handleClick}
        className={`w-10 h-5 rounded-full relative transition-colors cursor-pointer ${
          isUnset ? "bg-amber-300 ring-2 ring-amber-400" :
          value ? "bg-blue-600" : "bg-slate-300"
        }`}>
        <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
          isUnset ? "translate-x-3" :
          value ? "translate-x-5.5" : "translate-x-0.5"
        }`} />
        {isUnset && <span className="absolute inset-0 flex items-center justify-center text-[8px] font-bold text-amber-700">?</span>}
      </div>
      <span className={`text-xs ${
        isUnset ? "text-amber-600 font-medium" :
        value ? "text-slate-800 font-medium" : "text-slate-500"
      }`}>{label}</span>
    </label>
  );
}

function TypeCard({ compKey, typeIdx, data, onChange, expanded, onToggleExpand, pricing, laborSettings }) {
  const def = COMP[compKey];
  const calc = calcComponentType(compKey, data, pricing);
  const labor = calcComponentLabor(compKey, data, laborSettings);
  const qty = Number(data.qty) || 0;
  const hasData = qty > 0;
  const total = calc.material + calc.waste + labor;
  const perUnitMat = qty > 0 ? (calc.material + calc.waste) / qty : 0;
  const costPerSF = calc.sf > 0 ? perUnitMat / (calc.sf / qty) : 0;
  const issues = hasData ? validateType(compKey, data) : [];
  const issueCount = issues.length;
  const upd = (k, v) => onChange(typeIdx, k, v);

  return (
    <div className={`border rounded-lg mb-2 transition-all ${hasData ? "border-blue-300 bg-white shadow-sm" : "border-slate-200 bg-slate-50"}`}>
      <div className="flex items-center gap-2 px-3 py-2 cursor-pointer" onClick={onToggleExpand}>
        <span className={`text-xs font-bold w-6 h-6 rounded flex items-center justify-center ${issueCount > 0 ? "bg-amber-500 text-white" : hasData ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-500"}`}>
          {issueCount > 0 ? "!" : TYPE_LABELS[typeIdx]}
        </span>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="w-16">
            <input type="number" value={data.qty} placeholder="Qty"
              onClick={e => e.stopPropagation()}
              onChange={e => upd("qty", e.target.value === "" ? "" : Number(e.target.value))}
              className="w-full border border-slate-300 rounded px-2 py-1 text-xs bg-sky-50 text-center" />
          </div>
          <div className="w-32">
            <input type="text" value={data.label || ""} placeholder="Label"
              onClick={e => e.stopPropagation()}
              onChange={e => upd("label", e.target.value)}
              className="w-full border border-slate-300 rounded px-2 py-1 text-xs bg-sky-50" />
          </div>
          {hasData && (
            <div className="flex gap-3 text-xs text-slate-500 truncate">
              {def.dims.slice(0, 3).map(d => {
                const v = data[d.key];
                return v ? <span key={d.key}>{d.label.split(" ").pop()}: {v}{d.unit}</span> : null;
              })}
            </div>
          )}
        </div>
        <div className="flex items-center gap-3">
          {hasData && <span className="text-sm font-mono font-bold text-blue-600">{calc.sf.toLocaleString()} SF</span>}
          {hasData && qty > 1 && <span className="text-[10px] font-mono text-slate-400">({Math.round(calc.sf / qty)} SF/ea)</span>}
          {hasData && costPerSF > 0 && <span className="text-xs font-mono text-slate-400">{fmtDec(costPerSF)}/SF</span>}
          <span className={`text-sm font-mono font-bold ${hasData ? "text-blue-700" : "text-slate-400"}`}>
            {hasData ? fmt(total) : "$0"}
          </span>
          <svg className={`w-4 h-4 text-slate-400 transition-transform ${expanded ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-slate-200 px-3 py-3">
          {issueCount > 0 && (
            <div className="mb-3 bg-amber-50 border border-amber-300 rounded p-2 flex items-start gap-2">
              <span className="w-5 h-5 bg-amber-400 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0 mt-0.5">!</span>
              <div>
                <div className="text-xs font-bold text-amber-800 mb-0.5">{issueCount} field{issueCount !== 1 ? "s" : ""} incomplete</div>
                <div className="flex flex-wrap gap-1">
                  {issues.map(is => (
                    <span key={is.field} className="text-[10px] bg-amber-100 text-amber-700 border border-amber-200 rounded px-1.5 py-0.5">{is.label}</span>
                  ))}
                </div>
              </div>
            </div>
          )}
          <div className="mb-3">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Dimensions</div>
            <div className="grid grid-cols-5 gap-2">
              {def.dims.map(d => (
                <div key={d.key}>
                  <label className="text-[10px] text-slate-500 block">{d.label} {d.unit && `(${d.unit})`}</label>
                  <input type="number" value={data[d.key]} placeholder="0"
                    onChange={e => upd(d.key, e.target.value === "" ? "" : Number(e.target.value))}
                    className={`w-full border rounded px-2 py-1 text-xs ${qty > 0 && (data[d.key] === "" || data[d.key] === null || data[d.key] === undefined) ? "border-amber-400 bg-amber-50 ring-1 ring-amber-300" : "border-slate-300 bg-sky-50"}`} />
                </div>
              ))}
            </div>
          </div>

          <div className="mb-3">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Materials</div>
            <div className="grid grid-cols-3 gap-2">
              {def.selects.map(sel => {
                const list = pricing[sel.opts] || [];
                return (
                  <div key={sel.key}>
                    <label className="text-[10px] text-slate-500 block">{sel.label}</label>
                    <select value={data[sel.key] ?? ""} onChange={e => upd(sel.key, e.target.value === "" ? null : Number(e.target.value))}
                      className={`w-full border rounded px-1 py-1 text-xs ${data[sel.key] === null || data[sel.key] === undefined ? "border-amber-400 bg-amber-50 ring-1 ring-amber-300" : "border-slate-300 bg-sky-50"}`}>
                      {(data[sel.key] === null || data[sel.key] === undefined) && <option value="">-- Select --</option>}
                      {list.map((o, i) => <option key={i} value={i}>{o.label}{o.price > 0 ? ` ($${o.price.toFixed(2)})` : ""}</option>)}
                    </select>
                  </div>
                );
              })}
            </div>
          </div>

          {def.toggles.map(group => (
            <div key={group.section} className="mb-2">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">{group.section}</div>
              <div className="grid grid-cols-4 gap-x-4 gap-y-0">
                {group.items.map(t => (
                  <Toggle key={t.key} label={t.label} value={data[t.key]} onChange={v => upd(t.key, v)} />
                ))}
              </div>
            </div>
          ))}

          {def.extras && def.extras.length > 0 && (
            <div className="mt-2">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Additional</div>
              <div className="grid grid-cols-5 gap-2">
                {def.extras.map(e => (
                  <div key={e.key}>
                    <label className="text-[10px] text-slate-500 block">{e.label}</label>
                    <input type="number" value={data[e.key]} placeholder="0"
                      onChange={ev => upd(e.key, ev.target.value === "" ? "" : Number(ev.target.value))}
                      className="w-full border border-slate-300 rounded px-2 py-1 text-xs bg-sky-50" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {hasData && calc.lineItems.length > 0 && (
            <div className="mt-3 border-t border-slate-100 pt-2">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Cost Breakdown (per unit)</div>
              <div className="max-h-48 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead><tr className="text-slate-400 text-[10px]">
                    <th className="text-left py-0.5">Item</th><th className="text-right">Qty</th><th className="text-right">Unit</th><th className="text-right">$/Unit</th><th className="text-right">Cost</th>
                  </tr></thead>
                  <tbody>
                    {calc.lineItems.map((li, i) => (
                      <tr key={i} className={li.cost < 0 ? "text-red-600" : "text-slate-700"}>
                        <td className="py-0.5">{li.name}</td>
                        <td className="text-right font-mono">{li.qty.toFixed(1)}</td>
                        <td className="text-right text-slate-400">{li.unit}</td>
                        <td className="text-right font-mono">{fmtDec(li.unitPrice)}</td>
                        <td className="text-right font-mono font-medium">{fmtDec(li.cost)}</td>
                      </tr>
                    ))}
                    <tr className="border-t border-slate-200 font-bold text-slate-800">
                      <td className="pt-1">Subtotal</td><td></td><td></td><td></td>
                      <td className="text-right font-mono pt-1">{fmtDec(calc.material)}</td>
                    </tr>
                    <tr className="text-slate-500">
                      <td>Waste (5%)</td><td></td><td></td><td></td>
                      <td className="text-right font-mono">{fmtDec(calc.waste)}</td>
                    </tr>
                    <tr className="text-slate-500">
                      <td>Labor</td><td></td><td></td><td></td>
                      <td className="text-right font-mono">{fmtDec(labor)}</td>
                    </tr>
                    <tr className="border-t border-slate-300 font-bold text-blue-700">
                      <td className="pt-1">Total ({qty} units)</td><td></td><td></td><td></td>
                      <td className="text-right font-mono pt-1">{fmt(total)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// SMALL INPUT COMPONENT
// ═══════════════════════════════════════════════════════════════
function In({ label, value, onChange, type = "text", className = "" }) {
  return (
    <div className={className}>
      <label className="text-[10px] font-medium text-slate-500 uppercase tracking-wide block">{label}</label>
      <input type={type} value={value}
        onChange={e => onChange(type === "number" ? (e.target.value === "" ? "" : Number(e.target.value)) : e.target.value)}
        className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm bg-sky-50 focus:ring-2 focus:ring-blue-400 focus:outline-none" />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// QUOTE OUTPUT TAB
// ═══════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════
// REVIEW SUMMARY — full estimate review before generating quote
// ═══════════════════════════════════════════════════════════════
function ReviewSummary({ comps, pricing, laborSettings, calc, proj, misc, margin, validation, onGoToComponent, onProceedToQuote, onOverrideToQuote }) {
  const miscTotal = Object.values(misc).reduce((s, v) => s + (Number(v) || 0), 0);
  const hasIssues = !validation.isValid;
  const [reviewerName, setReviewerName] = useState("");
  const [reviewLog, setReviewLog] = useState(() => {
    try { return JSON.parse(localStorage.getItem("gst-review-log") || "[]"); } catch { return []; }
  });

  const handleReview = () => {
    if (!reviewerName.trim()) { alert("Please enter your name before reviewing."); return; }
    const entry = { name: reviewerName.trim(), date: new Date().toISOString(), project: proj.name || "Untitled" };
    const updated = [entry, ...reviewLog].slice(0, 50);
    setReviewLog(updated);
    localStorage.setItem("gst-review-log", JSON.stringify(updated));
    onProceedToQuote();
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 max-w-5xl mx-auto space-y-4">
      {/* Validation warning */}
      {hasIssues && (
        <div className="bg-amber-50 border-2 border-amber-300 rounded-lg p-4 flex items-center gap-3">
          <div className="w-8 h-8 bg-amber-400 rounded-full flex items-center justify-center text-white text-sm font-bold">!</div>
          <div>
            <span className="font-bold text-amber-800 text-sm">{validation.totalIssues} issue{validation.totalIssues !== 1 ? "s" : ""} found</span>
            <p className="text-xs text-amber-600">Some fields are incomplete. Fix them for an accurate quote.</p>
          </div>
        </div>
      )}

      {/* Project info */}
      <div className="bg-white border border-purple-200 rounded-lg p-4">
        <div className="text-xs font-bold text-purple-700 uppercase tracking-wider mb-2">Project Information</div>
        <div className="grid grid-cols-3 gap-3 text-sm">
          {[["Project", proj.name], ["Location", proj.location], ["Date", proj.date], ["Salesperson", proj.salesperson], ["Proposal #", proj.proposal], ["Sales Director", proj.salesDir]].map(([l, v]) => (
            <div key={l}><span className="text-slate-400 text-xs">{l}:</span> <span className="font-medium text-slate-800">{v || "—"}</span></div>
          ))}
        </div>
      </div>

      {/* Components — column layout, only show selected items */}
      {COMP_KEYS.map(compKey => {
        const def = COMP[compKey];
        const types = comps[compKey];
        const activeTypes = types.map((td, i) => ({ td, i })).filter(({ td }) => (Number(td.qty) || 0) > 0);
        if (activeTypes.length === 0) return null;
        const compCalc = calc.byComp[compKey];
        const issuesForComp = Object.keys(validation.allIssues).filter(k => k.startsWith(compKey + "-"));

        return (
          <div key={compKey} className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 bg-purple-600 text-white rounded flex items-center justify-center text-[10px] font-bold">{def.icon}</span>
                <span className="font-bold text-sm text-slate-800">{def.label}</span>
                {issuesForComp.length > 0 && (
                  <span className="text-[10px] bg-amber-100 text-amber-700 border border-amber-300 rounded px-1.5 py-0.5 font-medium">
                    {issuesForComp.reduce((s, k) => s + validation.allIssues[k].issues.length, 0)} issues
                  </span>
                )}
              </div>
              <span className="text-sm font-mono font-bold text-purple-700">{fmt(compCalc.total)}</span>
            </div>

            {/* Column headers */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200 text-[10px] text-slate-500 uppercase tracking-wider">
                    <th className="text-left px-3 py-1.5 w-48">Selection</th>
                    {activeTypes.map(({ i }) => (
                      <th key={i} className="text-center px-2 py-1.5 min-w-[140px]">
                        Type {TYPE_LABELS[i]}{types[i].label ? ` — ${types[i].label}` : ""}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {/* Qty row */}
                  <tr className="border-b border-slate-100 bg-blue-50">
                    <td className="px-3 py-1 font-bold text-blue-700">Quantity</td>
                    {activeTypes.map(({ td, i }) => (
                      <td key={i} className="text-center px-2 py-1 font-mono font-bold text-blue-700">{td.qty}</td>
                    ))}
                  </tr>
                  {/* SF row */}
                  <tr className="border-b border-slate-100 bg-blue-50">
                    <td className="px-3 py-1 font-bold text-blue-700">Square Footage</td>
                    {activeTypes.map(({ td, i }) => {
                      const tc = calcComponentType(compKey, td, pricing);
                      return <td key={i} className="text-center px-2 py-1 font-mono font-bold text-blue-700">{tc.sf.toLocaleString()} SF</td>;
                    })}
                  </tr>
                  {/* Dimension rows */}
                  {def.dims.map(d => (
                    <tr key={d.key} className="border-b border-slate-50">
                      <td className="px-3 py-1 text-slate-600">{d.label}</td>
                      {activeTypes.map(({ td, i }) => {
                        const v = td[d.key];
                        const missing = v === "" || v == null;
                        return <td key={i} className={`text-center px-2 py-1 font-mono ${missing ? "text-amber-600 font-bold" : "text-slate-700"}`}>{missing ? "—" : `${v} ${d.unit}`}</td>;
                      })}
                    </tr>
                  ))}
                  {/* Only show selected toggles + their material */}
                  {def.toggles.map(g => g.items.map(t => {
                    // Check if any active type has this toggle ON or has a related material selected
                    const anySelected = activeTypes.some(({ td }) => td[t.key] === true);
                    const anyUnset = activeTypes.some(({ td }) => td[t.key] === null || td[t.key] === undefined);
                    if (!anySelected && !anyUnset) return null; // all set to No — skip
                    // Find the related material select for this toggle
                    const relatedSelect = def.selects.find(s => {
                      const toggles = getRelatedToggles(s.key);
                      return toggles.includes(t.key);
                    });
                    return (
                      <tr key={t.key} className="border-b border-slate-50">
                        <td className="px-3 py-1 text-slate-600">{g.section}: {t.label}</td>
                        {activeTypes.map(({ td, i }) => {
                          const v = td[t.key];
                          const isUnset = v === null || v === undefined;
                          if (isUnset) return <td key={i} className="text-center px-2 py-1 text-amber-600 font-bold">?</td>;
                          if (!v) return <td key={i} className="text-center px-2 py-1 text-slate-300">—</td>;
                          // Show the material name if toggle is ON and material is selected
                          const matVal = relatedSelect ? td[relatedSelect.key] : null;
                          const matName = relatedSelect && matVal != null ? (pricing[relatedSelect.opts]?.[matVal]?.label || "") : "";
                          return <td key={i} className="text-center px-2 py-1 text-green-700 font-medium">{matName || "Yes"}</td>;
                        })}
                      </tr>
                    );
                  }))}
                  {/* Show selects that don't map to a toggle (standalone materials) */}
                  {def.selects.filter(sel => {
                    const toggles = getRelatedToggles(sel.key);
                    return toggles.length === 0;
                  }).map(sel => {
                    const anySet = activeTypes.some(({ td }) => td[sel.key] != null);
                    if (!anySet) return null;
                    return (
                      <tr key={sel.key} className="border-b border-slate-50">
                        <td className="px-3 py-1 text-slate-600">{sel.label}</td>
                        {activeTypes.map(({ td, i }) => {
                          const v = td[sel.key];
                          if (v == null) return <td key={i} className="text-center px-2 py-1 text-amber-600 font-bold">?</td>;
                          return <td key={i} className="text-center px-2 py-1 text-slate-700 font-medium">{pricing[sel.opts]?.[v]?.label || `#${v}`}</td>;
                        })}
                      </tr>
                    );
                  })}
                  {/* Extras */}
                  {(def.extras || []).map(e => {
                    const anyVal = activeTypes.some(({ td }) => Number(td[e.key]) > 0);
                    if (!anyVal) return null;
                    return (
                      <tr key={e.key} className="border-b border-slate-50">
                        <td className="px-3 py-1 text-slate-600">{e.label}</td>
                        {activeTypes.map(({ td, i }) => (
                          <td key={i} className="text-center px-2 py-1 font-mono text-slate-700">{td[e.key] || 0}</td>
                        ))}
                      </tr>
                    );
                  })}
                  {/* Cost row */}
                  <tr className="border-t border-slate-200 bg-slate-50 font-bold">
                    <td className="px-3 py-1.5 text-slate-700">Total Cost</td>
                    {activeTypes.map(({ td, i }) => {
                      const tc = calcComponentType(compKey, td, pricing);
                      const tl = calcComponentLabor(compKey, td, laborSettings);
                      return <td key={i} className="text-center px-2 py-1.5 font-mono text-purple-700">{fmt(tc.material + tc.waste + tl)}</td>;
                    })}
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Fix issues buttons */}
            {issuesForComp.length > 0 && (
              <div className="px-4 py-2 bg-amber-50 border-t border-amber-200 flex gap-2">
                {issuesForComp.map(k => {
                  const entry = validation.allIssues[k];
                  return (
                    <button key={k} onClick={() => onGoToComponent(entry.compKey, entry.typeIdx)}
                      className="text-[10px] bg-amber-500 hover:bg-amber-600 text-white px-2 py-0.5 rounded font-medium">
                      Fix Type {TYPE_LABELS[entry.typeIdx]} ({entry.issues.length})
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {/* Financial summary */}
      <div className="bg-white border border-purple-200 rounded-lg p-4">
        <div className="text-xs font-bold text-purple-700 uppercase tracking-wider mb-3">Financial Summary</div>
        <div className="space-y-1.5 text-sm max-w-md">
          <div className="flex justify-between"><span className="text-slate-500">Materials</span><span className="font-mono font-medium">{fmt(calc.totalMat)}</span></div>
          <div className="flex justify-between"><span className="text-slate-500">Labor</span><span className="font-mono font-medium">{fmt(calc.totalLab)}</span></div>
          <div className="flex justify-between"><span className="text-slate-500">Overhead</span><span className="font-mono font-medium">{fmt(calc.overhead)}</span></div>
          <div className="flex justify-between"><span className="text-slate-500">Misc</span><span className="font-mono font-medium">{fmt(miscTotal)}</span></div>
          <div className="flex justify-between border-t border-slate-200 pt-1.5"><span className="text-slate-500">Subtotal</span><span className="font-mono font-medium">{fmt(calc.subtotal)}</span></div>
          <div className="flex justify-between"><span className="text-slate-500">Margin</span><span className="font-mono font-medium">{margin}%</span></div>
          <div className="flex justify-between border-t border-purple-200 pt-1.5 text-base">
            <span className="font-bold text-purple-800">Contract Value</span>
            <span className="font-mono font-bold text-purple-700">{fmt(calc.contractValue)}</span>
          </div>
          <div className="flex justify-between text-xs"><span className="text-slate-400">Gross Profit</span><span className="font-mono text-slate-500">{fmt(calc.grossProfit)}</span></div>
          {calc.costPerSF > 0 && (
            <div className="flex justify-between text-xs"><span className="text-slate-400">Cost per SF</span><span className="font-mono text-slate-500">{fmtDec(calc.costPerSF)}/SF</span></div>
          )}
        </div>
      </div>

      {/* Reviewer sign-off */}
      <div className="bg-white border border-purple-200 rounded-lg p-4">
        <div className="text-xs font-bold text-purple-700 uppercase tracking-wider mb-3">Review Sign-Off</div>
        <div className="flex items-end gap-3">
          <div className="flex-1 max-w-xs">
            <label className="text-[10px] font-medium text-slate-500 uppercase tracking-wide block mb-1">Reviewed By</label>
            <input type="text" value={reviewerName} onChange={e => setReviewerName(e.target.value)} placeholder="Enter your name"
              className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm bg-sky-50 focus:ring-2 focus:ring-purple-400 focus:outline-none" />
          </div>
          {hasIssues ? (
            <>
              <button disabled className="px-5 py-2 rounded text-sm font-medium bg-slate-300 text-slate-500 cursor-not-allowed">
                Approve & Generate Quote
              </button>
              <button onClick={onOverrideToQuote} className="px-4 py-2 text-xs text-slate-500 hover:text-slate-700 border border-slate-300 rounded">
                Generate Anyway (incomplete)
              </button>
            </>
          ) : (
            <button onClick={handleReview}
              className="px-5 py-2 rounded text-sm font-bold bg-purple-600 hover:bg-purple-700 text-white shadow">
              Approve & Generate Quote
            </button>
          )}
        </div>
        {/* Review history */}
        {reviewLog.length > 0 && (
          <div className="mt-3 border-t border-slate-100 pt-2">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Review History</div>
            <div className="space-y-0.5 max-h-24 overflow-y-auto">
              {reviewLog.filter(r => r.project === (proj.name || "Untitled")).slice(0, 10).map((r, i) => (
                <div key={i} className="text-[10px] text-slate-500 flex gap-2">
                  <span className="font-medium text-slate-700">{r.name}</span>
                  <span>—</span>
                  <span>{new Date(r.date).toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// REVIEW GATE — validates all components before allowing quote
// ═══════════════════════════════════════════════════════════════
function ReviewGate({ validation, comps, onGoToComponent, onOverride }) {
  const { allIssues, totalIssues } = validation;
  const issueKeys = Object.keys(allIssues);

  return (
    <div className="flex-1 overflow-y-auto p-6 max-w-4xl mx-auto">
      <div className="bg-amber-50 border-2 border-amber-300 rounded-lg p-6 mb-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 bg-amber-400 rounded-full flex items-center justify-center text-white text-xl font-bold">!</div>
          <div>
            <h2 className="text-lg font-bold text-amber-800">Review Required</h2>
            <p className="text-sm text-amber-700">{totalIssues} item{totalIssues !== 1 ? "s" : ""} need attention before generating a quote.</p>
          </div>
        </div>
        <p className="text-xs text-amber-600">Every dimension must be filled, every toggle must be set to Yes or No, and every material dropdown must have a selection. Items highlighted below need your input.</p>
      </div>

      {issueKeys.map(key => {
        const entry = allIssues[key];
        const dimIssues = entry.issues.filter(i => i.type === "dim");
        const toggleIssues = entry.issues.filter(i => i.type === "toggle");
        const selectIssues = entry.issues.filter(i => i.type === "select");

        return (
          <div key={key} className="bg-white border border-red-200 rounded-lg mb-4 overflow-hidden">
            <div className="bg-red-50 px-4 py-2 flex justify-between items-center border-b border-red-200">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 bg-red-500 text-white rounded flex items-center justify-center text-xs font-bold">
                  {entry.issues.length}
                </span>
                <span className="font-bold text-sm text-red-800">{entry.label}</span>
              </div>
              <button onClick={() => onGoToComponent(entry.compKey, entry.typeIdx)}
                className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded">
                Go to Component
              </button>
            </div>
            <div className="p-4">
              {dimIssues.length > 0 && (
                <div className="mb-3">
                  <div className="text-[10px] font-bold text-red-400 uppercase tracking-wider mb-1">Missing Dimensions</div>
                  <div className="flex flex-wrap gap-2">
                    {dimIssues.map(issue => (
                      <span key={issue.field} className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 border border-amber-300 rounded px-2 py-1 text-xs">
                        <span className="font-medium">{issue.label}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {toggleIssues.length > 0 && (
                <div className="mb-3">
                  <div className="text-[10px] font-bold text-red-400 uppercase tracking-wider mb-1">Unset Toggles (must choose Yes or No)</div>
                  <div className="flex flex-wrap gap-2">
                    {toggleIssues.map(issue => (
                      <span key={issue.field} className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 border border-amber-300 rounded px-2 py-1 text-xs">
                        <span className="text-amber-500 font-bold">?</span>
                        <span className="font-medium">{issue.label}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {selectIssues.length > 0 && (
                <div>
                  <div className="text-[10px] font-bold text-red-400 uppercase tracking-wider mb-1">Unset Material Selections</div>
                  <div className="flex flex-wrap gap-2">
                    {selectIssues.map(issue => (
                      <span key={issue.field} className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 border border-amber-300 rounded px-2 py-1 text-xs">
                        <span className="font-medium">{issue.label}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })}

      <div className="flex gap-3 mt-6">
        <button onClick={onOverride}
          className="px-4 py-2 text-xs text-slate-500 hover:text-slate-700 border border-slate-300 rounded">
          Generate Quote Anyway (incomplete)
        </button>
      </div>
    </div>
  );
}

function QuoteOutput({ calc, proj, comps, pricing, misc, margin }) {
  const [view, setView] = useState("quote"); // "quote" | "internal"
  const [quoteNotes, setQuoteNotes] = useState("");
  const [attachments, setAttachments] = useState([]); // { name, size, type, url }
  const miscTotal = Object.values(misc).reduce((s, v) => s + (Number(v) || 0), 0);

  const NOTE_TEMPLATES = [
    "Price valid for 30 days from date of proposal.",
    "Lead time: 8-10 weeks from receipt of deposit and approved drawings.",
    "Subject to final engineering review and approval.",
    "Panels shipped in component form for field assembly by others.",
    "All panels fabricated with galvanized structural steel per applicable building codes.",
    "Delivery schedule to be coordinated upon receipt of signed Purchase Agreement.",
    "Pricing based on current material costs; subject to adjustment for material escalation.",
    "Guardian to provide on-site consultation during initial panel installation.",
    "Client responsible for unloading panels at job site.",
    "Structural sheathing at panel connections by others.",
  ];

  const addNote = (text) => {
    setQuoteNotes(prev => prev ? prev + "\n" + text : text);
  };

  const handleFileAttach = (e) => {
    const files = Array.from(e.target.files || []);
    const newAttachments = files.map(f => ({
      name: f.name,
      size: (f.size / 1024).toFixed(1) + " KB",
      type: f.type,
      url: URL.createObjectURL(f),
    }));
    setAttachments(prev => [...prev, ...newAttachments]);
    e.target.value = "";
  };

  const removeAttachment = (idx) => {
    setAttachments(prev => {
      const next = [...prev];
      URL.revokeObjectURL(next[idx].url);
      next.splice(idx, 1);
      return next;
    });
  };
  const quoteId = proj.proposal || `GST-${(proj.date || new Date().toISOString().slice(0, 10)).replace(/-/g, "")}`;
  const deposit = calc.contractValue * 0.15;
  const commence = calc.contractValue * 0.50;
  const shipment = calc.contractValue * 0.35;

  const QS = {
    navy: "#1C211B", navyMid: "#2A302A",
    accent: "#06A451", accentLt: "#33C47A",
    rule: "#D0D8E0", bg: "#F4F6F8", white: "#FFFFFF",
    text: "#1C2B3A", muted: "#6B7F8F",
    fontHead: "'Barlow Semi Condensed', 'Segoe UI', system-ui, sans-serif",
    fontBody: "'Barlow', 'Segoe UI', system-ui, sans-serif",
  };

  const fmtCur = (v) => {
    const n = Number(v) || 0;
    return "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  /* Collect panel line items grouped by component */
  const panelRows = [];
  COMP_KEYS.forEach(k => {
    const types = comps[k];
    const compRows = [];
    TYPE_LABELS.forEach((lbl, i) => {
      const td = types[i];
      const qty = Number(td.qty) || 0;
      if (qty === 0) return;
      const r = calcComponentType(k, td, pricing);
      const specs = [];
      if (COMP[k].dims) COMP[k].dims.forEach(d => { if (td[d.key]) specs.push(`${d.label}: ${td[d.key]} ${d.unit}`); });
      if (td.epsDensity && pricing.EPS?.[td.epsDensity]) specs.push(`EPS: ${pricing.EPS[td.epsDensity].label}`);
      if (td.insideStuds && td.insideStudType && pricing.TUBING?.[td.insideStudType]) specs.push(`Inside Stud: ${pricing.TUBING[td.insideStudType].label}`);
      compRows.push({ label: td.label || `${COMP[k].label} ${lbl}`, compLabel: COMP[k].label, qty, specs, sf: r.sf, key: `${k}-${i}` });
    });
    if (compRows.length > 0) panelRows.push({ compKey: k, compLabel: COMP[k].label, rows: compRows });
  });

  const sectionHead = (text) => ({
    fontFamily: QS.fontHead, fontSize: 13, fontWeight: 700, letterSpacing: 1.5,
    textTransform: "uppercase", color: QS.accent, marginBottom: 10, paddingBottom: 6,
    borderBottom: `2px solid ${QS.accent}`,
  });

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: 24, fontFamily: QS.fontBody, color: QS.text }}>
      <style>{`@media print { .no-print { display: none !important; } body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }`}</style>

      {/* Toggle / Action Buttons */}
      <div className="no-print" style={{ display: "flex", gap: 10, marginBottom: 20 }}>
        <button
          onClick={() => setView("quote")}
          style={{ padding: "8px 18px", fontSize: 13, fontWeight: 600, borderRadius: 4, border: "none", cursor: "pointer",
            background: view === "quote" ? QS.accent : "#E2E8F0", color: view === "quote" ? "#fff" : "#475569" }}
        >Customer Quote</button>
        <button
          onClick={() => setView("internal")}
          style={{ padding: "8px 18px", fontSize: 13, fontWeight: 600, borderRadius: 4, border: "none", cursor: "pointer",
            background: view === "internal" ? "#2563EB" : "#E2E8F0", color: view === "internal" ? "#fff" : "#475569" }}
        >Internal View</button>
        {view === "quote" && (
          <button onClick={() => window.print()} className="no-print"
            style={{ marginLeft: "auto", padding: "8px 18px", fontSize: 13, fontWeight: 600, borderRadius: 4, border: "none", cursor: "pointer",
              background: QS.navy, color: "#fff" }}
          >Print Quote</button>
        )}
      </div>

      {/* ============ CUSTOMER QUOTE VIEW ============ */}
      {view === "quote" && (
        <div style={{ background: QS.white, borderRadius: 6, overflow: "hidden", boxShadow: "0 2px 12px rgba(0,0,0,0.08)" }}>

          {/* ── Dark Navy Header ── */}
          <div style={{ background: QS.navy, padding: "28px 40px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <img src={GST_LOGO} alt="GST" style={{ width: 60, height: 60, borderRadius: 6 }} />
              <div>
                <div style={{ fontFamily: QS.fontHead, fontSize: 20, fontWeight: 700, color: QS.white, letterSpacing: 1 }}>Guardian Structural Technologies LLC</div>
                <div style={{ fontFamily: QS.fontHead, fontSize: 13, color: QS.accentLt, fontWeight: 600, letterSpacing: 2, textTransform: "uppercase", marginTop: 2 }}>SHIELD Panel Systems</div>
                <div style={{ fontSize: 12, color: "#A0AEC0", marginTop: 4 }}>4640 Manufacturing Avenue, Cleveland, OH 44135 &nbsp;|&nbsp; (216) 898-5600</div>
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontFamily: QS.fontHead, fontSize: 28, fontWeight: 700, color: QS.white, letterSpacing: 3, textTransform: "uppercase" }}>PROPOSAL</div>
            </div>
          </div>

          {/* ── Green Accent Bar ── */}
          <div style={{ height: 5, background: `linear-gradient(90deg, ${QS.accent}, ${QS.accentLt})` }} />

          {/* ── Meta Strip ── */}
          <div style={{ background: QS.navyMid, padding: "12px 40px", display: "flex", gap: 40 }}>
            {[
              { label: "Proposal No.", value: quoteId },
              { label: "Date", value: proj.date || new Date().toISOString().slice(0, 10) },
              { label: "Status", value: "Draft" },
            ].map((m, i) => (
              <div key={i}>
                <div style={{ fontSize: 10, color: "#8B9DAF", textTransform: "uppercase", letterSpacing: 1, fontWeight: 600 }}>{m.label}</div>
                <div style={{ fontSize: 14, color: QS.white, fontWeight: 600, marginTop: 2 }}>{m.value}</div>
              </div>
            ))}
          </div>

          {/* ── Body Content ── */}
          <div style={{ padding: "32px 40px" }}>

            {/* Two-column info cards */}
            <div style={{ display: "flex", gap: 24, marginBottom: 32 }}>
              {/* Submitted To */}
              <div style={{ flex: 1, background: QS.bg, borderRadius: 6, padding: "20px 24px", border: `1px solid ${QS.rule}` }}>
                <div style={{ fontSize: 10, color: QS.muted, textTransform: "uppercase", letterSpacing: 1.5, fontWeight: 700, marginBottom: 10 }}>Submitted To</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: QS.text, marginBottom: 4 }}>{proj.ownerName || "—"}</div>
                {proj.ownerContact && <div style={{ fontSize: 13, color: QS.muted }}>Attn: {proj.ownerContact}</div>}
                {proj.ownerPhone && <div style={{ fontSize: 13, color: QS.muted }}>{proj.ownerPhone}</div>}
                {proj.ownerEmail && <div style={{ fontSize: 13, color: QS.muted }}>{proj.ownerEmail}</div>}
              </div>
              {/* Project */}
              <div style={{ flex: 1, background: QS.bg, borderRadius: 6, padding: "20px 24px", border: `1px solid ${QS.rule}` }}>
                <div style={{ fontSize: 10, color: QS.muted, textTransform: "uppercase", letterSpacing: 1.5, fontWeight: 700, marginBottom: 10 }}>Project</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: QS.text, marginBottom: 4 }}>{proj.name || "—"}</div>
                <div style={{ fontSize: 13, color: QS.muted }}>{proj.location || "—"}</div>
                {proj.archFirm && <div style={{ fontSize: 13, color: QS.muted, marginTop: 4 }}>Architect: {proj.archFirm}</div>}
              </div>
            </div>

            {/* ── Scope of Work ── */}
            <div style={sectionHead()}>Scope of Work</div>
            <div style={{ fontSize: 12, color: QS.muted, lineHeight: 1.7, marginBottom: 20 }}>
              Guardian Structural Technologies LLC is pleased to provide the following scope of work for the fabrication and delivery of SHIELD™ Panels for the above-referenced project.
            </div>

            {/* 1. Engineering */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: QS.navy, marginBottom: 8 }}>1. Engineering & Design Services</div>
              <ol style={{ paddingLeft: 20, fontSize: 12, color: QS.text, lineHeight: 1.7, margin: 0, listStyleType: "decimal" }}>
                <li style={{ marginBottom: 6 }}>Prepare shop and construction drawings establishing all structural and connection details required for fabrication, regulatory approval, and installation.</li>
                <li style={{ marginBottom: 6 }}>Provide professional engineering coordination with the engineer of record as required.</li>
                <li style={{ marginBottom: 6 }}>Site plans, if required, will be furnished by third parties.</li>
              </ol>
            </div>

            {/* 2. Panel Fabrication */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: QS.navy, marginBottom: 8 }}>2. SHIELD™ Panel Fabrication</div>
              <ol style={{ paddingLeft: 20, fontSize: 12, color: QS.text, lineHeight: 1.7, margin: 0, listStyleType: "decimal" }}>
                <li style={{ marginBottom: 6 }}>Fabricate all wall and roof panels per the approved shop drawings and the specifications described in the Line Items section below.</li>
                <li style={{ marginBottom: 6 }}>All wall panels will be factory assembled into sections up to 8 feet wide.</li>
                <li style={{ marginBottom: 6 }}>Engineered headers will be factory installed at all door and window openings per the preliminary plans.</li>
                <li style={{ marginBottom: 6 }}>All panels will be fabricated with galvanized structural steel tubes embedded in EPS foam.</li>
              </ol>
            </div>

            {/* ── Line Items Table ── */}
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, marginBottom: 24 }}>
              <thead>
                <tr style={{ background: QS.navy }}>
                  {["Description", "Qty", "SF"].map((h, i) => (
                    <th key={i} style={{ color: QS.white, fontFamily: QS.fontHead, fontWeight: 600, fontSize: 11, letterSpacing: 1,
                      textTransform: "uppercase", padding: "10px 12px", textAlign: i === 0 ? "left" : "right",
                      borderBottom: `2px solid ${QS.accent}` }}>{h}</th>
                  ))}
                </tr>
              </thead>
                {panelRows.map((group, gi) => (
                  <tbody key={gi}>
                    {/* Category row */}
                    <tr>
                      <td colSpan={3} style={{ padding: "10px 12px 4px", fontWeight: 700, fontSize: 12, color: QS.accent,
                        borderBottom: `1px solid ${QS.rule}`, background: "#F8FAF8" }}>
                        {group.compLabel}
                      </td>
                    </tr>
                    {group.rows.map(row => (
                      <tr key={row.key} style={{ borderBottom: `1px solid ${QS.rule}` }}>
                        <td style={{ padding: "8px 12px 8px 24px" }}>
                          <div style={{ fontWeight: 600, color: QS.text }}>{row.label}</div>
                          {row.specs.length > 0 && (
                            <div style={{ fontSize: 11, color: QS.muted, marginTop: 2 }}>{row.specs.join("  |  ")}</div>
                          )}
                        </td>
                        <td style={{ padding: "8px 12px", textAlign: "right", fontWeight: 600 }}>{row.qty}</td>
                        <td style={{ padding: "8px 12px", textAlign: "right", fontWeight: 600, fontFamily: "monospace" }}>{row.sf.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                ))}
                <tbody>
                  <tr style={{ borderTop: `2px solid ${QS.navy}` }}>
                    <td style={{ padding: "10px 12px", fontWeight: 700 }}>Total Square Footage</td>
                    <td style={{ padding: "10px 12px", textAlign: "right" }}></td>
                    <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 700, fontFamily: "monospace", fontSize: 13 }}>{calc.totalSF.toLocaleString()}</td>
                  </tr>
                </tbody>
            </table>

            {/* 3. Metal Accessories */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: QS.navy, marginBottom: 8 }}>3. Metal Accessories</div>
              <ul style={{ paddingLeft: 20, fontSize: 12, color: QS.text, lineHeight: 1.7, margin: 0, listStyleType: "disc" }}>
                <li style={{ marginBottom: 6 }}>Top and bottom angle or track as required.</li>
                <li style={{ marginBottom: 6 }}>Outside and inside wall corners.</li>
                <li style={{ marginBottom: 6 }}>Strapping for connection of intersecting interior partitions.</li>
                <li style={{ marginBottom: 6 }}>Three 20-pound cans of sealing spray foam.</li>
                <li style={{ marginBottom: 6 }}>All fasteners and assembly accessories.</li>
              </ul>
            </div>

            {/* 4. Additional Services */}
            <div style={{ marginBottom: 32 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: QS.navy, marginBottom: 8 }}>4. Additional Services</div>
              <ul style={{ paddingLeft: 20, fontSize: 12, color: QS.text, lineHeight: 1.7, margin: 0, listStyleType: "disc" }}>
                <li style={{ marginBottom: 6 }}>On-site panel installation consultation as required.</li>
                <li style={{ marginBottom: 6 }}>Delivery of all panels to the client's construction site.</li>
              </ul>
            </div>

            {/* ── Totals Block ── */}
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 32 }}>
              <div style={{ width: 320, background: QS.bg, borderRadius: 6, border: `1px solid ${QS.rule}`, overflow: "hidden" }}>
                <div style={{ background: QS.navy, padding: "14px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ color: QS.white, fontFamily: QS.fontHead, fontWeight: 700, fontSize: 14, letterSpacing: 1, textTransform: "uppercase" }}>Total Contract Value</span>
                  <span style={{ color: QS.accentLt, fontFamily: "monospace", fontWeight: 700, fontSize: 20 }}>{fmtCur(calc.contractValue)}</span>
                </div>
              </div>
            </div>

            {/* ── Payment Schedule ── */}
            <div style={sectionHead()}>Payment Schedule</div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, marginBottom: 12 }}>
              <thead>
                <tr style={{ background: QS.bg }}>
                  {["Milestone", "%", "Amount"].map((h, i) => (
                    <th key={i} style={{ padding: "8px 12px", textAlign: i === 0 ? "left" : "right", fontSize: 11, fontWeight: 700,
                      color: QS.muted, textTransform: "uppercase", letterSpacing: 1, borderBottom: `1px solid ${QS.rule}` }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  { milestone: "Upon execution of contract", pct: 15, amt: deposit },
                  { milestone: "Upon notice to commence manufacturing", pct: 50, amt: commence },
                  { milestone: "Prior to shipment", pct: 35, amt: shipment },
                ].map((r, i) => (
                  <tr key={i} style={{ borderBottom: `1px solid ${QS.rule}` }}>
                    <td style={{ padding: "10px 12px", fontWeight: 500 }}>{r.milestone}</td>
                    <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 700, color: QS.accent }}>{r.pct}%</td>
                    <td style={{ padding: "10px 12px", textAlign: "right", fontFamily: "monospace", fontWeight: 600 }}>{fmtCur(r.amt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Progress bar */}
            <div style={{ display: "flex", height: 8, borderRadius: 4, overflow: "hidden", marginBottom: 32 }}>
              <div style={{ width: "15%", background: QS.accent }} />
              <div style={{ width: "50%", background: QS.accentLt }} />
              <div style={{ width: "35%", background: "#A8E6C3" }} />
            </div>

            {/* ── Exclusions ── */}
            <div style={sectionHead()}>Exclusions</div>
            <div style={{ fontSize: 12, color: QS.text, lineHeight: 1.8, paddingLeft: 0, marginBottom: 32 }}>
              {[
                "Common wall materials between the front and rear sections of the structure.",
                "Beams, trusses, columns, and structural sheathing for roof truss ends and sides.",
                "Second top plate \u2014 to be supplied and installed by others.",
                "Window and door units \u2014 openings will be factory installed; units furnished by others.",
                "Field assembly labor \u2014 panels shipped in component form for assembly by others.",
                "Foundations \u2014 to be prepared by others.",
                "All other building materials not explicitly listed in this proposal.",
              ].map((item, i) => <div key={i} style={{ paddingLeft: 20, position: "relative" }}><span style={{ position: "absolute", left: 0, color: QS.muted }}>{"\u2014"}</span> {item}</div>)}
            </div>

            {/* ── Terms & Conditions ── */}
            <div style={sectionHead()}>Terms &amp; Conditions</div>
            <div style={{ fontSize: 12, color: QS.text, lineHeight: 1.75, marginBottom: 32 }}>
              <p style={{ marginBottom: 8 }}>This proposal is subject to execution of a mutually agreeable Purchase Agreement based on final drawings and specifications.</p>
              <p style={{ marginBottom: 8 }}>Client to supply final architectural working plans and specifications prior to the commencement of fabrication. Pricing is based on current specifications provided by the client and is subject to revision upon receipt of final plans.</p>
              <p><strong>Client prerequisites prior to commencement:</strong> (a) Executed Purchase Agreement; (b) Guardian documents completed as requested; (c) Credit Application, if requested by Guardian; (d) Payments per the schedule above.</p>
            </div>

            {/* ── Notes ── */}
            <div style={sectionHead()}>Notes</div>
            <div className="no-print" style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: QS.muted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Quick Insert</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
                {NOTE_TEMPLATES.map((t, i) => (
                  <button key={i} onClick={() => addNote(t)}
                    style={{ padding: "4px 10px", fontSize: 11, background: QS.bg, border: `1px solid ${QS.rule}`, borderRadius: 4,
                      color: QS.text, cursor: "pointer", lineHeight: 1.4, textAlign: "left", maxWidth: 300 }}>
                    {t.slice(0, 60)}{t.length > 60 ? "..." : ""}
                  </button>
                ))}
              </div>
              <textarea value={quoteNotes} onChange={e => setQuoteNotes(e.target.value)}
                placeholder="Add notes to this proposal..."
                style={{ width: "100%", minHeight: 80, padding: "10px 12px", fontSize: 12, fontFamily: "inherit",
                  border: `1px solid ${QS.rule}`, borderRadius: 4, color: QS.text, lineHeight: 1.6, resize: "vertical", outline: "none" }} />
            </div>
            {quoteNotes && (
              <div style={{ fontSize: 12, color: QS.text, lineHeight: 1.75, marginBottom: 32, whiteSpace: "pre-wrap" }}>
                {quoteNotes}
              </div>
            )}

            {/* ── Attachments ── */}
            <div style={sectionHead()}>Attachments</div>
            <div className="no-print" style={{ marginBottom: 12 }}>
              <label style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 16px", fontSize: 12, fontWeight: 600,
                background: QS.bg, border: `1px solid ${QS.rule}`, borderRadius: 4, cursor: "pointer", color: QS.text }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/></svg>
                Attach Drawings / Documents
                <input type="file" multiple accept=".pdf,.dwg,.dxf,.png,.jpg,.jpeg,.tif,.tiff" style={{ display: "none" }} onChange={handleFileAttach} />
              </label>
              <span style={{ fontSize: 11, color: QS.muted, marginLeft: 12 }}>PDF, DWG, DXF, Images</span>
            </div>
            {attachments.length > 0 && (
              <div style={{ marginBottom: 32 }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: QS.bg }}>
                      <th style={{ padding: "8px 12px", textAlign: "left", fontSize: 10, fontWeight: 700, color: QS.muted, textTransform: "uppercase", letterSpacing: 1, borderBottom: `1px solid ${QS.rule}` }}>File</th>
                      <th style={{ padding: "8px 12px", textAlign: "right", fontSize: 10, fontWeight: 700, color: QS.muted, textTransform: "uppercase", letterSpacing: 1, borderBottom: `1px solid ${QS.rule}` }}>Size</th>
                      <th className="no-print" style={{ padding: "8px 12px", width: 40, borderBottom: `1px solid ${QS.rule}` }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {attachments.map((a, i) => (
                      <tr key={i} style={{ borderBottom: `1px solid ${QS.rule}` }}>
                        <td style={{ padding: "8px 12px" }}>
                          <a href={a.url} target="_blank" rel="noopener noreferrer" style={{ color: QS.accent, textDecoration: "none", fontWeight: 500 }}>
                            {a.name}
                          </a>
                        </td>
                        <td style={{ padding: "8px 12px", textAlign: "right", color: QS.muted }}>{a.size}</td>
                        <td className="no-print" style={{ padding: "8px 12px", textAlign: "center" }}>
                          <button onClick={() => removeAttachment(i)} style={{ background: "none", border: "none", color: "#EF4444", cursor: "pointer", fontSize: 14 }}>✕</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {attachments.length === 0 && (
              <div style={{ fontSize: 12, color: QS.muted, fontStyle: "italic", marginBottom: 32 }}>No attachments.</div>
            )}

            {/* ── Acceptance / Signature Blocks ── */}
            <div style={sectionHead()}>Acceptance</div>
            <div style={{ display: "flex", gap: 40, marginBottom: 32 }}>
              {/* Guardian side */}
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: QS.navy, textTransform: "uppercase", letterSpacing: 1.5, paddingBottom: 8, borderBottom: `2px solid ${QS.navy}`, marginBottom: 20 }}>Guardian Structural Technologies LLC</div>
                <div style={{ borderBottom: `1px solid ${QS.rule}`, marginBottom: 4, paddingBottom: 28 }} />
                <div style={{ fontSize: 10, fontWeight: 600, color: QS.muted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 20 }}>Authorized Signature</div>
                <div style={{ borderBottom: `1px solid ${QS.rule}`, marginBottom: 4, paddingBottom: 28 }} />
                <div style={{ fontSize: 10, fontWeight: 600, color: QS.muted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 20 }}>Printed Name &amp; Title</div>
                <div style={{ borderBottom: `1px solid ${QS.rule}`, marginBottom: 4, paddingBottom: 28 }} />
                <div style={{ fontSize: 10, fontWeight: 600, color: QS.muted, textTransform: "uppercase", letterSpacing: 1 }}>Date</div>
              </div>
              {/* Client side */}
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: QS.navy, textTransform: "uppercase", letterSpacing: 1.5, paddingBottom: 8, borderBottom: `2px solid ${QS.navy}`, marginBottom: 20 }}>Client</div>
                <div style={{ borderBottom: `1px solid ${QS.rule}`, marginBottom: 4, paddingBottom: 28 }} />
                <div style={{ fontSize: 10, fontWeight: 600, color: QS.muted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 20 }}>Authorized Signature</div>
                <div style={{ borderBottom: `1px solid ${QS.rule}`, marginBottom: 4, paddingBottom: 28 }} />
                <div style={{ fontSize: 10, fontWeight: 600, color: QS.muted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 20 }}>Printed Name &amp; Title</div>
                <div style={{ borderBottom: `1px solid ${QS.rule}`, marginBottom: 4, paddingBottom: 28 }} />
                <div style={{ fontSize: 10, fontWeight: 600, color: QS.muted, textTransform: "uppercase", letterSpacing: 1 }}>Date</div>
              </div>
            </div>

          </div>{/* end body content padding */}

          {/* ── Dark Footer ── */}
          <div style={{ background: QS.navy, padding: "16px 40px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.5)" }}>Guardian Structural Technologies LLC — <span style={{ color: QS.accentLt }}>SHIELD™ Panel Systems</span></div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>Proposal No. {quoteId} · Page 1 of 1</div>
          </div>

        </div>
      )}

      {/* ============ INTERNAL BREAKDOWN VIEW ============ */}
      {view === "internal" && (
        <>
          <div className="bg-white border border-slate-200 rounded-lg p-6">
            <h2 className="text-lg font-bold text-slate-800 mb-4">INTERNAL COST BREAKDOWN <span className="text-xs font-normal text-red-500 ml-2">GST Eyes Only</span></h2>
            <table className="w-full text-sm">
              <thead><tr className="text-slate-400 text-xs border-b"><th className="text-left py-1">Component</th><th className="text-right">SF</th><th className="text-right">Material</th><th className="text-right">Labor</th><th className="text-right">Total</th></tr></thead>
              <tbody>
                {COMP_KEYS.map(k => {
                  const c = calc.byComp[k];
                  if (!c || c.total === 0) return null;
                  return (
                    <tr key={k} className="border-b border-slate-100">
                      <td className="py-1 font-medium">{COMP[k].label}</td>
                      <td className="text-right font-mono text-slate-500">{c.sf.toLocaleString()}</td>
                      <td className="text-right font-mono">{fmt(c.material)}</td>
                      <td className="text-right font-mono">{fmt(c.labor)}</td>
                      <td className="text-right font-mono font-bold">{fmt(c.total)}</td>
                    </tr>
                  );
                })}
                <tr className="border-t-2 border-slate-300 font-bold">
                  <td className="py-2">TOTALS</td>
                  <td className="text-right font-mono">{calc.totalSF.toLocaleString()}</td>
                  <td className="text-right font-mono">{fmt(calc.totalMat)}</td>
                  <td className="text-right font-mono">{fmt(calc.totalLab)}</td>
                  <td className="text-right font-mono">{fmt(calc.totalMat + calc.totalLab)}</td>
                </tr>
                <tr><td className="py-1 text-slate-500">Overhead ($2.59/SF)</td><td></td><td></td><td></td><td className="text-right font-mono">{fmt(calc.overhead)}</td></tr>
                <tr><td className="py-1 text-slate-500">Miscellaneous</td><td></td><td></td><td></td><td className="text-right font-mono">{fmt(miscTotal)}</td></tr>
                <tr className="border-t border-slate-200"><td className="py-1">Subtotal</td><td></td><td></td><td></td><td className="text-right font-mono font-bold">{fmt(calc.subtotal + miscTotal)}</td></tr>
                <tr><td className="py-1">Gross Profit ({margin}%)</td><td></td><td></td><td></td><td className="text-right font-mono text-emerald-600">{fmt(calc.grossProfit)}</td></tr>
                <tr className="text-lg font-bold text-blue-700 border-t-2 border-blue-200"><td className="py-2">CONTRACT VALUE</td><td></td><td></td><td></td><td className="text-right font-mono">{fmt(calc.contractValue)}</td></tr>
              </tbody>
            </table>
          </div>

          {/* BOM */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h2 className="text-lg font-bold text-blue-800 mb-4">BILL OF MATERIALS (by component)</h2>
            {COMP_KEYS.map(k => {
              const types = comps[k];
              const anyData = types.some(t => (Number(t.qty) || 0) > 0);
              if (!anyData) return null;
              return (
                <div key={k} className="mb-4">
                  <h3 className="text-sm font-bold text-blue-700 mb-1">{COMP[k].label}</h3>
                  {TYPE_LABELS.map((lbl, i) => {
                    const td = types[i];
                    const qty = Number(td.qty) || 0;
                    if (qty === 0) return null;
                    const r = calcComponentType(k, td, pricing);
                    if (r.lineItems.length === 0) return null;
                    return (
                      <div key={i} className="ml-4 mb-2">
                        <div className="text-xs font-bold text-slate-600 mb-0.5">Type {lbl} (x{qty})</div>
                        <table className="w-full text-xs">
                          <thead><tr className="text-slate-400 text-[10px]"><th className="text-left">Item</th><th className="text-right">Qty</th><th className="text-right">Unit</th><th className="text-right">$/Unit</th><th className="text-right">Cost</th></tr></thead>
                          <tbody>
                            {r.lineItems.map((li, j) => (
                              <tr key={j} className={li.cost < 0 ? "text-red-500" : ""}>
                                <td className="py-0.5">{li.name}</td>
                                <td className="text-right font-mono">{li.qty.toFixed(1)}</td>
                                <td className="text-right text-slate-400">{li.unit}</td>
                                <td className="text-right font-mono">{fmtDec(li.unitPrice)}</td>
                                <td className="text-right font-mono">{fmtDec(li.cost)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// JOB STORAGE — multiple projects in localStorage
// ═══════════════════════════════════════════════════════════════
const JOBS_INDEX_KEY = "gst-jobs-index";
const JOB_PREFIX = "gst-job-";

function makeBlankProject() {
  return {
    proj: {
      proposal: "", name: "", location: "", date: "", salesperson: "", salesDir: "",
      archFirm: "", archContact: "", archPhone: "", archEmail: "",
      ownerName: "", ownerContact: "", ownerPhone: "", ownerEmail: "",
    },
    aboveSF: "", belowSF: "", margin: 30,
    misc: { engineering: 1500, drafting: 1000, shipping: 0, foam: 0, foamGun: 0, hotKnife: 0, tape: 0, bugleScrews: 0, roofScrews: 0 },
    comps: (() => { const st = {}; COMP_KEYS.forEach(k => { st[k] = TYPE_LABELS.map(() => makeTypeState(COMP[k])); }); return st; })(),
  };
}

function getJobsIndex() {
  try { return JSON.parse(localStorage.getItem(JOBS_INDEX_KEY)) || []; } catch { return []; }
}

function saveJobsIndex(index) {
  localStorage.setItem(JOBS_INDEX_KEY, JSON.stringify(index));
}

function loadJob(id) {
  try { return JSON.parse(localStorage.getItem(JOB_PREFIX + id)); } catch { return null; }
}

function saveJob(id, data) {
  localStorage.setItem(JOB_PREFIX + id, JSON.stringify(data));
}

function deleteJobData(id) {
  localStorage.removeItem(JOB_PREFIX + id);
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

// Migrate old single-project data if it exists
function migrateOldData() {
  try {
    const old = JSON.parse(localStorage.getItem("gst-estimator-v2"));
    if (old && old.comps) {
      const id = generateId();
      const name = old.proj?.name || "Imported Project";
      saveJob(id, old);
      const index = getJobsIndex();
      index.push({ id, name, created: new Date().toISOString(), updated: new Date().toISOString() });
      saveJobsIndex(index);
      localStorage.removeItem("gst-estimator-v2");
      return id;
    }
  } catch { /* ignore */ }
  return null;
}

// ═══════════════════════════════════════════════════════════════
// JOB PICKER COMPONENT
// ═══════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════
// SETTINGS TAB
// ═══════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════
// IMPORT COMPARISON MODAL
// ═══════════════════════════════════════════════════════════════
function ImportComparisonModal({ review, pricing, laborSettings, onConfirm, onCancel }) {
  const { result, fileName } = review;
  const data = result.data;
  const excelSummary = result.summary;

  // Calculate what the app would produce from the imported data
  const compKeys = ["windows", "doors", "walls", "shearWalls", "gables", "boxBeams", "singleSlope", "gableRoof", "hipRoof", "skylights"];
  const excelLabels = ["WINDOWS", "DOORS", "WALLS", "SHEAR WALLS", "GABLES", "BOX BEAMS", "LOW SLOPED ROOF", "GABLE ROOF", "HIP ROOF", "SKYLIGHTS"];
  const summaryKeys = ["windows", "doors", "walls", "shearWalls", "gables", "boxBeams", "singleSlope", "gableRoof", "hipRoof", "skylights"];

  const rows = compKeys.map((k, i) => {
    let appMat = 0, appLab = 0;
    (data.comps[k] || []).forEach(td => {
      const r = calcComponentType(k, td, pricing);
      appMat += r.material + r.waste;
      appLab += calcComponentLabor(k, td, laborSettings);
    });
    const exMat = excelSummary[summaryKeys[i]]?.material || 0;
    const exLab = excelSummary[summaryKeys[i]]?.labor || 0;
    const hasData = exMat > 0 || exLab > 0 || appMat > 0 || appLab > 0;
    return { label: excelLabels[i], exMat, exLab, appMat, appLab, hasData };
  });

  const totalExMat = rows.reduce((s, r) => s + r.exMat, 0);
  const totalExLab = rows.reduce((s, r) => s + r.exLab, 0);
  const totalAppMat = rows.reduce((s, r) => s + r.appMat, 0);
  const totalAppLab = rows.reduce((s, r) => s + r.appLab, 0);

  const delta = (app, ex) => {
    if (ex === 0 && app === 0) return null;
    const diff = app - ex;
    const pct = ex !== 0 ? (diff / ex * 100) : 0;
    const color = Math.abs(pct) < 1 ? "text-green-600" : Math.abs(pct) < 10 ? "text-amber-600" : "text-red-600";
    return <span className={`font-mono ${color}`}>{diff >= 0 ? "+" : ""}{fmt(diff)} ({pct >= 0 ? "+" : ""}{pct.toFixed(1)}%)</span>;
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto">
        <div className="bg-slate-900 text-white px-6 py-4 rounded-t-lg flex justify-between items-center">
          <div>
            <h2 className="text-lg font-bold">Excel Import Comparison</h2>
            <p className="text-slate-400 text-xs">{fileName} — {data.proj?.name || "Unnamed Project"}</p>
          </div>
          <button onClick={onCancel} className="text-slate-400 hover:text-white text-xl px-2">x</button>
        </div>

        {/* Project Info Preview */}
        {data.proj?.name && (
          <div className="px-6 py-3 bg-slate-50 border-b text-xs text-slate-600 flex gap-6">
            {data.proj.name && <span>Project: <strong>{data.proj.name}</strong></span>}
            {data.proj.location && <span>Location: <strong>{data.proj.location}</strong></span>}
            {data.proj.date && <span>Date: <strong>{data.proj.date}</strong></span>}
            {data.proj.salesperson && <span>Salesperson: <strong>{data.proj.salesperson}</strong></span>}
          </div>
        )}

        {/* Comparison Table */}
        <div className="px-6 py-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-slate-400 border-b">
                <th className="text-left py-2 w-40">Component</th>
                <th className="text-right w-24">Excel Mat.</th>
                <th className="text-right w-24">App Mat.</th>
                <th className="text-right w-32">Mat. Delta</th>
                <th className="text-right w-24">Excel Labor</th>
                <th className="text-right w-24">App Labor</th>
                <th className="text-right w-32">Labor Delta</th>
              </tr>
            </thead>
            <tbody>
              {rows.filter(r => r.hasData).map(r => (
                <tr key={r.label} className="border-b border-slate-100">
                  <td className="py-1.5 font-medium">{r.label}</td>
                  <td className="text-right font-mono text-slate-500">{r.exMat > 0 ? fmt(r.exMat) : "—"}</td>
                  <td className="text-right font-mono">{r.appMat > 0 ? fmt(r.appMat) : "—"}</td>
                  <td className="text-right text-xs">{delta(r.appMat, r.exMat)}</td>
                  <td className="text-right font-mono text-slate-500">{r.exLab > 0 ? fmt(r.exLab) : "—"}</td>
                  <td className="text-right font-mono">{r.appLab > 0 ? fmt(r.appLab) : "—"}</td>
                  <td className="text-right text-xs">{delta(r.appLab, r.exLab)}</td>
                </tr>
              ))}
              <tr className="border-t-2 border-slate-300 font-bold">
                <td className="py-2">TOTALS</td>
                <td className="text-right font-mono text-slate-500">{fmt(totalExMat)}</td>
                <td className="text-right font-mono">{fmt(totalAppMat)}</td>
                <td className="text-right text-xs">{delta(totalAppMat, totalExMat)}</td>
                <td className="text-right font-mono text-slate-500">{fmt(totalExLab)}</td>
                <td className="text-right font-mono">{fmt(totalAppLab)}</td>
                <td className="text-right text-xs">{delta(totalAppLab, totalExLab)}</td>
              </tr>
              {excelSummary.contractValue > 0 && (
                <tr className="text-blue-700 font-bold">
                  <td className="py-1">Excel Contract Value</td>
                  <td colSpan={6} className="text-right font-mono">{fmt(excelSummary.contractValue)}</td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Import log */}
          <div className="mt-4 text-xs text-slate-500">
            <div className="font-bold text-slate-400 uppercase mb-1">Import Log</div>
            {result.importLog.filter(l => l.status === "imported").map((l, i) => (
              <span key={i} className="inline-block bg-green-100 text-green-700 rounded px-2 py-0.5 mr-1 mb-1">{l.sheet} {l.type} (x{l.qty})</span>
            ))}
            {result.importLog.filter(l => l.status === "error").map((l, i) => (
              <span key={i} className="inline-block bg-red-100 text-red-700 rounded px-2 py-0.5 mr-1 mb-1">{l.sheet} {l.type}: {l.error}</span>
            ))}
          </div>

          <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800">
            <strong>Note:</strong> Delta shows difference between what the Excel stored and what this tool calculates from the imported inputs.
            Green (&lt;1%) = close match. Amber (1-10%) = minor difference. Red (&gt;10%) = significant — review the component inputs.
            Labor differences are expected since the app uses a different labor model than the Excel.
          </div>
        </div>

        <div className="px-6 py-4 bg-slate-50 rounded-b-lg flex justify-end gap-3 border-t">
          <button onClick={onCancel} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800">Cancel</button>
          <button onClick={onConfirm} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-medium">
            Import This Project
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// MATERIALS SUMMARY TAB — matches Excel Cover Summary rows 71-230
// ═══════════════════════════════════════════════════════════════
function MaterialsSummaryTab({ comps, pricing, calc }) {
  // Build rollup data per component
  const sections = COMP_KEYS.map(compKey => {
    const def = COMP[compKey];
    const types = comps[compKey];
    const typeResults = types.map(td => ({
      data: td,
      qty: Number(td.qty) || 0,
      result: calcComponentType(compKey, td, pricing),
    }));
    const anyData = typeResults.some(t => t.qty > 0);
    if (!anyData) return null;

    return { compKey, label: def.label, typeResults };
  }).filter(Boolean);

  // Aggregate all line items by name across all components for grand total
  const grandTotals = {};
  sections.forEach(sec => {
    sec.typeResults.forEach(tr => {
      if (tr.qty === 0) return;
      tr.result.lineItems.forEach(li => {
        const key = li.name;
        if (!grandTotals[key]) grandTotals[key] = { name: li.name, unit: li.unit, qty: 0, cost: 0 };
        grandTotals[key].qty += li.qty * tr.qty;
        grandTotals[key].cost += li.cost * tr.qty;
      });
    });
  });

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <h2 className="text-lg font-bold text-slate-800 mb-4">Materials Summary</h2>

      {sections.map(sec => (
        <div key={sec.compKey} className="mb-6 bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="bg-slate-100 px-4 py-2 font-bold text-sm text-slate-700 border-b border-slate-200">
            {sec.label}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-slate-400 text-[10px] border-b">
                  <th className="text-left py-1.5 px-3 w-48">Item</th>
                  {TYPE_LABELS.map((lbl, i) => {
                    const tr = sec.typeResults[i];
                    return tr.qty > 0 ? (
                      <th key={i} className="text-right px-2 w-24">Type {lbl} (x{tr.qty})</th>
                    ) : null;
                  })}
                  <th className="text-right px-3 w-28 font-bold">Total</th>
                  <th className="text-right px-3 w-16">Unit</th>
                </tr>
              </thead>
              <tbody>
                {/* SF row */}
                <tr className="border-b border-slate-100 bg-blue-50">
                  <td className="py-1 px-3 font-bold text-blue-700">Square Footage</td>
                  {TYPE_LABELS.map((_, i) => {
                    const tr = sec.typeResults[i];
                    return tr.qty > 0 ? (
                      <td key={i} className="text-right px-2 font-mono">{tr.result.sf.toLocaleString()}</td>
                    ) : null;
                  })}
                  <td className="text-right px-3 font-mono font-bold text-blue-700">
                    {sec.typeResults.reduce((s, tr) => s + tr.result.sf, 0).toLocaleString()}
                  </td>
                  <td className="text-right px-3 text-slate-400">SqFt</td>
                </tr>
                {/* Cost/SF row */}
                <tr className="border-b border-slate-100 bg-blue-50">
                  <td className="py-1 px-3 font-bold text-blue-700">Cost / SF</td>
                  {TYPE_LABELS.map((_, i) => {
                    const tr = sec.typeResults[i];
                    if (tr.qty === 0) return null;
                    const perUnitSF = tr.result.sf / tr.qty;
                    const perUnitMat = (tr.result.material + tr.result.waste) / tr.qty;
                    const cpsf = perUnitSF > 0 ? perUnitMat / perUnitSF : 0;
                    return <td key={i} className="text-right px-2 font-mono">{cpsf > 0 ? fmtDec(cpsf) : "—"}</td>;
                  })}
                  {(() => {
                    const totalSF = sec.typeResults.reduce((s, tr) => s + tr.result.sf, 0);
                    const totalMat = sec.typeResults.reduce((s, tr) => s + tr.result.material + tr.result.waste, 0);
                    const avg = totalSF > 0 ? totalMat / totalSF : 0;
                    return <td className="text-right px-3 font-mono font-bold text-blue-700">{avg > 0 ? fmtDec(avg) : "—"}</td>;
                  })()}
                  <td className="text-right px-3 text-slate-400">$/SF</td>
                </tr>
                {/* Line items — collect unique names across all types */}
                {(() => {
                  const allNames = [];
                  sec.typeResults.forEach(tr => {
                    tr.result.lineItems.forEach(li => {
                      if (!allNames.includes(li.name)) allNames.push(li.name);
                    });
                  });
                  return allNames.map(name => (
                    <tr key={name} className="border-b border-slate-50 hover:bg-slate-50">
                      <td className={`py-1 px-3 ${name.includes("Deduction") ? "text-red-600" : ""}`}>{name}</td>
                      {TYPE_LABELS.map((_, i) => {
                        const tr = sec.typeResults[i];
                        if (tr.qty === 0) return null;
                        const li = tr.result.lineItems.find(l => l.name === name);
                        if (!li) return <td key={i} className="text-right px-2 font-mono text-slate-300">—</td>;
                        return (
                          <td key={i} className={`text-right px-2 font-mono ${li.cost < 0 ? "text-red-500" : ""}`}>
                            {li.qty.toFixed(1)}
                          </td>
                        );
                      })}
                      <td className="text-right px-3 font-mono font-medium">
                        {(() => {
                          let total = 0;
                          sec.typeResults.forEach(tr => {
                            if (tr.qty === 0) return;
                            const li = tr.result.lineItems.find(l => l.name === name);
                            if (li) total += li.qty * tr.qty;
                          });
                          return total.toFixed(1);
                        })()}
                      </td>
                      <td className="text-right px-3 text-slate-400">
                        {sec.typeResults.flatMap(tr => tr.result.lineItems).find(l => l.name === name)?.unit || ""}
                      </td>
                    </tr>
                  ));
                })()}
                {/* Material cost row */}
                <tr className="border-t border-slate-200 bg-slate-50 font-bold">
                  <td className="py-1.5 px-3">Material + Waste</td>
                  {TYPE_LABELS.map((_, i) => {
                    const tr = sec.typeResults[i];
                    return tr.qty > 0 ? (
                      <td key={i} className="text-right px-2 font-mono">{fmt(tr.result.material + tr.result.waste)}</td>
                    ) : null;
                  })}
                  <td className="text-right px-3 font-mono font-bold">
                    {fmt(sec.typeResults.reduce((s, tr) => s + tr.result.material + tr.result.waste, 0))}
                  </td>
                  <td></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      ))}

      {/* Grand Total — consolidated BOM */}
      <div className="mb-6 bg-slate-800 text-white border border-slate-700 rounded-lg overflow-hidden">
        <div className="px-4 py-2 font-bold text-sm border-b border-slate-700">CONSOLIDATED TOTALS — All Components</div>
        <table className="w-full text-xs">
          <thead><tr className="text-slate-400 text-[10px] border-b border-slate-700">
            <th className="text-left py-1.5 px-3">Material</th>
            <th className="text-right px-3">Total Qty</th>
            <th className="text-right px-3">Unit</th>
            <th className="text-right px-3">Total Cost</th>
          </tr></thead>
          <tbody>
            {Object.values(grandTotals).filter(g => g.cost !== 0).sort((a, b) => Math.abs(b.cost) - Math.abs(a.cost)).map(g => (
              <tr key={g.name} className={`border-b border-slate-700 ${g.cost < 0 ? "text-red-400" : ""}`}>
                <td className="py-1 px-3">{g.name}</td>
                <td className="text-right px-3 font-mono">{g.qty.toFixed(1)}</td>
                <td className="text-right px-3 text-slate-400">{g.unit}</td>
                <td className="text-right px-3 font-mono">{fmtDec(g.cost)}</td>
              </tr>
            ))}
            <tr className="border-t-2 border-slate-500 font-bold text-emerald-400">
              <td className="py-2 px-3">TOTAL MATERIALS</td>
              <td></td><td></td>
              <td className="text-right px-3 font-mono">{fmt(calc.totalMat)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

const PRICING_CATEGORIES = [
  { key: "EPS", label: "EPS Density" },
  { key: "TUBING", label: "Tubing / Studs / Rafters" },
  { key: "TRACK", label: "Track" },
  { key: "HEADERS", label: "Headers" },
  { key: "SHEATHING", label: "Sheathing" },
  { key: "ANGLES", label: "Angles" },
  { key: "BENT", label: "Bent Metal" },
  { key: "RSCREW", label: "Roof Drill Pt. Screws" },
  { key: "WOOD", label: "Wood Plates" },
  { key: "LVL", label: "LVL" },
];

function SettingsTab({ settings, onUpdateSettings, pricing, onUpdatePricing }) {
  const [activeCategory, setActiveCategory] = useState("EPS");
  const [settingsSection, setSettingsSection] = useState("labor");

  const avgCost = calcAvgCostPerHour(settings.employees, settings.burdenRate);

  return (
    <div className="flex-1 flex">
      {/* Settings Sidebar */}
      <div className="w-56 bg-slate-50 border-r border-slate-200 overflow-y-auto">
        <div className="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Cost Settings</div>
        {[
          ["labor", "Labor Rates"],
          ["minutes", "Minutes / Panel"],
          ["overhead", "Overhead & Waste"],
        ].map(([k, l]) => (
          <button key={k} onClick={() => setSettingsSection(k)}
            className={`w-full text-left px-3 py-2 text-xs border-l-3 ${settingsSection === k ? "bg-white border-l-amber-500 font-bold text-slate-900" : "border-l-transparent text-slate-600 hover:bg-white"}`}>
            {l}
          </button>
        ))}

        <div className="px-3 py-2 mt-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-t border-slate-200">Material Pricing</div>
        {PRICING_CATEGORIES.map(cat => (
          <button key={cat.key} onClick={() => { setSettingsSection("pricing"); setActiveCategory(cat.key); }}
            className={`w-full text-left px-3 py-2 text-xs border-l-3 ${settingsSection === "pricing" && activeCategory === cat.key ? "bg-white border-l-amber-500 font-bold text-slate-900" : "border-l-transparent text-slate-600 hover:bg-white"}`}>
            {cat.label}
          </button>
        ))}
      </div>

      {/* Settings Main Panel */}
      <div className="flex-1 p-4 overflow-y-auto">

        {/* LABOR RATES */}
        {settingsSection === "labor" && (
          <div>
            <h2 className="text-sm font-bold text-slate-800 mb-3">Labor Rates</h2>
            <p className="text-xs text-slate-500 mb-4">Employee hourly rates from the Labor sheet. Burdened at {(settings.burdenRate * 100).toFixed(0)}% then averaged across all employees.</p>

            <div className="bg-white border border-slate-200 rounded-lg p-4 mb-4">
              <table className="w-full text-sm">
                <thead><tr className="text-xs text-slate-400 border-b"><th className="text-left py-1 w-32">Employee</th><th className="text-right w-32">Hourly Rate</th><th></th></tr></thead>
                <tbody>
                  {settings.employees.map((emp, i) => (
                    <tr key={i} className="border-b border-slate-100">
                      <td className="py-1">
                        <input type="text" value={emp.name}
                          onChange={e => { const emps = [...settings.employees]; emps[i] = { ...emps[i], name: e.target.value }; onUpdateSettings({ employees: emps }); }}
                          className="border border-slate-300 rounded px-2 py-1 text-xs w-24 bg-sky-50" />
                      </td>
                      <td className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <span className="text-xs text-slate-400">$</span>
                          <input type="number" value={emp.rate} step="0.50"
                            onChange={e => { const emps = [...settings.employees]; emps[i] = { ...emps[i], rate: Number(e.target.value) || 0 }; onUpdateSettings({ employees: emps }); }}
                            className="border border-slate-300 rounded px-2 py-1 text-xs w-20 bg-sky-50 text-right font-mono" />
                          <span className="text-xs text-slate-400">/hr</span>
                        </div>
                      </td>
                      <td className="text-right">
                        {settings.employees.length > 1 && (
                          <button onClick={() => { const emps = settings.employees.filter((_, j) => j !== i); onUpdateSettings({ employees: emps }); }}
                            className="text-red-400 hover:text-red-600 text-xs px-1">x</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <button onClick={() => onUpdateSettings({ employees: [...settings.employees, { name: "NEW", rate: 25 }] })}
                className="mt-2 text-xs text-blue-600 hover:text-blue-800">+ Add Employee</button>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg p-4 grid grid-cols-3 gap-4">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Burden Rate</label>
                <div className="flex items-center gap-1">
                  <input type="number" value={settings.burdenRate * 100} step="1" min="100" max="200"
                    onChange={e => onUpdateSettings({ burdenRate: (Number(e.target.value) || 115) / 100 })}
                    className="border border-slate-300 rounded px-2 py-1.5 text-sm w-20 bg-sky-50 font-mono text-right" />
                  <span className="text-xs text-slate-500">%</span>
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Total Hourly (all)</label>
                <div className="border border-slate-200 rounded px-2 py-1.5 text-sm bg-slate-100 font-mono">
                  ${settings.employees.reduce((s, e) => s + e.rate, 0).toFixed(2)}
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Avg Cost/Hr (burdened)</label>
                <div className="border border-emerald-200 rounded px-2 py-1.5 text-sm bg-emerald-50 font-mono font-bold text-emerald-700">
                  ${avgCost.toFixed(2)}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MINUTES PER PANEL */}
        {settingsSection === "minutes" && (
          <div>
            <h2 className="text-sm font-bold text-slate-800 mb-3">Minutes Per Panel</h2>
            <p className="text-xs text-slate-500 mb-4">Total production minutes per panel type (sum of all stages: prep, router, cutter, metal fab, tubing, assembly).</p>

            <div className="bg-white border border-slate-200 rounded-lg p-4">
              <table className="w-full text-sm">
                <thead><tr className="text-xs text-slate-400 border-b"><th className="text-left py-1">Panel Type</th><th className="text-right w-32">Minutes</th><th className="text-right w-32">Hours</th></tr></thead>
                <tbody>
                  {Object.entries(settings.minutesPerPanel).map(([key, val]) => (
                    <tr key={key} className="border-b border-slate-100">
                      <td className="py-1.5 text-xs">{PANEL_TYPE_LABELS[key] || key}</td>
                      <td className="text-right">
                        <input type="number" value={val} step="0.5"
                          onChange={e => onUpdateSettings({ minutesPerPanel: { ...settings.minutesPerPanel, [key]: Number(e.target.value) || 0 } })}
                          className="border border-slate-300 rounded px-2 py-1 text-xs w-20 bg-sky-50 text-right font-mono" />
                      </td>
                      <td className="text-right font-mono text-xs text-slate-500">{(val / 60).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* OVERHEAD & WASTE */}
        {settingsSection === "overhead" && (
          <div>
            <h2 className="text-sm font-bold text-slate-800 mb-3">Overhead & Waste</h2>

            <div className="bg-white border border-slate-200 rounded-lg p-4 grid grid-cols-2 gap-6">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Overhead Per SF</label>
                <p className="text-xs text-slate-500 mb-2">Applied to total wall + roof square footage</p>
                <div className="flex items-center gap-1">
                  <span className="text-sm text-slate-400">$</span>
                  <input type="number" value={settings.overheadPerSF} step="0.01"
                    onChange={e => onUpdateSettings({ overheadPerSF: Number(e.target.value) || 0 })}
                    className="border border-slate-300 rounded px-2 py-1.5 text-sm w-24 bg-sky-50 font-mono text-right" />
                  <span className="text-xs text-slate-500">/ SF</span>
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Waste Factor</label>
                <p className="text-xs text-slate-500 mb-2">Applied to material subtotal per component</p>
                <div className="flex items-center gap-1">
                  <input type="number" value={settings.wasteFactor * 100} step="1" min="0" max="20"
                    onChange={e => onUpdateSettings({ wasteFactor: (Number(e.target.value) || 0) / 100 })}
                    className="border border-slate-300 rounded px-2 py-1.5 text-sm w-20 bg-sky-50 font-mono text-right" />
                  <span className="text-xs text-slate-500">%</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MATERIAL PRICING */}
        {settingsSection === "pricing" && (
          <div>
            <h2 className="text-sm font-bold text-slate-800 mb-1">{PRICING_CATEGORIES.find(c => c.key === activeCategory)?.label} Pricing</h2>
            <p className="text-xs text-slate-500 mb-4">Edit prices below. Changes apply to all new calculations immediately.</p>

            <div className="bg-white border border-slate-200 rounded-lg p-4">
              <table className="w-full text-sm">
                <thead><tr className="text-xs text-slate-400 border-b">
                  <th className="text-left py-1">Item</th>
                  <th className="text-right w-28">Default</th>
                  <th className="text-right w-32">Current Price</th>
                  <th className="text-center w-16">Changed</th>
                </tr></thead>
                <tbody>
                  {(pricing[activeCategory] || []).map((item, i) => {
                    const defaultItem = DEFAULT_PRICING[activeCategory]?.[i];
                    const changed = defaultItem && Math.abs(item.price - defaultItem.price) > 0.001;
                    return (
                      <tr key={i} className={`border-b border-slate-100 ${changed ? "bg-amber-50" : ""}`}>
                        <td className="py-1.5 text-xs">{item.label}</td>
                        <td className="text-right font-mono text-xs text-slate-400">${defaultItem?.price?.toFixed(4) || "—"}</td>
                        <td className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <span className="text-xs text-slate-400">$</span>
                            <input type="number" value={item.price} step="0.01"
                              onChange={e => {
                                const cat = [...pricing[activeCategory]];
                                cat[i] = { ...cat[i], price: Number(e.target.value) || 0 };
                                onUpdatePricing(activeCategory, cat);
                              }}
                              className={`border rounded px-2 py-1 text-xs w-24 text-right font-mono ${changed ? "border-amber-400 bg-amber-50" : "border-slate-300 bg-sky-50"}`} />
                          </div>
                        </td>
                        <td className="text-center">{changed ? <span className="text-amber-600 text-xs font-bold">*</span> : ""}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div className="mt-3 flex gap-2">
                <button onClick={() => {
                  if (confirm(`Reset ${PRICING_CATEGORIES.find(c => c.key === activeCategory)?.label} to default prices?`)) {
                    onUpdatePricing(activeCategory, DEFAULT_PRICING[activeCategory].map(item => ({ ...item })));
                  }
                }} className="text-xs text-red-600 hover:text-red-800">Reset to Defaults</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function JobPicker({ jobs, activeJobId, onSelect, onNew, onDelete, onExport, onExportAll, onImport, onImportExcel, onUploadDrawing }) {
  return (
    <div className="bg-slate-800 px-4 py-1 flex items-center gap-2 text-xs border-b border-slate-700">
      <span className="text-slate-500 font-medium">Job:</span>
      <select value={activeJobId || ""} onChange={e => onSelect(e.target.value)}
        className="bg-slate-700 text-white border border-slate-600 rounded px-2 py-1 text-xs min-w-[200px]">
        {jobs.map(j => (
          <option key={j.id} value={j.id}>{j.name || "Untitled"}{j.updated ? ` (${new Date(j.updated).toLocaleDateString()})` : ""}</option>
        ))}
      </select>
      <button onClick={onNew} className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-xs font-medium">New Job</button>
      <button onClick={onExport} className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1 rounded text-xs font-bold">Save to File</button>
      <button onClick={onExportAll} className="bg-emerald-800 hover:bg-emerald-700 text-white px-3 py-1 rounded text-xs">Save All Jobs</button>
      <label className="bg-slate-600 hover:bg-slate-500 text-white px-3 py-1 rounded text-xs cursor-pointer">
        Open File
        <input type="file" accept=".json" className="hidden" onChange={onImport} />
      </label>
      <label className="bg-amber-600 hover:bg-amber-500 text-white px-3 py-1 rounded text-xs cursor-pointer font-medium">
        Import Excel
        <input type="file" accept=".xlsx,.xls" className="hidden" onChange={onImportExcel} />
      </label>
      <label className="bg-purple-600 hover:bg-purple-500 text-white px-3 py-1 rounded text-xs cursor-pointer font-bold">
        Upload Drawing
        <input type="file" accept=".pdf,.png,.jpg,.jpeg,.tiff,.tif" className="hidden" onChange={onUploadDrawing} />
      </label>
      {jobs.length > 1 && (
        <button onClick={onDelete} className="bg-red-700 hover:bg-red-600 text-white px-3 py-1 rounded text-xs ml-auto">Delete Job</button>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════════════════
export default function App() {
  // Initialize jobs list — migrate old data if needed
  const [jobs, setJobs] = useState(() => {
    migrateOldData();
    let index = getJobsIndex();
    if (index.length === 0) {
      const id = generateId();
      const blank = makeBlankProject();
      blank.proj.name = "New Project";
      saveJob(id, blank);
      index = [{ id, name: "New Project", created: new Date().toISOString(), updated: new Date().toISOString() }];
      saveJobsIndex(index);
    }
    return index;
  });

  const [activeJobId, setActiveJobId] = useState(jobs[0]?.id);

  // Load active job
  const loadActiveJob = useCallback((id) => {
    const data = loadJob(id);
    if (data) {
      setProj(data.proj || makeBlankProject().proj);
      setAboveSF(data.aboveSF || "");
      setBelowSF(data.belowSF || "");
      setMargin(data.margin || 30);
      setMisc(data.misc || makeBlankProject().misc);
      setComps(data.comps || makeBlankProject().comps);
    }
  }, []);

  const [activeTab, setActiveTab] = useState("input");
  const [importReview, setImportReview] = useState(null); // { result, fileName }
  const [quoteOverride, setQuoteOverride] = useState(false);
  const [reviewedOnce, setReviewedOnce] = useState(false);
  const [activeComp, setActiveComp] = useState("walls");
  const [expandedTypes, setExpandedTypes] = useState({});
  const [pricing, setPricing] = useState(() => clonePricing(DEFAULT_PRICING));

  const SETTINGS_KEY = "gst-settings";
  const [settings, setSettings] = useState(() => {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (raw) return JSON.parse(raw);
    } catch { /* ignore */ }
    return {
      employees: DEFAULT_EMPLOYEES.map(e => ({ ...e })),
      burdenRate: DEFAULT_BURDEN_RATE,
      minutesPerPanel: { ...DEFAULT_MINUTES_PER_PANEL },
      overheadPerSF: DEFAULT_OVERHEAD_PER_SF,
      wasteFactor: DEFAULT_WASTE_FACTOR,
    };
  });

  const handleUpdateSettings = useCallback((patch) => {
    setSettings(prev => {
      const next = { ...prev, ...patch };
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const handleUpdatePricing = useCallback((category, items) => {
    setPricing(prev => {
      const next = { ...prev, [category]: items };
      localStorage.setItem("gst-pricing", JSON.stringify(next));
      return next;
    });
  }, []);

  const laborSettings = useMemo(() => ({
    costPerHour: calcAvgCostPerHour(settings.employees, settings.burdenRate),
    minutesPerPanel: settings.minutesPerPanel,
  }), [settings.employees, settings.burdenRate, settings.minutesPerPanel]);

  const initialData = loadJob(activeJobId) || makeBlankProject();

  const [proj, setProj] = useState(initialData.proj);
  const [aboveSF, setAboveSF] = useState(initialData.aboveSF || "");
  const [belowSF, setBelowSF] = useState(initialData.belowSF || "");
  const [margin, setMargin] = useState(initialData.margin || 30);
  const [misc, setMisc] = useState(initialData.misc);
  const [comps, setComps] = useState(initialData.comps);

  // Auto-save current job
  const autoSave = useCallback(() => {
    if (!activeJobId) return;
    const data = { proj, aboveSF, belowSF, margin, misc, comps };
    saveJob(activeJobId, data);
    // Update index with latest name and timestamp
    setJobs(prev => {
      const updated = prev.map(j => j.id === activeJobId
        ? { ...j, name: proj.name || proj.proposal || "Untitled", updated: new Date().toISOString() }
        : j
      );
      saveJobsIndex(updated);
      return updated;
    });
  }, [activeJobId, proj, aboveSF, belowSF, margin, misc, comps]);

  useMemo(() => {
    const t = setTimeout(autoSave, 1000);
    return () => clearTimeout(t);
  }, [autoSave]);

  // Job actions
  const handleSelectJob = useCallback((id) => {
    // Save current first
    if (activeJobId) saveJob(activeJobId, { proj, aboveSF, belowSF, margin, misc, comps });
    setActiveJobId(id);
    const data = loadJob(id) || makeBlankProject();
    setProj(data.proj || makeBlankProject().proj);
    setAboveSF(data.aboveSF || "");
    setBelowSF(data.belowSF || "");
    setMargin(data.margin || 30);
    setMisc(data.misc || makeBlankProject().misc);
    setComps(data.comps || makeBlankProject().comps);
    setExpandedTypes({});
  }, [activeJobId, proj, aboveSF, belowSF, margin, misc, comps]);

  const handleNewJob = useCallback(() => {
    // Save current first
    if (activeJobId) saveJob(activeJobId, { proj, aboveSF, belowSF, margin, misc, comps });
    const id = generateId();
    const blank = makeBlankProject();
    blank.proj.name = "New Project";
    blank.proj.date = new Date().toISOString().split("T")[0];
    saveJob(id, blank);
    const entry = { id, name: "New Project", created: new Date().toISOString(), updated: new Date().toISOString() };
    setJobs(prev => { const next = [...prev, entry]; saveJobsIndex(next); return next; });
    setActiveJobId(id);
    setProj(blank.proj);
    setAboveSF("");
    setBelowSF("");
    setMargin(30);
    setMisc(blank.misc);
    setComps(blank.comps);
    setExpandedTypes({});
  }, [activeJobId, proj, aboveSF, belowSF, margin, misc, comps]);

  const handleDeleteJob = useCallback(() => {
    if (jobs.length <= 1) return;
    if (!confirm(`Delete "${proj.name || "Untitled"}"? This cannot be undone.`)) return;
    deleteJobData(activeJobId);
    const remaining = jobs.filter(j => j.id !== activeJobId);
    setJobs(remaining);
    saveJobsIndex(remaining);
    // Switch to first remaining
    const nextId = remaining[0].id;
    setActiveJobId(nextId);
    const data = loadJob(nextId) || makeBlankProject();
    setProj(data.proj || makeBlankProject().proj);
    setAboveSF(data.aboveSF || "");
    setBelowSF(data.belowSF || "");
    setMargin(data.margin || 30);
    setMisc(data.misc || makeBlankProject().misc);
    setComps(data.comps || makeBlankProject().comps);
  }, [activeJobId, jobs, proj.name]);

  const handleExportJob = useCallback(() => {
    const data = { proj, aboveSF, belowSF, margin, misc, comps, exportedAt: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `GST_${(proj.name || proj.proposal || "export").replace(/[^a-zA-Z0-9]/g, "_")}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [proj, aboveSF, belowSF, margin, misc, comps]);

  const handleExportAllJobs = useCallback(() => {
    // Save current job first
    if (activeJobId) saveJob(activeJobId, { proj, aboveSF, belowSF, margin, misc, comps });
    const allData = { exportedAt: new Date().toISOString(), jobs: [] };
    jobs.forEach(j => {
      const jd = loadJob(j.id);
      if (jd) allData.jobs.push({ ...j, data: jd });
    });
    const blob = new Blob([JSON.stringify(allData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `GST_All_Jobs_${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [activeJobId, proj, aboveSF, belowSF, margin, misc, comps, jobs]);

  const handleImportJob = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        // Handle "all jobs" export format
        if (data.jobs && Array.isArray(data.jobs)) {
          let count = 0;
          data.jobs.forEach(j => {
            if (!j.data || !j.data.comps) return;
            const id = generateId();
            const name = j.data.proj?.name || j.name || "Imported";
            saveJob(id, j.data);
            const entry = { id, name, created: j.created || new Date().toISOString(), updated: new Date().toISOString() };
            setJobs(prev => { const next = [...prev, entry]; saveJobsIndex(next); return next; });
            count++;
          });
          alert(`Imported ${count} job${count !== 1 ? "s" : ""}.`);
          return;
        }
        // Handle single job format
        if (!data.comps) { alert("Invalid file — no component data found."); return; }
        const id = generateId();
        const name = data.proj?.name || data.proj?.proposal || file.name.replace(".json", "");
        saveJob(id, data);
        const entry = { id, name, created: new Date().toISOString(), updated: new Date().toISOString() };
        setJobs(prev => { const next = [...prev, entry]; saveJobsIndex(next); return next; });
        setActiveJobId(id);
        setProj(data.proj || makeBlankProject().proj);
        setAboveSF(data.aboveSF || "");
        setBelowSF(data.belowSF || "");
        setMargin(data.margin || 30);
        setMisc(data.misc || makeBlankProject().misc);
        setComps(data.comps);
        setExpandedTypes({});
      } catch { alert("Failed to parse file."); }
    };
    reader.readAsText(file);
    e.target.value = "";
  }, []);

  const handleImportExcel = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const makeBlank = (compKey) => {
          const def = COMP[compKey];
          if (!def) return { qty: "", label: "" };
          const s = { qty: "", label: "" };
          def.dims.forEach(d => { s[d.key] = d.def ?? ""; });
          def.toggles.forEach(g => g.items.forEach(t => { s[t.key] = false; }));
          def.selects.forEach(sel => { s[sel.key] = 0; });
          (def.extras || []).forEach(ex => { s[ex.key] = ex.def ?? ""; });
          return s;
        };

        const result = importGSTWorkbook(new Uint8Array(ev.target.result), pricing, makeBlank);

        if (!result.isGST) {
          alert(result.error || "Not a recognized GST workbook.");
          return;
        }

        // Show comparison review modal
        setImportReview({ result, fileName: file.name });
      } catch (err) {
        alert("Failed to import Excel file: " + err.message);
        console.error(err);
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = "";
  }, [pricing]);

  const handleConfirmImport = useCallback(() => {
    if (!importReview) return;
    const data = importReview.result.data;
    const id = generateId();
    const name = data.proj?.name || data.proj?.proposal || importReview.fileName.replace(/\.xlsx?$/i, "");
    saveJob(id, data);
    const entry = { id, name, created: new Date().toISOString(), updated: new Date().toISOString(), source: "excel" };
    setJobs(prev => { const next = [...prev, entry]; saveJobsIndex(next); return next; });
    setActiveJobId(id);
    setProj(data.proj || makeBlankProject().proj);
    setAboveSF(data.aboveSF || "");
    setBelowSF(data.belowSF || "");
    setMargin(data.margin || 30);
    setMisc(data.misc || makeBlankProject().misc);
    setComps(data.comps);
    setExpandedTypes({});
    setImportReview(null);
  }, [importReview]);

  const handleUploadDrawing = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    formData.append("projectId", activeJobId || "");

    // Upload to drawing pipeline server
    fetch("http://localhost:3001/api/upload", { method: "POST", body: formData })
      .then(r => r.json())
      .then(data => {
        if (!data.jobId) { alert("Upload failed: " + (data.error || "Unknown error")); return; }
        alert(`Drawing uploaded! Job ID: ${data.jobId}\nProcessing... Check back in 15-30 seconds.`);
        // Poll for completion
        const poll = setInterval(() => {
          fetch(`http://localhost:3001/api/jobs/${data.jobId}`)
            .then(r => r.json())
            .then(status => {
              if (status.status === "complete") {
                clearInterval(poll);
                fetch(`http://localhost:3001/api/jobs/${data.jobId}/result`)
                  .then(r => r.json())
                  .then(result => {
                    if (result.formData?.comps) {
                      // Merge extracted data into current job
                      setComps(prev => {
                        const next = { ...prev };
                        Object.keys(result.formData.comps).forEach(k => {
                          const extracted = result.formData.comps[k];
                          if (!extracted || !extracted.length) return;
                          next[k] = [...prev[k]];
                          extracted.forEach((item, i) => {
                            if (i < 5 && item.qty) next[k][i] = { ...prev[k][i], ...item };
                          });
                        });
                        return next;
                      });
                      alert(`Drawing processed! ${(result.flags || []).length} items flagged for review.\n\nExtracted data has been loaded into the form.`);
                    }
                  }).catch(() => alert("Failed to load results."));
              } else if (status.status === "error") {
                clearInterval(poll);
                alert("Drawing processing failed: " + (status.error || "Unknown error"));
              }
            }).catch(() => {});
        }, 3000);
      })
      .catch(() => alert("Cannot connect to drawing pipeline server.\nMake sure it's running: cd gst-drawing-pipeline && npm start"));
    e.target.value = "";
  }, [activeJobId]);

  const handleTypeChange = useCallback((compKey, typeIdx, field, value) => {
    setQuoteOverride(false); // reset override when data changes
    setReviewedOnce(false); // require re-review when data changes
    setComps(prev => {
      const c = { ...prev };
      c[compKey] = [...prev[compKey]];
      c[compKey][typeIdx] = { ...prev[compKey][typeIdx], [field]: value };
      return c;
    });
    // Auto-expand when a toggle is turned ON
    if (value === true) {
      const def = COMP[compKey];
      const isToggle = def.toggles.some(g => g.items.some(t => t.key === field));
      if (isToggle) {
        setExpandedTypes(prev => ({ ...prev, [`${compKey}-${typeIdx}`]: true }));
      }
    }
    // Auto-expand and auto-toggle when a material dropdown is selected
    if (value !== null && value !== undefined && typeof value === 'number') {
      const def = COMP[compKey];
      const isSelect = def.selects.some(s => s.key === field);
      if (isSelect) {
        setExpandedTypes(prev => ({ ...prev, [`${compKey}-${typeIdx}`]: true }));
        // Auto-set related toggles to ON
        const relatedToggles = getRelatedToggles(field);
        if (relatedToggles.length > 0) {
          setComps(prev => {
            const c = { ...prev };
            c[compKey] = [...prev[compKey]];
            const updated = { ...prev[compKey][typeIdx] };
            relatedToggles.forEach(tk => {
              // Only auto-set if currently unset (null) or false — don't override explicit user choice
              if (updated[tk] === null || updated[tk] === undefined || updated[tk] === false) {
                updated[tk] = true;
              }
            });
            c[compKey][typeIdx] = updated;
            return c;
          });
        }
      }
    }
  }, []);

  const toggleExpand = useCallback((compKey, typeIdx) => {
    const key = `${compKey}-${typeIdx}`;
    // If trying to expand a type, check all previous types with qty are complete
    if (!expandedTypes[key]) {
      for (let i = 0; i < typeIdx; i++) {
        const td = comps[compKey][i];
        const qty = Number(td.qty) || 0;
        if (qty === 0) continue;
        const issues = validateType(compKey, td);
        if (issues.length > 0) {
          alert(`Please complete ${COMP[compKey].label} Type ${TYPE_LABELS[i]} before moving to Type ${TYPE_LABELS[typeIdx]}.\n\nMissing: ${issues.map(is => is.label).join(", ")}`);
          setExpandedTypes(prev => ({ ...prev, [`${compKey}-${i}`]: true }));
          return;
        }
      }
    }
    setExpandedTypes(prev => ({ ...prev, [key]: !prev[key] }));
  }, [comps, expandedTypes]);

  const handleCompSwitch = useCallback((newComp) => {
    // Check if any active types in current component are incomplete
    const currentTypes = comps[activeComp];
    for (let i = 0; i < currentTypes.length; i++) {
      const td = currentTypes[i];
      const qty = Number(td.qty) || 0;
      if (qty === 0) continue;
      const issues = validateType(activeComp, td);
      if (issues.length > 0) {
        alert(`Please complete ${COMP[activeComp].label} Type ${TYPE_LABELS[i]} before moving on.\n\nMissing: ${issues.map(is => is.label).join(", ")}`);
        setExpandedTypes(prev => ({ ...prev, [`${activeComp}-${i}`]: true }));
        return;
      }
    }
    setActiveComp(newComp);
  }, [activeComp, comps]);

  const pf = (k, v) => setProj(p => ({ ...p, [k]: v }));
  const miscTotal = Object.values(misc).reduce((s, v) => s + (Number(v) || 0), 0);

  const calc = useMemo(() => {
    const byComp = {};
    let totalMat = 0, totalLab = 0, totalSF = 0;

    COMP_KEYS.forEach(k => {
      let cMat = 0, cLab = 0, cSF = 0, cWaste = 0;
      comps[k].forEach(typeData => {
        const r = calcComponentType(k, typeData, pricing);
        const lab = calcComponentLabor(k, typeData, laborSettings);
        cMat += r.material + r.waste;
        cLab += lab;
        cSF += r.sf;
        cWaste += r.waste;
      });
      byComp[k] = { material: cMat, labor: cLab, sf: cSF, waste: cWaste, total: cMat + cLab };
      totalMat += cMat;
      totalLab += cLab;
      totalSF += cSF;
    });

    const overhead = calcOverhead(totalSF, settings.overheadPerSF);
    const subtotal = totalMat + totalLab + overhead + miscTotal;
    const m = margin / 100;
    const contractValue = m < 1 ? subtotal / (1 - m) : subtotal;
    const grossProfit = contractValue - subtotal;
    const buildingSF = (Number(aboveSF) || 0) + (Number(belowSF) || 0);
    const costPerSF = buildingSF > 0 ? contractValue / buildingSF : 0;

    return { byComp, totalMat, totalLab, totalSF, overhead, subtotal, contractValue, grossProfit, buildingSF, costPerSF };
  }, [comps, pricing, miscTotal, margin, aboveSF, belowSF, laborSettings, settings.overheadPerSF]);

  // Set favicon
  useEffect(() => {
    let link = document.querySelector("link[rel~='icon']");
    if (!link) { link = document.createElement('link'); link.rel = 'icon'; document.head.appendChild(link); }
    link.href = GST_FAVICON;
    document.title = proj.name ? `${proj.name} - GST Estimating` : "GST Estimating Tool";
  }, [proj.name]);

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      {/* HEADER */}
      <div className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src={GST_LOGO} alt="GST" className="h-10 w-10 rounded" />
          <div>
            <h1 className="text-lg font-bold tracking-tight">GST Estimating Tool</h1>
            <p className="text-slate-500 text-[10px]">Guardian Structural Technologies</p>
          </div>
        </div>
        <div className="flex gap-1">
          {[["input", "Project Input", "bg-blue-600"], ["review", "Review Summary", "bg-purple-600"], ["quote", "Quote Output", "bg-emerald-600"], ["materials", "Materials", "bg-indigo-600"], ["settings", "Settings", "bg-amber-600"]].map(([t, l, c]) => (
            <button key={t} onClick={() => setActiveTab(t)}
              className={`px-4 py-1.5 rounded text-xs font-medium ${activeTab === t ? `${c} text-white` : "bg-slate-700 text-slate-400 hover:bg-slate-600"}`}>{l}</button>
          ))}
        </div>
      </div>

      {/* JOB PICKER */}
      <JobPicker
        jobs={jobs}
        activeJobId={activeJobId}
        onSelect={handleSelectJob}
        onNew={handleNewJob}
        onDelete={handleDeleteJob}
        onExport={handleExportJob}
        onExportAll={handleExportAllJobs}
        onImport={handleImportJob}
        onImportExcel={handleImportExcel}
        onUploadDrawing={handleUploadDrawing}
      />

      {/* TICKER */}
      <div className="bg-slate-800 px-4 py-1.5 flex items-center justify-between text-xs border-b border-slate-700">
        <div className="flex gap-5 text-slate-400">
          <span>Materials: <span className="text-white font-mono">{fmt(calc.totalMat)}</span></span>
          <span>Labor: <span className="text-white font-mono">{fmt(calc.totalLab)}</span></span>
          <span>Overhead: <span className="text-white font-mono">{fmt(calc.overhead)}</span></span>
          <span>SF: <span className="text-white font-mono">{calc.totalSF.toLocaleString()}</span></span>
          {calc.costPerSF > 0 && <span>$/SF: <span className="text-white font-mono">{fmtDec(calc.costPerSF)}</span></span>}
        </div>
        <span className="text-emerald-400 font-bold font-mono text-base">{fmt(calc.contractValue)}</span>
      </div>

      {/* REVIEW SUMMARY TAB */}
      {activeTab === "review" && (
        <ReviewSummary
          comps={comps}
          pricing={pricing}
          laborSettings={laborSettings}
          calc={calc}
          proj={proj}
          misc={misc}
          margin={margin}
          validation={validateProject(comps, proj)}
          onGoToComponent={(compKey, typeIdx) => {
            setActiveTab("input");
            setActiveComp(compKey);
            setExpandedTypes(prev => ({ ...prev, [`${compKey}-${typeIdx}`]: true }));
          }}
          onProceedToQuote={() => {
            const v = validateProject(comps, proj);
            if (v.isValid) {
              setReviewedOnce(true);
              setActiveTab("quote");
              setQuoteOverride(true);
            }
          }}
          onOverrideToQuote={() => {
            setReviewedOnce(true);
            setActiveTab("quote");
            setQuoteOverride(true);
          }}
        />
      )}

      {/* QUOTE OUTPUT TAB — with review gate */}
      {activeTab === "quote" && (() => {
        // If user hasn't been through review, redirect them
        if (!reviewedOnce && !quoteOverride) {
          return (
            <div className="flex-1 overflow-y-auto p-6 max-w-4xl mx-auto">
              <div className="bg-purple-50 border-2 border-purple-300 rounded-lg p-6 text-center">
                <div className="w-12 h-12 bg-purple-400 rounded-full flex items-center justify-center text-white text-xl font-bold mx-auto mb-3">R</div>
                <h2 className="text-lg font-bold text-purple-800 mb-2">Please review your estimate first</h2>
                <p className="text-sm text-purple-600 mb-4">Review all components and settings before generating the quote output.</p>
                <button onClick={() => setActiveTab("review")}
                  className="px-6 py-2.5 rounded text-sm font-bold bg-purple-600 hover:bg-purple-700 text-white shadow">
                  Go to Review
                </button>
              </div>
            </div>
          );
        }
        const validation = validateProject(comps, proj);
        if (!validation.isValid && !quoteOverride) {
          return (
            <ReviewGate
              validation={validation}
              comps={comps}
              onGoToComponent={(compKey, typeIdx) => {
                setActiveTab("input");
                setActiveComp(compKey);
                setExpandedTypes(prev => ({ ...prev, [`${compKey}-${typeIdx}`]: true }));
              }}
              onOverride={() => setQuoteOverride(true)}
            />
          );
        }
        return (
          <div className="flex-1 overflow-y-auto">
            <QuoteOutput calc={calc} proj={proj} comps={comps} pricing={pricing} misc={misc} margin={margin} />
          </div>
        );
      })()}

      {/* MATERIALS SUMMARY TAB */}
      {activeTab === "materials" && (
        <MaterialsSummaryTab comps={comps} pricing={pricing} calc={calc} />
      )}

      {/* SETTINGS TAB */}
      {activeTab === "settings" && (
        <SettingsTab
          settings={settings}
          onUpdateSettings={handleUpdateSettings}
          pricing={pricing}
          onUpdatePricing={handleUpdatePricing}
        />
      )}

      {/* INPUT TAB */}
      {activeTab === "input" && (
        <div className="flex-1 flex flex-col">
          {/* Section 1: Project Info */}
          <div className="bg-white border-b border-slate-200 px-4 py-3">
            <div className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">Project Information</div>
            <div className="grid grid-cols-6 gap-2 mb-2">
              <In label="Proposal #" value={proj.proposal} onChange={v => pf("proposal", v)} />
              <In label="Project Name" value={proj.name} onChange={v => pf("name", v)} />
              <In label="Location" value={proj.location} onChange={v => pf("location", v)} />
              <In label="Date" value={proj.date} onChange={v => pf("date", v)} type="date" />
              <In label="Salesperson" value={proj.salesperson} onChange={v => pf("salesperson", v)} />
              <In label="Sales Director" value={proj.salesDir} onChange={v => pf("salesDir", v)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">Architect</div>
                <div className="grid grid-cols-2 gap-1.5">
                  <In label="Firm" value={proj.archFirm} onChange={v => pf("archFirm", v)} />
                  <In label="Contact" value={proj.archContact} onChange={v => pf("archContact", v)} />
                  <In label="Phone" value={proj.archPhone} onChange={v => pf("archPhone", v)} />
                  <In label="Email" value={proj.archEmail} onChange={v => pf("archEmail", v)} />
                </div>
              </div>
              <div>
                <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">Owner</div>
                <div className="grid grid-cols-2 gap-1.5">
                  <In label="Name" value={proj.ownerName} onChange={v => pf("ownerName", v)} />
                  <In label="Contact" value={proj.ownerContact} onChange={v => pf("ownerContact", v)} />
                  <In label="Phone" value={proj.ownerPhone} onChange={v => pf("ownerPhone", v)} />
                  <In label="Email" value={proj.ownerEmail} onChange={v => pf("ownerEmail", v)} />
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Building & Settings */}
          <div className="bg-white border-b border-slate-200 px-4 py-3">
            <div className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">Building & Pricing</div>
            <div className="grid grid-cols-7 gap-2">
              <In label="Above Grade SF" value={aboveSF} onChange={setAboveSF} type="number" />
              <In label="Below Grade SF" value={belowSF} onChange={setBelowSF} type="number" />
              <div>
                <label className="text-[10px] font-medium text-slate-500 uppercase tracking-wide block">Total SF</label>
                <div className="border border-slate-200 rounded px-2 py-1.5 text-sm bg-slate-100 font-mono">
                  {calc.buildingSF.toLocaleString() || "0"}
                </div>
              </div>
              <div>
                <label className="text-[10px] font-medium text-slate-500 uppercase tracking-wide block">Cost/SF</label>
                <div className="border border-slate-200 rounded px-2 py-1.5 text-sm bg-slate-100 font-mono">
                  {calc.costPerSF > 0 ? fmtDec(calc.costPerSF) : "—"}
                </div>
              </div>
              <div className="col-span-2">
                <label className="text-[10px] font-medium text-slate-500 uppercase tracking-wide block">Margin {margin}%</label>
                <input type="range" min="10" max="50" value={margin} onChange={e => setMargin(Number(e.target.value))}
                  className="w-full mt-1.5 accent-blue-600" />
              </div>
              <div>
                <label className="text-[10px] font-medium text-slate-500 uppercase tracking-wide block">Contract</label>
                <div className="border border-emerald-200 rounded px-2 py-1.5 text-sm bg-emerald-50 font-mono font-bold text-emerald-700">
                  {fmt(calc.contractValue)}
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Components + Sidebar */}
          <div className="flex-1 flex">
            {/* Sidebar */}
            <div className="w-52 bg-slate-50 border-r border-slate-200 overflow-y-auto flex flex-col">
              <div className="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Components</div>
              {COMP_KEYS.map(k => {
                const c = calc.byComp[k];
                const active = activeComp === k;
                const hasData = c && c.total > 0;
                return (
                  <button key={k} onClick={() => handleCompSwitch(k)}
                    className={`w-full text-left px-3 py-2 border-l-3 text-xs transition-colors ${active ? "bg-white border-l-blue-600 text-slate-900 font-bold" : "border-l-transparent text-slate-600 hover:bg-white"}`}>
                    <div className="flex justify-between items-center">
                      <span className="flex items-center gap-1.5">
                        <span className={`w-5 h-5 rounded text-[9px] font-bold flex items-center justify-center ${hasData ? "bg-blue-100 text-blue-700" : "bg-slate-200 text-slate-400"}`}>
                          {COMP[k].icon}
                        </span>
                        {COMP[k].label}
                      </span>
                      {hasData && <span className="font-mono text-blue-600 text-[10px]">{fmt(c.total)}</span>}
                    </div>
                  </button>
                );
              })}

              {/* Misc Costs */}
              <div className="border-t border-slate-200 mt-2 pt-2 px-3">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Misc Costs</div>
                {[
                  ["engineering", "Engineering"], ["drafting", "Drafting"], ["shipping", "Shipping"],
                  ["foam", "Foam"], ["foamGun", "Foam Gun"], ["hotKnife", "Hot Knife"],
                  ["tape", "Tape"], ["bugleScrews", "Bugle Screws"], ["roofScrews", "Roof Screws"],
                ].map(([k, l]) => (
                  <div key={k} className="mb-1.5">
                    <label className="text-[10px] text-slate-500 block mb-0.5">{l}</label>
                    <input type="number" value={misc[k]} placeholder="0"
                      onChange={e => setMisc(p => ({ ...p, [k]: e.target.value === "" ? "" : Number(e.target.value) }))}
                      className="w-full border border-slate-300 rounded px-1.5 py-1 text-xs bg-sky-50 text-right font-mono" />
                  </div>
                ))}
                <div className="flex justify-between text-xs font-bold mt-1 pt-1 border-t border-slate-200">
                  <span>Misc Total</span><span className="font-mono">{fmt(miscTotal)}</span>
                </div>
              </div>

              {/* Financial Summary */}
              <div className="border-t border-slate-200 mt-2 pt-2 px-3 pb-4 text-xs text-slate-600">
                <div className="flex justify-between mb-1"><span>Materials</span><span className="font-mono">{fmt(calc.totalMat)}</span></div>
                <div className="flex justify-between mb-1"><span>Labor</span><span className="font-mono">{fmt(calc.totalLab)}</span></div>
                <div className="flex justify-between mb-1"><span>Overhead</span><span className="font-mono">{fmt(calc.overhead)}</span></div>
                <div className="flex justify-between mb-1"><span>Misc</span><span className="font-mono">{fmt(miscTotal)}</span></div>
                <div className="flex justify-between mb-1 border-t pt-1"><span>Subtotal</span><span className="font-mono">{fmt(calc.subtotal)}</span></div>
                <div className="flex justify-between mb-1 text-emerald-600 font-bold"><span>Contract ({margin}%)</span><span className="font-mono">{fmt(calc.contractValue)}</span></div>
                <div className="flex justify-between text-slate-400"><span>Gross Profit</span><span className="font-mono">{fmt(calc.grossProfit)}</span></div>
              </div>
            </div>

            {/* Main Component Panel */}
            <div className="flex-1 p-4 overflow-y-auto">
              <div className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                <span className="w-6 h-6 rounded bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold">
                  {COMP[activeComp].icon}
                </span>
                {COMP[activeComp].label}
              </div>
              {TYPE_LABELS.map((_, i) => (
                <TypeCard
                  key={`${activeComp}-${i}`}
                  compKey={activeComp}
                  typeIdx={i}
                  data={comps[activeComp][i]}
                  onChange={(ti, f, v) => handleTypeChange(activeComp, ti, f, v)}
                  expanded={!!expandedTypes[`${activeComp}-${i}`]}
                  onToggleExpand={() => toggleExpand(activeComp, i)}
                  pricing={pricing}
                  laborSettings={laborSettings}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* IMPORT COMPARISON MODAL */}
      {importReview && (
        <ImportComparisonModal
          review={importReview}
          pricing={pricing}
          laborSettings={laborSettings}
          onConfirm={handleConfirmImport}
          onCancel={() => setImportReview(null)}
        />
      )}
    </div>
  );
}
