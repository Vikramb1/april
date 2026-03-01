import logging
from datetime import datetime, timezone
from typing import Any, Callable

try:
    from browser_use_sdk import AsyncBrowserUse
except ImportError:
    AsyncBrowserUse = None  # type: ignore
from sqlalchemy.orm import Session

from app.config import settings

logger = logging.getLogger("uvicorn")

# ---------------------------------------------------------------------------
# Dummy data for all fields (used until real DB data is wired up)
# ---------------------------------------------------------------------------
DUMMY_DATA = {
    "personal": {
        "first_name": "John",
        "last_name": "Smith",
        "ssn": "123-45-6789",
        "dob": "01/15/1990",
        "address": "123 Main Street",
        "city": "Austin",
        "state": "TX",
        "zip": "78701",
        "occupation": "Software Engineer",
        "claimed_as_dependent": "No",
        "blind": "No",
        "nonresident_alien": "No",
        "presidential_fund": "No",
    },
    "filing_status": "Single",
    "w2": {
        "employer_name": "Acme Corp",
        "ein": "12-3456789",
        "employer_address": "456 Business Ave",
        "employer_city": "Austin",
        "employer_state": "TX",
        "employer_zip": "78702",
        "employee_name": "John Smith",
        "employee_address": "123 Main Street",
        "employee_city": "Austin",
        "employee_state": "TX",
        "employee_zip": "78701",
        "wages": "75000.00",
        "federal_tax_withheld": "12000.00",
        "ss_wages": "75000.00",
        "ss_tax_withheld": "4650.00",
        "medicare_wages": "75000.00",
        "medicare_tax_withheld": "1087.50",
        "state": "TX",
        "state_wages": "75000.00",
        "state_tax_withheld": "0.00",
    },
    "income": {
        "has_cryptocurrency": "No",
        "has_other_income": False,
    },
    "deductions": {},
    "credits": {
        "has_marketplace_insurance": "No",
    },
    "misc": {
        "has_estimated_payments": False,
        "has_foreign_accounts": False,
    },
    "state": {
        "lived_in_texas": "Yes",
        "full_year": "Yes",
        "other_state_income": "No",
    },
    "bank": {
        "routing": "021000021",
        "account": "123456789",
        "account_type": "Checking",
    },
}

# ---------------------------------------------------------------------------
# Section-level task configs — one task per section, each handling multiple
# pages in sequence. Uses gemini-2.5-flash for simple click-through sections
# and browser-use-2.0 for sections requiring form-filling.
# ---------------------------------------------------------------------------
d = DUMMY_DATA  # shorthand

