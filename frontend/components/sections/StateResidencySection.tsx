'use client'

import { clsx } from 'clsx'
import { useStore } from '@/store'
import type { StateInfo, TaxReturn, TaxData } from '@/lib/types'

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','DC','FL','GA','HI','ID','IL','IN','IA',
  'KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM',
  'NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA',
  'WV','WI','WY',
]

const STATE_NAMES: Record<string, string> = {
  AL:'Alabama',AK:'Alaska',AZ:'Arizona',AR:'Arkansas',CA:'California',CO:'Colorado',
  CT:'Connecticut',DE:'Delaware',DC:'Washington D.C.',FL:'Florida',GA:'Georgia',
  HI:'Hawaii',ID:'Idaho',IL:'Illinois',IN:'Indiana',IA:'Iowa',KS:'Kansas',
  KY:'Kentucky',LA:'Louisiana',ME:'Maine',MD:'Maryland',MA:'Massachusetts',
  MI:'Michigan',MN:'Minnesota',MS:'Mississippi',MO:'Missouri',MT:'Montana',
  NE:'Nebraska',NV:'Nevada',NH:'New Hampshire',NJ:'New Jersey',NM:'New Mexico',
  NY:'New York',NC:'North Carolina',ND:'North Dakota',OH:'Ohio',OK:'Oklahoma',
  OR:'Oregon',PA:'Pennsylvania',RI:'Rhode Island',SC:'South Carolina',
  SD:'South Dakota',TN:'Tennessee',TX:'Texas',UT:'Utah',VT:'Vermont',
  VA:'Virginia',WA:'Washington',WV:'West Virginia',WI:'Wisconsin',WY:'Wyoming',
}

const NO_INCOME_TAX = new Set(['AK','FL','NV','NH','SD','TN','TX','WY','WA'])

function YesNoRow({
  question,
  description,
  value,
  onChange,
  required,
}: {
  question: string
  description?: string
  value?: string
  onChange: (v: string) => void
  required?: boolean
}) {
  return (
    <div className="border border-hairline rounded-xl p-4 mb-3 bg-white">
      <p className="text-[14px] font-semibold text-ink mb-1">
        {question}{required && <span className="text-red-500 ml-0.5">*</span>}
      </p>
      {description && (
        <p className="text-[12px] text-muted mb-3 leading-relaxed">{description}</p>
      )}
      <div className="flex gap-2">
        {(['Yes', 'No'] as const).map((opt) => (
          <button
            key={opt}
            onClick={() => onChange(value === opt ? '' : opt)}
            className={clsx(
              'rounded-full px-4 py-1.5 text-[13px] font-medium transition-colors border cursor-pointer',
              value === opt
                ? 'bg-green text-white border-green'
                : 'border-hairline text-muted hover:border-green hover:text-ink',
            )}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  )
}

export function StateResidencySection() {
  const taxData = useStore((s) => s.taxData)
  const setTaxData = useStore((s) => s.setTaxData)

  const state: StateInfo = taxData?.state_info ?? {}
  const stateCode = taxData?.tax_return?.state ?? ''

  function update(patch: Partial<StateInfo>) {
    setTaxData({ ...taxData, state_info: { ...state, ...patch } } as TaxData)
  }

  function updateState(code: string) {
    setTaxData({
      ...taxData,
      tax_return: { ...taxData?.tax_return, state: code } as TaxReturn,
      // Reset residency answers when state changes
      state_info: {},
    } as TaxData)
  }

  const hasNoIncomeTax = NO_INCOME_TAX.has(stateCode)
  const stateName = stateCode ? (STATE_NAMES[stateCode] ?? stateCode) : ''

  return (
    <div>
      <h2 className="text-[18px] font-bold text-ink mb-1">State Residency</h2>
      <p className="text-[13px] text-muted mb-5">
        Tell us which state you lived in during 2025 to determine your state filing requirements.
      </p>

      {/* State selector */}
      <div className="border border-hairline rounded-xl p-4 mb-4 bg-white">
        <p className="text-[14px] font-semibold text-ink mb-3">
          Which state did you live in during 2025?<span className="text-red-500 ml-0.5">*</span>
        </p>
        <select
          value={stateCode}
          onChange={(e) => updateState(e.target.value)}
          className="w-full border border-hairline rounded-lg px-3 py-2 text-[14px] text-ink bg-transparent outline-none focus:border-green transition-colors cursor-pointer"
        >
          <option value="">Select state…</option>
          {US_STATES.map((code) => (
            <option key={code} value={code}>
              {STATE_NAMES[code] ?? code}
            </option>
          ))}
        </select>
      </div>

      {/* No income tax states */}
      {stateCode && hasNoIncomeTax && (
        <div className="p-4 bg-green-pale border border-green rounded-xl">
          <p className="text-[14px] font-semibold text-green mb-1">No state income tax</p>
          <p className="text-[13px] text-ink leading-relaxed">
            {stateName} has no state income tax — no state return needed. If you earned income
            in another state, you may still owe taxes there.
          </p>
        </div>
      )}

      {/* Residency questions for income-tax states */}
      {stateCode && !hasNoIncomeTax && (
        <>
          <YesNoRow
            question={`Were you a resident of ${stateName} for any part of 2025?`}
            description="Answer Yes if you lived there at any point during the year."
            value={state.is_state_resident}
            onChange={(v) => update({ is_state_resident: v })}
            required
          />

          {state.is_state_resident === 'Yes' && (
            <YesNoRow
              question={`Were you a full-year resident of ${stateName} in 2025?`}
              description="Answer No if you moved to or from this state during 2025."
              value={state.is_full_year_resident}
              onChange={(v) => update({ is_full_year_resident: v })}
            />
          )}

          {state.is_state_resident === 'Yes' && (
            <YesNoRow
              question="Did you earn income in another state in 2025?"
              description="Includes wages, self-employment income, or rental income from property in another state."
              value={state.has_other_state_income}
              onChange={(v) => update({ has_other_state_income: v })}
            />
          )}

          {state.is_state_resident === 'No' && (
            <div className="p-4 bg-amber-pale border border-amber rounded-xl">
              <p className="text-[13px] font-semibold text-amber mb-1">No {stateName} return needed</p>
              <p className="text-[12px] text-ink leading-relaxed">
                Since you were not a resident of {stateName} in 2025, you generally do not need to
                file a {stateName} return. Check any state where you actually earned income.
              </p>
            </div>
          )}
        </>
      )}

      {!stateCode && (
        <div className="p-4 bg-amber-pale border border-amber rounded-xl">
          <p className="text-[12px] text-amber leading-relaxed">
            Select your state above to see your filing requirements.
          </p>
        </div>
      )}
    </div>
  )
}
