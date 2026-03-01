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
│   ├── page.tsx                # Redirects → /dashboard
│   ├── dashboard/page.tsx      # Three-column layout; init + DB hydration; resizable chat
│   ├── profile/page.tsx        # Apple-settings style profile page
│   └── accounts/page.tsx       # Connected financial accounts grid
│
├── components/
│   ├── layout/
│   │   ├── TopNav.tsx          # Fixed 56px bar: logo · year pills · phase pill · avatar
│   │   └── Sidebar.tsx         # Progress ring · click accordion nav · reset button
│   ├── ui/
│   │   ├── ProgressRing.tsx    # Animated SVG ring (120px, phase-aware)
│   │   └── SectionPills.tsx    # Horizontal scrollable pills with state variants
│   ├── chat/
│   │   ├── ChatPanel.tsx       # Resizable right panel; "Clear chat" button when messages exist
│   │   ├── ChatMessage.tsx     # April (green left border) vs user (right-aligned grey)
│   │   ├── PDFUploadCard.tsx   # Inline green-bordered drag-and-drop upload card
│   │   └── ChatInput.tsx       # Input bar
│   ├── sections/
│   │   ├── SectionContent.tsx          # switch(activeSection) dispatcher — all 18 keys + legacy
│   │   ├── PersonalSection.tsx         # 23 FreeTaxUSA fields; yes/no deselect on all radio rows
│   │   ├── FilingStatusSection.tsx     # 5 radio-card statuses; spouse fields appear for MFJ
│   │   ├── DependentsSection.tsx       # "Do you have dependents?" gate → per-dependent accordion
│   │   ├── IdentityProtectionSection.tsx # Yes/No gate; 6-digit PIN input when Yes
│   │   ├── W2Section.tsx               # All 44 W-2 boxes in 7 groups; compact card summary
│   │   ├── Form1099Section.tsx         # Per-payer cards; NEC/INT/DIV/B/MISC/R/SSA types
│   │   ├── OtherIncomeSection.tsx      # Cryptocurrency, investments, unemployment, SS, retirement, business/rental
│   │   ├── DeductionsSection.tsx       # 7 CategoryCard toggles; live standard vs itemized comparison
│   │   ├── HealthInsuranceSection.tsx  # Marketplace insurance yes/no; 1095-A note
│   │   ├── CommonCreditsSection.tsx    # IRA, college tuition, student loan, teacher, EIC, car loan, home energy, child care
│   │   ├── OtherCreditsSection.tsx     # HSA, MSA, adoption, elderly, clean vehicle, alt fuel, MCC, and more
│   │   ├── MiscSection.tsx             # Estimated payments (Q1–Q4 + extension); foreign accounts/assets
│   │   ├── RefundMaximizerSection.tsx  # "Maximize my refund" vs "Skip and finish filing"
│   │   ├── FederalSummarySection.tsx   # Live 2025 federal tax estimate (brackets + credits)
│   │   ├── StateResidencySection.tsx   # State dropdown; residency/full-year/other-state-income questions
│   │   ├── StateReturnSection.tsx      # State filing summary based on residency answers
│   │   ├── BankSection.tsx             # Refund type picker (direct deposit/GO2bank/paper check); DD fields
│   │   └── ReviewSection.tsx           # Return summary; submit guard; "File My Return →" button
│   └── filing/
│       ├── FilingView.tsx              # Phase 3 container (wraps timeline + terminal)
│       ├── FilingTimeline.tsx          # Vertical section timeline with status icons
│       └── TerminalLog.tsx             # Browser agent log (JetBrains Mono, live scroll)
│
├── lib/
│   ├── api.ts              # Typed fetch wrappers for all backend endpoints
│   └── types.ts            # Shared TypeScript types + SECTION_GROUPS constant
│
├── hooks/
│   └── useFilingStream.ts  # EventSource hook consuming /filing-stream/{user_id} SSE
│
└── store/
    └── index.ts            # Zustand store
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
Category flags: `has_homeowner`, `has_donations`, `has_medical`, `has_taxes_paid`, `has_investment_interest`, `has_casualty`, `has_other_itemized`. Amount fields for each category. Standard/itemized comparison helpers.

### `Credits`
`has_marketplace_insurance` (string), `has_ira`/`ira_amount`/`ira_type`, `has_college_tuition`, `has_student_loan`, `has_teacher_expenses`, `has_eic`/`eic_qualifying_children`, `has_car_loan`, `has_home_energy`, `has_child_care`, `has_hsa`, `has_clean_vehicle`, and ~10 more other-credits flags.

### `OtherIncome`
`has_cryptocurrency` (string), `has_investments`/`investment_income`, `has_unemployment`/`unemployment_amount`, `has_social_security`/`social_security_amount`, `has_retirement_income`/`retirement_income`, `has_state_refund`, `has_capital_loss_carryover`, `has_business_rental`/`business_income`/`rental_income`

### `MiscInfo`
`has_estimated_payments`, `estimated_q1`–`q4`, `extension_payment`, `apply_refund_next_year`/`next_year_amount`, `has_foreign_accounts` (boolean|undefined), `has_foreign_assets` (boolean|undefined), `refund_maximizer` (`'maximize'|'skip'`), `has_dependents` (string `'Yes'|'No'` — gate answer stored here)

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

// Transient (not persisted)
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

### Completion Logic (frontend-driven — no backend required)

Two functions drive all status indicators:

