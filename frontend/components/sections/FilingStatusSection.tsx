'use client'

import { useState } from 'react'
import { clsx } from 'clsx'
import { useStore } from '@/store'

const STATUSES = ['Single', 'Married Filing Jointly', 'Married Filing Separately', 'Head of Household', 'Qualifying Surviving Spouse']

interface Dependent {
  name: string
  relationship: string
  dob: string
  ssn: string
}

const EMPTY_DEP: Dependent = { name: '', relationship: '', dob: '', ssn: '' }

function DepRow({
  dep,
  onChange,
  onRemove,
}: {
  dep: Dependent
  onChange: (d: Dependent) => void
  onRemove: () => void
}) {
  const [open, setOpen] = useState(false)

  return (
    <div className="border border-hairline rounded-lg mb-2 overflow-hidden">
      {/* Summary row */}
      <div className="flex items-center justify-between px-3 py-2">
        <button
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-2 text-left flex-1 cursor-pointer"
        >
          <span className="text-[13px] font-medium text-ink">
            {dep.name || 'New Dependent'}
          </span>
          {dep.relationship && (
            <span className="text-[11px] text-muted">{dep.relationship}</span>
          )}
          <span className="ml-auto text-[11px] text-muted">{open ? '▲' : '▼'}</span>
        </button>
        <button
          onClick={onRemove}
          className="text-[12px] text-muted hover:text-red transition-colors ml-3 cursor-pointer"
        >
          Remove
        </button>
      </div>

      {/* Editable fields */}
      {open && (
        <div className="border-t border-hairline px-3 pb-3 pt-3 grid grid-cols-2 gap-3 bg-cream">
          {(
            [
              ['Full Name', 'name', false, 'Jane Rivera'],
              ['Relationship', 'relationship', false, 'Daughter'],
              ['Date of Birth', 'dob', true, 'YYYY-MM-DD'],
              ['SSN (last 4)', 'ssn', true, '0000'],
            ] as [string, keyof Dependent, boolean, string][]
          ).map(([label, key, mono, placeholder]) => (
            <div key={key} className={key === 'name' || key === 'relationship' ? 'col-span-2' : ''}>
              <p className="text-[11px] text-muted mb-0.5">{label}</p>
              <input
                value={dep[key]}
                onChange={(e) => onChange({ ...dep, [key]: e.target.value })}
                placeholder={placeholder}
                className={`w-full border-b border-hairline focus:border-green outline-none bg-transparent py-1 text-[13px] text-ink transition-colors ${mono ? 'font-mono' : ''}`}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function FilingStatusSection() {
  const taxData = useStore((s) => s.taxData)
  const setTaxData = useStore((s) => s.setTaxData)

  const [selected, setSelected] = useState(taxData?.tax_return?.filing_status ?? 'Single')
  const [identityPin, setIdentityPin] = useState(taxData?.tax_return?.identity_protection_pin ?? '')
  const [identityPinNumber, setIdentityPinNumber] = useState(taxData?.tax_return?.identity_protection_pin_number ?? '')
  const [dependents, setDependents] = useState<Dependent[]>([])

  function updateDep(index: number, dep: Dependent) {
    setDependents((d) => d.map((x, i) => (i === index ? dep : x)))
    // Persist filing status + dependents to store
    setTaxData({
      ...taxData,
      tax_return: {
        ...taxData?.tax_return,
        filing_status: selected,
      },
    } as Parameters<typeof setTaxData>[0])
  }

  function handleStatusChange(status: string) {
    setSelected(status)
    setTaxData({
      ...taxData,
      tax_return: { ...taxData?.tax_return, filing_status: status },
    } as Parameters<typeof setTaxData>[0])
  }

  function handlePinChange(val: string) {
    setIdentityPin(val)
    const pinNumber = val === 'No' ? '' : identityPinNumber
    if (val === 'No') setIdentityPinNumber('')
    setTaxData({
      ...taxData,
      tax_return: {
        ...taxData?.tax_return,
        identity_protection_pin: val,
        identity_protection_pin_number: pinNumber || undefined,
      },
    } as Parameters<typeof setTaxData>[0])
  }

  function handlePinNumberChange(val: string) {
    setIdentityPinNumber(val)
    setTaxData({
      ...taxData,
      tax_return: { ...taxData?.tax_return, identity_protection_pin_number: val },
    } as Parameters<typeof setTaxData>[0])
  }

  return (
    <div>
      <h2 className="text-[18px] font-bold text-ink mb-4">Filing Status</h2>

      {/* Segmented control */}
      <div className="flex flex-wrap gap-2 mb-6">
        {STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => handleStatusChange(s)}
            className={clsx(
              'rounded-full px-4 py-1.5 text-[13px] font-medium transition-colors border cursor-pointer',
              selected === s
                ? 'bg-green text-white border-green'
                : 'border-hairline text-muted hover:border-green hover:text-ink'
            )}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Identity Protection PIN */}
      <div className="mb-6">
        <h3 className="text-[14px] font-semibold text-ink mb-2">Identity Protection PIN</h3>
        <p className="text-[12px] text-muted mb-3">Did the IRS issue you an Identity Protection PIN?</p>
        <div className="flex gap-2">
          {['Yes', 'No'].map((opt) => (
            <button
              key={opt}
              onClick={() => handlePinChange(opt)}
              className={clsx(
                'rounded-full px-4 py-1.5 text-[13px] font-medium transition-colors border cursor-pointer',
                identityPin === opt
                  ? 'bg-green text-white border-green'
                  : 'border-hairline text-muted hover:border-green hover:text-ink'
              )}
            >
              {opt}
            </button>
          ))}
        </div>

        {identityPin === 'Yes' && (
          <div className="mt-3 p-3 bg-cream rounded-lg border border-hairline">
            <p className="text-[12px] text-muted mb-1">Enter your 6-digit Identity Protection PIN</p>
            <input
              value={identityPinNumber}
              onChange={(e) => handlePinNumberChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              maxLength={6}
              className="font-mono text-[16px] text-ink bg-transparent outline-none border-b-2 border-green w-24 py-1 tracking-widest"
            />
          </div>
        )}
      </div>

      {/* Dependents */}
      <h3 className="text-[14px] font-semibold text-ink mb-2">Dependents</h3>
      {dependents.length === 0 && (
        <p className="text-[13px] text-muted mb-3">No dependents added yet.</p>
      )}
      {dependents.map((dep, i) => (
        <DepRow
          key={i}
          dep={dep}
          onChange={(d) => updateDep(i, d)}
          onRemove={() => setDependents((d) => d.filter((_, j) => j !== i))}
        />
      ))}
      <button
        onClick={() => setDependents((d) => [...d, { ...EMPTY_DEP }])}
        className="text-green text-[14px] font-medium cursor-pointer mt-2 hover:text-green-mid transition-colors"
      >
        + Add Dependent
      </button>
    </div>
  )
}
