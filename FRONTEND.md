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
│   ├── layout.tsx              # Fonts (Plus Jakarta Sans + JetBrains Mono) + metadata
│   ├── globals.css             # Design tokens, animations, scrollbar-hide utility
│   ├── page.tsx                # Landing page (Nav, Hero, WorksSection, TheGap, Stats, Security, FAQ, Footer)
│   ├── dashboard/page.tsx      # Three-column layout; init + DB hydration; resizable chat
│   └── _landing/               # Landing page components (inline styles, not Tailwind)
│       ├── shared.tsx          # useScrollY, useWindowWidth, useInView, enter(), OrganicBlob, SectionLabel, StatusDot
│       ├── Nav.tsx             # Fixed nav; transparent at top, frosted on scroll
│       ├── Hero.tsx            # Headline + scroll-driven dashboard mockup reveal
│       ├── WorksSection.tsx    # 7-step scroll-driven sticky mockup section
│       ├── Content.tsx         # TheGap (comparison table) + Stats (animated count-up)
│       └── Closing.tsx         # Security (6 cards) + FAQ (accordion) + FinalCTA + Footer
│
├── components/
│   ├── layout/
│   │   ├── TopNav.tsx          # Fixed 56px bar: logo · year pills · phase pill · avatar
│   │   └── Sidebar.tsx         # Progress ring · refund estimate card · click accordion nav
│   ├── ui/
│   │   └── ProgressRing.tsx    # Animated SVG ring (phase-aware)
│   ├── chat/
│   │   ├── ChatPanel.tsx       # Drag-resizable right panel; backend-down indicator
│   │   ├── ChatMessage.tsx     # April (green left border) vs user (right-aligned grey)
│   │   ├── PDFUploadCard.tsx   # Inline drag-and-drop upload card
│   │   └── ChatInput.tsx       # Input bar + PDF upload button
│   ├── sections/
│   │   ├── SectionContent.tsx          # switch(activeSection) dispatcher — all 18 keys
│   │   ├── PersonalSection.tsx         # 23 FreeTaxUSA fields; yes/no deselect on all radio rows
│   │   ├── FilingStatusSection.tsx     # 5 radio-card statuses; spouse fields appear for MFJ
│   │   ├── DependentsSection.tsx       # "Do you have dependents?" gate → per-dependent accordion
│   │   ├── IdentityProtectionSection.tsx # Yes/No gate; 6-digit PIN input when Yes
│   │   ├── W2Section.tsx               # All 44 W-2 boxes in 7 groups; compact card summary
│   │   ├── Form1099Section.tsx         # has_1099_income gate → per-payer cards; NEC/INT/DIV/B/MISC/R/SSA types
│   │   ├── OtherIncomeSection.tsx      # has_cryptocurrency gate; investments, unemployment, SS, retirement
│   │   ├── DeductionsSection.tsx       # has_itemized_deductions gate → 7 CategoryCard toggles; live comparison
│   │   ├── HealthInsuranceSection.tsx  # Marketplace insurance yes/no; 1095-A note
│   │   ├── CommonCreditsSection.tsx    # IRA, college tuition, student loan, teacher, EIC, car loan, home energy, child care
│   │   ├── OtherCreditsSection.tsx     # HSA, MSA, adoption, elderly, clean vehicle, alt fuel, MCC, and more
│   │   ├── MiscSection.tsx             # Estimated payments (Q1–Q4 + extension); foreign accounts/assets
│   │   ├── RefundMaximizerSection.tsx  # "Maximize my refund" vs "Skip and finish filing"
│   │   ├── FederalSummarySection.tsx   # Live 2025 federal tax estimate (brackets + credits)
│   │   ├── StateResidencySection.tsx   # State dropdown; residency/full-year/other-state-income questions
│   │   ├── StateReturnSection.tsx      # State filing summary based on residency answers
│   │   ├── BankSection.tsx             # Refund type picker (direct deposit/GO2bank/paper check); DD fields
│   │   └── ReviewSection.tsx           # Return summary; validation modal; filing action buttons
│   └── filing/
│       ├── FilingView.tsx              # Phase 3 container (wraps timeline + terminal)
│       ├── FilingTimeline.tsx          # Vertical section timeline with status icons
│       └── TerminalLog.tsx             # Browser agent log (JetBrains Mono, live scroll)
│
├── lib/
│   ├── api.ts              # Typed fetch wrappers for all 14 backend endpoints
│   ├── types.ts            # Shared TypeScript types + SECTION_GROUPS constant
│   ├── sectionUtils.ts     # isSectionComplete(), isSectionStarted(), OPTIONAL_SECTIONS
│   └── validation.ts       # getMissingFields() — returns { section, label }[] for modal
│
├── hooks/
│   └── useFilingStream.ts  # EventSource hook consuming /filing-stream/{user_id} SSE
│
└── store/
    └── index.ts            # Zustand store (persisted)
