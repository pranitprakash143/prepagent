import re
import unicodedata


def clean_text(text: str) -> str:
    if not text:
        return ""

    # Pass 1: Unicode normalization (NFC)
    text = unicodedata.normalize("NFC", text)

    # Pass 2: Replace non-breaking spaces and other weird whitespace
    text = re.sub(r"[\u00a0\u200b\u200c\u200d\ufeff]", " ", text)

    # Pass 3: Normalize line endings
    text = text.replace("\r\n", "\n").replace("\r", "\n")

    # Pass 4: Remove page numbers (common patterns: "Page 1", "- 1 -", "[1]", "1/10")
    text = re.sub(
        r"(?m)^\s*[-–—]*\s*(?:Page\s*)?\d+\s*(?:of\s*\d+)?\s*[-–—]*\s*$", "", text
    )
    text = re.sub(r"(?m)^\s*\[?\d+\s*/\s*\d+\]?\s*$", "", text)
    text = re.sub(r"(?m)^\s*[-–—]+\s*\d+\s*[-–—]+\s*$", "", text)

    # Pass 5: Remove running headers/footers (short lines at top/bottom)
    lines = text.split("\n")
    cleaned_lines = []
    for line in lines:
        stripped = line.strip()
        if stripped and len(stripped.split()) <= 3 and stripped.isupper():
            continue
        cleaned_lines.append(line)
    text = "\n".join(cleaned_lines)

    # Pass 6: Remove URLs
    text = re.sub(r"https?://\S+|www\.\S+", "", text)

    # Pass 7: Remove email addresses
    text = re.sub(r"\S+@\S+\.\S+", "", text)

    # Pass 8: Collapse repeated whitespace (tabs, multiple spaces)
    text = re.sub(r"[ \t]+", " ", text)

    # Pass 9: Remove empty lines (but keep paragraph breaks)
    text = re.sub(r"\n{3,}", "\n\n", text)

    # Pass 10: Strip leading/trailing whitespace from each line
    text = "\n".join(line.strip() for line in text.split("\n"))

    # Final: Remove leading/trailing whitespace from entire text
    text = text.strip()

    return text
