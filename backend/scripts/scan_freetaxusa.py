"""
One-time scanner: walks through FreeTaxUSA with dummy data and records every
form field encountered. Saves results to data/freetaxusa_fields.json.

Usage:
  1. Open Chrome with remote debugging on port 9222:
       /Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
         --remote-debugging-port=9222 --user-data-dir=/tmp/chrome-april
  2. Navigate Chrome to https://www.freetaxusa.com and sign in / start a return
  3. Run this script:
       cd backend && python scripts/scan_freetaxusa.py
"""

import asyncio
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

# Ensure project root is on the path
sys.path.insert(0, str(Path(__file__).parent.parent))

from browser_use import Agent, Browser
from langchain_anthropic import ChatAnthropic
from dotenv import load_dotenv

load_dotenv()

import os

ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY", "")
CDP_URL = os.environ.get("CHROME_CDP_URL", "http://localhost:9222")
OUTPUT_PATH = Path(__file__).parent.parent / "data" / "freetaxusa_fields.json"

DUMMY = {
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
}

TASK = f"""
You are scanning the FreeTaxUSA tax filing website to record every form field.

Your job:
1. Start from the current page (you are already logged in or on a new return page).
2. Walk through EVERY section in order: Personal Information → Filing Status → Income (W-2) → Deductions → Credits → Bank/Refund Info → Review.
3. Fill every field with the provided dummy data below. If a field is not covered by the dummy data, use a plausible placeholder.
4. After filling each page, click Next/Continue to advance to the next page.
5. STOP just before the final "File" or "Submit" button — do NOT click it.
6. As you go, carefully record every field you encounter: its label, input type (text, select, radio, checkbox, number, date), which section it belongs to, and whether it appears required.

Dummy data to use:
{json.dumps(DUMMY, indent=2)}

After completing all sections (stopping before final submit), return a JSON object in this exact format:
{{
  "sections": [
    {{
      "name": "Section Name",
      "page_url_pattern": "/filing/...",
      "fields": [
        {{"id": "field_id_or_name", "label": "Human Label", "type": "text|select|radio|checkbox|number|date", "required": true}}
      ]
    }}
  ],
  "pdf_upload_sections": ["W-2 Income", "1099 Income"],
  "scanned_at": "{datetime.now(timezone.utc).isoformat()}"
}}

Be thorough — record every field on every page, even optional ones.
"""


async def main():
    llm = ChatAnthropic(
        model="claude-sonnet-4-6",
        api_key=ANTHROPIC_API_KEY,
    )

    browser = Browser(cdp_url=CDP_URL)

    print(f"Connecting to Chrome at {CDP_URL} ...")
    print("Starting scan — this will walk through all FreeTaxUSA sections with dummy data.")
    print("DO NOT interact with the browser while the scan is running.\n")

    try:
        agent = Agent(task=TASK, llm=llm, browser=browser)
        history = await agent.run()

        # Extract the JSON result from the agent's final output
        final_output = history.final_result()

        # Try to parse JSON from the output
        if final_output:
            # Find JSON block in output
            start = final_output.find("{")
            end = final_output.rfind("}") + 1
            if start != -1 and end > start:
                json_str = final_output[start:end]
                data = json.loads(json_str)
            else:
                print("WARNING: Could not find JSON in agent output. Saving raw output.")
                data = {"raw_output": final_output, "scanned_at": datetime.now(timezone.utc).isoformat()}
        else:
            print("WARNING: Agent returned no output.")
            data = {"sections": [], "pdf_upload_sections": [], "scanned_at": datetime.now(timezone.utc).isoformat()}

        # Ensure scanned_at is set
        data.setdefault("scanned_at", datetime.now(timezone.utc).isoformat())

        OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
        with open(OUTPUT_PATH, "w") as f:
            json.dump(data, f, indent=2)

        section_count = len(data.get("sections", []))
        field_count = sum(len(s.get("fields", [])) for s in data.get("sections", []))
        print(f"\nScan complete.")
        print(f"  Sections found: {section_count}")
        print(f"  Total fields:   {field_count}")
        print(f"  Output saved to: {OUTPUT_PATH}")

    finally:
        await browser.close()


if __name__ == "__main__":
    asyncio.run(main())
