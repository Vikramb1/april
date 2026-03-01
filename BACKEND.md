# April — Backend

April uses a Python backend to collect user tax data through a conversational chat interface, parse uploaded PDFs, fetch documents from financial portals via browser automation, and file a return on FreeTaxUSA using a browser agent.

See [FRONTEND.md](./FRONTEND.md) for the Next.js frontend that consumes this API.

---

## Architecture Overview

```
scripts/scan_freetaxusa.py     ← one-time runner, saves JSON field manifest
data/freetaxusa_fields.json    ← real FreeTaxUSA fields (scanned 2026-03-01)

FastAPI backend (16 routes)
  POST   /users                      ← create/find user by email
  POST   /sessions                   ← create chat session
  POST   /chat                       ← conversational data collection (GPT-4 tool-use)
  POST   /upload-pdf                 ← parse any tax PDF with pdfplumber + Claude
  POST   /upload-w2-pdf              ← parse W-2 PDF, return fields without saving
  POST   /upload-1099-pdf            ← parse 1099 PDF, return fields without saving
  GET    /sessions/{id}/status       ← check collected vs required fields
  POST   /submit-taxes               ← trigger browser-use filing agent (background)
  POST   /retry-section              ← retry a single failed section
  GET    /users/{id}/data            ← return all stored tax data
  PUT    /users/{id}/data            ← upsert full TaxData payload from frontend
  DELETE /users/{id}/data            ← wipe all tax records for a user (reset)
  GET    /filing-stream/{id}         ← SSE stream of per-section filing progress events
  POST   /fetch-gusto-w2             ← fetch W-2 from Gusto via cloud browser agent
  POST   /fetch-fidelity-1099        ← fetch 1099 from Fidelity via cloud browser agent
  GET    /users/{id}/tax-pdf         ← generate and stream a ReportLab PDF summary

SQLite (april.db)              ← all user data, chat history, and tax records
```

---

## File Structure

```
backend/
├── app/
│   ├── main.py                  # FastAPI app + all 16 routes
│   ├── config.py                # Pydantic settings (loads from .env)
│   ├── database/
│   │   ├── models.py            # SQLAlchemy ORM models
│   │   └── session.py           # engine + get_db dependency + init_db()
│   ├── schemas/
│   │   └── api.py               # Pydantic request/response models
│   └── services/
│       ├── chat_agent.py        # GPT-4 tool-use chat agent
│       ├── pdf_parser.py        # pdfplumber + Claude PDF extraction
│       ├── browser_agent.py     # browser-use filing agent (local Chrome via CDP)
│       ├── gusto_agent.py       # browser-use Cloud SDK → Gusto W-2 fetch
│       ├── fidelity_agent.py    # browser-use Cloud SDK → Fidelity 1099 fetch
│       └── field_loader.py      # load/query freetaxusa_fields.json
├── scripts/
│   └── scan_freetaxusa.py       # one-time scanner (walks FreeTaxUSA with dummy data)
├── data/
│   └── freetaxusa_fields.json   # real field manifest from 2026-03-01 scan
├── pyproject.toml
└── .env.example
```

---

## Components

### 1. Website Scanner (`scripts/scan_freetaxusa.py`)

- Connects to an already-running Chrome instance via CDP at `http://localhost:9222`
- Uses a browser-use `Agent` with Claude Sonnet to walk through FreeTaxUSA with dummy data
- Records every field label, type, options, section, and required status encountered
- Outputs `data/freetaxusa_fields.json` — the canonical field manifest (already committed)
- Re-run only if FreeTaxUSA changes its form structure

### 2. SQLite Models (`app/database/models.py`)

All tables include a JSON blob column to store the full frontend payload verbatim. Explicit columns are synced for backend queries; the JSON blob wins on read via `_row_to_dict()`.