SECTION_CONFIGS = [
    {
        "section": "Personal Information",
        "llm": "browser-use-2.0",
        "max_steps": 35,
        "needs_login": True,
        "task": (
            "You are filling out a tax return on FreeTaxUSA.\n\n"
            "STEP 0 — Log in:\n"
            "  Go to https://www.freetaxusa.com/signin\n"
            "  Enter the username and password from the provided secrets.\n"
            "  Click Sign In / Log In.\n"
            "  Once logged in, navigate to start or continue a 2025 tax return.\n\n"
            "Then complete the Personal Information section by going through all "
            "pages, clicking Continue/Next between each page.\n\n"
            "PAGE 1 — 'Tell us about yourself':\n"
            f"  Fill in: First Name = '{d['personal']['first_name']}', "
            f"Last Name = '{d['personal']['last_name']}', "
            f"SSN = '{d['personal']['ssn']}', "
            f"Date of Birth = '{d['personal']['dob']}', "
            f"Address = '{d['personal']['address']}', "
            f"City = '{d['personal']['city']}', "
            f"State = '{d['personal']['state']}', "
            f"ZIP = '{d['personal']['zip']}', "
            f"Occupation = '{d['personal']['occupation']}'\n"
            "  If asked about dependent/blind/nonresident, select 'No' for all.\n"
            "  Click Continue.\n\n"
            "PAGE 2 — 'Filing Status':\n"
            "  Select 'Single'. Click Continue.\n\n"
            "PAGE 3 — 'Dependents':\n"
            "  Do NOT add any dependents. Click Continue.\n\n"
            "PAGE 4 — 'Personal Info Summary':\n"
            "  If asked about Identity Protection PIN, select 'No'. Click Continue.\n\n"
            "REMAINING PAGES — upsell/transition pages:\n"
            "  Just click Continue or Skip on each until you reach the Income section.\n"
            "  Stop once you see a page about W-2s or wages."
        ),
    },
    {
        "section": "Income",
        "llm": "browser-use-2.0",
        "max_steps": 35,
        "task": (
            "You are in the Income section of a FreeTaxUSA tax return. Complete all "
            "pages in this section.\n\n"
            "PAGE 1 — 'Your Wages (W-2)':\n"
            "  Click 'Add a W-2' or the button to enter a new W-2.\n\n"
            "PAGE 2 — 'Edit W-2':\n"
            f"  Fill in ALL W-2 fields:\n"
            f"  Employer Name (Box c) = '{d['w2']['employer_name']}'\n"
            f"  Employer EIN (Box b) = '{d['w2']['ein']}'\n"
            f"  Employer Address = '{d['w2']['employer_address']}'\n"
            f"  Employer City = '{d['w2']['employer_city']}'\n"
            f"  Employer State = '{d['w2']['employer_state']}'\n"
            f"  Employer ZIP = '{d['w2']['employer_zip']}'\n"
            f"  Wages (Box 1) = '{d['w2']['wages']}'\n"
            f"  Federal Tax Withheld (Box 2) = '{d['w2']['federal_tax_withheld']}'\n"
            f"  Social Security Wages (Box 3) = '{d['w2']['ss_wages']}'\n"
            f"  Social Security Tax Withheld (Box 4) = '{d['w2']['ss_tax_withheld']}'\n"
            f"  Medicare Wages (Box 5) = '{d['w2']['medicare_wages']}'\n"
            f"  Medicare Tax Withheld (Box 6) = '{d['w2']['medicare_tax_withheld']}'\n"
            f"  State (Box 15) = '{d['w2']['state']}'\n"
            f"  State Wages (Box 16) = '{d['w2']['state_wages']}'\n"
            f"  State Tax Withheld (Box 17) = '{d['w2']['state_tax_withheld']}'\n"
            "  Click Continue/Save when done.\n\n"
            "PAGE 3 — 'Tips or Overtime': Select 'No' for all. Click Continue.\n\n"
            "PAGE 4 — 'Double-check wages': Click Continue.\n\n"
            "PAGE 5 — 'Your Income': Select 'No' for ALL other income types. "
            "Uncheck all checkboxes. Click Continue.\n\n"
            "PAGE 6 — 'Cryptocurrency': Select 'No'. Click Continue.\n\n"
            "REMAINING PAGES — income summary, upsells, transitions:\n"
            "  Click Continue or Skip on each until you reach the Deductions section.\n"
            "  Stop once you see a page about deductions or standard deduction."
        ),
    },
    {
        "section": "Deductions",
        "llm": "browser-use-2.0",
        "max_steps": 15,
        "task": (
            "You are in the Deductions section of a FreeTaxUSA tax return. "
            "This taxpayer takes the standard deduction.\n\n"
            "PAGE 1 — 'Deductions checklist':\n"
            "  Uncheck ALL deduction checkboxes. Nothing should be selected. "
            "Click Continue.\n\n"
            "PAGE 2 — 'Standard deduction is best':\n"
            "  Confirm standard deduction. Click Continue.\n\n"
            "Click Continue/Skip on any additional pages until you reach Credits.\n"
            "Stop once you see a page about credits or marketplace insurance."
        ),
    },
    {
        "section": "Credits",
        "llm": "browser-use-2.0",
        "max_steps": 20,
        "task": (
            "You are in the Credits section. This taxpayer has NO credits to claim.\n\n"
            "PAGE 1 — 'Marketplace insurance': Select 'No'. Click Continue.\n\n"
            "PAGE 2 — 'Common credits': Uncheck ALL checkboxes. Click Continue.\n\n"
            "PAGE 3 — 'Other credits': Uncheck ALL checkboxes. Click Continue.\n\n"
            "PAGE 4 — 'Credits summary': Click Continue.\n\n"
            "Click Continue/Skip on any additional pages until you reach "
            "Miscellaneous or a progress page.\n"
            "Stop once you see a page about misc forms or estimated payments."
        ),
    },
    {
        "section": "Miscellaneous",
        "llm": "browser-use-2.0",
        "max_steps": 15,
        "task": (
            "You are in the Miscellaneous section. The taxpayer has no misc items.\n\n"
            "PAGE 1 — 'Making progress': Click Continue.\n\n"
            "PAGE 2 — 'Misc forms': Uncheck ALL checkboxes (estimated payments, "
            "foreign accounts, HSA, etc.). Click Continue.\n\n"
            "PAGE 3 — 'Refund maximizer' (upsell): Click Skip or Continue.\n\n"
            "Click Continue/Skip on any additional pages until you reach the "
            "Federal Tax Summary.\n"
            "Stop once you see a summary of federal taxes."
        ),
    },
    {
        "section": "Summary & State",
        "llm": "browser-use-2.0",
        "max_steps": 25,
        "task": (
            "You are in the Summary and State sections. The taxpayer lived in "
            "Texas for the full year.\n\n"
            "PAGE 1 — 'Federal Tax Summary': Review and click Continue.\n\n"
            "PAGE 2 — 'Look how far' (transition): Click Continue.\n\n"
            "PAGE 3 — 'Did you live in Texas?': Select 'Yes'. Click Continue.\n\n"
            "PAGE 4 — 'Full year resident?': Select 'Yes'. Click Continue.\n\n"
            "PAGE 5 — 'Where earn money?': Select only Texas. Click Continue.\n\n"
            "PAGE 6 — 'State Returns': Click Continue.\n\n"
            "PAGE 7 — 'Almost there': Click Continue.\n\n"
            "Click Continue/Skip on any additional pages until you reach "
            "a page about benefits, audit defense, or order summary.\n"
            "Stop once you see upsells about Deluxe or Audit Defense."
        ),
    },
    {
        "section": "Final Steps",
        "llm": "browser-use-2.0",
        "max_steps": 15,
        "task": (
            "You are in the Final Steps section. Decline all upsells.\n\n"
            "PAGE 1 — 'Unlock benefits' (upsell): Click Skip or Continue.\n\n"
            "PAGE 2 — 'Audit Defense': Click 'No Thanks' or Skip.\n\n"
            "PAGE 3 — 'Order Summary': Click Continue.\n\n"
            "Click Continue/Skip on any additional pages until you reach "
            "refund/bank information.\n"
            "Stop once you see a page about refund method or direct deposit."
        ),
    },
    {
        "section": "Bank/Refund",
        "llm": "browser-use-2.0",
        "max_steps": 20,
        "task": (
            "You are in the Bank/Refund section. The taxpayer wants direct deposit.\n\n"
            "PAGE 1 — 'Refund method': Select 'Direct Deposit'. Click Continue.\n\n"
            "PAGE 2 — 'Direct deposit info':\n"
            f"  Routing Number = '{d['bank']['routing']}'\n"
            f"  Account Number = '{d['bank']['account']}'\n"
            f"  Account Type = select '{d['bank']['account_type']}'\n"
            "  Click Continue.\n\n"
            "PAGE 3 — 'Double check refund': Review and click Continue.\n\n"
            "Click Continue/Skip on any additional pages until you reach "
            "the review/filing page.\n"
            "Stop once you see a page about reviewing or double-checking the return."
        ),
    },
    {
        "section": "Review",
        "llm": "browser-use-2.0",
        "max_steps": 12,
        "task": (
            "You are on the final Review pages.\n\n"
            "PAGE 1 — 'Phone to IRS': Select 'No'. Click Continue.\n\n"
            "PAGE 2 — 'Double check return':\n"
            "  STOP HERE. Do NOT click File, Submit, E-File, or any button that "
            "  would finalize or submit the return. Just stop and do nothing.\n\n"
            "CRITICAL: Do NOT click any submit/file button under any circumstances."
        ),
    },
]

