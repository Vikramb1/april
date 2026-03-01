# April — Frontend

Next.js 16 / React 19 / Tailwind v4 UI for the April tax filing assistant. Connects to the FastAPI backend described in [BACKEND.md](./BACKEND.md).

---

## Design Philosophy

"A beautifully typeset financial document that came to life." Inspired by Muji restraint and Bloomberg Terminal precision:

- **Warm cream backgrounds** (#FAF7F2) — no cold whites or dark modes
- **Forest green accents** (#1B4332) for all interactive / positive states
- **JetBrains Mono** for every number, dollar amount, and code-like value
- **Plus Jakarta Sans** for all prose text
- Zero shadows, zero gradients — borders and whitespace only

---

## Tech Stack

- **Next.js 16** (App Router) + **React 19**
- **Tailwind CSS v4** (`@theme inline` design tokens, no config file)
- **Zustand** for global client state (phase, chat messages, filing progress)
- **TypeScript** throughout

---

## File Structure

```
frontend/
├── app/
│   ├── layout.tsx          # Fonts (Plus Jakarta Sans + JetBrains Mono) + metadata
│   ├── globals.css         # Design tokens, animations (pulse-dot, shimmer)
│   ├── page.tsx            # Redirects → /dashboard
│   ├── dashboard/page.tsx  # Three-column layout (all phases)
│   ├── profile/page.tsx    # Apple-settings style profile page
│   └── accounts/page.tsx   # Connected financial accounts grid
│
├── components/
│   ├── layout/
│   │   ├── TopNav.tsx      # Fixed 56px bar: logo · year switcher · phase pill · avatar
│   │   └── Sidebar.tsx     # Greeting · progress ring · nav groups · status card
│   ├── ui/
│   │   ├── ProgressRing.tsx    # Animated SVG ring (120px, phase-aware)
│   │   └── SectionPills.tsx    # Horizontal scrollable pills with state variants
│   ├── chat/
│   │   ├── ChatPanel.tsx       # Right panel wrapper + API integration
│   │   ├── ChatMessage.tsx     # April (green left border) vs user (right-aligned grey)
│   │   ├── PDFUploadCard.tsx   # Inline green-bordered drag-and-drop upload card
│   │   └── ChatInput.tsx       # Input bar + 3 suggestion chips
│   ├── sections/
│   │   ├── SectionContent.tsx      # switch(activeSection) dispatcher
│   │   ├── PersonalSection.tsx     # Inline editable field rows
│   │   ├── FilingStatusSection.tsx # Segmented control + dependents list
│   │   ├── W2Section.tsx           # Per-employer cards with mono number grid
│   │   ├── Form1099Section.tsx     # Per-payer cards with form type pill
│   │   ├── DeductionsSection.tsx   # Standard vs itemized comparison card
│   │   ├── CreditsSection.tsx      # Per-credit cards with description
│   │   ├── BankSection.tsx         # Routing/account + refund amount card
│   │   └── ReviewSection.tsx       # Full return table + "File My Return →" button
│   └── filing/
│       ├── FilingView.tsx          # Phase 3 container (wraps timeline + terminal)
│       ├── FilingTimeline.tsx      # Vertical section timeline with status icons
│       └── TerminalLog.tsx         # Browser agent log (JetBrains Mono, live scroll)
│
├── lib/
│   ├── api.ts              # Typed fetch wrappers for all 9 backend endpoints
│   └── types.ts            # Shared TypeScript types (Phase, TaxData, FilingEvent, …)
│
├── hooks/
│   └── useFilingStream.ts  # EventSource hook consuming /filing-stream/{user_id} SSE
│
└── store/
    └── index.ts            # Zustand store (user, session, phase, data, chat, filing)
```

---

## Design Tokens (`app/globals.css`)

```css
--color-cream:       #FAF7F2   /* page background */
--color-cream-deep:  #F5F0E8   /* sidebar background */
--color-ink:         #0D0D0D   /* primary text */
--color-muted:       #6B7280   /* secondary text */
--color-green:       #1B4332   /* primary brand / CTA */
--color-green-mid:   #2D6A4F   /* hover state */
--color-green-light: #D8F3DC
--color-green-pale:  #EAF4EC   /* success backgrounds */
--color-amber:       #D97706   /* in-progress / warning */
--color-amber-pale:  #FEF3C7
--color-red:         #DC2626   /* error */
--color-hairline:    #E5E7EB   /* all borders/dividers */
```

Animations: `pulse-dot` (opacity 1→0.3→1, 1.5s) · `shimmer` (opacity 0.6→1→0.6, 1.5s)

---

## Zustand Store Shape (`store/index.ts`)

```ts
userId: number | null          // from POST /users
sessionId: number | null       // from POST /sessions
userEmail: string
phase: 'collecting' | 'reviewing' | 'filing' | 'filed'

activeSection: string          // current middle-panel section
activeYear: string             // '2024' | '2023' | ...

messages: ChatMessage[]        // full chat history
pendingPdfUpload: { active, reason }
isTyping: boolean

taxData: TaxData | null        // from GET /users/{id}/data
percentComplete: number        // from GET /sessions/{id}/status
missingFields: string[]

filingProgress: SectionResult[]  // from SSE stream
filingLog: FilingLogEntry[]      // timestamped agent messages
```

Persisted to localStorage (via `zustand/middleware/persist`): userId, sessionId, userEmail, phase, activeYear, messages, taxData, percentComplete.

---

## API Client (`lib/api.ts`)

All requests go to `NEXT_PUBLIC_API_URL` (defaults to `http://localhost:8000`).

| Method | Endpoint | Used by |
|---|---|---|
| POST | /users | Dashboard init |
| POST | /sessions | Dashboard init |
| POST | /chat | ChatPanel |
| POST | /upload-pdf | PDFUploadCard |
| GET | /sessions/{id}/status | ChatPanel (after each turn) |
| POST | /submit-taxes | ReviewSection |
| POST | /retry-section | FilingTimeline (retry button) |
| GET | /users/{id}/data | Dashboard init |
| GET | /filing-stream/{id} | useFilingStream hook (SSE) |

---

## Phase Flow

1. **collecting** — ChatPanel drives data collection; middle panel shows section pills + editable fields
2. **reviewing** — All fields collected; middle panel shows ReviewSection with green banner + "File My Return →"
3. **filing** — POST /submit-taxes triggered; middle panel shows FilingView with live timeline + terminal log (SSE)
4. **filed** — All sections complete; timeline all green, completion banner shown

---

## Page Routes

| Route | Description |
|---|---|
| `/` | Redirects to `/dashboard` |
| `/dashboard` | Main three-column filing experience |
| `/profile` | Editable personal info + filing preferences + security |
| `/accounts` | 3-col grid of connected financial institutions |

---

## How to Run

```bash
cd frontend
npm install       # install dependencies
npm run dev       # start at http://localhost:3000
```

Requires the FastAPI backend running at `http://localhost:8000`. Set `NEXT_PUBLIC_API_URL` in `.env.local` to override.
