import io
import json
import anthropic
import pdfplumber

from app.config import settings

PARSE_SYSTEM_PROMPT = """You are a tax document parser. Extract SUMMARY-LEVEL fields from the provided tax form text.

Identify the form type and return a JSON object with:
- form_type: string (e.g. "W-2", "1099-DIV", "1099-INT", "1099-NEC", "1099-B", or "1099-CONSOLIDATED" for consolidated statements)
- fields: object containing extracted summary field values

For a W-2, extract:
  employer_name, ein, wages, federal_withheld, ss_withheld, medicare_withheld,
  state_withheld, state_wages, local_withheld, box12_code, box12_amount

For a 1099 (any type), extract only the TOP-LEVEL SUMMARY totals:
  payer_name, payer_tin, federal_withheld, and the key box totals.
  For 1099-DIV: total_ordinary_dividends, qualified_dividends, total_capital_gain_distributions
  For 1099-INT: interest_income
  For 1099-B: total_proceeds, total_cost_basis, total_realized_gain_loss
  For 1099-MISC: other_income, substitute_payments
  For consolidated forms, include summary fields from each sub-form section.

DO NOT include per-transaction detail rows. Only totals/summaries.
Return ONLY valid JSON. No markdown, no explanation, no comments.
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
        max_tokens=4096,
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
