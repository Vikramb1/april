'use client'

import { useState } from 'react'
import { useStore } from '@/store'

interface FieldRowProps {
  label: string
  value: string
  mono?: boolean
  masked?: boolean
}

function FieldRow({ label, value, mono, masked }: FieldRowProps) {
  const [editing, setEditing] = useState(false)
  const [localVal, setLocalVal] = useState(value)

  const display = masked && localVal ? `···-··-${localVal.slice(-4)}` : localVal || '—'

  return (
    <div className="border-b border-hairline py-3">
      <p className="text-[12px] text-muted mb-0.5">{label}</p>
      {editing ? (
        <input
          autoFocus
          value={localVal}
          onChange={(e) => setLocalVal(e.target.value)}
          onBlur={() => setEditing(false)}
          className="text-[14px] border-b-2 border-green outline-none bg-transparent w-full font-sans"
        />
      ) : (
        <p
          className={`text-[14px] text-ink cursor-pointer hover:text-green transition-colors ${mono ? 'font-mono' : ''}`}
          onClick={() => setEditing(true)}
        >
          {display}
        </p>
      )}
    </div>
  )
}

export function PersonalSection() {
  const taxData = useStore((s) => s.taxData)
  const tr = taxData?.tax_return ?? {}

  return (
    <div>
      <h2 className="text-[18px] font-bold text-ink mb-4">Personal Information</h2>
      <FieldRow label="First Name" value={tr.first_name ?? ''} />
      <FieldRow label="Last Name" value={tr.last_name ?? ''} />
      <FieldRow label="Social Security Number" value={tr.ssn ?? ''} masked mono />
      <FieldRow label="Date of Birth" value={tr.date_of_birth ?? ''} mono />
      <FieldRow label="Occupation" value={tr.occupation ?? ''} />
      <FieldRow label="Street Address" value={tr.address ?? ''} />
      <FieldRow label="City" value={tr.city ?? ''} />
      <FieldRow label="State" value={tr.state ?? ''} />
      <FieldRow label="ZIP Code" value={tr.zip_code ?? ''} mono />
    </div>
  )
}
