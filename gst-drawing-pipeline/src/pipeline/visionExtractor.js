const Anthropic = require("@anthropic-ai/sdk");
const fs = require("fs");
const path = require("path");

const client = new Anthropic();

const EXTRACTION_PROMPT = `You are an expert architectural drawing analyzer for GST (a structural steel and framing company). Analyze this architectural floor plan / elevation drawing and extract all structural geometry.

You are looking at a construction drawing that may have highlighted regions indicating scope of work. Extract the following:

## Wall Segments
For each wall segment visible in the drawing:
- label: A descriptive label (e.g., "Wall A - North Exterior", "Wall B - South Interior")
- length_ft: estimated length in feet (read from dimensions if visible)
- height_ft: estimated height in feet (typically 8, 9, or 10 for residential)
- thickness_in: wall thickness in inches (typically 4.5 for 2x4, 6.5 for 2x6)
- type: "exterior" or "interior"
- orientation: "N", "S", "E", "W", or angle in degrees

## Windows
For each window:
- label: window mark/tag if visible
- width_ft: rough opening width in feet
- height_ft: rough opening height in feet
- sill_height_ft: height of sill from floor
- wall_label: which wall segment it belongs to
- type: "single_hung", "double_hung", "casement", "fixed", "sliding", or "unknown"

## Doors
For each door:
- label: door mark/tag if visible
- width_ft: rough opening width in feet
- height_ft: rough opening height in feet (typically 6.67 for 6'-8")
- wall_label: which wall segment it belongs to
- type: "single", "double", "sliding", "garage", or "unknown"
- swing: "in", "out", "left", "right", or "unknown"

## Gable Ends
For each gable:
- wall_label: which wall it sits on
- pitch: roof pitch (e.g., "6/12", "8/12")
- span_ft: width of the gable

## General Info
- drawing_type: "floor_plan", "elevation", "section", "detail", or "unknown"
- scale: the drawing scale if noted (e.g., "1/4\" = 1'-0\"")
- notes: any relevant text notes visible on the drawing

IMPORTANT:
- Read actual dimensions from the drawing whenever possible
- If dimensions aren't legible, estimate based on scale and proportions
- Include confidence scores (0-100) for each extracted value
- Be thorough - extract EVERY wall, window, and door visible

Respond with ONLY valid JSON in this exact structure:
{
  "drawing_type": "floor_plan",
  "scale": null,
  "notes": [],
  "walls": [
    {
      "label": "Wall A",
      "length_ft": 24,
      "height_ft": 9,
      "thickness_in": 6.5,
      "type": "exterior",
      "orientation": "N",
      "confidence": 75
    }
  ],
  "windows": [
    {
      "label": "W1",
      "width_ft": 3,
      "height_ft": 4,
      "sill_height_ft": 3,
      "wall_label": "Wall A",
      "type": "double_hung",
      "confidence": 70
    }
  ],
  "doors": [
    {
      "label": "D1",
      "width_ft": 3,
      "height_ft": 6.67,
      "wall_label": "Wall A",
      "type": "single",
      "swing": "in",
      "confidence": 65
    }
  ],
  "gables": [
    {
      "wall_label": "Wall A",
      "pitch": "6/12",
      "span_ft": 24,
      "confidence": 60
    }
  ]
}`;

/**
 * Use Claude Vision to extract geometry from an architectural drawing.
 *
 * @param {string} imagePath - path to the image to analyze
 * @param {object} highlightData - result from highlight detection (bounding boxes, etc.)
 * @param {object} [options]
 * @param {number} [options.maxRetries=2] - retries on JSON parse failure
 * @returns {Promise<object>} structured extraction result
 */
async function extractGeometry(imagePath, highlightData, options = {}) {
  const maxRetries = options.maxRetries != null ? options.maxRetries : 2;
  const model = process.env.CLAUDE_MODEL || "claude-sonnet-4-20250514";

  // Read image as base64
  const imageBuffer = fs.readFileSync(imagePath);
  const base64Image = imageBuffer.toString("base64");

  // Determine media type from extension
  const ext = path.extname(imagePath).toLowerCase();
  const mediaTypeMap = {
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".tiff": "image/png", // Claude doesn't support tiff directly
    ".tif": "image/png",
  };
  const mediaType = mediaTypeMap[ext] || "image/png";

  // Build highlight hints for the prompt
  let highlightHint = "";
  if (highlightData && highlightData.highlights && highlightData.highlights.length > 0) {
    highlightHint = "\n\nHighlighted regions detected on this drawing (these indicate scope of work):\n";
    for (const h of highlightData.highlights) {
      highlightHint += `- ${h.color} highlight at [x=${h.bbox[0]}, y=${h.bbox[1]}, w=${h.bbox[2]}, h=${h.bbox[3]}], area=${h.area_px}px\n`;
    }
    highlightHint += "\nFocus extraction on the highlighted areas as they represent the work scope.\n";
  }

  const fullPrompt = EXTRACTION_PROMPT + highlightHint;

  let lastError = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await client.messages.create({
        model,
        max_tokens: 4096,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: mediaType,
                  data: base64Image,
                },
              },
              {
                type: "text",
                text: fullPrompt,
              },
            ],
          },
        ],
      });

      // Extract text content from response
      const textContent = response.content.find((c) => c.type === "text");
      if (!textContent) {
        throw new Error("No text content in Claude response");
      }

      let jsonStr = textContent.text.trim();

      // Try to extract JSON from markdown code block if present
      const codeBlockMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (codeBlockMatch) {
        jsonStr = codeBlockMatch[1].trim();
      }

      const parsed = JSON.parse(jsonStr);
      return parsed;
    } catch (err) {
      lastError = err;
      if (attempt < maxRetries) {
        console.warn(
          `Vision extraction attempt ${attempt + 1} failed (${err.message}), retrying...`
        );
      }
    }
  }

  throw new Error(
    `Vision extraction failed after ${maxRetries + 1} attempts: ${lastError.message}`
  );
}

module.exports = { extractGeometry };
