# April

April is THE tax season. But it's also THE AI-native CPA.

April is an agentic tax filing assistant that collects your information through conversation, extracts data from uploaded documents, and files your federal and state return — automatically. Named after the month everyone dreads, it's built to make sure you never dread it again.

---

## The Problem

Filing taxes means hunting down every W-2 and 1099, manually entering hundreds of fields into a tax portal, and hoping you didn't miss anything. Most people either pay a CPA hundreds of dollars or white-knuckle it through TurboTax. April does it differently: you talk to an AI that already knows what questions to ask, fills in every field as you answer, and files when you're ready.

---

## How It Works

1. **Chat with April** — an AI assistant (GPT-4.5 tool-use agent) walks you through every section of your return, asking the right questions and saving answers directly to your tax data
2. **Upload documents** — drop in a W-2 or 1099 PDF and April extracts every field automatically using pdfplumber + Claude; or connect directly to Gusto or Fidelity to fetch documents via cloud browser automation
3. **Review your return** — a live sidebar tracks completion across all 18 sections with a real-time refund estimate computed locally from 2025 tax brackets
4. **File** — April navigates FreeTaxUSA section by section using browser automation, filling every field while you watch; progress streams back live via Server-Sent Events

---

## Architecture

A FastAPI backend (16 routes) handles data storage, the AI chat agent, PDF extraction, document fetching, and browser automation. A Next.js frontend provides a landing page and a three-panel dashboard: sidebar navigation, section forms, and the April chat panel.

```
Frontend (Next.js 16 + React 19)
      │
      ├── app/page.tsx      — landing page
      ├── app/dashboard/    — three-column dashboard layout
      │     ├── Sidebar         — section completion, live refund estimate, year switcher
      │     ├── SectionContent  — 18 form sections (personal info → review)
      │     └── ChatPanel       — April AI assistant
      │
      │  REST + SSE
      ▼

Backend (FastAPI, Python 3.13) — 16 routes
      ├── Chat agent         — OpenAI GPT-4.5 tool-use agent
      ├── PDF parser         — pdfplumber + Claude extraction
      ├── Browser agent      — browser-use + Chrome CDP → FreeTaxUSA filing
      ├── Gusto agent        — browser-use Cloud SDK → Gusto W-2 fetch
      ├── Fidelity agent     — browser-use Cloud SDK → Fidelity 1099 fetch
      ├── PDF generator      — ReportLab tax return summary PDF
      └── SQLite (SQLAlchemy 2.0)
```

---

## Tech Stack

| Layer                      | Technology                              |
| -------------------------- | --------------------------------------- |
| **Frontend**               | Next.js 16, React 19, TypeScript        |
| **Styling**                | Tailwind CSS v4                         |
| **State**                  | Zustand (persisted)                     |
| **Backend**                | FastAPI, Python 3.13, uvicorn           |
| **ORM / DB**               | SQLAlchemy 2.0, SQLite                  |
| **Chat AI**                | OpenAI GPT-4.5 (tool-use agent)         |
| **PDF extraction**         | pdfplumber + Claude                     |
| **PDF generation**         | ReportLab                               |
| **Browser automation**     | browser-use + Chrome CDP (local filing) |
| **Gusto / Fidelity fetch** | browser-use Cloud SDK                   |
| **Package management**     | uv (backend), npm (frontend)            |

---

## Key Features

### Chat Agent

The AI agent uses OpenAI GPT-4.5 tool-use to read and write structured tax data. It knows which section the user is currently on, injects the current tax data snapshot into every turn, and calls structured tools to save each answer. When the user uploads a PDF, a separate extraction pipeline uses pdfplumber to pull text and Claude to map fields to the correct schema locations. The chat panel also accepts direct PDF uploads mid-conversation.

### Document Fetch (Gusto + Fidelity)

Users can connect directly to Gusto or Fidelity instead of uploading a PDF manually. A cloud-hosted browser agent (via the browser-use Cloud SDK) logs into the portal, navigates to the tax documents section, downloads the PDF, and passes it through the same PDF extraction pipeline. The user completes MFA via a live browser URL displayed in the UI.

### Section System

18 sections across 6 groups track completion state entirely in the frontend (Zustand + `sectionUtils.ts`):

| Group                | Sections                                                      |
| -------------------- | ------------------------------------------------------------- |
| Personal             | Personal Info, Filing Status, Dependents, Identity Protection |
| Income               | W-2 Income, 1099 Income, Other Income                         |
| Deductions & Credits | Deductions, Health Insurance, Common Credits, Other Credits   |
| Miscellaneous        | Misc Forms, Refund Maximizer                                  |
| State                | State Residency, State Return                                 |
| Summary              | Federal Summary, Bank & Refund, Review                        |

Most sections use a gate question pattern — a Yes/No pill that controls whether sub-fields are required. Deselecting a gate answer reverts the section from complete or amber back to incomplete. The sidebar shows green (complete), amber (started but incomplete), or muted (not started) for every section and group.

### Refund Estimate

The sidebar computes a live federal refund estimate using 2025 tax brackets and the user's W-2 wages and federal withholding as they fill in the form — no backend call required. The estimate updates immediately as new W-2s are added or edited.

