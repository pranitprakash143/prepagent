import logging
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)


def extract_text_from_image(file_path: Path) -> Optional[str]:
    try:
        import cv2
        import pytesseract
        import numpy as np
    except ImportError:
        logger.error(
            "OpenCV or pytesseract not installed. "
            "Install: pip install opencv-python-headless pytesseract"
        )
        return None

    try:
        img = cv2.imread(str(file_path))
        if img is None:
            logger.warning("Failed to load image: %s", file_path)
            return None

        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

        denoised = cv2.fastNlMeansDenoising(gray, h=30)

        _, thresh = cv2.threshold(denoised, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)

        custom_config = r"--oem 3 --psm 6"
        text = pytesseract.image_to_string(thresh, config=custom_config)

        return text.strip() or None

    except Exception as exc:
        logger.exception("OCR failed for %s: %s", file_path, exc)
        return None
