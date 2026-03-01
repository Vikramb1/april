'use client'

import { clsx } from 'clsx'
import { useStore } from '@/store'
import type { MiscInfo, TaxData } from '@/lib/types'

export function RefundMaximizerSection() {
  const taxData = useStore((s) => s.taxData)
  const setTaxData = useStore((s) => s.setTaxData)

  const misc: MiscInfo = taxData?.misc_info ?? {}

  function update(patch: Partial<MiscInfo>) {
    setTaxData({ ...taxData, misc_info: { ...misc, ...patch } } as TaxData)
  }

  return (
    <div>
      <h2 className="text-[18px] font-bold text-ink mb-1">Refund Maximizer</h2>
      <p className="text-[13px] text-muted mb-5">
        April can review your return for additional deductions and credits you may have missed.
      </p>

      <p className="text-[14px] font-medium text-ink mb-3">
        How would you like to proceed?<span className="text-red-500 ml-0.5">*</span>
      </p>

      <div className="flex flex-col gap-3">
        <div
          onClick={() => update({ refund_maximizer: 'maximize' })}
          className={clsx(
            'border rounded-xl p-5 cursor-pointer transition-colors',
            misc.refund_maximizer === 'maximize'
              ? 'border-green bg-green-pale'
              : 'border-hairline hover:bg-[#F7F5F0]',
          )}
        >
          <div className="flex items-start gap-3">
            <div
              className={clsx(
                'w-5 h-5 rounded-full border-2 flex-shrink-0 mt-0.5 flex items-center justify-center transition-colors',
                misc.refund_maximizer === 'maximize' ? 'border-green' : 'border-hairline',
              )}
            >
              {misc.refund_maximizer === 'maximize' && (
                <div className="w-2.5 h-2.5 rounded-full bg-green" />
              )}
            </div>
            <div>
              <p className="text-[15px] font-bold text-ink">Maximize my refund</p>
              <p className="text-[12px] text-muted mt-1 leading-relaxed">
                April will check your return for overlooked deductions, credits, and adjustments
                before you file. This may take a few extra minutes but could increase your refund.
              </p>
            </div>
          </div>
        </div>

        <div
          onClick={() => update({ refund_maximizer: 'skip' })}
          className={clsx(
            'border rounded-xl p-5 cursor-pointer transition-colors',
            misc.refund_maximizer === 'skip'
              ? 'border-green bg-green-pale'
              : 'border-hairline hover:bg-[#F7F5F0]',
          )}
        >
          <div className="flex items-start gap-3">
            <div
              className={clsx(
                'w-5 h-5 rounded-full border-2 flex-shrink-0 mt-0.5 flex items-center justify-center transition-colors',
                misc.refund_maximizer === 'skip' ? 'border-green' : 'border-hairline',
              )}
            >
              {misc.refund_maximizer === 'skip' && (
                <div className="w-2.5 h-2.5 rounded-full bg-green" />
              )}
            </div>
            <div>
              <p className="text-[15px] font-bold text-ink">Skip and finish filing</p>
              <p className="text-[12px] text-muted mt-1 leading-relaxed">
                Proceed directly to filing with the information already entered. You can always
                amend your return later if you discover additional deductions.
              </p>
            </div>
          </div>
        </div>
      </div>

      {misc.refund_maximizer === 'maximize' && (
        <div className="mt-4 p-4 bg-amber/10 border border-amber rounded-xl">
          <p className="text-[13px] font-semibold text-amber mb-1">Refund Maximizer selected</p>
          <p className="text-[12px] text-ink leading-relaxed">
            April will perform a final review of your deductions and credits before submitting.
            You will see a summary of any additional savings found.
          </p>
        </div>
      )}
    </div>
  )
}