```

---

## Section Navigation (`lib/types.ts` — `SECTION_GROUPS`)

18 subsections across 6 groups. Order matches FreeTaxUSA navigation:

| Group | Key | Subsections |
|---|---|---|
| Personal | `personal` | personal-info, filing-status, dependents, identity-protection |
| Income | `income` | w2-income, 1099-income, other-income |
| Deductions & Credits | `deductions-credits` | deductions, health-insurance, common-credits, other-credits |
| Miscellaneous | `miscellaneous` | misc-forms, refund-maximizer |
| State | `state` | state-residency, state-return |
| Summary | `summary` | federal-summary, bank-refund, review |

---

## TypeScript Types (`lib/types.ts`)

### `TaxReturn`
Personal info: `first_name`, `middle_initial`, `last_name`, `suffix`, `ssn`, `date_of_birth`, `occupation`, `address`, `apt`, `city`, `state`, `zip_code`, `zip_plus_4`, `addr_changed`, `filing_status`, `claimed_as_dependent`, `presidential_fund`, `blind`, `deceased`, `nonresident_alien`, `identity_protection_pin`, `identity_protection_pin_number`

Spouse (MFJ): `spouse_first_name`, `spouse_last_name`, `spouse_ssn`, `spouse_dob`

Bank & Refund: `refund_type` (`'direct_deposit'|'go2bank'|'paper_check'`), `is_multiple_deposit`, `bank_account_nickname`, `bank_routing_number`, `bank_account_number`, `bank_account_type`, `bank_is_foreign`

Review: `phone_option`, `refund_amount`, `tax_owed`

### `W2Form`
All 44 W-2 boxes: employer info (name, EIN, address, city, state, zip, address_type), employee info, boxes 1–11, box 12 (2 code+amount pairs), box 13 (3 checkboxes), box 14, boxes 15–20 (state/local), W-2 type/corrected/tip/overtime flags.

### `Form1099`
`form_type`, `payer_name`, `amount`

### `Dependent`
`first_name`, `last_name`, `ssn`, `date_of_birth`, `relationship`, `months_lived`

### `Deductions`
Gate: `has_itemized_deductions` (`'Yes'|'No'`). Category flags: `has_homeowner`, `has_donations`, `has_medical`, `has_taxes_paid`, `has_investment_interest`, `has_casualty`, `has_other_itemized`. Amount fields for each category. Standard/itemized comparison helpers.

### `Credits`
`has_marketplace_insurance` (string), `has_ira`/`ira_amount`/`ira_type`, `has_college_tuition`, `has_student_loan`, `has_teacher_expenses`, `has_eic`/`eic_qualifying_children`, `has_car_loan`, `has_home_energy`, `has_child_care`, `has_hsa`, `has_clean_vehicle`, and ~10 more other-credits flags.

### `OtherIncome`
Gates: `has_1099_income` (`'Yes'|'No'`), `has_cryptocurrency` (`'Yes'|'No'`). Plus: `has_investments`/`investment_income`, `has_unemployment`/`unemployment_amount`, `has_social_security`/`social_security_amount`, `has_retirement_income`/`retirement_income`, `has_state_refund`, `has_capital_loss_carryover`, `has_business_rental`/`business_income`/`rental_income`

### `MiscInfo`
`has_estimated_payments`, `estimated_q1`–`q4`, `extension_payment`, `apply_refund_next_year`/`next_year_amount`, `has_foreign_accounts`, `has_foreign_assets`, `refund_maximizer` (`'maximize'|'skip'`), `has_dependents` (`'Yes'|'No'` — gate answer stored here)

### `StateInfo`
`is_state_resident`, `is_full_year_resident`, `has_other_state_income` (all `'Yes'|'No'` strings)

### `TaxData`
Root container: `tax_return`, `w2_forms`, `form_1099s`, `deductions`, `credits`, `other_income`, `dependents`, `misc_info`, `state_info`

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
--color-amber-pale:  #FEF3C7   /* warning/note backgrounds */
--color-red:         #DC2626   /* error */
--color-hairline:    #E5E7EB   /* all borders/dividers */
```