### Browser Filing Agent

When the user clicks "File with FreeTaxUSA," a `browser-use` agent connects to a local Chrome instance via Chrome DevTools Protocol and fills in every section of FreeTaxUSA using the collected tax data. The agent works section by section against a real field manifest (`freetaxusa_fields.json`) scanned from FreeTaxUSA's live DOM. Filing progress streams back to the frontend via Server-Sent Events. Individual sections can be retried on failure via `POST /retry-section`.

### Tax Return PDF

`GET /users/{id}/tax-pdf` generates a formatted PDF summary of the complete return using ReportLab — personal info, W-2s, 1099s, deductions, credits, refund info — and streams it directly to the browser.

### Validation

`lib/validation.ts` exports `getMissingFields()` which returns human-readable `{ section, label }` entries for every required field not yet filled. The Review section shows a modal listing all missing fields before allowing the user to proceed to filing.

---

## Running Locally

**Prerequisites:** Python 3.13, Node.js 18+, Chrome with remote debugging enabled

```bash
# Chrome (required for browser filing agent)
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
  --remote-debugging-port=9222

# Backend
cd backend
uv sync
cp .env.example .env   # fill in API keys
uvicorn app.main:app --reload
# → http://localhost:8000
# API docs: http://localhost:8000/docs

# Frontend
cd frontend
npm install
npm run dev
# → http://localhost:3000
```

**Required environment variables** (in `backend/.env`):

```
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
DATABASE_URL=sqlite:///./april.db
CHROME_CDP_URL=http://localhost:9222
BROWSER_USE_API_KEY=        # browser-use Cloud SDK key (Gusto + Fidelity fetch)
```

---

## Project Structure

```
april/
├── BACKEND.md
├── FRONTEND.md
├── backend/
│   ├── app/
│   │   ├── main.py                  # FastAPI app + all 16 routes
│   │   ├── config.py                # Pydantic settings (loads .env)
│   │   ├── database/
│   │   │   ├── models.py            # SQLAlchemy ORM models
│   │   │   └── session.py           # engine + get_db + init_db
│   │   ├── schemas/
│   │   │   └── api.py               # Pydantic request/response models
│   │   └── services/
│   │       ├── chat_agent.py        # GPT-4.5 tool-use chat agent
│   │       ├── pdf_parser.py        # pdfplumber + Claude PDF extraction
│   │       ├── browser_agent.py     # browser-use FreeTaxUSA filing agent
│   │       ├── gusto_agent.py       # cloud browser → Gusto W-2 fetch
│   │       ├── fidelity_agent.py    # cloud browser → Fidelity 1099 fetch
│   │       └── field_loader.py      # loads freetaxusa_fields.json
│   ├── scripts/
│   │   └── scan_freetaxusa.py       # one-time FreeTaxUSA field scanner
│   └── data/
│       └── freetaxusa_fields.json   # real field manifest (scanned 2026-03-01)
└── frontend/
    ├── app/
    │   ├── page.tsx                 # landing page
    │   ├── _landing/                # landing page section components
    │   │   ├── Hero.tsx
    │   │   ├── WorksSection.tsx
    │   │   ├── SecuritySection.tsx
    │   │   ├── CTASection.tsx
    │   │   ├── Footer.tsx
    │   │   └── shared.tsx
    │   ├── dashboard/
    │   │   └── page.tsx             # three-column dashboard layout
    │   └── globals.css              # design tokens + Tailwind base
    ├── components/
    │   ├── layout/
    │   │   ├── Sidebar.tsx          # accordion nav, completion, refund estimate
    │   │   └── TopNav.tsx           # fixed 56px top bar
    │   ├── sections/                # 18 section form components
    │   │   └── SectionContent.tsx   # switch dispatcher
    │   └── chat/
    │       ├── ChatPanel.tsx        # right panel with resize handle
    │       ├── ChatMessage.tsx
    │       └── ChatInput.tsx
    ├── store/
    │   └── index.ts                 # Zustand store (persisted)
    ├── hooks/
    │   └── useFilingStream.ts       # EventSource SSE hook
    └── lib/
        ├── types.ts                 # shared TypeScript types + SECTION_GROUPS
        ├── api.ts                   # typed fetch wrappers (14 endpoints)
        ├── validation.ts            # getMissingFields()
        └── sectionUtils.ts          # isSectionComplete, isSectionStarted
```

---

## What We Learned

- **Structured tool-use beats free-form chat for data collection.** Giving the agent explicit read/write tools for each tax field produces reliable, structured output without prompt engineering gymnastics.
- **Frontend completion logic should live client-side.** Tracking section completion in Zustand with gate-question patterns gives instant feedback without round-trips. The gate → amber → green progression makes it obvious what still needs attention.
- **Browser automation needs a real field manifest.** We scanned FreeTaxUSA's actual DOM to produce `freetaxusa_fields.json` — a ground-truth map of every field the agent needs to fill. This made the browser agent dramatically more reliable than prompting it to find fields by description.
- **Cloud browser agents solve the MFA problem.** For Gusto and Fidelity, running the browser session in the cloud lets the user complete MFA in a live browser URL without any local setup beyond providing credentials.
