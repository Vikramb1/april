'use client'

import { useState } from 'react'
import { useStore } from '@/store'

function formatMoney(val: number | undefined) {
  if (val == null) return '—'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val)
}

interface FieldRowProps {
  label: string
  value: number | undefined
  placeholder?: string
}

function FieldRow({ label, value, placeholder = '0.00' }: FieldRowProps) {
  const [editing, setEditing] = useState(false)
  const [localVal, setLocalVal] = useState(String(value ?? ''))

  return (
    <div className="border-b border-hairline py-3">
      <p className="text-[12px] text-muted mb-0.5">{label}</p>
      <input
        readOnly={!editing}
        value={editing ? localVal : (localVal ? formatMoney(parseFloat(localVal)) : '')}
        placeholder={placeholder}
        onChange={(e) => setLocalVal(e.target.value)}
        onFocus={() => setEditing(true)}
        onBlur={() => setEditing(false)}
        className={`font-mono text-[14px] border-b-2 outline-none bg-transparent w-full transition-colors ${editing ? 'border-green text-ink' : 'border-transparent cursor-pointer hover:text-green'} ${!editing && !localVal ? 'text-muted' : 'text-ink'}`}
      />
    </div>
  )
}

export function DeductionsSection() {
  const taxData = useStore((s) => s.taxData)
  const ded = taxData?.deductions ?? {}

  const standard = 14600 // 2024 standard deduction (single)
  const itemized = (ded.mortgage_interest ?? 0) + (ded.charitable_donations ?? 0) + (ded.state_local_taxes ?? 0)
  const useItemized = itemized > standard

  return (
    <div>
      <h2 className="text-[18px] font-bold text-ink mb-4">Deductions</h2>

      {/* Comparison card */}
      <div className="bg-green-pale rounded-xl p-4 mb-4">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-[12px] text-muted">Standard Deduction</p>
            <p className="font-mono text-[16px] font-bold text-ink">{formatMoney(standard)}</p>
          </div>
          <div className="text-right">
            <p className="text-[12px] text-muted">Your Itemized Total</p>
            <p className={`font-mono text-[16px] font-bold ${itemized > 0 ? 'text-ink' : 'text-muted'}`}>
              {itemized > 0 ? formatMoney(itemized) : '—'}
            </p>
          </div>
        </div>
        <p className="text-green font-semibold text-[13px] mt-3">
          {useItemized
            ? `Itemizing saves you ${formatMoney(itemized - standard)} more`
            : 'Standard deduction is recommended for you'}
        </p>
      </div>

      <h3 className="text-[14px] font-semibold text-ink mb-2">Itemized Deductions</h3>
      <FieldRow label="Mortgage Interest" value={ded.mortgage_interest as number | undefined} />
      <FieldRow label="Charitable Donations" value={ded.charitable_donations as number | undefined} />
      <FieldRow label="State & Local Taxes (SALT)" value={ded.state_local_taxes as number | undefined} />
    </div>
  )
}
