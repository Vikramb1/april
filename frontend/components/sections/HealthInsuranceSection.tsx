'use client'

import { clsx } from 'clsx'
import { useStore } from '@/store'
import type { TaxData } from '@/lib/types'

export function HealthInsuranceSection() {
  const taxData = useStore((s) => s.taxData)
  const setTaxData = useStore((s) => s.setTaxData)

  const hasMarketplace = taxData?.credits?.has_marketplace_insurance ?? ''

  function update(val: string) {
    setTaxData({
      ...taxData,
      credits: { ...taxData?.credits, has_marketplace_insurance: val },
    } as TaxData)
  }

  return (
    <div>
      <h2 className="text-[18px] font-bold text-ink mb-1">Health Insurance</h2>
      <p className="text-[13px] text-muted mb-5">
        If you bought health coverage through the Marketplace (healthcare.gov or a state
        exchange), you may qualify for the Premium Tax Credit.
      </p>

      <div className="border border-hairline rounded-xl p-4 mb-4">
        <p className="text-[14px] text-ink font-medium mb-1">
          Did you have health insurance from the Marketplace (healthcare.gov)?
        </p>
        <p className="text-[12px] text-muted mb-4 leading-relaxed">
          You should have received <strong>Form 1095-A</strong> from the Marketplace if so.
          Forms 1095-B and 1095-C are informational only — do not enter those here.
        </p>
        <div className="flex gap-2">
          {['Yes', 'No'].map((opt) => (
            <button
              key={opt}
              onClick={() => update(hasMarketplace === opt ? '' : opt)}
              className={clsx(
                'rounded-full px-4 py-1.5 text-[13px] font-medium transition-colors border cursor-pointer',
                hasMarketplace === opt
                  ? 'bg-green text-white border-green'
                  : 'border-hairline text-muted hover:border-green hover:text-ink',
              )}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>

      {hasMarketplace === 'Yes' && (
        <div className="p-4 bg-green-pale border border-green rounded-xl">
          <p className="text-[13px] font-semibold text-green mb-1">Form 1095-A Required</p>
          <p className="text-[12px] text-ink leading-relaxed">
            You will need the details from your Form 1095-A to calculate your Premium Tax Credit
            or reconcile any advance premium payments made on your behalf.
          </p>
        </div>
      )}

      {hasMarketplace === 'No' && (
        <div className="p-3 bg-amber-pale border border-amber rounded-xl">
          <p className="text-[12px] text-amber font-semibold mb-0.5">No Marketplace coverage</p>
          <p className="text-[12px] text-ink leading-relaxed">
            Employer-sponsored health insurance is already handled through your W-2 and does
            not need to be entered here.
          </p>
        </div>
      )}
    </div>
  )
}
