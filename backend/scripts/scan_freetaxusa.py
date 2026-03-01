"""
Multi-pass scanner: walks through FreeTaxUSA multiple times with different
configurations to reveal ALL conditional form fields. Saves merged results
to data/freetaxusa_fields.json.

Usage:
  1. Open Chrome with remote debugging on port 9222:
       /Applications/Google\\ Chrome.app/Contents/MacOS/Google\\ Chrome \\
         --remote-debugging-port=9222 --user-data-dir=/tmp/chrome-april
  2. Navigate Chrome to https://www.freetaxusa.com and sign in / start a return
  3. Run this script:
       cd backend && python scripts/scan_freetaxusa.py
  4. Optionally run a single pass for debugging:
       cd backend && python scripts/scan_freetaxusa.py --pass 2
"""

import argparse
import asyncio
import glob as globmod
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

# Ensure project root is on the path
sys.path.insert(0, str(Path(__file__).parent.parent))

from browser_use import Agent, BrowserSession, ChatAnthropic
from dotenv import load_dotenv

load_dotenv()

import os

ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY", "")
CDP_URL = os.environ.get("CHROME_CDP_URL", "http://localhost:9222")
OUTPUT_PATH = Path(__file__).parent.parent / "data" / "freetaxusa_fields.json"

# ---------------------------------------------------------------------------
# JSON schema description shared across all pass prompts
# ---------------------------------------------------------------------------
RESULT_SCHEMA = """\
Return a JSON object in this exact format:
{
  "pages": [
    {
      "page_title": "The page heading or title shown at the top",
      "page_url_pattern": "/taxes2025/...",
      "section": "The high-level section this page belongs to (Personal Information, Filing Status, Income, Deductions, Credits, Bank/Refund, Review)",
      "page_order": 1,
      "fields": [
        {
          "id": "the_html_id_or_name_attribute",
          "label": "Human-readable label shown next to the field",
          "type": "text|select|radio|checkbox|number|date|textarea",
          "required": true,
          "options": ["option1", "option2"],
          "validation": "any format hint like SSN (XXX-XX-XXXX) or max length",
          "depends_on": {"field_id": "value_that_reveals_this_field"}
        }
      ]
    }
  ],
  "pdf_upload_sections": ["W-2 Income", "1099 Income"]
}

IMPORTANT rules for recording fields:
- For SELECT dropdowns: list ALL available options in the "options" array
- For RADIO buttons: record as ONE field with all radio labels in the "options" array (do NOT make each radio option a separate field)
- For CHECKBOX groups: record each checkbox as its own field
- "depends_on" is for fields that only appear AFTER you select a specific value on another field ON THE SAME PAGE. Leave it out if the field is always visible on that page.
- "validation" should note any format hints, masks, or max-length restrictions you see
- "page_order" should be sequential (1, 2, 3...) reflecting the order you visit pages
- Record the ACTUAL HTML id or name attribute, not a made-up one. If you can't find it, use the label text in snake_case.
"""

