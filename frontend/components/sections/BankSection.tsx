'use client'

import { clsx } from 'clsx'
import { useStore } from '@/store'
import type { TaxReturn, TaxData } from '@/lib/types'

function FieldRow({
  label,
  value,
  placeholder,
  mono,
  onChange,
}: {
  label: string
  value?: string
  placeholder?: string
  mono?: boolean
  onChange: (v: string) => void
}) {
  return (
    <div className="py-3 border-b border-hairline last:border-0">
      <p className="text-[12px] text-muted mb-0.5">{label}</p>
      <input
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? '—'}
        className={clsx(
          'text-[14px] border-b-2 border-green outline-none bg-transparent w-full py-0.5 text-ink transition-colors',
          mono ? 'font-mono' : '',
        )}
      />
    </div>
  )
}

export function BankSection() {
  const taxData = useStore((s) => s.taxData)
  const setTaxData = useStore((s) => s.setTaxData)

  const tr: TaxReturn = taxData?.tax_return ?? {}

  function update(patch: Partial<TaxReturn>) {
    setTaxData({ ...taxData, tax_return: { ...tr, ...patch } } as TaxData)
  }

  const refundType = tr.refund_type ?? ''

  return (
    <div>
      <h2 className="text-[18px] font-bold text-ink mb-1">Bank &amp; Refund</h2>
      <p className="text-[13px] text-muted mb-5">
        Choose how you want to receive your federal refund (or pay any tax owed).
      </p>

      {/* Refund delivery method */}
      <div className="mb-5">
        <p className="text-[13px] font-semibold text-ink mb-2">How would you like to receive your refund?</p>
        <div className="flex flex-col gap-2">
          {[
            { key: 'direct_deposit', label: 'Direct Deposit', desc: 'Fastest option — deposited directly into your bank account.' },
            { key: 'go2bank', label: 'GO2bank Debit Card', desc: 'Receive a prepaid GO2bank debit card. No bank account needed.' },
            { key: 'paper_check', label: 'Paper Check', desc: 'Mailed to your address on file. Slowest option.' },
          ].map(({ key, label, desc }) => (
            <div
              key={key}
              onClick={() => update({ refund_type: key })}
              className={clsx(
                'border rounded-xl p-4 cursor-pointer transition-colors',
                refundType === key
                  ? 'border-green bg-green-pale'
                  : 'border-hairline bg-white hover:bg-[#F7F5F0]',
              )}
            >
              <div className="flex items-center gap-3">
                <div
                  className={clsx(
                    'w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors',
                    refundType === key ? 'border-green' : 'border-hairline',
                  )}
                >
                  {refundType === key && <div className="w-2 h-2 rounded-full bg-green" />}
                </div>
                <div>
                  <p className="text-[14px] font-semibold text-ink">{label}</p>
                  <p className="text-[12px] text-muted">{desc}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Direct deposit fields */}
      {refundType === 'direct_deposit' && (
        <div className="border border-hairline rounded-xl px-4 mb-4">
          <FieldRow
            label="Bank Account Nickname (optional)"
            value={tr.bank_account_nickname}
            placeholder="e.g. My Checking"
            onChange={(v) => update({ bank_account_nickname: v })}
          />
          <FieldRow
            label="Routing Number"
            value={tr.bank_routing_number}
            placeholder="e.g. 021000021"
            mono
            onChange={(v) => update({ bank_routing_number: v })}
          />
          <FieldRow
            label="Account Number"
            value={tr.bank_account_number}
            placeholder="e.g. 123456789012"
            mono
            onChange={(v) => update({ bank_account_number: v })}
          />

          {/* Account type */}
          <div className="py-3 border-b border-hairline">
            <p className="text-[12px] text-muted mb-2">Account Type</p>
            <div className="flex gap-2">
              {['Checking', 'Savings'].map((type) => (
                <button
                  key={type}
                  onClick={() => update({ bank_account_type: type })}
                  className={clsx(
                    'rounded-full px-4 py-1.5 text-[13px] font-medium transition-colors border cursor-pointer',
                    tr.bank_account_type === type
                      ? 'bg-green text-white border-green'
                      : 'border-hairline text-muted hover:border-green hover:text-ink',
                  )}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Foreign bank */}
          <div className="py-3 flex items-center justify-between">
            <p className="text-[13px] text-ink">Is this a foreign bank account?</p>
            <div className="flex gap-2">
              {(['Yes', 'No'] as const).map((opt) => (
                <button
                  key={opt}
                  onClick={() => update({ bank_is_foreign: opt === 'Yes' })}
                  className={clsx(
                    'rounded-full px-3 py-1 text-[12px] font-medium transition-colors border cursor-pointer',
                    (tr.bank_is_foreign ? 'Yes' : tr.bank_is_foreign === false ? 'No' : '') === opt
                      ? 'bg-green text-white border-green'
                      : 'border-hairline text-muted hover:border-green hover:text-ink',
                  )}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>

          {/* Split refund */}
          <div className="py-3">
            <div className="flex items-center justify-between">
              <p className="text-[13px] text-ink">Split refund into multiple accounts?</p>
              <div className="flex gap-2">
                {(['Yes', 'No'] as const).map((opt) => (
                  <button
                    key={opt}
                    onClick={() => update({ is_multiple_deposit: opt })}
                    className={clsx(
                      'rounded-full px-3 py-1 text-[12px] font-medium transition-colors border cursor-pointer',
                      tr.is_multiple_deposit === opt
                        ? 'bg-green text-white border-green'
                        : 'border-hairline text-muted hover:border-green hover:text-ink',
                    )}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {refundType === 'paper_check' && (
        <div className="p-4 bg-amber/10 border border-amber rounded-xl">
          <p className="text-[13px] font-semibold text-amber-dark mb-1">Allow 4–6 weeks for delivery</p>
          <p className="text-[12px] text-ink leading-relaxed">
            Your check will be mailed to the address on your return. Make sure your address in
            Personal Info is correct.
          </p>
        </div>
      )}

      {refundType === 'go2bank' && (
        <div className="p-4 bg-cream border border-hairline rounded-xl">
          <p className="text-[13px] font-semibold text-ink mb-1">GO2bank Debit Card</p>
          <p className="text-[12px] text-muted leading-relaxed">
            A debit card will be mailed to your address. Funds are typically available within 21 days.
            No bank account required.
          </p>
        </div>
      )}
    </div>
  )
}