**`isSectionComplete(key, taxData, visited)`**
- Optional sections (`dependents`, `common-credits`, `other-credits`, `misc-forms`, `federal-summary`): complete when `visited === true`
- Required sections: check specific `taxData` fields (e.g. all personal fields present, at least one W-2 with `employer_name` + `wages`, 1099 forms all have `payer_name`, etc.)

**`isSectionStarted(key, taxData)`**
- Returns `true` only when partial data exists but section is not complete
- Currently meaningful only for `personal-info` (some but not all of first_name/last_name/ssn/address/city/state/zip filled)

### Subsection Status

| State | Condition | Visual |
|---|---|---|
| Active | `activeSection === key` | `bg-green text-white` |
| Complete | `isSectionComplete` | `bg-green-pale text-green` + ✓ badge |
| Started | `isSectionStarted` (partial data) | `bg-amber-pale text-amber` + ⚠ badge |
| Default | Not visited or visited but empty | Plain `text-ink` |

### Group Header Status

| State | Condition | Visual |
|---|---|---|
| Complete | All subsections complete | `text-green-mid` + ✓ |
| In progress | Some subsections complete or started (not all) | `text-amber` + ⚠ |
| Default | No progress | `text-muted` |

### Interaction Model
- Click-based accordion: clicking a group header opens it and navigates to its first subsection
- `effectiveOpenGroup = isPastYear ? null : openGroup` — collapses sidebar for past tax years
- **Reset**: calls `DELETE /users/{id}/data` + `resetTaxData()` + resets `openGroup` to first group

### Progress Ring
`completedCount / allSubKeys.length × 100` — derived entirely from `isSectionComplete` calls, no backend dependency.

---

## Dashboard Layout (`app/dashboard/page.tsx`)

Three-column layout:
```
[Sidebar w-1/5] [Main flex-1] [DragHandle w-0] [ChatPanel 360–600px]
```

### Resizable Chat Panel
- Drag handle: `w-0` absolute-positioned widget centered on the `border-l` of ChatPanel
- Visual: white pill container (`bg-white border border-hairline shadow-sm`) with 3 thin vertical lines (1px × 24px, `gap-[2px]`)
- Lines turn green on hover; container border turns green-tinted
- Width range: **360px** (min/default) to **600px** (max) — can only expand left, not shrink
- Mouse events attached to `window` on drag start, cleaned up on `mouseup`

### Backend Offline Indicator
When backend is unreachable: small amber pill (`Backend offline`) fixed at `top-16 right-3`, `pointer-events-none`. No full-width banner.

### Save Status
Collecting phase shows `Saving…` / `✓ Saved` / `Save failed` in the top-right corner of the middle panel (absolute positioned, pointer-events-none).

---

## Note Box Convention

All informational/advisory boxes in section components use amber styling:
- Container: `bg-amber-pale border border-amber rounded-xl`
- Label: `text-amber font-semibold`
- Body: `text-ink leading-relaxed`

Green boxes are used only for confirmed-positive states (e.g. "No state income tax", "Form 1095-A required").

---

## Yes/No Toggle Pattern

All Yes/No pill pairs use deselect-on-click:
- `string` fields (`'Yes'|'No'`): clicking the active option sets value to `''`
- `boolean|undefined` fields: clicking the active option sets value to `undefined`

This ensures neither pill is highlighted when the user clears their answer.

---

## Key Section Patterns

### Gate Questions
Sections with optional content show a Yes/No gate first:
- **DependentsSection**: "Do you have any dependents?" — answer stored in `misc_info.has_dependents`; No → amber note; Yes → accordion form
- **IdentityProtectionSection**: "Do you have an IRS Identity Protection PIN?" — Yes reveals 6-digit input
- **HealthInsuranceSection**: "Did you have Marketplace insurance?" — Yes shows 1095-A note

### CategoryCard (DeductionsSection)
7 toggle cards (homeowner, donations, medical, SALT, investment interest, casualty, other). Live comparison shows standard deduction vs itemized total; SALT cap displayed when exceeded.

### FederalSummarySection
Full 2025 tax bracket calculation (single + MFJ tables) from live `taxData`. Aggregates W-2 wages + other income types, above-the-line adjustments, standard vs itemized, tax credits, withholding + estimated payments → refund/owed banner.

### StateResidencySection
Full 50-state + DC dropdown. Selecting a state resets `state_info`. `NO_INCOME_TAX` set (AK, FL, NV, NH, SD, TN, TX, WY, WA) shows green "no return needed" banner. Income-tax states reveal residency question chain.

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
3. Sets `saveStatus: 'saving'` and fires `PUT /users/{id}/data`; shows `Saving…` → `✓ Saved` / `Save failed` overlay

On page load (dashboard `useEffect`):
1. Restore from localStorage (automatic via Zustand persist)
2. Call `GET /users/{id}/data` → `hydrateTaxData(dbData)` — overwrites with DB truth if any data exists

After each chat message: same GET + hydrate to reflect chat-agent extractions in the section UI.

---

## Phase Flow

1. **collecting** — ChatPanel drives data collection; middle panel shows editable section fields via `SectionContent`
2. **reviewing** — All fields collected; middle panel shows `ReviewSection` with submit guard
3. **filing** — POST /submit-taxes triggered; `FilingView` with live SSE timeline + terminal log
4. **filed** — All sections complete; timeline all green, past-year chat overlay shown if year changes

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
