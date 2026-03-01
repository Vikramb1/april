'use client'

import { useState } from 'react'
import { clsx } from 'clsx'
import { useStore } from '@/store'

interface FieldRowProps {
  label: string
  value: string
  placeholder?: string
}

function FieldRow({ label, value, placeholder = '—' }: FieldRowProps) {
  const [editing, setEditing] = useState(false)
  const [localVal, setLocalVal] = useState(value)

  return (
    <div className="border-b border-hairline py-3">
      <p className="text-[12px] text-muted mb-0.5">{label}</p>
      <input
        readOnly={!editing}
        value={localVal}
        placeholder={placeholder}
        onChange={(e) => setLocalVal(e.target.value)}
        onFocus={() => setEditing(true)}
        onBlur={() => setEditing(false)}
        className={`font-mono text-[14px] border-b-2 outline-none bg-transparent w-full transition-colors ${editing ? 'border-green text-ink' : 'border-transparent cursor-pointer hover:text-green'} ${!editing && !localVal ? 'text-muted' : 'text-ink'}`}
      />
    </div>
  )
}

export function BankSection() {
  const taxData = useStore((s) => s.taxData)
  const tr = taxData?.tax_return ?? {}
  const [accountType, setAccountType] = useState(tr.bank_account_type ?? 'Checking')

  return (
    <div>
      <h2 className="text-[18px] font-bold text-ink mb-4">Bank Information</h2>

      <FieldRow label="Routing Number" value={tr.bank_routing_number ?? ''} placeholder="e.g. 021000021" />
      <FieldRow label="Account Number" value={tr.bank_account_number ?? ''} placeholder="e.g. 123456789012" />

      {/* Account type toggle */}
      <div className="py-3 border-b border-hairline">
        <p className="text-[12px] text-muted mb-2">Account Type</p>
        <div className="flex gap-2">
          {['Checking', 'Savings'].map((type) => (
            <button
              key={type}
              onClick={() => setAccountType(type)}
              className={clsx(
                'rounded-full px-4 py-1.5 text-[13px] font-medium transition-colors border cursor-pointer',
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
    </div>
  )
}