Animations: `pulse-dot` (opacity 1→0.3→1, 1.5s) · `shimmer` (opacity 0.6→1→0.6, 1.5s)

Utility: `.scrollbar-hide` — applied to all overflow-y-auto containers (sidebar, middle panel, chat messages)

---

## Zustand Store (`store/index.ts`)

```ts
// Auth / session (persisted)
userId: number | null
sessionId: number | null
userEmail: string
phase: 'collecting' | 'reviewing' | 'filing' | 'filed'

// Navigation (persisted)
activeSection: string          // defaults to 'personal-info'
activeYear: string             // defaults to '2025'
visitedSections: string[]      // sections the user has navigated to; drives optional-section completion

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

// Transient
saveStatus: 'idle' | 'saving' | 'saved' | 'error'
```

### Key Actions

| Action | Behavior |
|---|---|
| `setActiveSection(key)` | Updates `activeSection`; appends to `visitedSections` if not already present |
| `setTaxData(data)` | Updates local state + fires `PUT /users/{id}/data`; drives `saveStatus` indicator |
| `hydrateTaxData(data)` | Updates local state only — used on init and post-chat to avoid write-back loops |
| `resetTaxData()` | Clears taxData, resets `activeSection` to `'personal-info'`, clears `visitedSections`, resets phase/filing |
| `clearMessages()` | Empties the `messages` array |
| `logout()` | Clears all persisted state |

---

## Sidebar (`components/layout/Sidebar.tsx`)

### Completion Logic (`lib/sectionUtils.ts`)

**`isSectionComplete(key, taxData, visited)`**
- **Optional sections** (`dependents`, `common-credits`, `other-credits`, `misc-forms`, `federal-summary`): complete when `visited === true`
- `personal-info`: all 7 required fields filled (first_name, last_name, ssn, address, city, state, zip_code)
- `filing-status`: `filing_status` set
- `identity-protection`: `identity_protection_pin` answered
- `w2-income`: ≥1 W-2 with `employer_name` + `wages`
- `1099-income`: `has_1099_income === 'No'` OR (`=== 'Yes'` AND ≥1 form with payer_name)
- `other-income`: `has_cryptocurrency` answered
- `deductions`: `has_itemized_deductions === 'No'` OR (`=== 'Yes'` AND ≥1 category flag toggled)
- `health-insurance`: `has_marketplace_insurance` answered
- `refund-maximizer`: `refund_maximizer` set
- `state-residency`: state selected + `is_state_resident` answered
- `bank-refund`: `refund_type` selected
- `review`: complete when visited

**`isSectionStarted(key, taxData)`** — returns `true` when a gate question is answered Yes but the follow-up is incomplete. Used to show amber (in-progress) color instead of normal muted.

### Subsection Status

| State | Condition | Visual |
|---|---|---|
| Active | `activeSection === key` | `bg-green text-white` |
| Complete | `isSectionComplete` | `bg-green-pale text-green` + ✓ badge |
| Started | `isSectionStarted` | `bg-amber-pale text-amber` + ⚠ badge |
| Default | Not visited or empty | Plain `text-ink` |

### Group Header Status

| State | Condition | Visual |
|---|---|---|
| Complete | All subsections complete | `text-green-mid` + ✓ |
| In progress | Some complete or started | `text-amber` + ⚠ |
| Default | No progress | `text-muted` |

