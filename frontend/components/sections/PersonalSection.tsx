'use client'

import { useState } from 'react'
import { useStore } from '@/store'
import type { TaxReturn, TaxData } from '@/lib/types'

const US_STATES = [
  'AL','AK','AZ','AR','AA','AE','AP','CA','CO','CT',
  'DE','DC','FL','GA','GU','HI','ID','IL','IN','IA',
  'KS','KY','LA','ME','MD','MA','MI','MN','MS','MO',
  'MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH',
  'OK','OR','PA','PR','RI','SC','SD','TN','TX','UT',
  'VT','VI','VA','WA','WV','WI','WY',
]

const SUFFIXES = ['JR', 'SR', 'II', 'III', 'IV', 'V', 'VI']

interface FieldRowProps {
  label: string
  value: string
  onChange: (val: string) => void
  mono?: boolean
  masked?: boolean
  placeholder?: string
  required?: boolean
}

function FieldRow({ label, value, onChange, mono, masked, placeholder, required }: FieldRowProps) {
  const [editing, setEditing] = useState(false)
  const [localVal, setLocalVal] = useState(value)

  const displayVal = masked && value ? `···-··-${value.slice(-4)}` : value

  return (
    <div className="border-b border-hairline py-3">
      <p className="text-[12px] text-muted mb-0.5">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </p>
      <input
        readOnly={!editing}
        value={editing ? localVal : displayVal}
        placeholder={placeholder}
        onChange={(e) => setLocalVal(e.target.value)}
        onFocus={() => { setLocalVal(value); setEditing(true) }}
        onBlur={() => { setEditing(false); onChange(localVal) }}
        className={`text-[14px] border-b-2 outline-none bg-transparent w-full font-sans transition-colors ${mono ? 'font-mono' : ''} ${editing ? 'border-green text-ink' : 'border-transparent cursor-pointer hover:text-green'} ${!editing && !displayVal ? 'text-muted' : 'text-ink'}`}
      />
    </div>
  )
}

interface SelectRowProps {
  label: string
  value: string
  onChange: (val: string) => void
  options: string[]
  placeholder?: string
  required?: boolean
}

function SelectRow({ label, value, onChange, options, placeholder, required }: SelectRowProps) {
  return (
    <div className="border-b border-hairline py-3">
      <p className="text-[12px] text-muted mb-0.5">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </p>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="text-[14px] text-ink bg-transparent outline-none w-full cursor-pointer py-0.5"
      >
        <option value="">{placeholder ?? '—'}</option>
        {options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    </div>
  )
}

interface RadioRowProps {
  label: string
  value: string
  onChange: (val: string) => void
  required?: boolean
}

function RadioRow({ label, value, onChange, required }: RadioRowProps) {
  return (
    <div className="border-b border-hairline py-3 flex items-center justify-between">
      <p className="text-[13px] text-ink flex-1 pr-4">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </p>
      <div className="flex gap-2 flex-shrink-0">
        {['Yes', 'No'].map((opt) => (
          <button
            key={opt}
            onClick={() => onChange(value === opt ? '' : opt)}
            className={`px-3 py-1 text-[12px] font-medium rounded-full border transition-colors cursor-pointer ${
              value === opt
                ? 'bg-green text-white border-green'
                : 'border-hairline text-muted hover:border-green hover:text-ink'
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  )
}

interface CheckboxRowProps {
  label: string
  checked: boolean
  onChange: (val: boolean) => void
}

function CheckboxRow({ label, checked, onChange }: CheckboxRowProps) {
  return (
    <div className="border-b border-hairline py-3 flex items-center gap-3">
      <input
        type="checkbox"
        id={`chk-${label}`}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="w-4 h-4 accent-green cursor-pointer flex-shrink-0"
      />
      <label htmlFor={`chk-${label}`} className="text-[13px] text-ink cursor-pointer">{label}</label>
    </div>
  )
}

function SectionHeading({ title }: { title: string }) {
  return (
    <h3 className="text-[11px] font-semibold uppercase tracking-widest text-muted mt-6 mb-1">{title}</h3>
  )
}

export function PersonalSection() {
  const taxData = useStore((s) => s.taxData)
  const setTaxData = useStore((s) => s.setTaxData)
  const tr = taxData?.tax_return ?? {}

  function update(field: keyof TaxReturn) {
    return (val: string | boolean) =>
      setTaxData({
        ...taxData,
        tax_return: { ...taxData?.tax_return, [field]: val },
      } as TaxData)
  }

  return (
    <div>
      <h2 className="text-[18px] font-bold text-ink mb-4">Personal Information</h2>

      <SectionHeading title="Name" />
      <FieldRow label="First Name" value={tr.first_name ?? ''} onChange={update('first_name')} placeholder="John" required />
      <FieldRow label="Middle Initial" value={tr.middle_initial ?? ''} onChange={update('middle_initial')} placeholder="M" />
      <FieldRow label="Last Name" value={tr.last_name ?? ''} onChange={update('last_name')} placeholder="Doe" required />
      <SelectRow label="Suffix" value={tr.suffix ?? ''} onChange={update('suffix') as (v: string) => void} options={SUFFIXES} placeholder="None" />

      <SectionHeading title="Contact & Address" />
      <FieldRow label="Social Security Number" value={tr.ssn ?? ''} onChange={update('ssn')} masked mono placeholder="XXX-XX-XXXX" required />
      <FieldRow label="Date of Birth" value={tr.date_of_birth ?? ''} onChange={update('date_of_birth')} mono placeholder="YYYY-MM-DD" required />
      <FieldRow label="Occupation" value={tr.occupation ?? ''} onChange={update('occupation')} placeholder="Software Engineer" />
      <FieldRow label="Street Address" value={tr.address ?? ''} onChange={update('address')} placeholder="123 Main St" required />
      <FieldRow label="Apt #" value={tr.apt ?? ''} onChange={update('apt')} placeholder="Apt 4B (optional)" />
      <FieldRow label="City" value={tr.city ?? ''} onChange={update('city')} placeholder="New York" required />
      <SelectRow label="State" value={tr.state ?? ''} onChange={update('state') as (v: string) => void} options={US_STATES} required />
      <FieldRow label="ZIP Code" value={tr.zip_code ?? ''} onChange={update('zip_code')} mono placeholder="10001" required />
      <FieldRow label="ZIP+4" value={tr.zip_plus_4 ?? ''} onChange={update('zip_plus_4')} mono placeholder="1234" />
      <CheckboxRow
        label="Address changed since last return"
        checked={!!tr.addr_changed}
        onChange={update('addr_changed') as (v: boolean) => void}
      />

      <SectionHeading title="Tax Questions" />
      <RadioRow
        label="Claimed as dependent on someone else's return?"
        value={tr.claimed_as_dependent ?? ''}
        onChange={update('claimed_as_dependent') as (v: string) => void}
        required
      />
      <RadioRow
        label="Presidential Election Campaign Fund ($3)?"
        value={tr.presidential_fund ?? ''}
        onChange={update('presidential_fund') as (v: string) => void}
      />
      <RadioRow
        label="Were you blind on 12/31/2025?"
        value={tr.blind ?? ''}
        onChange={update('blind') as (v: string) => void}
        required
      />
      <RadioRow
        label="Did you pass away in 2025?"
        value={tr.deceased ?? ''}
        onChange={update('deceased') as (v: string) => void}
        required
      />
      <RadioRow
        label="Are you a Nonresident Alien?"
        required
        value={tr.nonresident_alien ?? ''}
        onChange={update('nonresident_alien') as (v: string) => void}
      />
    </div>
  )
}
