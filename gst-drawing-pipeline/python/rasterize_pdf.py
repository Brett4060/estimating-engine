"""
Convert PDF pages to PNG images using pdf2image (poppler).

Usage:
    python rasterize_pdf.py --input <pdf_path> --output-dir <dir> --dpi 300 [--poppler-path <path>]

Outputs JSON to stdout:
    { "pages": ["page_001.png", "page_002.png", ...] }
"""

import argparse
import json
import os
import sys


def rasterize_pdf(input_path, output_dir, dpi, poppler_path=None):
    """Convert a PDF to a list of PNG page images."""

    try:
        from pdf2image import convert_from_path
    except ImportError:
        print(json.dumps({"error": "pdf2image not installed. Run: pip install pdf2image"}), file=sys.stderr)
        sys.exit(1)

    os.makedirs(output_dir, exist_ok=True)

    kwargs = {
        "dpi": dpi,
        "fmt": "png",
        "output_folder": output_dir,
        "output_file": "page",
        "paths_only": True,
    }

    if poppler_path:
        kwargs["poppler_path"] = poppler_path

    try:
        page_paths = convert_from_path(input_path, **kwargs)
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)

    # Rename to consistent naming: page_001.png, page_002.png, ...
    renamed = []
    for i, old_path in enumerate(page_paths):
        new_name = f"page_{i + 1:03d}.png"
        new_path = os.path.join(output_dir, new_name)
        if old_path != new_path:
            os.rename(old_path, new_path)
        renamed.append(new_name)

    result = {"pages": renamed}
    print(json.dumps(result))


def main():
    parser = argparse.ArgumentParser(description="Rasterize PDF to PNG pages")
    parser.add_argument("--input", required=True, help="Path to input PDF")
    parser.add_argument("--output-dir", required=True, help="Directory for output page images")
    parser.add_argument("--dpi", type=int, default=300, help="Resolution (default 300)")
    parser.add_argument("--poppler-path", default=None, help="Path to poppler bin directory")
    args = parser.parse_args()

    rasterize_pdf(args.input, args.output_dir, args.dpi, args.poppler_path)


if __name__ == "__main__":
    main()