| Table           | Explicit columns                                                                                                                                   | JSON blob column                                                                  | Notes                            |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- | -------------------------------- |
| `users`         | id, email                                                                                                                                          | —                                                                                 | One per browser session          |
| `chat_sessions` | id, user_id, status                                                                                                                                | —                                                                                 | status: `'open'` or `'complete'` |
| `chat_messages` | id, session_id, role, content                                                                                                                      | —                                                                                 | Full chat history                |
| `tax_returns`   | first_name, last_name, ssn, dob, address, occupation, filing_status, direct_deposit_routing, direct_deposit_account                                | `extra_data` + JSON cols: `other_income`, `dependents`, `misc_info`, `state_info` | Full TaxReturn payload           |
| `w2_forms`      | employer_name, ein, wages, federal_withheld, ss_withheld, medicare_withheld, state_withheld, state_wages, local_withheld, box12_code, box12_amount | `extra_data`                                                                      | All 44 W-2 box fields            |
| `form_1099s`    | form_type, payer_name, payer_tin, amount, federal_withheld                                                                                         | `raw_json`                                                                        | All extracted 1099 fields        |
| `deductions`    | mortgage_interest, charitable_cash, student_loan_interest                                                                                          | `other_json`                                                                      | Full DeductionsData payload      |
| `credits`       | eitc_qualifying_children                                                                                                                           | `other_json`                                                                      | Full CreditsData payload         |

### 3. Pydantic Sub-models (`app/schemas/api.py`)

Typed models mirror the frontend TypeScript interfaces exactly. All fields are `Optional` with `extra='ignore'` to drop internal DB keys on round-trip.