# ---------------------------------------------------------------------------
# Pass definitions
# ---------------------------------------------------------------------------
PASSES = [
    {
        "name": "Baseline (Single + W-2)",
        "conditions": {},  # No conditions — these fields always appear
        "dummy_data": {
            "ssn": "123-45-6789",
            "first_name": "John",
            "last_name": "Smith",
            "dob": "1985-06-15",
            "address": "123 Main St",
            "city": "Austin",
            "state": "TX",
            "zip": "78701",
            "filing_status": "single",
            "occupation": "Engineer",
            "w2_employer": "Acme Corp",
            "w2_ein": "12-3456789",
            "w2_wages": "75000",
            "w2_federal_withheld": "12000",
            "w2_state_withheld": "3500",
            "w2_ss_withheld": "4650",
            "w2_medicare_withheld": "1088",
            "bank_routing": "021000021",
            "bank_account": "123456789",
            "bank_account_type": "checking",
        },
        "task": """\
You are scanning FreeTaxUSA to record every form field visible in a BASELINE single-filer scenario.

Instructions:
1. Start from the current page (you are already logged in / on a return).
2. Walk through EVERY section in order: Personal Information → Filing Status → Income (W-2) → Deductions (choose Standard Deduction) → Credits (skip all) → Bank/Refund Info → Review.
3. Select filing status: SINGLE. Do NOT add a spouse or dependents.
4. Add one W-2 using the dummy data below. Do NOT add any other income types.
5. Choose Standard Deduction when asked.
6. Skip all credits by selecting "No" on each.
7. Fill every field with the dummy data. For fields not covered, use a plausible placeholder.
8. Click Next/Continue to advance through each page.
9. STOP just before the final "File" or "Submit" button — do NOT click it.

CRITICAL — How to record fields on EACH PAGE:
- Before clicking Continue on any page, record ALL fields on that page.
- For each field, get the ACTUAL HTML id or name attribute from the page source (right-click → inspect or read from the DOM).
- For SELECT/dropdown fields: expand the dropdown and record ALL available options.
- For RADIO button groups: record as ONE field with the group name, and list all radio labels in "options".
- Note any format hints or validation (e.g., "XXX-XX-XXXX" for SSN).
- If selecting a value causes new fields to appear on the same page, record those with a "depends_on" noting which field/value triggered them.
- Track page order sequentially (page 1, 2, 3...).

Be thorough — record every field on every page, even optional ones.
""",
    },
    {
        "name": "Married Filing Jointly",
        "conditions": {
            "filing_status": ["married_filing_jointly", "married_filing_separately"],
            "has_dependents": True,
        },
        "dummy_data": {
            "filing_status": "married_filing_jointly",
            "spouse_ssn": "987-65-4321",
            "spouse_first_name": "Jane",
            "spouse_last_name": "Smith",
            "spouse_dob": "1987-03-22",
            "spouse_occupation": "Teacher",
            "dependent_1_first": "Emma",
            "dependent_1_last": "Smith",
            "dependent_1_ssn": "111-22-3333",
            "dependent_1_dob": "2015-09-10",
            "dependent_1_relationship": "daughter",
            "dependent_2_first": "Liam",
            "dependent_2_last": "Smith",
            "dependent_2_ssn": "444-55-6666",
            "dependent_2_dob": "2018-12-01",
            "dependent_2_relationship": "son",
        },
        "task": """\
You are scanning FreeTaxUSA to record fields that appear for MARRIED FILING JOINTLY with dependents.

Instructions:
1. Navigate to the Filing Status section. Change the filing status to MARRIED FILING JOINTLY.
2. Fill in all spouse information fields that appear (name, SSN, DOB, occupation, etc.) using the dummy data.
3. Navigate to the Dependents section. Add TWO dependents using the dummy data.
4. Walk through all sections that are affected by this filing status change.
5. Record EVERY field you encounter — especially new fields that appear because of MFJ status or dependents.
6. Pay special attention to: spouse info fields, dependent fields (name, SSN, DOB, relationship, months lived with you, qualifying child questions), any joint-specific options or questions.
7. STOP before the final "File" or "Submit" button.

CRITICAL — How to record fields on EACH PAGE:
- Get the ACTUAL HTML id or name attribute from the DOM for each field.
- For SELECT/dropdown fields: record ALL available options.
- For RADIO button groups: record as ONE field with all labels in "options".
- Note any format hints or validation.
- If selecting a value causes new fields to appear on the same page, record those with "depends_on".
- Track page order sequentially.

Focus on fields that would NOT appear for a single filer with no dependents.
""",
    },
    {
        "name": "Self-Employment (1099-NEC + Schedule C)",
        "conditions": {
            "income_types": ["1099-NEC", "self_employment"],
        },
        "dummy_data": {
            "business_name": "Smith Consulting LLC",
            "business_ein": "98-7654321",
            "business_type": "sole_proprietorship",
            "business_start_date": "2020-01-15",
            "business_code": "541611",
            "nec_payer": "Tech Solutions Inc",
            "nec_payer_tin": "11-2233445",
            "nec_amount": "45000",
            "gross_receipts": "45000",
            "advertising": "1200",
            "car_expenses": "3500",
            "insurance": "2400",
            "office_expense": "800",
            "supplies": "650",
            "utilities": "1200",
            "home_office_sqft": "200",
            "home_total_sqft": "1800",
            "vehicle_miles_business": "8500",
            "vehicle_miles_total": "12000",
        },
        "task": """\
You are scanning FreeTaxUSA to record fields for SELF-EMPLOYMENT INCOME (1099-NEC and Schedule C).

Instructions:
1. Navigate to the Income section.
2. Look for an option to add self-employment income, 1099-NEC, or business income. Select it.
3. Add a 1099-NEC using the dummy data below.
4. Fill out the Schedule C / business income section: business name, EIN, type, accounting method, business code, etc.
5. Walk through ALL expense categories: advertising, car/vehicle, insurance, office expenses, supplies, utilities, home office deduction, etc.
6. If there is a home office section, fill it out (simplified or actual method).
7. If there is a vehicle/car section, fill it out (standard mileage or actual expenses).
8. Record EVERY field you encounter — especially Schedule C fields, expense categories, home office, and vehicle.
9. STOP before the final "File" or "Submit" button.

CRITICAL — How to record fields on EACH PAGE:
- Get the ACTUAL HTML id or name attribute from the DOM for each field.
- For SELECT/dropdown fields: record ALL available options.
- For RADIO button groups: record as ONE field with all labels in "options".
- Note any format hints or validation.
- If selecting a value causes new fields to appear on the same page, record those with "depends_on".
- Track page order sequentially.

Focus on self-employment and business-related fields.
""",
    },
    {
        "name": "Investment Income (1099-INT, 1099-DIV, 1099-B)",
        "conditions": {
            "income_types": ["1099-INT", "1099-DIV", "1099-B"],
        },
        "dummy_data": {
            "int_payer": "Chase Bank",
            "int_payer_tin": "13-4941099",
            "int_amount": "1250",
            "int_us_savings_bonds": "0",
            "div_payer": "Vanguard",
            "div_payer_tin": "23-1945930",
            "div_ordinary": "3200",
            "div_qualified": "2800",
            "div_capital_gain_dist": "500",
            "stock_description": "100 shares AAPL",
            "stock_date_acquired": "2022-03-15",
            "stock_date_sold": "2024-08-20",
            "stock_proceeds": "18500",
            "stock_cost_basis": "15000",
            "stock_wash_sale_loss": "0",
            "stock_type": "short_term",
        },
        "task": """\
You are scanning FreeTaxUSA to record fields for INVESTMENT INCOME (1099-INT, 1099-DIV, 1099-B).

Instructions:
1. Navigate to the Income section.
2. Look for options to add interest income (1099-INT). Add one using the dummy data.
3. Look for options to add dividend income (1099-DIV). Add one using the dummy data.
4. Look for options to add stock/investment sales (1099-B / capital gains). Add one using the dummy data.
5. For capital gains, fill out: description, date acquired, date sold, proceeds, cost basis, wash sale adjustments, short-term vs long-term classification.
6. Check for any additional investment-related sections: foreign accounts, tax-exempt interest, qualified dividends, capital gain distributions, etc.
7. Record EVERY field you encounter related to investment income.
8. STOP before the final "File" or "Submit" button.

CRITICAL — How to record fields on EACH PAGE:
- Get the ACTUAL HTML id or name attribute from the DOM for each field.
- For SELECT/dropdown fields: record ALL available options.
- For RADIO button groups: record as ONE field with all labels in "options".
- Note any format hints or validation.
- If selecting a value causes new fields to appear on the same page, record those with "depends_on".
- Track page order sequentially.

Focus on interest, dividend, and capital gains fields.
""",
    },
    {
        "name": "Itemized Deductions",
        "conditions": {
            "deduction_method": ["itemized"],
        },
        "dummy_data": {
            "deduction_method": "itemized",
            "mortgage_interest": "12500",
            "mortgage_lender": "Wells Fargo",
            "mortgage_lender_tin": "04-1234567",
            "property_tax": "6800",
            "state_local_income_tax": "5200",
            "charitable_cash": "3500",
            "charitable_noncash": "800",
            "charitable_org_name": "United Way",
            "medical_expenses": "4500",
            "medical_insurance_premiums": "2400",
            "student_loan_interest": "1800",
            "educator_expenses": "250",
        },
        "task": """\
You are scanning FreeTaxUSA to record fields for ITEMIZED DEDUCTIONS.

Instructions:
1. Navigate to the Deductions section.
2. When asked about deduction method, choose ITEMIZED DEDUCTIONS (not standard).
3. Walk through EVERY itemized deduction category:
   - Medical and dental expenses
   - State and local taxes (SALT) — income tax, property tax
   - Mortgage interest (1098 info: lender, TIN, amount)
   - Charitable contributions — cash, non-cash, carryovers
   - Casualty and theft losses
   - Other itemized deductions
4. Also check for above-the-line deductions that may appear: student loan interest, educator expenses, HSA, IRA, etc.
5. Fill every field with the dummy data. Use plausible placeholders for fields not covered.
6. Record EVERY field you encounter in the deductions sections.
7. STOP before the final "File" or "Submit" button.

CRITICAL — How to record fields on EACH PAGE:
- Get the ACTUAL HTML id or name attribute from the DOM for each field.
- For SELECT/dropdown fields: record ALL available options.
- For RADIO button groups: record as ONE field with all labels in "options".
- Note any format hints or validation.
- If selecting a value causes new fields to appear on the same page, record those with "depends_on".
- Track page order sequentially.

Focus on deduction-specific fields, especially those only visible when itemizing.
""",
    },
    {
        "name": "Credits & Other (Education, CTC, EITC, HSA, IRA)",
        "conditions": {
            "credits": ["education", "child_tax_credit", "eitc"],
            "accounts": ["hsa", "ira"],
        },
        "dummy_data": {
            "student_first_name": "Emma",
            "student_last_name": "Smith",
            "student_ssn": "111-22-3333",
            "school_name": "State University",
            "school_ein": "74-1234567",
            "tuition_paid": "8500",
            "scholarships": "2000",
            "education_credit_type": "american_opportunity",
            "child_tax_credit_children": "2",
            "eitc_qualifying_children": "2",
            "eitc_investment_income": "450",
            "hsa_contribution": "3600",
            "hsa_employer_contribution": "1200",
            "hsa_coverage_type": "self_only",
            "ira_contribution": "6500",
            "ira_type": "traditional",
            "form_1098t_received": "yes",
        },
        "task": """\
You are scanning FreeTaxUSA to record fields for TAX CREDITS and other special sections (HSA, IRA).

Instructions:
1. Navigate to the Credits section.
2. Enable / add the following credits and fill out their fields:
   a. EDUCATION CREDITS (1098-T): student name, SSN, school name, EIN, tuition paid, scholarships, American Opportunity vs Lifetime Learning credit.
   b. CHILD TAX CREDIT: number of qualifying children, ages.
   c. EARNED INCOME TAX CREDIT (EITC): qualifying children count, investment income.
   d. Any other available credits: child/dependent care, energy credits, adoption, etc.
3. Navigate to any HSA section: contributions, employer contributions, coverage type, distributions.
4. Navigate to any IRA section: contribution amount, traditional vs Roth, income limits.
5. Check for any retirement-related sections: 401(k), pension, Social Security income.
6. Record EVERY field you encounter in credits and these special sections.
7. STOP before the final "File" or "Submit" button.

CRITICAL — How to record fields on EACH PAGE:
- Get the ACTUAL HTML id or name attribute from the DOM for each field.
- For SELECT/dropdown fields: record ALL available options.
- For RADIO button groups: record as ONE field with all labels in "options".
- Note any format hints or validation.
- If selecting a value causes new fields to appear on the same page, record those with "depends_on".
- Track page order sequentially.

Focus on credit-specific fields and retirement/savings account fields.
""",
    },
]


