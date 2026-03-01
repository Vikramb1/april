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
- **Zustand** for global client state (persisted to localStorage via `zustand/middleware/persist`)
- **TypeScript** throughout

---

## File Structure

```
frontend/
├── app/
│   ├── layout.tsx          # Fonts (Plus Jakarta Sans + JetBrains Mono) + metadata
│   ├── globals.css         # Design tokens, animations (pulse-dot, shimmer)
│   ├── page.tsx            # Redirects → /dashboard
│   ├── dashboard/page.tsx  # Three-column layout (all phases); init + DB hydration
│   ├── profile/page.tsx    # Apple-settings style profile page
│   └── accounts/page.tsx   # Connected financial accounts grid
│
├── components/
│   ├── layout/
│   │   ├── TopNav.tsx      # Fixed 56px bar: logo · "Tax Year" label · year pills · phase pill · avatar
│   │   └── Sidebar.tsx     # "Welcome back" · progress ring · section nav · reset button
│   ├── ui/
│   │   ├── ProgressRing.tsx    # Animated SVG ring (120px, phase-aware)
│   │   └── SectionPills.tsx    # Horizontal scrollable pills with state variants
│   ├── chat/
│   │   ├── ChatPanel.tsx       # Right panel wrapper; refreshes taxData from DB after each message
│   │   ├── ChatMessage.tsx     # April (green left border) vs user (right-aligned grey)
│   │   ├── PDFUploadCard.tsx   # Inline green-bordered drag-and-drop upload card
│   │   └── ChatInput.tsx       # Input bar (no suggestion chips)
│   ├── sections/
│   │   ├── SectionContent.tsx      # switch(activeSection) dispatcher
│   │   ├── PersonalSection.tsx     # 23 real FreeTaxUSA fields; FieldRow/SelectRow/RadioRow/CheckboxRow; persists to store on blur
│   │   ├── FilingStatusSection.tsx # 5 statuses incl. Qualifying Surviving Spouse; Identity Protection PIN with conditional PIN-number input; dependents list
│   │   ├── W2Section.tsx           # All 44 W-2 boxes in 7 groups; compact card summary; tip income conditional fields
│   │   ├── Form1099Section.tsx     # Per-payer cards; NEC/INT/DIV/B/MISC/R/SSA types
│   │   ├── DeductionsSection.tsx   # Standard vs itemized comparison card
│   │   ├── CreditsSection.tsx      # Per-credit cards with description
│   │   ├── BankSection.tsx         # Routing/account + Checking/Savings toggle (no refund estimate)
│   │   └── ReviewSection.tsx       # Return summary table; submit guard (lists incomplete sections); "File My Return →" button
│   └── filing/
│       ├── FilingView.tsx          # Phase 3 container (wraps timeline + terminal)
│       ├── FilingTimeline.tsx      # Vertical section timeline with status icons
│       └── TerminalLog.tsx         # Browser agent log (JetBrains Mono, live scroll)
│
├── lib/
│   ├── api.ts              # Typed fetch wrappers for all 11 backend endpoints
│   └── types.ts            # Shared TypeScript types
│
├── hooks/
│   └── useFilingStream.ts  # EventSource hook consuming /filing-stream/{user_id} SSE
│
└── store/
    └── index.ts            # Zustand store
```

---

## TypeScript Types (`lib/types.ts`)

### `TaxReturn`
All personal info fields mirroring real FreeTaxUSA form:
`first_name`, `middle_initial`, `last_name`, `suffix`, `ssn`, `date_of_birth`, `occupation`, `address`, `apt`, `city`, `state`, `zip_code`, `zip_plus_4`, `addr_changed` (boolean), `filing_status`, `claimed_as_dependent`, `presidential_fund`, `blind`, `deceased`, `nonresident_alien`, `identity_protection_pin`, `identity_protection_pin_number`, `bank_routing_number`, `bank_account_number`, `bank_account_type`, `refund_amount`, `tax_owed`

### `W2Form`
All 44 W-2 boxes: employer info (name, EIN, address, city, state, zip, address_type), employee info, boxes 1–11 (wages through nonqualified plans), box 12 (2 code+amount pairs), box 13 (3 checkboxes), box 14 other, boxes 15–20 (state/local), `local_tax_state`, W-2 type/corrected/tip/overtime flags.

State lists for all selects include 50 states + DC, GU, PR, VI, AA, AE, AP to match FreeTaxUSA exactly.

---

## Design Tokens (`app/globals.css`)

```css
--color-cream:       #FAF7F2   /* page background */
--color-cream-deep:  #F5F0E8   /* sidebar + form card background */
--color-ink:         #0D0D0D   /* primary text */
--color-muted:       #6B7280   /* secondary text / placeholder text */
--color-green:       #1B4332   /* primary brand / CTA */
--color-green-mid:   #2D6A4F   /* hover state */
--color-green-light: #D8F3DC
--color-green-pale:  #EAF4EC   /* complete section background */
--color-amber:       #D97706   /* in-progress / warning */
--color-amber-pale:  #FEF3C7   /* warning backgrounds */
--color-red:         #DC2626   /* error */
--color-hairline:    #E5E7EB   /* all borders/dividers */
```