### Refund Estimate Card
- Computed live using 2025 tax brackets (single + MFJ) from W-2 wages and withholding in `taxData`
- No backend call — pure client-side calculation
- Shows green card for refund (`Est. Refund $X`) or amber for owed (`Est. Owed $X`)
- Hidden until wage or withholding data exists

### Progress Ring
Derived entirely from `isSectionComplete` calls across all 18 subsections. No backend dependency.

### Interaction Model
- Click-based accordion: clicking a group header opens it and navigates to its first subsection
- `effectiveOpenGroup = isPastYear ? null : openGroup` — collapses sidebar for past tax years
- **Reset**: calls `DELETE /users/{id}/data` + `resetTaxData()` + resets `openGroup`

---

## Dashboard Layout (`app/dashboard/page.tsx`)

```
[Sidebar w-1/5] [Main flex-1] [DragHandle w-0] [ChatPanel 360–600px]
```

All within a `flex flex-col h-screen` container with a fixed `TopNav` (56px).

### Resizable Chat Panel
- Drag handle: `w-0` absolute-positioned widget centered on the `border-l` of ChatPanel
- Visual: white pill (`bg-white border-hairline shadow-sm`) with 3 vertical 1px×24px lines (`gap-[2px]`)
- Lines turn green on hover; border turns green-tinted
- Width range: **280px** (min) to **600px** (max); default **360px**
- Mouse events attached to `window` on drag start, cleaned up on `mouseup`

### Phase Logic

| Phase | Middle panel behavior |
|---|---|
| `collecting` | Normal section editing; `SectionContent` renders the active section |
| `reviewing` | Green "All information collected" banner in `ReviewSection` |
| `filing` | Panel dims + locked; `FilingView` with live SSE progress |
| `filed` | Green "✓ Filed" pill overlay; `ReviewSection` shows frozen state |

### Backend Offline Indicator
Amber pill (`Backend offline`) fixed at `top-16 right-3` when init fails. `pointer-events-none`.

### Save Status
`Saving…` / `✓ Saved` / `Save failed` in the top-right corner of the middle panel (absolute, pointer-events-none).

---

## Validation (`lib/validation.ts`)

`getMissingFields(taxData)` returns `{ section: string; label: string }[]` for all incomplete required fields. Used in `ReviewSection` to show a blocking modal when the user tries to file with missing data.

---

## Key UX Conventions

- **Yes/No pills deselect on re-click**: string fields reset to `''`; boolean fields to `undefined`
- **Info boxes**: `bg-amber-pale border-amber` (not cream/hairline). Green boxes only for confirmed-positive states.
- **Gate questions** (1099 income, deductions, dependents, identity protection, health insurance, other income): stored as string `'Yes'|'No'`; deselecting reverts section to incomplete (not amber)
- **Red `*` on required fields**: `<span className="text-red-500 ml-0.5">*</span>`
- **DependentsSection gate**: stored in `misc_info.has_dependents`
- **StateResidency**: selecting a state resets `state_info` entirely

---

## Key Section Patterns

### Gate Questions
Sections with optional content show a Yes/No gate first:
- **1099-income**: `other_income.has_1099_income` — No → section complete; Yes → must add ≥1 payer
- **other-income**: `other_income.has_cryptocurrency` — gate for the main question
- **deductions**: `deductions.has_itemized_deductions` — No → standard deduction banner; Yes → category cards
- **dependents**: `misc_info.has_dependents` — No → amber note; Yes → accordion form
- **identity-protection**: gate → 6-digit PIN input
- **health-insurance**: gate → 1095-A note

### CategoryCard (DeductionsSection)
7 toggle cards (homeowner, donations, medical, SALT, investment interest, casualty, other). Live comparison shows standard deduction vs itemized total; SALT cap displayed when exceeded.

### FederalSummarySection
Full 2025 tax bracket calculation (single + MFJ tables) from live `taxData`. Aggregates W-2 wages + other income types, applies standard vs itemized deduction, computes tax, subtracts credits and withholding → refund/owed banner.

### StateResidencySection
Full 50-state + DC dropdown. Selecting a state resets `state_info`. `NO_INCOME_TAX` set (AK, FL, NV, NH, SD, TN, TX, WY, WA) shows green "no return needed" banner.