def build_task_prompt(pass_def: dict) -> str:
    """Build the full task prompt for a given pass definition."""
    scanned_at = datetime.now(timezone.utc).isoformat()
    return f"""{pass_def["task"]}

Dummy data to use:
{json.dumps(pass_def["dummy_data"], indent=2)}

After completing your scan, return a JSON object in this exact format:
{RESULT_SCHEMA}

Add a "scanned_at" key with the value "{scanned_at}".
Be thorough — record every field on every page, even optional ones.

SKIP PAGES: If you encounter validation/review pages like "Let's double-check your wages info", upsell pages like "Deluxe gives you more", or anything about detecting something unusual — just click Continue at the bottom immediately. Do NOT spend time on these pages. Only record fields from actual data-entry pages.
"""


def parse_agent_result(output: str | None) -> dict:
    """Extract JSON from agent output, falling back to temp file if needed."""
    if output:
        start = output.find("{")
        end = output.rfind("}") + 1
        if start != -1 and end > start:
            try:
                return json.loads(output[start:end])
            except json.JSONDecodeError:
                pass
        print("  WARNING: Could not parse JSON from agent final output.")

    # Fallback: read from the agent's temp file
    temp_file = _find_agent_temp_file()
    if temp_file and temp_file.exists():
        try:
            data = json.loads(temp_file.read_text())
            page_count = len(data.get("pages", []))
            field_count = sum(len(p.get("fields", [])) for p in data.get("pages", []))
            print(f"  Recovered {page_count} pages, {field_count} fields from agent temp file")
            return data
        except (json.JSONDecodeError, OSError):
            pass

    print("  WARNING: No data from agent output or temp file.")
    return {"pages": [], "pdf_upload_sections": []}


