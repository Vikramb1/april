import json
from pathlib import Path
from functools import lru_cache
from typing import Any

FIELDS_PATH = Path(__file__).parent.parent.parent / "data" / "freetaxusa_fields.json"


@lru_cache(maxsize=1)
def load_fields() -> dict[str, Any]:
    if not FIELDS_PATH.exists():
        return {"pages": [], "pdf_upload_sections": [], "scanned_at": None}
    with open(FIELDS_PATH) as f:
        return json.load(f)


def _field_matches_user(field: dict, user_data: dict) -> bool:
    """Check if a field's conditions are satisfied by the user's data.

    A field with no conditions (baseline) always matches.
    A field with conditions matches if ANY condition key is satisfied:
      - List values (e.g. filing_status, income_types): user's value is in the list
      - Boolean values (e.g. has_dependents): user's value matches
    """
    conditions = field.get("conditions")
    if not conditions:
        return True  # Baseline field — always shown

    for key, required_values in conditions.items():
        user_value = user_data.get(key)
        if user_value is None:
            continue

        if isinstance(required_values, bool):
            if user_value == required_values:
                return True
        elif isinstance(required_values, list):
            if isinstance(user_value, list):
                if set(user_value) & set(required_values):
                    return True
            elif user_value in required_values:
                return True

    return False


def _page_matches_user(page: dict, user_data: dict) -> bool:
    """Check if a page-level condition is satisfied by user data."""
    conditions = page.get("conditions")
    if not conditions:
        return True
    return _field_matches_user({"conditions": conditions}, user_data)


def get_pages() -> list[dict[str, Any]]:
    """Return all pages from the manifest."""
    return load_fields().get("pages", [])


def get_pages_for_user(user_data: dict) -> list[dict[str, Any]]:
    """Return pages and fields filtered to match the user's situation.

    Args:
        user_data: Dict describing what the user has told us so far. Keys:
            - filing_status: str ("single", "married_filing_jointly", etc.)
            - income_types: list[str] (["w2", "1099-NEC", "1099-INT", ...])
            - deduction_method: str ("standard" or "itemized")
            - has_dependents: bool
            - credits: list[str] (["education", "child_tax_credit", "eitc"])
            - accounts: list[str] (["hsa", "ira"])

    Returns:
        List of page dicts with only matching fields included, sorted by page_order.
    """
    data = load_fields()
    filtered_pages = []

    for page in data.get("pages", []):
        if not _page_matches_user(page, user_data):
            continue

        matching_fields = [
            f for f in page.get("fields", [])
            if _field_matches_user(f, user_data)
        ]

        if matching_fields:
            filtered_pages.append({
                "page_title": page.get("page_title"),
                "page_url_pattern": page.get("page_url_pattern"),
                "section": page.get("section"),
                "page_order": page.get("page_order"),
                "fields": matching_fields,
            })

    filtered_pages.sort(key=lambda p: p.get("page_order") or 999)
    return filtered_pages


def get_all_required_fields() -> list[dict[str, Any]]:
    """Return flat list of all required fields across all pages."""
    data = load_fields()
    required = []
    for page in data.get("pages", []):
        for field in page.get("fields", []):
            if field.get("required"):
                required.append({
                    "section": page.get("section", page.get("page_title")),
                    "page": page.get("page_title"),
                    "id": field["id"],
                    "label": field["label"],
                    "type": field["type"],
                })
    return required


def get_required_fields_for_user(user_data: dict) -> list[dict[str, Any]]:
    """Return flat list of required fields filtered to the user's situation."""
    pages = get_pages_for_user(user_data)
    required = []
    for page in pages:
        for field in page.get("fields", []):
            if field.get("required"):
                required.append({
                    "section": page.get("section", page.get("page_title")),
                    "page": page.get("page_title"),
                    "id": field["id"],
                    "label": field["label"],
                    "type": field["type"],
                })
    return required


def get_pdf_upload_sections() -> list[str]:
    return load_fields().get("pdf_upload_sections", [])


def get_field_manifest_text(user_data: dict | None = None) -> str:
    """Return a compact text representation of fields for use in prompts.

    If user_data is provided, only includes fields matching the user's situation.
    Otherwise includes all fields.
    """
    if user_data is not None:
        pages = get_pages_for_user(user_data)
    else:
        pages = get_pages()

    lines = []
    current_section = None
    for page in pages:
        section = page.get("section", "Other")
        if section != current_section:
            lines.append(f"\n# {section}")
            current_section = section
        lines.append(f"\n## {page.get('page_title', 'Unknown Page')}")
        for field in page.get("fields", []):
            req = " (required)" if field.get("required") else ""
            options = ""
            if field.get("options"):
                options = f" options={field['options']}"
            lines.append(f"  - {field['id']}: {field['label']} [{field['type']}]{req}{options}")
    return "\n".join(lines)
