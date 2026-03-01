import json
import logging
from openai import OpenAI
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

from app.config import settings
from app.database.models import (
    ChatMessage, ChatSession, TaxReturn, W2Form, Form1099, Deduction, Credit
)
from app.services.field_loader import get_field_manifest_text, get_pdf_upload_sections

MODEL = "gpt-5.2"

# ── Snapshot helpers (DB → dict matching frontend TypeScript interfaces) ─────

_SNAP_EXCLUDE = {
    'extra_data', 'raw_json', 'pdf_data', 'other_json',
    'created_at', 'updated_at', 'user_id',
    'other_income', 'dependents', 'misc_info', 'state_info',
}
_SNAP_TR_RENAMES = {
    'dob': 'date_of_birth',
    'direct_deposit_routing': 'bank_routing_number',
    'direct_deposit_account': 'bank_account_number',
}
_SNAP_W2_RENAMES = {
    'federal_withheld': 'federal_tax_withheld',
    'ss_withheld': 'social_security_tax_withheld',
    'medicare_withheld': 'medicare_tax_withheld',
    'state_withheld': 'state_tax_withheld',
    'local_withheld': 'local_tax',
    'box12_code': 'box12_code1',
    'box12_amount': 'box12_amount1',
}


def _snap_row(obj, renames: dict | None = None) -> dict | None:
    if obj is None:
        return None
    base = {}
    for col in obj.__table__.columns:
        if col.name in _SNAP_EXCLUDE:
            continue
        key = (renames or {}).get(col.name, col.name)
        base[key] = getattr(obj, col.name)
    overflow = getattr(obj, 'extra_data', None) or getattr(obj, 'raw_json', None) or {}
    if not isinstance(overflow, dict):
        overflow = {}
    return {**base, **overflow}


def _snap_ded(ded) -> dict | None:
    if ded is None:
        return None
    base = {
        'cash_donations': ded.charitable_cash,
        'mortgage_interest': ded.mortgage_interest,
        'student_loan_interest': ded.student_loan_interest,
    }
    other = ded.other_json or {}
    result = {k: v for k, v in base.items() if v is not None}
    result.update(other)
    return result


def _snap_cred(cred) -> dict | None:
    if cred is None:
        return None
    base = {'eic_qualifying_children': cred.eitc_qualifying_children}
    other = cred.other_json or {}
    result = {k: v for k, v in base.items() if v is not None}
    result.update(other)
    return result


def _build_snapshot(db: Session, user_id: int) -> dict:
    """Return the full current user data as a dict for direct frontend hydration."""
    tr = db.query(TaxReturn).filter_by(user_id=user_id).first()
    w2s = db.query(W2Form).filter_by(user_id=user_id).all()
    f1099s = db.query(Form1099).filter_by(user_id=user_id).all()
    ded = db.query(Deduction).filter_by(user_id=user_id).first()
    cred = db.query(Credit).filter_by(user_id=user_id).first()
    return {
        'tax_return': _snap_row(tr, _SNAP_TR_RENAMES),
        'w2_forms': [_snap_row(w, _SNAP_W2_RENAMES) for w in w2s],
        'form_1099s': [_snap_row(f) for f in f1099s],
        'deductions': _snap_ded(ded),
        'credits': _snap_cred(cred),
        'other_income': tr.other_income if tr else None,
        'dependents': list(tr.dependents or []) if tr else [],
        'misc_info': tr.misc_info if tr else None,
        'state_info': tr.state_info if tr else None,
    }


# Only actual DB columns on TaxReturn (everything else → extra_data)
_TR_COLUMN_MAP = {
    "first_name", "last_name", "ssn", "dob", "date_of_birth",
    "address", "occupation", "filing_status",
    "direct_deposit_routing", "direct_deposit_account",
}