def merge_results(cumulative: dict, new_result: dict, conditions: dict) -> None:
    """Merge new_result into cumulative in place, deduplicating by (page_title, field_id).

    The new schema uses "pages" (each representing a single page in the flow) instead
    of "sections". Each page has a section, page_title, page_order, and fields.

    Args:
        cumulative: The cumulative manifest being built up.
        new_result: The result from a single pass.
        conditions: The conditions dict from the pass definition. Empty dict means
                    the field always appears (baseline).
    """
    existing_pages = {p["page_title"]: p for p in cumulative.get("pages", [])}

    for page in new_result.get("pages", []):
        page_title = page.get("page_title", "Unknown")

        if page_title in existing_pages:
            # Merge fields into existing page
            existing = existing_pages[page_title]
            existing_field_ids = {f["id"] for f in existing.get("fields", [])}
            for field in page.get("fields", []):
                if field.get("id") not in existing_field_ids:
                    if conditions:
                        field["conditions"] = conditions
                    existing["fields"].append(field)
                    existing_field_ids.add(field["id"])
        else:
            # New page — tag all its fields with conditions and add it
            if conditions:
                for field in page.get("fields", []):
                    field.setdefault("conditions", conditions)
                page["conditions"] = conditions
            existing_pages[page_title] = page
            cumulative["pages"].append(page)

    # Union of pdf_upload_sections
    existing_pdf = set(cumulative.get("pdf_upload_sections", []))
    for pdf_section in new_result.get("pdf_upload_sections", []):
        if pdf_section not in existing_pdf:
            cumulative["pdf_upload_sections"].append(pdf_section)
            existing_pdf.add(pdf_section)


