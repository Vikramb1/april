import json
import anthropic
from sqlalchemy.orm import Session

from app.config import settings
from app.database.models import (
    ChatMessage, ChatSession, TaxReturn, W2Form, Form1099, Deduction, Credit
)
from app.services.field_loader import get_field_manifest_text, get_pdf_upload_sections


def _build_user_data(db: Session, user_id: int) -> dict:
    """Build the user_data dict from DB state for field filtering.

    Returns a dict with keys matching the condition keys used in the field manifest:
      filing_status, income_types, deduction_method, has_dependents, credits, accounts
    """
    user_data: dict = {}

    # Filing status
    tax_return = db.query(TaxReturn).filter_by(user_id=user_id).first()
    if tax_return and tax_return.filing_status:
        user_data["filing_status"] = tax_return.filing_status

    # Income types — derived from what forms exist
    income_types = []
    w2s = db.query(W2Form).filter_by(user_id=user_id).all()
    if w2s:
        income_types.append("w2")
    form_1099s = db.query(Form1099).filter_by(user_id=user_id).all()
    for f in form_1099s:
        form_key = f"1099-{f.form_type}"  # e.g. "1099-NEC", "1099-INT"
        if form_key not in income_types:
            income_types.append(form_key)
        if f.form_type == "NEC":
            income_types.append("self_employment")
    if income_types:
        user_data["income_types"] = income_types

    # Deduction method
    deduction = db.query(Deduction).filter_by(user_id=user_id).first()
    if deduction and deduction.type:
        user_data["deduction_method"] = deduction.type

    # Credits and accounts
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

        # Check other_json for account types
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

SYSTEM_PROMPT_TEMPLATE = """You are April, a friendly tax filing assistant. Your job is to collect all the information needed to file a US federal tax return through FreeTaxUSA.

Guide the user conversationally through each section. Ask for one section at a time in a natural, friendly way. When the user provides data, use the save_fields tool to store it.

Required fields by section:
{field_manifest}

Sections that accept PDF uploads: {pdf_upload_sections}

When the user needs to provide a W-2 or 1099, use the request_pdf_upload tool to ask them to upload the PDF instead of entering data manually.

Rules:
- Ask for fields in section order (Personal Info → Income → Deductions → Credits → Bank Info)
- Once you have collected all fields for a section, use mark_section_complete, then move to the next
- Be conversational and clear — avoid tax jargon when possible
- If the user uploads a PDF (you'll see a system message confirming it), thank them and move on
- When all required sections are complete, congratulate the user and explain they can now submit their return
"""

TOOLS = [
    {
        "name": "save_fields",
        "description": "Save collected tax fields to the database for a given section.",
        "input_schema": {
            "type": "object",
            "properties": {
                "section": {
                    "type": "string",
                    "description": "The section name (e.g. 'Personal Information', 'W-2 Income')",
                },
                "fields": {
                    "type": "object",
                    "description": "Key-value pairs of field IDs and their collected values",
                },
            },
            "required": ["section", "fields"],
        },
    },
    {
        "name": "mark_section_complete",
        "description": "Mark a section as fully collected and move to the next.",
        "input_schema": {
            "type": "object",
            "properties": {
                "section": {
                    "type": "string",
                    "description": "The section name to mark complete",
                }
            },
            "required": ["section"],
        },
    },
    {
        "name": "request_pdf_upload",
        "description": "Tell the user to upload a PDF for W-2 or 1099 data.",
        "input_schema": {
            "type": "object",
            "properties": {
                "reason": {
                    "type": "string",
                    "description": "Human-readable reason / instruction for the upload",
                }
            },
            "required": ["reason"],
        },
    },
]