Animations: `pulse-dot` (opacity 1→0.3→1, 1.5s) · `shimmer` (opacity 0.6→1→0.6, 1.5s)

---

## Zustand Store (`store/index.ts`)

```ts
// Auth / session (persisted)
userId: number | null
sessionId: number | null
userEmail: string
phase: 'collecting' | 'reviewing' | 'filing' | 'filed'

// Navigation (persisted)
activeSection: string
activeYear: string

// Chat (persisted)
messages: ChatMessage[]
pendingPdfUpload: { active, reason }
isTyping: boolean

// Data (persisted)
taxData: TaxData | null
percentComplete: number
missingFields: string[]

// Filing
filingProgress: SectionResult[]
filingLog: FilingLogEntry[]
```

### Key Actions

| Action | Behavior |
|---|---|
| `setTaxData(data)` | Updates local state **and** fires `PUT /users/{id}/data` to backend (fire-and-forget) |
| `hydrateTaxData(data)` | Updates local state only — used on init and after chat to avoid write-back loops |
| `resetTaxData()` | Clears taxData, percentComplete, missingFields, phase, filingProgress/Log |
| `logout()` | Clears all persisted state including userId/sessionId |

---

## API Client (`lib/api.ts`)

All requests go to `NEXT_PUBLIC_API_URL` (defaults to `http://localhost:8000`).

| Method | Endpoint | Used by |
|---|---|---|
| POST | /users | Dashboard init |
| POST | /sessions | Dashboard init |
| POST | /chat | ChatPanel |
| POST | /upload-pdf | PDFUploadCard |
| GET | /sessions/{id}/status | Dashboard init + ChatPanel after each turn |
| POST | /submit-taxes | ReviewSection |
| POST | /retry-section | FilingTimeline (retry button) |
| GET | /users/{id}/data | Dashboard init + ChatPanel after each turn |
| PUT | /users/{id}/data | setTaxData (auto, fire-and-forget) |
| DELETE | /users/{id}/data | Sidebar "Reset info" button |
| GET | /filing-stream/{id} | useFilingStream hook (SSE) |

---

## Data Sync Pattern

Every user edit in any section component calls `setTaxData(newData)` which:
1. Updates Zustand store immediately (UI reflects change)
2. Persists to localStorage (Zustand persist middleware)
3. Fires `PUT /users/{id}/data` to the backend DB (fire-and-forget; failures are silent)

On page load (dashboard `useEffect`):
1. Restore from localStorage (automatic via Zustand persist)
2. Call `GET /users/{id}/data` → `hydrateTaxData(dbData)` — overwrites with DB truth if any data exists

After each chat message: same GET + hydrate to reflect chat-agent extractions in the section UI.

---

## Section UI Patterns

### FieldRow (PersonalSection)
- Click to enter edit mode → `<input>` with `autoFocus`
- On blur: saves value to store via `onChange(localVal)` → triggers `setTaxData`
- Empty fields show muted placeholder text (e.g. "John", "XXX-XX-XXXX")

### SelectRow
- Native `<select>` for state (all 57 options) and suffix

### RadioRow
- Inline Yes/No pill toggle buttons; saves on click

### CheckboxRow
- Native checkbox; saves on change

### Conditional Fields
- **Identity Protection PIN**: Yes → 6-digit PIN number input appears
- **W-2 Tip Income**: Yes → Box 7 (SS Tips) and Box 8 (Allocated Tips) appear

---

## Sidebar Section Status

| State | Condition | Visual |
|---|---|---|
| No indicator | `percentComplete === 0` | Plain text |
| ⚠ amber | `percentComplete > 0` and section has missing fields | Amber ⚠ icon + normal background |
| ✓ green | `percentComplete > 0` and no missing fields for section | Green ✓ icon + `bg-green-pale` row |
| Active | Currently selected section | `bg-green text-white` |

"Reset info" button at sidebar bottom: shows inline confirmation → calls `DELETE /users/{id}/data` + `resetTaxData()`.

---

## Submit Guard (ReviewSection)

- Derives incomplete sections from `missingFields` (splits on `.` for section name)
- If any sections incomplete: shows amber warning panel listing them + disables "File My Return →"
- Once `missingFields` is empty: button enables and filing can proceed

---

## Phase Flow

1. **collecting** — ChatPanel drives data collection; middle panel shows editable section fields
2. **reviewing** — All fields collected; middle panel shows ReviewSection with submit guard
3. **filing** — POST /submit-taxes triggered; FilingView with live SSE timeline + terminal log
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
npm run build     # production build (must pass before committing)
```

Requires the FastAPI backend running at `http://localhost:8000`. Set `NEXT_PUBLIC_API_URL` in `.env.local` to override.
