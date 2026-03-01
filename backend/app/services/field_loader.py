import json
from pathlib import Path
from functools import lru_cache
from typing import Any

FIELDS_PATH = Path(__file__).parent.parent.parent / "data" / "freetaxusa_fields.json"


@lru_cache(maxsize=1)
def load_fields() -> dict[str, Any]:
    if not FIELDS_PATH.exists():
        return {"sections": [], "pdf_upload_sections": [], "scanned_at": None}
    with open(FIELDS_PATH) as f:
        return json.load(f)


def get_all_required_fields() -> list[dict[str, Any]]:
    """Return flat list of all required fields across all sections."""
    data = load_fields()
    required = []
    for section in data.get("sections", []):
        for field in section.get("fields", []):
            if field.get("required"):
                required.append({
                    "section": section["name"],
                    "id": field["id"],
                    "label": field["label"],
                    "type": field["type"],
                })
    return required


def get_sections() -> list[dict[str, Any]]:
    return load_fields().get("sections", [])


def get_pdf_upload_sections() -> list[str]:
    return load_fields().get("pdf_upload_sections", [])


def get_field_manifest_text() -> str:
    """Return a compact text representation of all fields for use in prompts."""
    sections = get_sections()
    lines = []
    for section in sections:
        lines.append(f"\n## {section['name']}")
        for field in section.get("fields", []):
            req = " (required)" if field.get("required") else ""
            lines.append(f"  - {field['id']}: {field['label']} [{field['type']}]{req}")
    return "\n".join(lines)
