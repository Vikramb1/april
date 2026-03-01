import io
import json
import anthropic
import pdfplumber

from app.config import settings

PARSE_SYSTEM_PROMPT = """You are a tax document parser. Extract all fields from the provided tax form text.

Identify the form type (W-2, 1099-NEC, 1099-INT, 1099-DIV, or 1099-B) and return a JSON object with:
- form_type: string (one of: W-2, 1099-NEC, 1099-INT, 1099-DIV, 1099-B)
- fields: object containing all extracted field values

For a W-2, extract:
  employer_name, ein, wages, federal_withheld, ss_withheld, medicare_withheld,
  state_withheld, state_wages, local_withheld, box12_code, box12_amount

For a 1099, extract:
  payer_name, payer_tin, amount, federal_withheld, and any type-specific fields

Return ONLY valid JSON. No markdown, no explanation.
"""


def extract_text_from_pdf(pdf_bytes: bytes) -> str:
    with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
        pages = [page.extract_text() or "" for page in pdf.pages]
    return "\n\n".join(pages)


async def parse_tax_pdf(pdf_bytes: bytes) -> dict:
    text = extract_text_from_pdf(pdf_bytes)

    client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
    message = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1024,
        system=PARSE_SYSTEM_PROMPT,
        messages=[
            {
                "role": "user",
                "content": f"Extract all fields from this tax form:\n\n{text}",
            }
        ],
    )

    raw = message.content[0].text.strip()
    # Strip markdown code fences if present
    if raw.startswith("```"):
        raw = raw.split("\n", 1)[1]  # remove ```json line
        raw = raw.rsplit("```", 1)[0]  # remove closing ```
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        # Try to fix common JSON issues (trailing commas, comments)
        import re
        cleaned = re.sub(r'//.*?$', '', raw, flags=re.MULTILINE)  # remove line comments
        cleaned = re.sub(r',\s*([}\]])', r'\1', cleaned)  # remove trailing commas
        return json.loads(cleaned)