def _find_agent_temp_file() -> Path | None:
    """Find the most recently modified fields_data.json in browser_use temp dirs."""
    pattern = "/var/folders/**/browser_use_agent_*/browseruse_agent_data/fields_data.json"
    matches = globmod.glob(pattern, recursive=True)
    if not matches:
        return None
    # Return the most recently modified one
    return Path(max(matches, key=lambda p: Path(p).stat().st_mtime))


async def _periodic_save(interval: int = 30):
    """Background task that copies the agent's temp fields_data.json to OUTPUT_PATH every `interval` seconds."""
    last_mtime = 0.0
    while True:
        await asyncio.sleep(interval)
        try:
            temp_file = _find_agent_temp_file()
            if temp_file and temp_file.exists():
                mtime = temp_file.stat().st_mtime
                if mtime > last_mtime:
                    last_mtime = mtime
                    data = json.loads(temp_file.read_text())
                    page_count = len(data.get("pages", []))
                    field_count = sum(len(p.get("fields", [])) for p in data.get("pages", []))
                    if field_count > 0:
                        OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
                        with open(OUTPUT_PATH, "w") as f:
                            json.dump(data, f, indent=2)
                        print(f"  [auto-save] {page_count} pages, {field_count} fields → {OUTPUT_PATH}")
        except (json.JSONDecodeError, OSError):
            pass  # File may be mid-write, skip this cycle


