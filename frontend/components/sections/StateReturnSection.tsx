'use client'

import { useStore } from '@/store'

export function StateReturnSection() {
  const taxData = useStore((s) => s.taxData)

  const state = taxData?.state_info ?? {}
  const stateCode = taxData?.tax_return?.state ?? ''

  const NO_INCOME_TAX_STATES = ['AK', 'FL', 'NV', 'NH', 'SD', 'TN', 'TX', 'WY', 'WA']
  const hasNoIncomeTax = NO_INCOME_TAX_STATES.includes(stateCode)

  if (hasNoIncomeTax) {
    return (
      <div>
        <h2 className="text-[18px] font-bold text-ink mb-1">State Return</h2>
        <div className="mt-4 p-5 bg-green-pale border border-green rounded-xl">
          <p className="text-[14px] font-semibold text-green mb-1">No state return needed</p>
          <p className="text-[13px] text-ink leading-relaxed">
            {stateCode || 'Your state'} has no income tax. No state return will be filed.
          </p>
        </div>
      </div>
    )
  }

  if (state.is_state_resident === 'No') {
    return (
      <div>
        <h2 className="text-[18px] font-bold text-ink mb-1">State Return</h2>
        <div className="mt-4 p-4 bg-amber-pale border border-amber rounded-xl">
          <p className="text-[13px] text-amber leading-relaxed">
            Based on your residency answers, you may not need to file a state return for{' '}
            {stateCode || 'this state'}. If you earned income in another state, check that
            state&apos;s requirements.
          </p>
        </div>
      </div>
    )
  }

  const isFullYear = state.is_full_year_resident === 'Yes'
  const hasOtherState = state.has_other_state_income === 'Yes'

  return (
    <div>
      <h2 className="text-[18px] font-bold text-ink mb-1">State Return</h2>
      <p className="text-[13px] text-muted mb-5">
        Summary of your {stateCode || 'state'} tax filing requirements.
      </p>

      <div className="border border-hairline rounded-xl overflow-hidden mb-4">
        <div className="bg-cream px-4 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted">Filing Details</p>
        </div>
        <div className="px-4 divide-y divide-hairline">
          <div className="py-3 flex justify-between">
            <span className="text-[13px] text-muted">State</span>
            <span className="text-[13px] font-semibold text-ink">{stateCode || '—'}</span>
          </div>
          <div className="py-3 flex justify-between">
            <span className="text-[13px] text-muted">Residency Type</span>
            <span className="text-[13px] font-semibold text-ink">
              {isFullYear ? 'Full-Year Resident' : 'Part-Year Resident'}
            </span>
          </div>
          <div className="py-3 flex justify-between">
            <span className="text-[13px] text-muted">Other State Income</span>
            <span className="text-[13px] font-semibold text-ink">{hasOtherState ? 'Yes' : 'No'}</span>
          </div>
        </div>
      </div>

      <div className="p-4 bg-green-pale border border-green rounded-xl mb-4">
        <p className="text-[13px] font-semibold text-green mb-1">
          {stateCode || 'State'} return will be prepared
        </p>
        <p className="text-[12px] text-ink leading-relaxed">
          April will prepare your {stateCode || 'state'} return based on your federal data.
          {!isFullYear && ' As a part-year resident, only income earned while living in-state will be taxed.'}
          {hasOtherState && ' A credit for taxes paid to other states may reduce your state liability.'}
        </p>
      </div>

      <div className="p-3 bg-amber-pale border border-amber rounded-xl">
        <p className="text-[12px] text-amber leading-relaxed">
          State tax calculations are estimates. Your actual state tax depends on state-specific
          deductions, credits, and rates not shown here.
        </p>
      </div>
    </div>
  )
}