### ReviewSection
- Summary table of all key return figures
- `getMissingFields()` check before filing → modal listing all missing items
- Filing options: File with FreeTaxUSA (browser agent), Download PDF for CPA (`GET /users/{id}/tax-pdf`), File with TurboTax (disabled), Do It Yourself (disabled)

---

## Landing Page (`app/page.tsx` + `app/_landing/`)

All landing components use inline styles (not Tailwind). Shared utilities in `_landing/shared.tsx`:
- `useScrollY()`, `useWindowWidth()` — scroll and viewport hooks
- `useInView(threshold)` — IntersectionObserver for enter animations (fires once)
- `enter(inView, delay, dx, dy)` — returns `opacity` + `transform` CSSProperties for fade-up/slide
- `OrganicBlob` — animated background shape
- `SectionLabel`, `StatusDot` — shared visual components

**Page order:**
1. `Nav` — transparent at top, frosted (`backdrop-filter: blur(12px)`) on scroll
2. `Hero` — headline + scroll-driven dashboard mockup with fade+scale reveal
3. `WorksSection` — 7 labeled steps (Hunt/Detect/Remember/Read/Verify/File/Control) with IntersectionObserver-driven sticky mockup transitions
4. `TheGap` — comparison table showing April vs TurboTax/H&R Block/TaxAct + blockquote
5. `Stats` — animated count-up: ~10 min, 99.2% accuracy, $2,840 avg refund
6. `Security` — 6 cards: local machine, CDP localhost, SQLite storage, action logging, session closure, no data sold
7. `FAQ` — accordion (8 questions)
8. `FinalCTA` — dark green section with animated headline
9. `Footer`

---

## API Client (`lib/api.ts`)

All requests go to `NEXT_PUBLIC_API_URL` (defaults to `http://localhost:8000`).

| Method | Endpoint | Used by |
|---|---|---|
| POST | /users | Dashboard init |
| POST | /sessions | Dashboard init |
| POST | /chat | ChatPanel |
| POST | /upload-pdf | PDFUploadCard |
| POST | /upload-w2-pdf | W2Section (manual PDF upload) |
| POST | /upload-1099-pdf | Form1099Section (manual PDF upload) |
| GET | /sessions/{id}/status | Dashboard init + ChatPanel after each turn |
| POST | /submit-taxes | ReviewSection |
| POST | /retry-section | FilingTimeline (retry button) |
| GET | /users/{id}/data | Dashboard init + ChatPanel after each turn |
| PUT | /users/{id}/data | setTaxData (auto, fire-and-forget) |
| DELETE | /users/{id}/data | Sidebar reset button |
| POST | /fetch-gusto-w2 | W2Section (Gusto integration) |
| POST | /fetch-fidelity-1099 | Form1099Section (Fidelity integration) |

---

## Data Sync Pattern

Every user edit in any section component calls `setTaxData(newData)` which:
1. Updates Zustand store immediately (UI reflects change)
2. Persists to localStorage (Zustand persist middleware)
3. Sets `saveStatus: 'saving'` and fires `PUT /users/{id}/data`; shows `Saving…` → `✓ Saved` / `Save failed`

On page load:
1. Restore from localStorage (automatic via Zustand persist)
2. Call `GET /users/{id}/data` → `hydrateTaxData(dbData)` — overwrites with DB truth if any data exists

After each chat message: same GET + hydrate to reflect chat-agent extractions in the section UI.

---

## Phase Flow

1. **collecting** — ChatPanel drives data collection; middle panel shows editable section fields
2. **reviewing** — All fields collected; ReviewSection with submit guard
3. **filing** — POST /submit-taxes triggered; FilingView with live SSE timeline + terminal log
4. **filed** — All sections complete; past-year selector available in TopNav

---

## How to Run

```bash
cd frontend
npm install       # install dependencies
npm run dev       # start at http://localhost:3000
npm run build     # production build (must pass before committing)
```

Requires the FastAPI backend running at `http://localhost:8000`. Set `NEXT_PUBLIC_API_URL` in `.env.local` to override.
