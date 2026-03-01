# April — Backend

April is a Python backend that collects user tax data through a conversational chat interface and files a return on FreeTaxUSA using a browser-use automation agent.

See [FRONTEND.md](./FRONTEND.md) for the Next.js frontend that consumes this API.

---

## Architecture Overview

```
scripts/scan_freetaxusa.py     ← one-time runner, saves JSON field manifest
data/freetaxusa_fields.json    ← real FreeTaxUSA fields (scanned 2026-03-01)

FastAPI backend/
  POST   /users                ← create/find user by email
  POST   /sessions             ← create chat session
  POST   /chat                 ← conversational data collection (Claude tool-use)
  POST   /upload-pdf           ← parse W-2/1099 PDFs with pdfplumber + Claude
  GET    /sessions/{id}/status ← check collected vs required fields
  POST   /submit-taxes         ← trigger browser-use submission agent
  POST   /retry-section        ← retry a single failed section
  GET    /users/{id}/data      ← return all stored tax data (explicit cols + extra_data)
  PUT    /users/{id}/data      ← upsert full TaxData payload from frontend
  DELETE /users/{id}/data      ← wipe all tax records for a user (reset)
  GET    /filing-stream/{id}   ← SSE stream of per-section filing progress events
  POST   /gusto-login          ← create browser-use cloud profile for Gusto login
  POST   /fetch-gusto-w2       ← fetch W-2 from Gusto via browser automation

SQLite (april.db)              ← all user data, chat history, and tax records
```

---

## File Structure

```
backend/
├── app/
│   ├── main.py                  # FastAPI app + all 11 routes
│   ├── config.py                # Pydantic settings (loads from .env)
│   ├── queues.py                # Shared asyncio Queues for SSE filing stream
│   ├── database/
│   │   ├── models.py            # SQLAlchemy ORM models
│   │   └── session.py           # engine + get_db dependency + init_db()
│   ├── schemas/
│   │   └── api.py               # Pydantic request/response models
│   └── services/
│       ├── chat_agent.py        # Claude chat agent with tool-use
│       ├── pdf_parser.py        # pdfplumber + Claude PDF extraction
│       ├── browser_agent.py     # browser-use submission agent (CDP)
│       ├── gusto_agent.py       # browser-use Cloud SDK agent for Gusto W-2 fetch
│       └── field_loader.py      # load/query freetaxusa_fields.json
├── scripts/
│   └── scan_freetaxusa.py       # one-time scanner (walks FreeTaxUSA with dummy data)
├── data/
│   └── freetaxusa_fields.json   # real field manifest from 2026-03-01 scan
├── pyproject.toml
├── .env.example
└── april.db                     # SQLite database (gitignored)
```

---

## Components

### 1. Website Scanner (`scripts/scan_freetaxusa.py`)
- Connects to an already-running Chrome instance via CDP at `http://localhost:9222`
- Uses a browser-use `Agent` with Claude Sonnet to walk through FreeTaxUSA with dummy data
- Records every field label, type, options, section, and required status encountered
- Outputs `data/freetaxusa_fields.json` — the canonical field manifest (already committed from real scan)
- Re-run only if FreeTaxUSA changes its form structure

### 2. SQLite Models (`app/database/models.py`)

All tables include `extra_data JSON` to store the full frontend payload verbatim (keys match frontend TypeScript interfaces). Explicit columns are synced for backend queries; `extra_data` wins on read.

| Table | Explicit Columns | extra_data |
|---|---|---|
| `users` | id, email, created_at | — |
| `chat_sessions` | id, user_id, status, current_section | — |
| `chat_messages` | id, session_id, role, content | — |
| `tax_returns` | first_name, last_name, ssn, dob, address, occupation, filing_status, direct_deposit_routing/account | All frontend TaxReturn fields |
| `w2_forms` | employer_name, ein, wages, federal/ss/medicare/state_withheld, state_wages, local_withheld, box12_code/amount | All 44 W-2 box fields |
| `form_1099s` | form_type, payer_name, payer_tin, amount, federal_withheld, raw_json | — |
| `deductions` | type, mortgage_interest, charitable_cash, student_loan_interest, other_json | — |
| `credits` | child_tax_credit_count, education_credit_type, eitc_qualifying_children, other_json | — |

### 3. Data Sync Flow
- **Write**: `PUT /users/{id}/data` — upserts TaxReturn (creates if none), replaces W2/1099 list wholesale, upserts Deduction/Credit. Stores full payload in `extra_data`. Also syncs known columns for browser agent compatibility.
- **Read**: `GET /users/{id}/data` — calls `_row_to_dict()` which merges `{**explicit_cols, **extra_data}` so frontend edits always override chat-agent writes to explicit columns.
- **Reset**: `DELETE /users/{id}/data` — hard-deletes all tax records; user row and chat session remain intact.

### 4. PDF Parser (`app/services/pdf_parser.py`)
- Receives PDF bytes via `POST /upload-pdf`
- Extracts text with `pdfplumber`
- Sends extracted text to Claude with a structured extraction prompt
- Returns typed dict mapped to DB columns
- Persists to the appropriate table (W2Form or Form1099)

### 5. Chat Agent (`app/services/chat_agent.py`)
- Stateful Claude conversation using the Anthropic SDK (not LangChain)
- Loads full field manifest and chat history from DB on each turn
- Uses three Claude tools:
  - `save_fields(section, fields)` — persists collected data to SQLite
  - `mark_section_complete(section)` — advances current_section pointer
  - `request_pdf_upload(reason)` — signals frontend to show upload UI
- Runs an agentic loop until Claude stops using tools
- Returns `{reply, request_pdf_upload, pdf_upload_reason, session_status}`

