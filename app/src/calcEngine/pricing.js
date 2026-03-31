// ═══════════════════════════════════════════════════════════════
// PRICING DATA — exact from Drop Downs sheet (2025-04-15)
// All prices are per linear foot unless noted
// ═══════════════════════════════════════════════════════════════

export const DEFAULT_PRICING = {
  EPS: [
    { label: "EPS 1.0 LB Density lb/cf", price: 0.30, factor: 4, lb: 1 },
    { label: "EPS 1.5 LB Density lb/cf", price: 0.40, factor: 4.5, lb: 1.5 },
    { label: "EPS 2.0 LB Density lb/cf", price: 0.50, factor: 5, lb: 2 },
  ],
  TUBING: [
    { label: "None", price: 0 },
    { label: "Tubing 1x2 - 18 Ga", price: 1.30 },
    { label: "Tubing 1x2 - 16 Ga", price: 1.55 },
    { label: "Tubing 1x2 - 14 Ga", price: 1.83 },
    { label: "Tubing 2x2 - 16 Ga", price: 1.8985 },
    { label: "Tubing 2x2 - 14 Ga", price: 2.27 },
    { label: "362S162-43 - 18 Ga", price: 1.68 },
    { label: "362S162-54 - 16 Ga", price: 2.07 },
    { label: "600S162-43 - 18 Ga", price: 2.22 },
    { label: "600S162-54 - 16 Ga", price: 2.75 },
    { label: "600S162-68 - 14 Ga", price: 3.46 },
    { label: "600S250-68 - 14 Ga", price: 3.54 },
    { label: "600S250-97 - 12 Ga", price: 5.015 },
    { label: "600S300-97 - 12 Ga", price: 5.20 },
    { label: "800S162-43 - 18 Ga", price: 2.68 },
    { label: "800S162-54 - 16 Ga", price: 3.31 },
    { label: "800S162-68 - 14 Ga", price: 4.19 },
    { label: "800S200-68 - 14 Ga", price: 3.85 },
    { label: "800S300-97 - 12 Ga", price: 5.94 },
  ],
  TRACK: [
    { label: "None", price: 0 },
    { label: "362T125-33 - 20 Ga", price: 0 },
    { label: "362T125-43 - 18 Ga", price: 0 },
    { label: "362T125-54 - 16 Ga", price: 0 },
    { label: "600T125-33 - 20 Ga", price: 0 },
    { label: "600T125-43 - 18 Ga", price: 1.94 },
    { label: "600T125-54 - 16 Ga", price: 2.38 },
    { label: "600T125-68 - 14 Ga", price: 2.38 },
    { label: "DL 600T200-43 - 18 Ga", price: 2.28 },
    { label: "DL 600T200-54 - 16 Ga", price: 2.80 },
    { label: "725T125-33 - 20 Ga", price: 0 },
    { label: "725T125-43 - 18 Ga", price: 2.08 },
    { label: "725T125-54 - 16 Ga", price: 2.56 },
    { label: "725T125-68 - 14 Ga", price: 0 },
    { label: "DL 725T200-43 - 18 Ga", price: 3.29 },
    { label: "DL 725T200-54 - 16 Ga", price: 3.15 },
    { label: "800T125-33 - 20 Ga", price: 0 },
    { label: "800T125-43 - 18 Ga", price: 0 },
    { label: "800T125-54 - 16 Ga", price: 0 },
    { label: "800T125-68 - 14 Ga", price: 0 },
    { label: "1000T125-43 - 18 Ga", price: 2.85 },
    { label: "1000T125-54 - 16 Ga", price: 3.52 },
    { label: "1000T125-68 - 14 Ga", price: 0 },
    { label: "DL 1000T200-43 - 18 Ga", price: 3.20 },
    { label: "DL 1000T200-54 - 16 Ga", price: 3.95 },
  ],
  HEADERS: [
    { label: "None", price: 0 },
    { label: "L Hdr 600L150-43 (18)", price: 3.54625 },
    { label: "L Hdr 600L150-54 (16)", price: 4.07375 },
    { label: "L Hdr 600L150-68 (14)", price: 4.4125 },
    { label: "L Hdr 800L150-43 (18)", price: 4.45 },
    { label: "L Hdr 800L150-54 (16)", price: 4.92875 },
    { label: "L Hdr 800L150-68 (14)", price: 5.75 },
    { label: "L Hdr 1000L150-43 (18)", price: 4.45 },
    { label: "L Hdr 1000L150-54 (16)", price: 4.92875 },
    { label: "L Hdr 1000L150-68 (14)", price: 5.75 },
    { label: "L Hdr 600L200-43 (18)", price: 3.54625 },
    { label: "L Hdr 600L200-54 (16)", price: 4.07375 },
    { label: "L Hdr 600L200-68 (14)", price: 4.4125 },
    { label: "L Hdr 800L200-43 (18)", price: 4.45 },
    { label: "L Hdr 800L200-54 (16)", price: 4.92875 },
    { label: "L Hdr 800L200-68 (14)", price: 5.75 },
    { label: "L Hdr 1000L200-43 (18)", price: 4.45 },
    { label: "L Hdr 1000L200-54 (16)", price: 4.92875 },
    { label: "L Hdr 1000L200-68 (14)", price: 5.75 },
  ],
  SHEATHING: [
    { label: "None", price: 0 },
    { label: '4x8x7/16" OSB', price: 0.47 },
    { label: '4x8x7/16" Zip OSB', price: 1.05 },
    { label: '4x8x15/32" Plywood', price: 0.88 },
    { label: '4x8x1/2" Dens Glass', price: 0 },
    { label: '4x8x5/8" Dens Glass', price: 1.25 },
    { label: '4x8x1/2" Ext Gypsum', price: 0.53 },
    { label: '4x8x5/8" Ext Gypsum', price: 0.54 },
    { label: '4x8x1/2" Type X Drywall', price: 0 },
    { label: '4x8x1/4" MO Board', price: 1.35 },
    { label: '4x8x1/2" MO Board', price: 2.02 },
  ],
  ANGLES: [
    { label: "None", price: 0 },
    { label: '1.5"x1.5" - 20 Ga', price: 0.51 },
    { label: '1.5"x1.5" - 18 Ga', price: 0.88 },
    { label: '2"x8" - 20 Ga', price: 2.26 },
    { label: '2"x8" - 18 Ga', price: 2.91 },
    { label: '2"x8" - 16 Ga', price: 3.49 },
    { label: '2"x10" - 20 Ga', price: 2.39 },
    { label: '2"x10" - 18 Ga', price: 3.36 },
    { label: '2"x10" - 16 Ga', price: 4.35 },
  ],
  BENT: [
    { label: "None", price: 0 },
    { label: '1.5"x1.5" - 18 Ga', price: 0.88 },
    { label: '6" wide - 18 Ga 1 Bend', price: 3.09375 },
    { label: '8" wide - 18 Ga 1 Bend', price: 4.60 },
    { label: '10" wide - 18 Ga 1 Bend', price: 4.85 },
    { label: '12" wide - 18 Ga 1 Bend', price: 5.36 },
    { label: '14" wide - 18 Ga 1 Bend', price: 6.23 },
    { label: '16" wide - 18 Ga 1 Bend', price: 7.59 },
    { label: '18" wide - 18 Ga 1 Bend', price: 7.415 },
    { label: '20" wide - 18 Ga 1 Bend', price: 7.98 },
    { label: '22" wide - 18 Ga 1 Bend', price: 8.56 },
    { label: '24" wide - 18 Ga 1 Bend', price: 10.38 },
    { label: '18" wide - 18 Ga 2 Bend', price: 7.98 },
    { label: '20" wide - 18 Ga 2 Bend', price: 8.56 },
    { label: '22" wide - 18 Ga 2 Bend', price: 9.74625 },
    { label: '24" wide - 18 Ga 2 Bend', price: 10.74625 },
  ],
  RSCREW: [
    { label: "None", price: 0 },
    { label: '5.5" Drill Pt.', price: 0.63 },
    { label: '6" Drill Pt.', price: 0.30 },
    { label: '7" Drill Pt.', price: 0.297 },
    { label: '8" Drill Pt.', price: 0.345 },
    { label: '9" Drill Pt.', price: 0.39 },
    { label: '10" Drill Pt.', price: 0.54 },
    { label: '11" Drill Pt.', price: 0.61 },
    { label: '12" Drill Pt.', price: 0.675 },
    { label: '14" Drill Pt.', price: 0.90 },
  ],
  WOOD: [
    { label: "None", price: 0 },
    { label: "2x4 Wood Plates", price: 0.40 },
    { label: "2x6 Wood Plates", price: 0.83 },
    { label: "2x8 Wood Plates", price: 1.05 },
    { label: "2x10 Wood Plates", price: 1.58 },
    { label: "2x12 Wood Plates", price: 1.80 },
  ],
  LVL: [
    { label: "None", price: 0 },
    { label: "LVL 1-3/4 x 7-1/4", price: 4.939 },
    { label: "LVL 1-3/4 x 9-1/4", price: 5.596 },
    { label: "LVL 1-3/4 x 11-1/4", price: 7.254 },
    { label: "LVL 1-3/4 x 11-7/8", price: 7.609 },
    { label: "LVL 1-3/4 x 14", price: 9.064 },
  ],
};

