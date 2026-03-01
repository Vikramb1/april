'use client'

import { useState } from 'react'
import { clsx } from 'clsx'
import { useStore } from '@/store'

function formatMoney(val: number | undefined) {
  if (val == null) return null
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val)
}

interface FieldRowProps {
  label: string
  value: string
}

function FieldRow({ label, value }: FieldRowProps) {
  const [editing, setEditing] = useState(false)
  const [localVal, setLocalVal] = useState(value)

  return (
    <div className="border-b border-hairline py-3">
      <p className="text-[12px] text-muted mb-0.5">{label}</p>
      {editing ? (
        <input
          autoFocus
          value={localVal}
          onChange={(e) => setLocalVal(e.target.value)}
          onBlur={() => setEditing(false)}
          className="font-mono text-[14px] border-b-2 border-green outline-none bg-transparent w-full"
        />
      ) : (
        <p
          className="font-mono text-[14px] text-ink cursor-pointer hover:text-green transition-colors"
          onClick={() => setEditing(true)}
        >
          {localVal || '—'}
        </p>
      )}
    </div>
  )
}

export function BankSection() {
  const taxData = useStore((s) => s.taxData)
  const tr = taxData?.tax_return ?? {}
  const [accountType, setAccountType] = useState(tr.bank_account_type ?? 'Checking')

  const refund = tr.refund_amount as number | undefined
  const owed = tr.tax_owed as number | undefined

  return (
    <div>
      <h2 className="text-[18px] font-bold text-ink mb-4">Bank Information</h2>

      <FieldRow label="Routing Number" value={tr.bank_routing_number ?? ''} />
      <FieldRow label="Account Number" value={tr.bank_account_number ?? ''} />

      {/* Account type toggle */}
      <div className="py-3 border-b border-hairline">
        <p className="text-[12px] text-muted mb-2">Account Type</p>
        <div className="flex gap-2">
          {['Checking', 'Savings'].map((type) => (
            <button
              key={type}
              onClick={() => setAccountType(type)}
              className={clsx(
                'rounded-full px-4 py-1.5 text-[13px] font-medium transition-colors border',
                accountType === type
                  ? 'bg-green text-white border-green'
                  : 'border-hairline text-muted hover:border-green'
              )}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {/* Refund / owed card */}
      <div className="bg-white border border-hairline rounded-xl p-5 mt-4">
        {refund != null && refund > 0 ? (
          <>
            <p className="text-[12px] text-muted mb-1">Estimated Refund</p>
            <p className="text-[28px] font-bold font-mono text-green">{formatMoney(refund)}</p>
            <p className="text-[12px] text-muted mt-1">Deposited to your {accountType.toLowerCase()} account</p>
          </>
        ) : owed != null && owed > 0 ? (
          <>
            <p className="text-[12px] text-muted mb-1">Amount Owed</p>
            <p className="text-[28px] font-bold font-mono text-amber">{formatMoney(owed)}</p>
            <p className="text-[12px] text-muted mt-1">Due by April 15, 2025</p>
          </>
        ) : (
          <>
            <p className="text-[12px] text-muted mb-1">Refund / Amount Owed</p>
            <p className="text-[20px] font-mono text-muted">Calculating...</p>
          </>
        )}
      </div>
    </div>
  )
}
