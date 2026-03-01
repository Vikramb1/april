# April — Backend

April is a Python backend that collects user tax data through a conversational chat interface and files a return on FreeTaxUSA using a browser-use automation agent.

See [FRONTEND.md](./FRONTEND.md) for the Next.js frontend that consumes this API.

---

## Architecture Overview

```
scripts/scan_freetaxusa.py     ← one-time runner, saves JSON field manifest
data/freetaxusa_fields.json    ← field manifest consumed by all agents

FastAPI backend/
  POST /users                  ← create user + session
  POST /sessions               ← create chat session
  POST /chat                   ← conversational data collection (Claude tool-use)
  POST /upload-pdf             ← parse W-2/1099 PDFs with pdfplumber + Claude
  GET  /sessions/{id}/status   ← check collected vs required fields
  POST /submit-taxes           ← trigger browser-use submission agent
  POST /retry-section          ← retry a single failed section
  GET  /users/{id}/data        ← review all stored tax data
  GET  /filing-stream/{user_id}← SSE stream of per-section filing progress events
  POST /setup-gusto-profile    ← create browser-use cloud profile for Gusto login
  POST /fetch-gusto-w2         ← fetch W-2 from Gusto via browser automation

SQLite (april.db)              ← stores all user data and chat history
```

---

## File Structure

```
backend/
├── app/
│   ├── main.py                  # FastAPI app + all routes (9 total)
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
│   └── freetaxusa_fields.json   # scanner output (placeholder committed; re-run for real fields)
├── pyproject.toml
├── .env.example
└── april.db                     # SQLite database (gitignored)
```

---

## Components

### 1. Website Scanner (`scripts/scan_freetaxusa.py`)
- Connects to an already-running Chrome instance via CDP at `http://localhost:9222`
- Uses a browser-use `Agent` with Claude Sonnet to walk through FreeTaxUSA with dummy data
- Records every field label, type, section, and required status encountered
- Outputs `data/freetaxusa_fields.json` — the canonical field manifest
- Run once; commit the output

### 2. SQLite Models (`app/database/models.py`)
- `users`: email, created_at
- `chat_sessions`: user_id, status (`collecting`/`complete`), current_section
- `chat_messages`: session_id, role (`user`/`assistant`), content
- `tax_returns`: personal info + bank/refund fields
- `w2_forms`: all W-2 box values per employer
- `form_1099s`: NEC/INT/DIV/B with raw_json blob for type-specific fields
- `deductions`: standard/itemized + specific deduction amounts
- `credits`: child tax credit, education credits, EITC

### 3. PDF Parser (`app/services/pdf_parser.py`)
- Receives PDF bytes via `POST /upload-pdf`
- Extracts text with `pdfplumber`
- Sends extracted text to Claude with a structured extraction prompt
- Returns typed dict mapped to DB columns
- Persists to the appropriate table (W2Form or Form1099)

### 4. Chat Agent (`app/services/chat_agent.py`)
- Stateful Claude conversation using the Anthropic SDK (not LangChain)
- Loads full field manifest and chat history from DB on each turn
- Uses three Claude tools:
  - `save_fields(section, fields)` — persists collected data to SQLite
  - `mark_section_complete(section)` — advances current_section pointer
  - `request_pdf_upload(reason)` — signals frontend to show upload UI
- Runs an agentic loop until Claude stops using tools
- Returns `{reply, request_pdf_upload, pdf_upload_reason, session_status}`

### 5. Browser Submission Agent (`app/services/browser_agent.py`)
- Uses browser-use `Agent` + `Browser(cdp_url=...)` connected to Chrome
- Runs **one agent per section** for reliability
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
- `POST /users` — idempotent user creation by email
- `POST /sessions` — creates a new chat session
- `POST /chat` — processes one chat turn, returns reply + optional PDF upload flag
- `POST /upload-pdf` — multipart form: session_id + PDF file
- `GET /sessions/{id}/status` — returns missing fields + percent complete
- `POST /submit-taxes` — triggers browser agent, returns per-section results
- `POST /retry-section` — retries one named section
- `GET /users/{id}/data` — returns all stored tax data as JSON
- `GET /filing-stream/{user_id}` — SSE stream of `section_complete` and `complete` events
- `POST /setup-gusto-profile` — creates a browser-use cloud profile for Gusto; user authenticates via `live_url`
- `POST /fetch-gusto-w2` — uses saved profile to fetch W-2 from Gusto, parse it, and save to DB

### 8. SSE Queue (`app/queues.py`)
- `filing_queues: dict[int, asyncio.Queue]` — one queue per active filing user
- `browser_agent.py` pushes events; `main.py` /filing-stream reads them
- Separated into its own module to avoid circular imports

---

## SQLite Schema Summary

| Table | Key Columns |
|---|---|
| `users` | id, email, created_at |
| `chat_sessions` | id, user_id, status, current_section |
| `chat_messages` | id, session_id, role, content |
| `tax_returns` | id, user_id, filing_status, first/last name, ssn, dob, address, occupation, routing, account |
| `w2_forms` | id, user_id, employer_name, ein, wages, federal/ss/medicare/state_withheld, box12 |
| `form_1099s` | id, user_id, form_type, payer_name, payer_tin, amount, federal_withheld, raw_json |
| `deductions` | id, user_id, type, mortgage_interest, charitable_cash, student_loan_interest, other_json |
| `credits` | id, user_id, child_tax_credit_count, education_credit_type, eitc_qualifying_children, other_json |

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

### Step 1 — Run the scanner (one-time)
```bash
# Open Chrome with remote debugging:
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
  --remote-debugging-port=9222 --user-data-dir=/tmp/chrome-april

# Navigate Chrome to freetaxusa.com and start/log in to a return, then:
cd backend
python scripts/scan_freetaxusa.py
# → writes data/freetaxusa_fields.json
```

### Step 2 — Start the server
```bash
cd backend
uvicorn app.main:app --reload
# Server runs at http://localhost:8000
# API docs: http://localhost:8000/docs
```

### Step 3 — Chat flow (curl example)
```bash
curl -X POST http://localhost:8000/users \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com"}'

curl -X POST http://localhost:8000/sessions \
  -H "Content-Type: application/json" \
  -d '{"user_id": 1}'

curl -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{"session_id": 1, "message": "I have a W-2 from Google"}'

curl http://localhost:8000/sessions/1/status
```

### Step 4 — Submit (Chrome must be open at FreeTaxUSA)
```bash
curl -X POST http://localhost:8000/submit-taxes \
  -H "Content-Type: application/json" \
  -d '{"user_id": 1}'

# Watch live progress via SSE:
curl http://localhost:8000/filing-stream/1
```