# ---------------------------------------------------------------------------
# Prompt wrapper
# ---------------------------------------------------------------------------
_PROMPT_WRAPPER = """{task}

IMPORTANT RULES:
- Fill fields EXACTLY as specified — do not change or guess values
- Click "Continue" or "Next" to advance between pages within this section
- If you see a promotional/upsell page not listed above, click Continue or Skip
- Do NOT click "File" or "Submit" under any circumstances
- If a field is already filled with the correct value, leave it as-is
- Work quickly — complete each page and move to the next
"""


def _build_section_prompt(section_config: dict) -> str:
    return _PROMPT_WRAPPER.format(task=section_config["task"])


# ---------------------------------------------------------------------------
# Client helper
# ---------------------------------------------------------------------------
def _client() -> "AsyncBrowserUse":
    if AsyncBrowserUse is None:
        raise RuntimeError(
            "browser_use_sdk is not installed. "
            "Install it with: pip install browser-use-sdk"
        )
    return AsyncBrowserUse(api_key=settings.browser_use_api_key)


def _is_success(status) -> bool:
    status_str = str(status).lower()
    return "finished" in status_str or "completed" in status_str


async def _run_task_with_retry(client, run_kwargs, max_retries=2, timeout=300):
    """Run a browser-use task with retry on 502/stale-task errors.

    If we get a 'session already has a running task' error, wait for it
    to finish before retrying.
    """
    import asyncio as _asyncio

    for attempt in range(max_retries + 1):
        try:
            task_run = client.run(**run_kwargs)
            task_id = await task_run._ensure_task_id()
            result = await client.tasks.wait(task_id, timeout=timeout)
            return result
        except Exception as e:
            err = str(e)
            is_stale = "already has a running task" in err
            is_server_err = "502" in err or "500" in err

            if attempt < max_retries and (is_stale or is_server_err):
                wait_time = 15 if is_stale else 5
                logger.warning(
                    f"  Retry {attempt + 1}/{max_retries} "
                    f"(waiting {wait_time}s): {err[:80]}"
                )
                await _asyncio.sleep(wait_time)
                continue
            raise