def _save_fields_to_db(db: Session, user_id: int, section: str, fields: dict):
    section_lower = section.lower()

    if "personal" in section_lower:
        tr = db.query(TaxReturn).filter_by(user_id=user_id).first()
        if not tr:
            tr = TaxReturn(user_id=user_id)
            db.add(tr)
        for k, v in fields.items():
            if hasattr(tr, k):
                setattr(tr, k, v)

    elif "w-2" in section_lower or "w2" in section_lower:
        w2 = W2Form(user_id=user_id)
        db.add(w2)
        for k, v in fields.items():
            if hasattr(w2, k):
                setattr(w2, k, v)

    elif "1099" in section_lower:
        f1099 = Form1099(
            user_id=user_id,
            form_type=fields.get("form_type", "NEC"),
            raw_json=fields,
        )
        for k, v in fields.items():
            if hasattr(f1099, k):
                setattr(f1099, k, v)
        db.add(f1099)

    elif "deduction" in section_lower:
        ded = db.query(Deduction).filter_by(user_id=user_id).first()
        if not ded:
            ded = Deduction(user_id=user_id)
            db.add(ded)
        for k, v in fields.items():
            if hasattr(ded, k):
                setattr(ded, k, v)

    elif "credit" in section_lower:
        cred = db.query(Credit).filter_by(user_id=user_id).first()
        if not cred:
            cred = Credit(user_id=user_id)
            db.add(cred)
        for k, v in fields.items():
            if hasattr(cred, k):
                setattr(cred, k, v)

    elif "bank" in section_lower or "refund" in section_lower:
        tr = db.query(TaxReturn).filter_by(user_id=user_id).first()
        if not tr:
            tr = TaxReturn(user_id=user_id)
            db.add(tr)
        if "routing" in fields:
            tr.direct_deposit_routing = fields["routing"]
        if "account" in fields:
            tr.direct_deposit_account = fields["account"]
        for k, v in fields.items():
            if hasattr(tr, k):
                setattr(tr, k, v)

    db.commit()


async def run_chat_turn(
    db: Session,
    session: ChatSession,
    user_message: str,
) -> dict:
    """
    Process one user message. Returns:
      {reply, request_pdf_upload, pdf_upload_reason, session_status}
    """
    # Persist user message
    db.add(ChatMessage(session_id=session.id, role="user", content=user_message))
    db.commit()

    # Build conversation history from DB
    history = db.query(ChatMessage).filter_by(session_id=session.id).order_by(ChatMessage.id).all()
    messages = [{"role": m.role, "content": m.content} for m in history]

    # Build user context to filter fields to only what's relevant
    user_data = _build_user_data(db, session.user_id)
    field_manifest = get_field_manifest_text(user_data if user_data else None)
    pdf_sections = ", ".join(get_pdf_upload_sections())
    system = SYSTEM_PROMPT_TEMPLATE.format(
        field_manifest=field_manifest,
        pdf_upload_sections=pdf_sections,
    )

    client = anthropic.Anthropic(api_key=settings.anthropic_api_key)

    request_pdf_upload = False
    pdf_upload_reason = None
    assistant_text = ""

    # Agentic loop: keep running until Claude stops using tools
    while True:
        response = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=2048,
            system=system,
            tools=TOOLS,
            messages=messages,
        )

        # Collect text from this response
        for block in response.content:
            if block.type == "text":
                assistant_text += block.text

        # Check stop reason
        if response.stop_reason == "end_turn":
            break

        if response.stop_reason == "tool_use":
            # Append assistant message with all content blocks
            messages.append({
                "role": "assistant",
                "content": [b.model_dump() for b in response.content],
            })

            tool_results = []
            for block in response.content:
                if block.type != "tool_use":
                    continue

                tool_name = block.name
                tool_input = block.input

                if tool_name == "save_fields":
                    _save_fields_to_db(
                        db,
                        session.user_id,
                        tool_input["section"],
                        tool_input["fields"],
                    )
                    result_content = "Fields saved successfully."

                elif tool_name == "mark_section_complete":
                    session.current_section = tool_input["section"]
                    db.commit()
                    result_content = f"Section '{tool_input['section']}' marked complete."

                elif tool_name == "request_pdf_upload":
                    request_pdf_upload = True
                    pdf_upload_reason = tool_input["reason"]
                    result_content = "PDF upload requested."

                else:
                    result_content = f"Unknown tool: {tool_name}"

                tool_results.append({
                    "type": "tool_result",
                    "tool_use_id": block.id,
                    "content": result_content,
                })

            messages.append({"role": "user", "content": tool_results})
            continue

        # Any other stop reason — break
        break

    # Persist final assistant reply
    if assistant_text:
        db.add(ChatMessage(session_id=session.id, role="assistant", content=assistant_text))
        db.commit()

    return {
        "reply": assistant_text,
        "request_pdf_upload": request_pdf_upload,
        "pdf_upload_reason": pdf_upload_reason,
        "session_status": session.status,
    }
