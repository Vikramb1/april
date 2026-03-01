import json
from typing import Any, Optional

from browser_use import Agent, Browser
from langchain_anthropic import ChatAnthropic
from sqlalchemy.orm import Session

from app.config import settings
from app.database.models import TaxReturn, W2Form, Form1099, Deduction, Credit
from app.services.field_loader import get_sections

SECTION_TASK_TEMPLATE = """You are filling out a tax return on FreeTaxUSA.

Navigate to the '{section_name}' section if not already there.
Fill in these fields using the provided data exactly — do not change or omit any values:

{data_json}

When all fields in this section are filled, click Next or Continue and stop.
Do NOT proceed to the next section after clicking Next.
Do NOT click the final Submit or File button under any circumstances.
"""


def build_section_task(section_name: str, data: Any) -> str:
    return SECTION_TASK_TEMPLATE.format(
        section_name=section_name,
        data_json=json.dumps(data, indent=2, default=str),
    )


def _load_user_data(db: Session, user_id: int) -> dict[str, Any]:
    tr = db.query(TaxReturn).filter_by(user_id=user_id).first()
    w2s = db.query(W2Form).filter_by(user_id=user_id).all()
    f1099s = db.query(Form1099).filter_by(user_id=user_id).all()
    ded = db.query(Deduction).filter_by(user_id=user_id).first()
    cred = db.query(Credit).filter_by(user_id=user_id).first()

    def row_to_dict(obj) -> Optional[dict]:
        if obj is None:
            return None
        return {
            c.name: getattr(obj, c.name)
            for c in obj.__table__.columns
            if c.name not in ("id", "user_id", "created_at", "updated_at")
        }

    personal = {}
    bank = {}
    if tr:
        d = row_to_dict(tr)
        bank = {
            "routing": d.pop("direct_deposit_routing", None),
            "account": d.pop("direct_deposit_account", None),
        }
        personal = d

    return {
        "Personal Information": personal,
        "W-2 Income": [row_to_dict(w) for w in w2s],
        "1099 Income": [row_to_dict(f) for f in f1099s],
        "Deductions": row_to_dict(ded),
        "Credits": row_to_dict(cred),
        "Bank / Refund": bank,
        "Review": None,
    }


async def run_submission(db: Session, user_id: int) -> list[dict[str, Any]]:
    """
    Run section-by-section browser submission.
    Returns a list of per-section result dicts.
    """
    user_data = _load_user_data(db, user_id)

    sections = get_sections()
    section_names = [s["name"] for s in sections]

    # Always end with Review — never submit
    ordered_sections = []
    for name in section_names:
        ordered_sections.append(name)
    if "Review" not in ordered_sections:
        ordered_sections.append("Review")

    llm = ChatAnthropic(
        model="claude-sonnet-4-6",
        api_key=settings.anthropic_api_key,
    )

    browser = Browser(cdp_url=settings.chrome_cdp_url)
    results = []

    try:
        for section_name in ordered_sections:
            section_data = user_data.get(section_name)

            # Skip empty sections (no data collected)
            if section_name != "Review" and not section_data:
                results.append({
                    "section": section_name,
                    "success": True,
                    "error": "Skipped — no data",
                })
                continue

            task = build_section_task(section_name, section_data)

            try:
                agent = Agent(task=task, llm=llm, browser=browser)
                history = await agent.run()
                results.append({
                    "section": section_name,
                    "success": history.is_done(),
                    "error": None,
                })
            except Exception as e:
                results.append({
                    "section": section_name,
                    "success": False,
                    "error": str(e),
                })
    finally:
        await browser.close()

    return results


async def run_section(db: Session, user_id: int, section_name: str) -> dict[str, Any]:
    """Retry a single section."""
    user_data = _load_user_data(db, user_id)
    section_data = user_data.get(section_name)

    llm = ChatAnthropic(
        model="claude-sonnet-4-6",
        api_key=settings.anthropic_api_key,
    )

    browser = Browser(cdp_url=settings.chrome_cdp_url)
    try:
        task = build_section_task(section_name, section_data)
        agent = Agent(task=task, llm=llm, browser=browser)
        history = await agent.run()
        return {
            "section": section_name,
            "success": history.is_done(),
            "error": None,
        }
    except Exception as e:
        return {
            "section": section_name,
            "success": False,
            "error": str(e),
        }
    finally:
        await browser.close()