# ---------------------------------------------------------------------------
# Main submission flow
# ---------------------------------------------------------------------------
async def run_submission(db: Session, user_id: int, on_section_done=None) -> list[dict[str, Any]]:
    """Run the full FreeTaxUSA filing flow section-by-section.

    Creates a single browser_use_sdk session (shared browser state) and
    runs one task per section (~9 tasks instead of ~39).
    Returns a list of per-section result dicts.
    """
    client = _client()

    # Reuse or create a profile for FreeTaxUSA
    profiles = await client.profiles.list()
    profile = next((p for p in profiles.items if p.name == "freetaxusa"), None)
    if not profile:
        profile = await client.profiles.create(name="freetaxusa")

    session = await client.sessions.create(profile_id=profile.id)
    logger.info(f"FreeTaxUSA live URL: {session.live_url}")

    results: list[dict[str, Any]] = []

    for i, section_config in enumerate(SECTION_CONFIGS):
        section = section_config["section"]
        prompt = _build_section_prompt(section_config)
        llm = section_config.get("llm", "browser-use-2.0")
        max_steps = section_config.get("max_steps", 20)

        logger.info(
            f"Section {i + 1}/{len(SECTION_CONFIGS)}: {section} "
            f"(llm={llm}, max_steps={max_steps})"
        )

        run_kwargs = dict(
            task=prompt,
            session_id=str(session.id),
            llm=llm,
            max_steps=max_steps,
            flash_mode=True,
        )
        if section_config.get("needs_login"):
            run_kwargs["secrets"] = {
                "username": settings.freetax_username,
                "password": settings.freetax_password,
            }

        try:
            result = await _run_task_with_retry(client, run_kwargs)

            success = _is_success(result.status)
            error = None if success else f"Task status: {result.status}"

            logger.info(f"  -> {'OK' if success else 'FAIL'}: {section}")

            entry = {
                "section_name": section,
                "success": success,
                "error": error,
            }
            results.append(entry)
            if on_section_done:
                on_section_done({
                    "type": "section_complete",
                    "section": section,
                    "success": success,
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                })
        except Exception as e:
            logger.error(f"  -> ERROR on {section}: {e}")
            entry = {
                "section_name": section,
                "success": False,
                "error": str(e),
            }
            results.append(entry)
            if on_section_done:
                on_section_done({
                    "type": "section_complete",
                    "section": section,
                    "success": False,
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                })

    return results


async def run_section(
    db: Session, user_id: int, section_name: str
) -> dict[str, Any]:
    """Retry a specific section."""
    section_config = next(
        (s for s in SECTION_CONFIGS if s["section"] == section_name), None
    )
    if not section_config:
        return {
            "section_name": section_name,
            "success": False,
            "error": f"Unknown section: {section_name}",
        }

    client = _client()

    profiles = await client.profiles.list()
    profile = next((p for p in profiles.items if p.name == "freetaxusa"), None)
    if not profile:
        profile = await client.profiles.create(name="freetaxusa")

    session = await client.sessions.create(profile_id=profile.id)
    logger.info(
        f"FreeTaxUSA retry section '{section_name}' live URL: {session.live_url}"
    )

    prompt = _build_section_prompt(section_config)
    llm = section_config.get("llm", "browser-use-2.0")
    max_steps = section_config.get("max_steps", 20)

    run_kwargs = dict(
        task=prompt,
        session_id=str(session.id),
        llm=llm,
        max_steps=max_steps,
        flash_mode=True,
    )
    if section_config.get("needs_login"):
        run_kwargs["secrets"] = {
            "username": settings.freetax_username,
            "password": settings.freetax_password,
        }

    try:
        result = await _run_task_with_retry(client, run_kwargs)

        success = _is_success(result.status)
        return {
            "section_name": section_name,
            "success": success,
            "error": None if success else f"Task status: {result.status}",
        }
    except Exception as e:
        return {
            "section_name": section_name,
            "success": False,
            "error": str(e),
        }