| Pydantic model    | Frontend type | Key fields                                                                                                                                                                                                                                                                                                                                                                             |
| ----------------- | ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `TaxReturnData`   | `TaxReturn`   | first*name, middle_initial, last_name, suffix, ssn, date_of_birth, occupation, address, apt, city, state, zip_code, zip_plus_4, addr_changed, filing_status, claimed_as_dependent, presidential_fund, blind, deceased, nonresident_alien, identity_protection_pin[_number], spouse*_, refund*type, is_multiple_deposit, bank*_, bank_is_foreign, phone_option, refund_amount, tax_owed |
| `W2FormData`      | `W2Form`      | employer*\*/employee*\* address fields, all 44 boxes, box12 pairs, box13 checkboxes, state/local fields, w2_type, is_corrected, has_tip_income, has_overtime                                                                                                                                                                                                                           |
| `Form1099Data`    | `Form1099`    | form_type, payer_name, amount                                                                                                                                                                                                                                                                                                                                                          |
| `DeductionsData`  | `Deductions`  | has*itemized_deductions gate, standard/itemized amounts, 7 has*\* category flags, all amount fields                                                                                                                                                                                                                                                                                    |
| `CreditsData`     | `Credits`     | has*marketplace_insurance, has_ira/ira*_, has_college_tuition/_, has*student_loan/*, has*teacher_expenses/*, has_eic/eic**, has*car_loan/*, has*home_energy/*, has_child_care/_, has_hsa/_, has_adoption/_, has_clean_vehicle/\*, + other has_\* flags                                                                                                                                 |
| `OtherIncomeData` | `OtherIncome` | has*1099_income gate, has_cryptocurrency gate, has_investments/investment_income, has_unemployment/*, has*social_security/*, has*retirement_income/*, has*state_refund/*, has_capital_loss_carryover, has_business_rental, business_income, rental_income                                                                                                                              |
| `DependentData`   | `Dependent`   | first_name, last_name, ssn, date_of_birth, relationship, months_lived                                                                                                                                                                                                                                                                                                                  |
| `MiscInfoData`    | `MiscInfo`    | has_estimated_payments, estimated_q1–q4, extension_payment, apply_refund_next_year, next_year_amount, has_foreign_accounts, has_foreign_assets, refund_maximizer, has_dependents                                                                                                                                                                                                       |
| `StateInfoData`   | `StateInfo`   | is_state_resident, is_full_year_resident, has_other_state_income                                                                                                                                                                                                                                                                                                                       |

### 4. Data Sync Flow

- **Write**: `PUT /users/{id}/data` — upserts TaxReturn (creates if none), replaces W2/1099 list wholesale, upserts Deduction/Credit. Stores full payload in JSON blobs. Also syncs known columns for browser agent compatibility.
- **Read**: `GET /users/{id}/data` — calls `_row_to_dict()` which merges `{**explicit_cols, **extra_data}` so frontend edits always override chat-agent writes.
- **Reset**: `DELETE /users/{id}/data` — hard-deletes all tax records; user row and chat session remain.

### 5. PDF Parser (`app/services/pdf_parser.py`)

- Receives PDF bytes via `POST /upload-pdf`, `POST /upload-w2-pdf`, or `POST /upload-1099-pdf`
- Extracts text with `pdfplumber`
- Sends extracted text to Claude with a structured extraction prompt
- Returns `{ form_type, fields }` typed dict mapped to DB columns
- `POST /upload-pdf` persists to the appropriate table; `upload-w2-pdf` and `upload-1099-pdf` return fields without saving (frontend handles persistence)

### 6. Chat Agent (`app/services/chat_agent.py`)

- Stateful OpenAI conversation using the OpenAI Python SDK
- Model: GPT-4.5 (set via `MODEL` constant at top of file)
- Loads full field manifest and chat history from DB on each turn
- System prompt injected with current tax data snapshot and active section context
- Uses OpenAI tool-use to read/write structured tax fields
- Runs an agentic loop until `finish_reason == "stop"`
- Returns `{reply, request_pdf_upload, pdf_upload_reason, session_status, snapshot, navigate_to_section}`

### 7. Browser Filing Agent (`app/services/browser_agent.py`)

- Uses browser-use `Agent` + `Browser(cdp_url=...)` connected to a local Chrome instance via CDP
- Runs one agent per section for reliability; sections follow FreeTaxUSA navigation order
- Triggered by `POST /submit-taxes`, runs as an `asyncio.create_task()` background task
- After each section completes, calls `_emit_filing_event()` → SSE bus → frontend timeline
- Supports individual section retry via `run_section()` (called by `POST /retry-section`)
- Returns per-section `{section_name, success, error, timestamp}` results

### 8. Gusto Agent (`app/services/gusto_agent.py`)

- Uses browser-use Cloud SDK — runs in a cloud-hosted browser, not local Chrome
- `start_gusto_w2_task()` — starts a cloud browser task that logs into Gusto; returns `{task_id, live_url}`
- `get_gusto_w2_result(task_id)` — polls task until done, returns W-2 PDF bytes
- MFA: user visits the `live_url` logged to console to complete Gusto login
- Downloaded PDF goes through `parse_tax_pdf()` → saved as W2Form record

### 9. Fidelity Agent (`app/services/fidelity_agent.py`)

- Same architecture as Gusto agent — cloud-hosted browser via browser-use SDK
- `start_fidelity_1099_task()` — starts cloud task that logs into Fidelity; returns `{task_id, live_url}`
- `get_fidelity_1099_result(task_id)` — polls task until done, returns consolidated 1099 PDF bytes
- MFA: user visits the `live_url` logged to console to complete Fidelity login
- Downloaded PDF goes through `parse_tax_pdf()` → saved as Form1099 record

### 10. Tax PDF Generation (`GET /users/{id}/tax-pdf`)

Uses ReportLab to generate a formatted PDF summary of the complete tax return:

- Personal information, filing status, occupation
- W-2 forms (all boxes including state/local)
- 1099 forms (all extracted fields from `raw_json`)
- Deductions (itemized entries or "Standard deduction")
- Credits
- Direct deposit info
- Other income, state info, dependents, misc info

Streamed as `application/pdf` with filename `tax-return-2025.pdf`.

### 11. Filing SSE Event Bus (inline in `app/main.py`)

An in-memory dict per user: `_filing_events` (event list) + `_filing_waiters` (asyncio.Event list).

- `_emit_filing_event(user_id, event)` — appends event and sets all waiters
- `GET /filing-stream/{user_id}` — long-polls using `asyncio.wait_for(waiter.wait(), timeout=120)`
- Events stop streaming on `complete`, `error`, or `timeout`

Event types:

- `section_complete` — `{ section, success, timestamp }`
- `complete` — `{ overall_success, timestamp }`
- `error` — `{ message, timestamp }`
- `timeout` — connection timed out after 120s

### 12. FastAPI Routes (`app/main.py`)

| Method | Route                 | Description                                                             |
| ------ | --------------------- | ----------------------------------------------------------------------- |
| POST   | /users                | Idempotent user creation by email                                       |
| POST   | /sessions             | Creates a new chat session                                              |
| POST   | /chat                 | Processes one chat turn; returns reply + snapshot + navigate_to_section |
| POST   | /upload-pdf           | Multipart: session_id + PDF file; extracts and persists                 |
| POST   | /upload-w2-pdf        | Multipart: user_id + PDF file; extracts and returns (no save)           |
| POST   | /upload-1099-pdf      | Multipart: user_id + PDF file; extracts and returns (no save)           |
| GET    | /sessions/{id}/status | Returns missing fields + percent_complete                               |
| POST   | /submit-taxes         | Starts browser agent as background task                                 |
| POST   | /retry-section        | Retries one named section                                               |
| GET    | /users/{id}/data      | Returns all stored tax data                                             |
| PUT    | /users/{id}/data      | Upserts full TaxData from frontend UI edits                             |
| DELETE | /users/{id}/data      | Wipes all tax records (reset)                                           |
| GET    | /filing-stream/{id}   | SSE stream of filing progress events                                    |
| POST   | /fetch-gusto-w2       | Starts cloud browser → Gusto → W-2 PDF → parse → save                   |
| POST   | /fetch-fidelity-1099  | Starts cloud browser → Fidelity → 1099 PDF → parse → save               |
| GET    | /users/{id}/tax-pdf   | Generates and streams ReportLab PDF summary                             |

### 13. Schemas (`app/schemas/api.py`)

Request/response models:

- `CreateUserRequest`, `UserResponse`
- `CreateSessionRequest`, `SessionResponse`
- `ChatRequest`, `ChatResponse`
- `PDFUploadResponse`
- `SessionStatusResponse`
- `SubmitTaxesRequest`, `SubmitTaxesResponse`, `SectionResult`
- `RetrySectionRequest`
- `UserDataResponse` — returned by GET and PUT /users/{id}/data; uses typed sub-models
- `UpdateDataRequest` — body for PUT /users/{id}/data; uses typed sub-models
- `FetchGustoW2Request`, `FetchGustoW2Response`
- `FetchFidelity1099Request`, `FetchFidelity1099Response`

Typed sub-models (mirror frontend TypeScript interfaces, `extra='ignore'`):

- `TaxReturnData`, `W2FormData`, `Form1099Data`, `DeductionsData`, `CreditsData`
- `OtherIncomeData`, `DependentData`, `MiscInfoData`, `StateInfoData`

---

## Field Manifest (`data/freetaxusa_fields.json`)

Real fields scanned from FreeTaxUSA on 2026-03-01. Key sections:

| Section              | Pages  | Key fields                                                                                                                                                                                                       |
| -------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Personal Information | 1, 3–6 | First/middle/last name, suffix, address (apt, city, state, zip, zip+4), SSN, DOB, occupation, addr_changed, blind, deceased, nonresident_alien, claimed_as_dependent, presidential_fund, identity_protection_pin |
| Filing Status        | 2      | filing_status (Single / MFJ / MFS / HoH / Qualifying Surviving Spouse)                                                                                                                                           |
| Income (W-2)         | 7–10   | All 44 boxes: EIN, employer/employee name+address+state+zip, boxes 1–20, box 12 codes A–HH, box 13 checkboxes, w2_type, is_corrected, has_tip_income, has_overtime                                               |
| Income (other)       | 11–13  | Cryptocurrency, investments, unemployment, SS benefits, retirement, etc.                                                                                                                                         |

State lists include all 50 states + DC, GU, PR, VI, AA, AE, AP (military/territory codes) to match FreeTaxUSA exactly.

---

## Environment Variables

Set in `backend/.env` (copy from `.env.example`):

```env
OPENAI_API_KEY=sk-proj-...
ANTHROPIC_API_KEY=sk-ant-...
DATABASE_URL=sqlite:///./april.db
CHROME_CDP_URL=http://localhost:9222
BROWSER_USE_API_KEY=...       # browser-use Cloud SDK key (for Gusto + Fidelity fetch)
```

---

## How to Run

### Prerequisites

- Python 3.13+, `uv` package manager
- Chrome installed (for browser filing agent)

### Setup

```bash
cd backend
uv sync
cp .env.example .env
# Fill in OPENAI_API_KEY, ANTHROPIC_API_KEY in .env
```

### Start the server

```bash
uvicorn app.main:app --reload
# → http://localhost:8000
# API docs: http://localhost:8000/docs
```

### File taxes (Chrome must be open at FreeTaxUSA)

```bash
# Open Chrome with remote debugging:
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
  --remote-debugging-port=9222

# Trigger filing:
curl -X POST http://localhost:8000/submit-taxes \
  -H "Content-Type: application/json" \
  -d '{"user_id": 1}'

# Watch live progress via SSE:
curl http://localhost:8000/filing-stream/1
```