async def run_pass(pass_index: int, pass_def: dict, llm, browser: BrowserSession) -> dict:
    """Run a single scan pass and return the parsed result."""
    pass_num = pass_index + 1
    print(f"\n{'='*60}")
    print(f"  Pass {pass_num}/6: {pass_def['name']}")
    print(f"{'='*60}")

    # Start periodic auto-save in the background
    saver = asyncio.create_task(_periodic_save(interval=30))

    try:
        task_prompt = build_task_prompt(pass_def)
        agent = Agent(task=task_prompt, llm=llm, browser=browser)
        history = await agent.run()

        final_output = history.final_result()
        result = parse_agent_result(final_output)

        page_count = len(result.get("pages", []))
        field_count = sum(len(p.get("fields", [])) for p in result.get("pages", []))
        print(f"  Pass {pass_num} found {page_count} pages, {field_count} fields")

        return result
    finally:
        saver.cancel()
        try:
            await saver
        except asyncio.CancelledError:
            pass


async def main():
    parser = argparse.ArgumentParser(description="Multi-pass FreeTaxUSA field scanner")
    parser.add_argument(
        "--pass",
        type=int,
        dest="single_pass",
        metavar="N",
        help="Run only pass N (1-6) instead of all passes",
    )
    args = parser.parse_args()

    if args.single_pass is not None:
        if not 1 <= args.single_pass <= len(PASSES):
            print(f"Error: --pass must be between 1 and {len(PASSES)}")
            sys.exit(1)

    llm = ChatAnthropic(
        model="claude-sonnet-4-5-20250929",
        api_key=ANTHROPIC_API_KEY,
    )

    browser = BrowserSession(cdp_url=CDP_URL)

    print(f"Connecting to Chrome at {CDP_URL} ...")
    print("Starting multi-pass scan of FreeTaxUSA.")
    print("DO NOT interact with the browser while the scan is running.\n")

    # Determine which passes to run
    if args.single_pass is not None:
        passes_to_run = [(args.single_pass - 1, PASSES[args.single_pass - 1])]
        print(f"Running single pass: Pass {args.single_pass} — {PASSES[args.single_pass - 1]['name']}")
    else:
        passes_to_run = list(enumerate(PASSES))
        print(f"Running all {len(PASSES)} passes:")
        for i, p in enumerate(PASSES):
            print(f"  {i+1}. {p['name']}")

    # Load existing manifest if running a single pass (to merge into)
    cumulative: dict = {"pages": [], "pdf_upload_sections": []}
    if args.single_pass is not None and OUTPUT_PATH.exists():
        try:
            with open(OUTPUT_PATH) as f:
                cumulative = json.load(f)
            print(f"\nLoaded existing manifest with {len(cumulative.get('pages', []))} pages")
        except (json.JSONDecodeError, KeyError):
            print("\nCould not load existing manifest, starting fresh")

    try:
        for pass_index, pass_def in passes_to_run:
            result = await run_pass(pass_index, pass_def, llm, browser)
            merge_results(cumulative, result, pass_def.get("conditions", {}))

            # Print cumulative progress
            total_pages = len(cumulative.get("pages", []))
            total_fields = sum(len(p.get("fields", [])) for p in cumulative.get("pages", []))
            print(f"  Cumulative: {total_pages} pages, {total_fields} fields")

            # Save after each pass so we don't lose data if a later pass crashes
            cumulative["scanned_at"] = datetime.now(timezone.utc).isoformat()
            OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
            with open(OUTPUT_PATH, "w") as f:
                json.dump(cumulative, f, indent=2)
            print(f"  Saved to {OUTPUT_PATH}")

        # Final save
        cumulative["scanned_at"] = datetime.now(timezone.utc).isoformat()
        with open(OUTPUT_PATH, "w") as f:
            json.dump(cumulative, f, indent=2)

        total_pages = len(cumulative.get("pages", []))
        total_fields = sum(len(p.get("fields", [])) for p in cumulative.get("pages", []))
        print(f"\n{'='*60}")
        print(f"  Scan complete!")
        print(f"  Total pages:  {total_pages}")
        print(f"  Total fields: {total_fields}")
        print(f"  PDF upload sections: {cumulative.get('pdf_upload_sections', [])}")
        print(f"  Output saved to: {OUTPUT_PATH}")
        print(f"{'='*60}")

    finally:
        await browser.stop()


if __name__ == "__main__":
    asyncio.run(main())
