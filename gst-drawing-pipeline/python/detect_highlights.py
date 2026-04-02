"""
Detect highlighted regions (yellow, pink, green, orange) on architectural drawings.

Usage:
    python detect_highlights.py --input <image_path> --output-dir <dir>

Outputs:
    - cleaned.png   : drawing with highlights inpainted away
    - scope_overlay.png : semi-transparent green rectangles over highlighted areas
    - mask.png      : binary mask of detected highlights
    - JSON to stdout with detection results
"""

import argparse
import json
import os
import sys

import cv2
import numpy as np


def detect_highlights(input_path, output_dir):
    """Run highlight detection on an image and write outputs."""

    os.makedirs(output_dir, exist_ok=True)

    # 1. Load image
    image = cv2.imread(input_path)
    if image is None:
        # If we can't load the image, output empty results with original as cleaned
        result = {
            "highlights": [],
            "cleaned_path": input_path,
            "overlay_path": input_path,
            "mask_path": None,
            "highlight_count": 0,
        }
        print(json.dumps(result))
        return

    hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)

    # 3. Create colour masks
    # Yellow: H 20-35, S 80-255, V 150-255
    yellow_mask = cv2.inRange(hsv, np.array([20, 80, 150]), np.array([35, 255, 255]))

    # Pink: H 140-175, S 60-255, V 150-255
    pink_mask = cv2.inRange(hsv, np.array([140, 60, 150]), np.array([175, 255, 255]))

    # Green: H 35-85, S 80-255, V 150-255
    green_mask = cv2.inRange(hsv, np.array([35, 80, 150]), np.array([85, 255, 255]))

    # Orange: H 8-20, S 100-255, V 150-255
    orange_mask = cv2.inRange(hsv, np.array([8, 100, 150]), np.array([20, 255, 255]))

    # 4. Combine masks
    combined_mask = yellow_mask | pink_mask | green_mask | orange_mask

    # 5. Morphological operations to clean noise
    kernel_close = np.ones((5, 5), np.uint8)
    kernel_open = np.ones((3, 3), np.uint8)
    combined_mask = cv2.morphologyEx(combined_mask, cv2.MORPH_CLOSE, kernel_close)
    combined_mask = cv2.morphologyEx(combined_mask, cv2.MORPH_OPEN, kernel_open)

    # 6. Find contours, filter by area
    contours, _ = cv2.findContours(combined_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    valid_contours = [c for c in contours if cv2.contourArea(c) > 500]

    # Determine dominant colour for each contour
    colour_names = {
        "yellow": yellow_mask,
        "pink": pink_mask,
        "green": green_mask,
        "orange": orange_mask,
    }

    highlights = []
    for contour in valid_contours:
        x, y, w, h = cv2.boundingRect(contour)
        area = int(cv2.contourArea(contour))

        # Determine colour by which mask has the most overlap
        roi_mask = np.zeros(combined_mask.shape, dtype=np.uint8)
        cv2.drawContours(roi_mask, [contour], -1, 255, -1)

        best_colour = "unknown"
        best_overlap = 0
        for name, mask in colour_names.items():
            overlap = cv2.countNonZero(cv2.bitwise_and(mask, roi_mask))
            if overlap > best_overlap:
                best_overlap = overlap
                best_colour = name

        highlights.append({
            "color": best_colour,
            "bbox": [int(x), int(y), int(w), int(h)],
            "area_px": area,
        })

    # Paths
    cleaned_path = os.path.join(output_dir, "cleaned.png")
    overlay_path = os.path.join(output_dir, "scope_overlay.png")
    mask_path = os.path.join(output_dir, "mask.png")

    if len(valid_contours) == 0:
        # No highlights detected - save original as cleaned and overlay
        cv2.imwrite(cleaned_path, image)
        cv2.imwrite(overlay_path, image)
        cv2.imwrite(mask_path, combined_mask)
    else:
        # 7. Cleaned drawing: inpaint masked regions
        cleaned = cv2.inpaint(image, combined_mask, 7, cv2.INPAINT_TELEA)
        cv2.imwrite(cleaned_path, cleaned)

        # 8. Scope overlay: draw semi-transparent green rectangles
        overlay = image.copy()
        overlay_layer = image.copy()

        # Fill colour: #1D9E75 -> BGR (117, 158, 29)
        fill_bgr = (117, 158, 29)
        # Border colour: #085041 -> BGR (65, 80, 8)
        border_bgr = (65, 80, 8)

        for contour in valid_contours:
            rect = cv2.minAreaRect(contour)
            box = cv2.boxPoints(rect)
            box = np.int0(box)

            # Fill with green
            cv2.fillPoly(overlay_layer, [box], fill_bgr)
            # Border
            cv2.drawContours(overlay_layer, [box], 0, border_bgr, 2)

        # Blend at 35% opacity
        alpha = 0.35
        overlay = cv2.addWeighted(overlay_layer, alpha, image, 1 - alpha, 0)
        cv2.imwrite(overlay_path, overlay)

        # Save mask
        cv2.imwrite(mask_path, combined_mask)

    result = {
        "highlights": highlights,
        "cleaned_path": cleaned_path,
        "overlay_path": overlay_path,
        "mask_path": mask_path,
        "highlight_count": len(highlights),
    }

    print(json.dumps(result))


def main():
    parser = argparse.ArgumentParser(description="Detect highlighted regions on drawings")
    parser.add_argument("--input", required=True, help="Path to input image")
    parser.add_argument("--output-dir", required=True, help="Directory for output files")
    args = parser.parse_args()

    detect_highlights(args.input, args.output_dir)


if __name__ == "__main__":
    main()
