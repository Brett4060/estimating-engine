// ═══════════════════════════════════════════════════════════════
// SHARED HELPERS
// ═══════════════════════════════════════════════════════════════

// Parse numeric value from form data, default 0
export const n = (data, key) => Number(data[key]) || 0;

// Parse boolean (Yes/true) from form data
export const b = (data, key) => data[key] === "Yes" || data[key] === true;

// Round up (equivalent to Excel ROUNDUP)
export const roundUp = (val, decimals = 0) => {
  const factor = Math.pow(10, decimals);
  return Math.ceil(val * factor) / factor;
};

// Add a line item to the array and return its cost
export function addLineItem(lineItems, name, qty, unit, unitPrice) {
  const cost = qty * unitPrice;
  if (qty !== 0 && unitPrice !== 0) {
    lineItems.push({ name, qty, unit, unitPrice, cost });
  }
  return cost;
}

// Create the standard return object
export function makeResult(sf, materialCost, laborCost, lineItems, waste) {
  return {
    sf,
    material: materialCost + waste,
    labor: laborCost,
    waste,
    panels: Math.ceil(sf / 32),
    lineItems,
    total: materialCost + waste + laborCost,
  };
}

export const ZERO_RESULT = {
  sf: 0, material: 0, labor: 0, waste: 0, panels: 0, lineItems: [], total: 0,
};