def _build_existing_data_summary(db: Session, user_id: int) -> str:
    lines = []
    tr = db.query(TaxReturn).filter_by(user_id=user_id).first()
    if tr:
        if tr.first_name:
            lines.append(f"- Name: {tr.first_name} {tr.last_name or ''}")
        if tr.ssn:
            lines.append("- SSN: collected")
        if tr.dob:
            lines.append(f"- DOB: {tr.dob}")
        if tr.address:
            ed = tr.extra_data or {}
            city = ed.get('city', '')
            state = ed.get('state', '')
            lines.append(f"- Address: {tr.address}, {city} {state}")
        if tr.occupation:
            lines.append(f"- Occupation: {tr.occupation}")
        if tr.filing_status:
            lines.append(f"- Filing status: {tr.filing_status}")
        ed = tr.extra_data or {}
        if ed.get("identity_protection_pin"):
            lines.append("- Identity Protection PIN: collected")
        if ed.get("spouse_first_name"):
            lines.append("- Spouse info: collected")
        if tr.other_income:
            lines.append("- Other income: collected")
        if tr.dependents:
            lines.append(f"- Dependents: {len(tr.dependents)} collected")
        if tr.misc_info:
            lines.append("- Misc info: collected")
        if tr.state_info:
            lines.append("- State info: collected")
        if tr.direct_deposit_routing:
            lines.append("- Bank info: collected")
    w2s = db.query(W2Form).filter_by(user_id=user_id).all()
    for w in w2s:
        lines.append(f"- W-2: {w.employer_name or 'employer'}, wages ${w.wages or '?'}")
    f1099s = db.query(Form1099).filter_by(user_id=user_id).all()
    for f in f1099s:
        lines.append(f"- 1099-{f.form_type}: {f.payer_name or 'payer'}, amount ${f.amount or '?'}")
    ded = db.query(Deduction).filter_by(user_id=user_id).first()
    if ded:
        lines.append(f"- Deductions: {ded.type or 'type unknown'}")
    cred = db.query(Credit).filter_by(user_id=user_id).first()
    if cred:
        lines.append("- Credits: collected")
    return "\n".join(lines) if lines else "No data collected yet — fresh return."


SYSTEM_PROMPT_TEMPLATE = """You are April, a warm and expert CPA helping a client file their US federal income tax return for the 2025 tax year through FreeTaxUSA. You have 20+ years of experience and you speak plainly — no jargon.

## YOUR MISSION
Collect tax data conversationally and save it to the database immediately as the user provides it. Move through sections in order. After every user reply, call save_fields with ALL fields extracted from that reply, then call navigate_to_section, then ask the next question.

## SECTION ORDER
1. personal-info — name, SSN, DOB, address, occupation
2. filing-status — filing status, spouse info if MFJ
3. dependents — only if they have dependents
4. identity-protection — only if they have an IRS IP PIN
5. w2-income — W-2 wages from each employer
6. 1099-income — 1099-NEC, 1099-INT, 1099-DIV, 1099-B
7. other-income — unemployment, SSA, retirement, crypto, investments
8. deductions — standard vs itemized
9. health-insurance — ACA/Marketplace coverage
10. common-credits — IRA, student loan, teacher expenses, EIC, child care
11. other-credits — HSA, adoption, clean vehicle, etc.
12. misc-forms — estimated payments, foreign accounts
13. refund-maximizer — optimization preference
14. state-residency — state residency questions
15. state-return — state-specific income
16. bank-refund — direct deposit info
17. review — phone number

## FIELD EXTRACTION — THIS IS THE MOST IMPORTANT RULE
When a user's reply contains multiple pieces of information, extract ALL of them in a single save_fields call. Never ask for something the user already told you.

Examples:
- User says "lebron james jr" → save {{first_name: "Lebron", last_name: "James", suffix: "JR"}} in one save_fields call. Do NOT then ask "what's your first name?" — you already have it.
- User says "123 Main St, Austin TX 78701" → save {{address: "123 Main St", city: "Austin", state: "TX", zip_code: "78701"}} in one call.
- User says "software engineer, born March 5 1990" → save {{occupation: "Software Engineer", date_of_birth: "1990-03-05"}} in one call.
- User says "google, $120000 wages, $28000 federal withheld" → save all W-2 fields in one call.

Name parsing rules:
- "first last" → first_name, last_name
- "first last jr/sr/ii/iii" → first_name, last_name, suffix (uppercase: JR/SR/II/III)
- "first middle last" → first_name, middle_initial (first letter), last_name
- Capitalize first letter of first and last name when saving.

## CONVERSATION FLOW
Ask one focused question at a time, but save everything the user includes in their answer. Good questions:
- "What's your full legal name?" (accepts "John Smith" or "John A. Smith Jr." — save all parts)
- "What's your SSN?" (single sensitive field — ask alone)
- "What's your date of birth?" (single field — ask alone)
- "What's your street address, city, state, and zip?" (one natural question covering 4 fields)
- "What's your occupation?"

Never re-ask for a field the user already provided. If user gave full name "lebron james jr", go straight to SSN next.

## SMART SKIPPING
- Before dependents: ask "Do you have any children or other dependents on your return?" Skip the section if No.
- Before identity-protection: ask "Do you have an IRS Identity Protection PIN (IP PIN)?" Skip if No.
- For deductions: ask "Do you own a home, have significant charitable donations, or large medical bills?" If No, save {{type: "standard"}} and skip itemized questions.

## SAVE_FIELDS SECTION KEYS — use exactly these strings:
personal-info, filing-status, dependents, identity-protection, w2-income, 1099-income, other-income, deductions, health-insurance, common-credits, other-credits, misc-forms, refund-maximizer, state-residency, state-return, bank-refund, review

## FIELD MANIFEST
{field_manifest}

## PDF UPLOADS
Sections accepting PDF uploads: {pdf_upload_sections}
When collecting W-2 or 1099 data, offer: "You can type the numbers from your form, or upload the PDF and I'll read it for you." Use request_pdf_upload if they want to upload.

## DATA FORMAT
- SSN: must be exactly 9 digits. Valid: "123456789" or "123-45-6789". Reject anything else — "That doesn't look like a valid SSN (should be 9 digits). Could you re-enter it?"
- Dates: store as YYYY-MM-DD
- Dollar amounts: numeric only, no $ signs
- Filing status: "Single", "Married Filing Jointly", "Married Filing Separately", "Head of Household", "Qualifying Surviving Spouse"
- Yes/No fields: store as the strings "Yes" or "No"

## PERSONA
- Warm, efficient, professional. Vary your responses — don't repeat the same opener.
- When all sections are done, congratulate warmly and tell them they're ready to file.

## FIRST MESSAGE BEHAVIOR
If the user's message is "start" or it's the very first message:

"Hi there! I'm April, your personal tax filing assistant. I'll walk you through your 2025 federal tax return — it usually takes about 5 minutes, and even faster if you've filed with us before (under a minute!).

What's your full legal name?"

## ALREADY COLLECTED (skip these — do not re-ask)
{existing_data_summary}
"""

TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "save_fields",
            "description": "Save collected tax data to the database for a given section. Call immediately after gathering all required fields for a section. Use the exact section key strings from the system prompt.",
            "parameters": {
                "type": "object",
                "properties": {
                    "section": {"type": "string", "description": "Section key, e.g. 'personal-info', 'w2-income'"},
                    "fields": {"type": "object", "description": "Key-value pairs of field IDs and collected values"},
                },
                "required": ["section", "fields"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "navigate_to_section",
            "description": "Tell the frontend to display a specific section. Call after save_fields so the user sees the section that was just filled. Use the exact 17 section key strings from the system prompt.",
            "parameters": {
                "type": "object",
                "properties": {
                    "section": {"type": "string", "description": "Section key to navigate to"},
                },
                "required": ["section"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "request_pdf_upload",
            "description": "Ask the user to upload a PDF document for W-2 or 1099 data extraction.",
            "parameters": {
                "type": "object",
                "properties": {
                    "reason": {"type": "string", "description": "Human-readable instruction for the upload"},
                },
                "required": ["reason"],
            },
        },
    },
]


def _save_fields_to_db(db: Session, user_id: int, section: str, fields: dict):
    """Route collected fields to the correct DB table/column based on section key."""

    def _get_or_create_tr() -> TaxReturn:
        tr = db.query(TaxReturn).filter_by(user_id=user_id).first()
        if not tr:
            tr = TaxReturn(user_id=user_id)
            db.add(tr)
        return tr

    def _get_or_create_ded() -> Deduction:
        ded = db.query(Deduction).filter_by(user_id=user_id).first()
        if not ded:
            ded = Deduction(user_id=user_id)
            db.add(ded)
        return ded

    def _get_or_create_cred() -> Credit:
        cred = db.query(Credit).filter_by(user_id=user_id).first()
        if not cred:
            cred = Credit(user_id=user_id)
            db.add(cred)
        return cred

    if section == "personal-info":
        tr = _get_or_create_tr()
        ed = dict(tr.extra_data or {})

        # Normalize common field name variations the model might use
        _field_aliases = {
            "first": "first_name", "fname": "first_name",
            "last": "last_name", "lname": "last_name", "surname": "last_name",
            "middle": "middle_initial", "middle_name": "middle_initial",
            "dob": "date_of_birth", "birthday": "date_of_birth", "birth_date": "date_of_birth",
            "zip": "zip_code", "postal_code": "zip_code",
            "street": "address", "street_address": "address",
            "apt_number": "apt", "apartment": "apt",
            "job": "occupation", "profession": "occupation",
            "phone": "phone_option",
        }
        normalized = {}
        for k, v in fields.items():
            normalized[_field_aliases.get(k, k)] = v

        # If model gave full_name/name as a single string, split it
        for name_key in ("full_name", "name", "legal_name"):
            if name_key in normalized and isinstance(normalized[name_key], str):
                parts = normalized.pop(name_key).split()
                _suffixes = {"jr", "sr", "ii", "iii", "iv", "v", "jr.", "sr."}
                if parts and parts[-1].lower().rstrip(".") in _suffixes:
                    normalized.setdefault("suffix", parts.pop().upper().rstrip("."))
                if len(parts) >= 2:
                    normalized.setdefault("first_name", parts[0].capitalize())
                    normalized.setdefault("last_name", parts[-1].capitalize())
                    if len(parts) == 3:
                        normalized.setdefault("middle_initial", parts[1][0].upper())
                elif len(parts) == 1:
                    normalized.setdefault("first_name", parts[0].capitalize())

        # middle_initial: keep only first letter
        if "middle_initial" in normalized and isinstance(normalized["middle_initial"], str):
            normalized["middle_initial"] = normalized["middle_initial"][0].upper() if normalized["middle_initial"] else ""

        for k, v in normalized.items():
            if k in _TR_COLUMN_MAP:
                col = "dob" if k == "date_of_birth" else k
                setattr(tr, col, v)
            else:
                ed[k] = v
        tr.extra_data = ed

    elif section == "filing-status":
        tr = _get_or_create_tr()
        ed = dict(tr.extra_data or {})
        for k, v in fields.items():
            if k == "filing_status":
                tr.filing_status = v
            else:
                ed[k] = v
        tr.extra_data = ed

    elif section == "dependents":
        tr = _get_or_create_tr()
        existing = list(tr.dependents or [])
        if isinstance(fields, list):
            existing = fields
        else:
            existing.append(fields)
        tr.dependents = existing

    elif section == "identity-protection":
        tr = _get_or_create_tr()
        ed = dict(tr.extra_data or {})
        ed.update(fields)
        tr.extra_data = ed

    elif section == "w2-income":
        w2 = W2Form(user_id=user_id)
        db.add(w2)
        ed: dict = {}
        # Column aliases
        _w2_alias = {
            "federal_tax_withheld": "federal_withheld",
            "social_security_tax_withheld": "ss_withheld",
            "medicare_tax_withheld": "medicare_withheld",
            "state_tax_withheld": "state_withheld",
            "box12_code1": "box12_code",
            "box12_amount1": "box12_amount",
        }
        for k, v in fields.items():
            col = _w2_alias.get(k, k)
            if hasattr(w2, col):
                setattr(w2, col, v)
            else:
                ed[k] = v
        w2.extra_data = ed

    elif section == "1099-income":
        # Strip "1099-" prefix if present in form_type value
        form_type_raw = fields.get("form_type", fields.get("type", "NEC"))
        form_type = str(form_type_raw).replace("1099-", "").upper()
        f1099 = Form1099(user_id=user_id, form_type=form_type, raw_json=fields)
        db.add(f1099)
        for k, v in fields.items():
            if hasattr(f1099, k):
                setattr(f1099, k, v)

    elif section == "other-income":
        tr = _get_or_create_tr()
        existing = dict(tr.other_income or {})
        existing.update(fields)
        tr.other_income = existing

    elif section == "deductions":
        ded = _get_or_create_ded()
        other = dict(ded.other_json or {})
        # Map TS field names → DB column names for the few explicit columns
        _ded_col_map = {
            "type": "type",
            "mortgage_interest": "mortgage_interest",
            "charitable_cash": "charitable_cash",
            "cash_donations": "charitable_cash",        # TS name alias
            "student_loan_interest": "student_loan_interest",
        }
        for k, v in fields.items():
            if k in _ded_col_map:
                setattr(ded, _ded_col_map[k], v)
            else:
                other[k] = v
        ded.other_json = other

    elif section in ("health-insurance", "common-credits", "other-credits"):
        cred = _get_or_create_cred()
        other = dict(cred.other_json or {})
        # Map TS field names → DB column names for the few explicit columns
        _cred_col_map = {
            "child_tax_credit_count": "child_tax_credit_count",
            "education_credit_type": "education_credit_type",
            "eitc_qualifying_children": "eitc_qualifying_children",
            "eic_qualifying_children": "eitc_qualifying_children",  # TS name alias
        }
        for k, v in fields.items():
            if k in _cred_col_map:
                setattr(cred, _cred_col_map[k], v)
            else:
                other[k] = v
        cred.other_json = other

    elif section in ("misc-forms", "refund-maximizer"):
        tr = _get_or_create_tr()
        existing = dict(tr.misc_info or {})
        existing.update(fields)
        tr.misc_info = existing

    elif section in ("state-residency", "state-return"):
        tr = _get_or_create_tr()
        existing = dict(tr.state_info or {})
        existing.update(fields)
        tr.state_info = existing

    elif section == "bank-refund":
        tr = _get_or_create_tr()
        ed = dict(tr.extra_data or {})
        for k, v in fields.items():
            if k == "routing":
                tr.direct_deposit_routing = v
            elif k == "account":
                tr.direct_deposit_account = v
            elif k in _TR_COLUMN_MAP:
                setattr(tr, k, v)
            else:
                ed[k] = v
        tr.extra_data = ed

    elif section == "review":
        tr = _get_or_create_tr()
        ed = dict(tr.extra_data or {})
        ed.update(fields)
        tr.extra_data = ed

    else:
        # Unknown section: fallback to extra_data
        tr = _get_or_create_tr()
        ed = dict(tr.extra_data or {})
        ed[section] = fields
        tr.extra_data = ed

    db.commit()


def _build_user_data(db: Session, user_id: int) -> dict:
    """Build the user_data dict from DB state for field manifest filtering."""
    user_data: dict = {}

    tax_return = db.query(TaxReturn).filter_by(user_id=user_id).first()
    if tax_return and tax_return.filing_status:
        user_data["filing_status"] = tax_return.filing_status

    income_types = []
    w2s = db.query(W2Form).filter_by(user_id=user_id).all()
    if w2s:
        income_types.append("w2")
    form_1099s = db.query(Form1099).filter_by(user_id=user_id).all()
    for f in form_1099s:
        form_key = f"1099-{f.form_type}"
        if form_key not in income_types:
            income_types.append(form_key)
        if f.form_type == "NEC":
            income_types.append("self_employment")
    if income_types:
        user_data["income_types"] = income_types

    deduction = db.query(Deduction).filter_by(user_id=user_id).first()
    if deduction and deduction.type:
        user_data["deduction_method"] = deduction.type

    credit = db.query(Credit).filter_by(user_id=user_id).first()
    if credit:
        active_credits = []
        if credit.education_credit_type:
            active_credits.append("education")
        if credit.child_tax_credit_count and credit.child_tax_credit_count > 0:
            active_credits.append("child_tax_credit")
        if credit.eitc_qualifying_children is not None:
            active_credits.append("eitc")
        if active_credits:
            user_data["credits"] = active_credits
        if credit.other_json:
            accounts = []
            other = credit.other_json if isinstance(credit.other_json, dict) else {}
            if other.get("hsa"):
                accounts.append("hsa")
            if other.get("ira"):
                accounts.append("ira")
            if accounts:
                user_data["accounts"] = accounts

    return user_data


async def run_chat_turn(
    db: Session,
    session: ChatSession,
    user_message: str,
) -> dict:
    """
    Process one user message. Returns:
      {reply, request_pdf_upload, pdf_upload_reason, session_status, navigate_to_section}
    """
    # Persist user message
    db.add(ChatMessage(session_id=session.id, role="user", content=user_message))
    db.commit()

    # Build conversation history from DB
    history = db.query(ChatMessage).filter_by(session_id=session.id).order_by(ChatMessage.id).all()

    # Build user context to filter fields to only what's relevant
    user_data = _build_user_data(db, session.user_id)
    field_manifest = get_field_manifest_text(user_data if user_data else None)
    pdf_sections = ", ".join(get_pdf_upload_sections())
    existing_data_summary = _build_existing_data_summary(db, session.user_id)
    system = SYSTEM_PROMPT_TEMPLATE.format(
        field_manifest=field_manifest,
        pdf_upload_sections=pdf_sections,
        existing_data_summary=existing_data_summary,
    )

    # System prompt as first message, then full chat history
    messages = [{"role": "system", "content": system}]
    messages += [{"role": m.role, "content": m.content} for m in history]

    client = OpenAI(api_key=settings.openai_api_key)

    request_pdf_upload = False
    pdf_upload_reason = None
    assistant_text = ""
    navigate_to_section_value = None
    fields_were_saved = False

    # Agentic loop: keep running until the model stops using tools
    while True:
        response = client.chat.completions.create(
            model=MODEL,
            max_completion_tokens=2048,
            messages=messages,
            tools=TOOLS,
            tool_choice="auto",
        )

        message = response.choices[0].message
        finish_reason = response.choices[0].finish_reason

        # Collect any text content from this turn
        if message.content:
            assistant_text += message.content

        if finish_reason == "stop":
            break

        if finish_reason == "tool_calls" and message.tool_calls:
            # Append assistant message (with tool_calls) to history
            messages.append({
                "role": "assistant",
                "content": message.content,
                "tool_calls": [
                    {
                        "id": tc.id,
                        "type": "function",
                        "function": {
                            "name": tc.function.name,
                            "arguments": tc.function.arguments,
                        },
                    }
                    for tc in message.tool_calls
                ],
            })

            # Process each tool call and append results
            for tool_call in message.tool_calls:
                tool_name = tool_call.function.name
                tool_input = json.loads(tool_call.function.arguments)

                if tool_name == "save_fields":
                    section_key = tool_input.get("section", "")
                    # Model sometimes sends a flat dict instead of nested "fields"
                    fields_data = tool_input.get("fields") or {
                        k: v for k, v in tool_input.items() if k != "section"
                    }
                    logger.info("save_fields: section=%s fields=%s", section_key, fields_data)
                    if section_key and fields_data:
                        _save_fields_to_db(db, session.user_id, section_key, fields_data)
                        fields_were_saved = True
                        result_content = "Fields saved successfully."
                    else:
                        result_content = f"save_fields called with unexpected args: {tool_input}"

                elif tool_name == "navigate_to_section":
                    navigate_to_section_value = tool_input["section"]
                    session.current_section = tool_input["section"]
                    db.commit()
                    result_content = f"Navigation set to '{tool_input['section']}'."

                elif tool_name == "mark_section_complete":
                    # Legacy no-op kept for backwards compatibility
                    result_content = "ok"

                elif tool_name == "request_pdf_upload":
                    request_pdf_upload = True
                    pdf_upload_reason = tool_input["reason"]
                    result_content = "PDF upload requested."

                else:
                    result_content = f"Unknown tool: {tool_name}"

                messages.append({
                    "role": "tool",
                    "tool_call_id": tool_call.id,
                    "content": result_content,
                })

            continue

        # Any other finish reason — break
        break

    # Persist final assistant reply
    if assistant_text:
        db.add(ChatMessage(session_id=session.id, role="assistant", content=assistant_text))
        db.commit()

    # Build snapshot of current DB state so frontend can update UI directly
    snapshot = _build_snapshot(db, session.user_id) if fields_were_saved else None

    return {
        "reply": assistant_text,
        "request_pdf_upload": request_pdf_upload,
        "pdf_upload_reason": pdf_upload_reason,
        "session_status": session.status,
        "navigate_to_section": navigate_to_section_value,
        "snapshot": snapshot,
    }
