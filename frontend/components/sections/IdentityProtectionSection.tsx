'use client'

import { clsx } from 'clsx'
import { useStore } from '@/store'
import type { TaxData } from '@/lib/types'

export function IdentityProtectionSection() {
  const taxData = useStore((s) => s.taxData)
  const setTaxData = useStore((s) => s.setTaxData)

  const hasPin = taxData?.tax_return?.identity_protection_pin ?? ''
  const pinNumber = taxData?.tax_return?.identity_protection_pin_number ?? ''

  function handleHasPin(val: string) {
    setTaxData({
      ...taxData,
      tax_return: {
        ...taxData?.tax_return,
        identity_protection_pin: val,
        identity_protection_pin_number: val === 'No' ? '' : taxData?.tax_return?.identity_protection_pin_number,
      },
    } as TaxData)
  }

  function handlePinNumber(val: string) {
    setTaxData({
      ...taxData,
      tax_return: { ...taxData?.tax_return, identity_protection_pin_number: val },
    } as TaxData)
  }

  return (
    <div>
      <h2 className="text-[18px] font-bold text-ink mb-1">Identity Protection</h2>
      <p className="text-[13px] text-muted mb-5">
        An Identity Protection PIN (IP PIN) is a 6-digit number the IRS issues to prevent
        someone else from filing a tax return using your SSN or ITIN.
      </p>

      <div className="border border-hairline rounded-xl p-4 mb-4">
        <p className="text-[14px] text-ink font-medium mb-3">
          Do you have an Identity Protection PIN from the IRS?
        </p>
        <div className="flex gap-2">
          {['Yes', 'No'].map((opt) => (
            <button
              key={opt}
              onClick={() => handleHasPin(opt)}
              className={clsx(
                'rounded-full px-4 py-1.5 text-[13px] font-medium transition-colors border cursor-pointer',
                hasPin === opt
                  ? 'bg-green text-white border-green'
                  : 'border-hairline text-muted hover:border-green hover:text-ink',
              )}
            >
              {opt}
            </button>
          ))}
        </div>

        {hasPin === 'Yes' && (
          <div className="mt-4 pt-4 border-t border-hairline">
            <p className="text-[12px] text-muted mb-2">Enter your 6-digit IP PIN</p>
            <input
              value={pinNumber}
              onChange={(e) => handlePinNumber(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              maxLength={6}
              className="font-mono text-[20px] text-ink bg-transparent outline-none border-b-2 border-green w-32 py-1 tracking-[0.4em]"
            />
          </div>
        )}
      </div>

      <div className="p-3 bg-amber-pale border border-amber rounded-xl">
        <p className="text-[12px] font-semibold text-amber mb-1">Important</p>
        <p className="text-[12px] text-ink">
          If you received an IP PIN letter (CP01A) from the IRS, you <strong>must</strong>{' '}
          enter it or your return will be rejected. Get or retrieve your IP PIN at irs.gov/ippin.
        </p>
      </div>
    </div>
  )
}