// Fixed prices from Drop Downs (not in category dropdowns)
export const FIXED_PRICES = {
  liftRing: 2.00,           // F15
  waferHeadScrew: 0.03,     // F37
  bugleHeadScrew: 0.05,     // F40
  bugleHeadScrewWB: 0.05,   // F12 (wood bucks fastener)
  sheathingFastener: 0.03,  // F43
  xBracingFastener: 0.03,   // F46
  wallStrapping: 2.25,      // F18  3" Wide 20 Ga 2'-0" Long
  flatMetal3x6: 1.78125,    // F19  3" Wide 18 Ga 6" Long
  flatMetal6x8: 2.015,      // F20  6" Wide 20 Ga 8'-0" Long (cabinet backing)
  simpsonTieDown: 4.09,     // F80
  flatPlate16x6: 0,         // F103 (needs price from Drop Downs)
  foam: 22.49,              // F84
  cleaner: 17.77,           // F85
  hotKnife: 120,            // F86
  foamGun: 20,              // F87
  sealingTape: 10.96,       // F88
  roofGrip3in: 0.20,        // F89
  boxBugleScrews: 55,       // F90
  angleLHdr: 0.88,          // F62 - 1.5"x1.5" - 18 Ga (deducted from structural header price)
};

export const WASTE_FACTOR = 0.05;
export const OVERHEAD_PER_SF = 2.59;

// Helper: get price from a pricing category by index
export function getPrice(pricing, category, idx) {
  return pricing[category]?.[idx]?.price || 0;
}

// Helper: get label from a pricing category by index
export function getLabel(pricing, category, idx) {
  return pricing[category]?.[idx]?.label || "None";
}

// Deep clone pricing for user-editable copies
export function clonePricing(src) {
  const out = {};
  Object.keys(src).forEach(k => {
    out[k] = src[k].map(item => ({ ...item }));
  });
  return out;
}
