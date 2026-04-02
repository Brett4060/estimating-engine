/**
 * Maps Claude Vision extraction results to the estimating form structure
 * that matches App.jsx's makeBlankProject shape.
 */

/**
 * Map extracted geometry to the estimating form data structure.
 *
 * @param {object} extracted - structured output from visionExtractor
 * @returns {{ formData: { comps: object }, confidence: object, flags: string[] }}
 */
function mapToEstimatingForm(extracted) {
  const confidence = {};
  const flags = [];

  // Map walls
  const walls = (extracted.walls || []).map((wall, i) => {
    const key = `wall_${i}`;
    confidence[`${key}_length`] = wall.confidence || 50;
    confidence[`${key}_height`] = wall.confidence || 50;

    return {
      qty: 1,
      label: wall.label || `Wall ${String.fromCharCode(65 + i)}`,
      height: wall.height_ft || null,
      length: wall.length_ft || null,
      thickness: wall.thickness_in || null,
      epsThick: null, // Let estimator choose EPS thickness
      type: wall.type || "exterior",
      orientation: wall.orientation || null,
    };
  });

  // Map windows
  const windows = (extracted.windows || []).map((win, i) => {
    const key = `window_${i}`;
    confidence[`${key}_width`] = win.confidence || 50;
    confidence[`${key}_height`] = win.confidence || 50;

    return {
      qty: 1,
      label: win.label || `W${i + 1}`,
      width: win.width_ft || null,
      height: win.height_ft || null,
      sillHeight: win.sill_height_ft || null,
      wallLabel: win.wall_label || null,
      type: win.type || "unknown",
    };
  });

  // Map doors
  const doors = (extracted.doors || []).map((door, i) => {
    const key = `door_${i}`;
    confidence[`${key}_width`] = door.confidence || 50;
    confidence[`${key}_height`] = door.confidence || 50;

    return {
      qty: 1,
      label: door.label || `D${i + 1}`,
      width: door.width_ft || null,
      height: door.height_ft || 6.67,
      wallLabel: door.wall_label || null,
      type: door.type || "unknown",
      swing: door.swing || "unknown",
    };
  });

  // Map gables
  const gables = (extracted.gables || []).map((gable, i) => {
    const key = `gable_${i}`;
    confidence[`${key}_pitch`] = gable.confidence || 50;

    return {
      wallLabel: gable.wall_label || null,
      pitch: gable.pitch || null,
      spanFt: gable.span_ft || null,
    };
  });

  // Build the comps object matching makeBlankProject shape
  const comps = {
    walls,
    windows,
    doors,
    gables,
    // Toggles default to null (unset) - let estimator choose
    toggles: {
      hasEPS: null,
      hasGables: gables.length > 0 ? true : null,
      hasLargeOpenings: null,
    },
    // Selects default to null (unset) - let estimator choose
    selects: {
      studSize: null,
      studSpacing: null,
      sheathingType: null,
    },
    drawingInfo: {
      drawingType: extracted.drawing_type || "unknown",
      scale: extracted.scale || null,
      notes: extracted.notes || [],
    },
  };

  // Add flags for low-confidence extractions
  const avgConfidence =
    Object.values(confidence).length > 0
      ? Object.values(confidence).reduce((a, b) => a + b, 0) /
        Object.values(confidence).length
      : 0;

  if (avgConfidence < 50) {
    flags.push("Low overall extraction confidence - manual review recommended");
  }

  if (walls.length === 0) {
    flags.push("No walls detected - drawing may not be a floor plan or elevation");
  }

  if (extracted.drawing_type === "unknown") {
    flags.push("Drawing type could not be determined");
  }

  return {
    formData: { comps },
    confidence,
    flags,
  };
}

module.exports = { mapToEstimatingForm };