### 6. Browser Submission Agent (`app/services/browser_agent.py`)
- Uses browser-use `Agent` + `Browser(cdp_url=...)` connected to Chrome
- Runs one agent per section for reliability
- Sections: Personal Information → Filing Status → W-2 Income → 1099 Income → Deductions → Credits → Bank/Refund → Review
- Stops before the final "File" / "Submit" button
- After each section completes, pushes an event to `app/queues.py` → consumed by SSE endpoint
- Supports individual section retry via `run_section()`
- Returns per-section `{section_name, success, error}` results

### 6. Gusto Agent (`app/services/gusto_agent.py`)
- Uses browser-use Cloud SDK (`browser-use-sdk`) — runs in a cloud-hosted browser, not local Chrome
- `create_gusto_profile(name)` — creates a persistent browser profile, opens Gusto login for user to authenticate
- `fetch_w2_pdf(profile_id)` — reuses an authenticated profile to navigate Gusto and download the most recent W-2 PDF
- Downloaded PDF is passed through the existing `parse_tax_pdf()` pipeline and saved as a W2Form record

### 7. FastAPI Routes (`app/main.py`)

| Method | Route | Description |
|---|---|---|
| POST | /users | Idempotent user creation by email |
| POST | /sessions | Creates a new chat session |
| POST | /chat | Processes one chat turn; returns reply + optional PDF upload flag |
| POST | /upload-pdf | Multipart: session_id + PDF file; persists extracted fields |
| GET | /sessions/{id}/status | Returns missing fields + percent_complete |
| POST | /submit-taxes | Triggers browser agent; returns per-section results |
| POST | /retry-section | Retries one named section |
| GET | /users/{id}/data | Returns all stored tax data (extra_data merged) |
| PUT | /users/{id}/data | Upserts full TaxData from frontend UI edits |
| DELETE | /users/{id}/data | Wipes all tax records (reset) |
| GET | /filing-stream/{id} | SSE stream of section_complete and complete events |
| POST | /gusto-login | Creates browser-use cloud profile for Gusto; user authenticates via live_url |
| POST | /fetch-gusto-w2 | Uses saved profile to fetch W-2 from Gusto, parse, and save to DB |

### 8. Schemas (`app/schemas/api.py`)
- `CreateUserRequest`, `UserResponse`
- `CreateSessionRequest`, `SessionResponse`
- `ChatRequest`, `ChatResponse`
- `PDFUploadResponse`
- `SessionStatusResponse`
- `SubmitTaxesRequest`, `SubmitTaxesResponse`, `SectionResult`
- `RetrySectionRequest`
- `UserDataResponse` — returned by GET and PUT /users/{id}/data
- `UpdateDataRequest` — body for PUT /users/{id}/data
- `GustoLoginRequest`, `GustoLoginResponse`, `FetchGustoW2Request`, `FetchGustoW2Response`

### 9. SSE Queue (`app/queues.py`)
- `filing_queues: dict[int, asyncio.Queue]` — one queue per active filing user
- `browser_agent.py` pushes events; `main.py` /filing-stream reads them
- Separated into its own module to avoid circular imports

---

## Field Manifest (`data/freetaxusa_fields.json`)

Real fields scanned from FreeTaxUSA on 2026-03-01. Key sections:

| Section | Pages | Key fields |
|---|---|---|
| Personal Information | 1, 3–6 | First/middle/last name, suffix, address (apt, city, state, zip, zip+4), SSN, DOB, occupation, addr_changed, blind, deceased, nonresident_alien, claimed_as_dependent, presidential_fund, identity_protection_pin |
| Filing Status | 2 | filing_status (Single / MFJ / MFS / HoH / Qualifying Surviving Spouse) |
| Income (W-2) | 7–10 | All 44 boxes: EIN, employer/employee name+address+state+zip, boxes 1–20, box 12 codes A–HH, box 13 checkboxes, w2_type, is_corrected, has_tip_income, has_overtime |
| Income (other) | 11–13 | Cryptocurrency, investments, unemployment, SS benefits, retirement, etc. |

State lists include all 50 states + DC, GU, PR, VI, AA, AE, AP (military/territory codes) to match FreeTaxUSA exactly.

---

## Environment Variables

Set in `backend/.env` (copy from `.env.example`):

```env
ANTHROPIC_API_KEY=sk-ant-...
DATABASE_URL=sqlite:///./april.db
CHROME_CDP_URL=http://localhost:9222
BROWSER_USE_API_KEY=...              # browser-use cloud SDK key (for Gusto W-2 fetch)
GUSTO_PROFILE_ID=...                 # optional; set after first /setup-gusto-profile call
```

---

## How to Run

### Prerequisites
- Python 3.13+, `uv` package manager
- Chrome installed

### Setup
```bash
cd backend
uv sync          # installs all dependencies
cp .env.example .env
# Fill in ANTHROPIC_API_KEY in .env
```

### Step 1 — Start the server
```bash
cd backend
uvicorn app.main:app --reload
# Server runs at http://localhost:8000
# API docs: http://localhost:8000/docs
```

### Step 2 — Scanner (only if FreeTaxUSA changes)
```bash
# Open Chrome with remote debugging:
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
  --remote-debugging-port=9222 --user-data-dir=/tmp/chrome-april

# Navigate Chrome to freetaxusa.com, log in, then:
python scripts/scan_freetaxusa.py
# → overwrites data/freetaxusa_fields.json
```

### Step 3 — Submit (Chrome must be open at FreeTaxUSA)
```bash
curl -X POST http://localhost:8000/submit-taxes \
  -H "Content-Type: application/json" \
  -d '{"user_id": 1}'

# Watch live progress via SSE:
curl http://localhost:8000/filing-stream/1
```
