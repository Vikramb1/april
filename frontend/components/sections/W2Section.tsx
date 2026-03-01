'use client'

import { useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { useStore } from '@/store'

function formatMoney(val: number | undefined) {
  if (val == null) return '—'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val)
}

type W2Record = Record<string, unknown>

interface W2CardProps {
  w2: W2Record
  index: number
  onRemove: () => void
}

function W2Card({ w2, onRemove }: W2CardProps) {
  return (
    <div className="bg-white border border-hairline rounded-xl p-5 mb-3">
      <div className="flex items-baseline justify-between mb-3">
        <div className="flex items-baseline gap-2">
          <span className="text-[16px] font-bold text-ink">
            {(w2.employer_name as string) ?? 'Unknown Employer'}
          </span>
          {!!w2.ein && (
            <span className="font-mono text-[13px] text-muted">{w2.ein as string}</span>
          )}
        </div>
        <button onClick={onRemove} className="text-[12px] text-muted hover:text-red transition-colors">
          Remove
        </button>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {([
          ['Wages & Salary', w2.wages],
          ['Federal Tax Withheld', w2.federal_tax_withheld],
          ['SS Wages', w2.social_security_wages],
          ['SS Tax Withheld', w2.social_security_tax_withheld],
          ['Medicare Wages', w2.medicare_wages],
          ['Medicare Tax Withheld', w2.medicare_tax_withheld],
        ] as [string, unknown][]).map(([label, val]) => (
          <div key={label}>
            <p className="text-[12px] text-muted">{label}</p>
            <p className="font-mono text-[14px] text-ink">{formatMoney(val as number | undefined)}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

interface FieldProps {
  label: string
  value: string
  onChange: (v: string) => void
  mono?: boolean
  placeholder?: string
}

function FormField({ label, value, onChange, mono, placeholder }: FieldProps) {
  return (
    <div>
      <p className="text-[12px] text-muted mb-0.5">{label}</p>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? '—'}
        className={`w-full border-b border-hairline focus:border-green outline-none bg-transparent py-1 text-[14px] text-ink transition-colors ${mono ? 'font-mono' : ''}`}
      />
    </div>
  )
}

const EMPTY_FORM = {
  employer_name: '',
  ein: '',
  wages: '',
  federal_tax_withheld: '',
  state_tax_withheld: '',
  social_security_wages: '',
  social_security_tax_withheld: '',
  medicare_wages: '',
  medicare_tax_withheld: '',
}

export function W2Section() {
  const { taxData, setTaxData } = useStore(
    useShallow((s) => ({ taxData: s.taxData, setTaxData: s.setTaxData }))
  )
  const w2s = taxData?.w2_forms ?? []

  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)

  function set(key: keyof typeof EMPTY_FORM) {
    return (v: string) => setForm((f) => ({ ...f, [key]: v }))
  }

  function handleAdd() {
    if (!form.employer_name.trim()) return

    const num = (s: string) => (s.trim() === '' ? undefined : parseFloat(s.replace(/,/g, '')))

    const newW2: W2Record = {
      employer_name: form.employer_name.trim(),
      ein: form.ein.trim() || undefined,
      wages: num(form.wages),
      federal_tax_withheld: num(form.federal_tax_withheld),
      state_tax_withheld: num(form.state_tax_withheld),
      social_security_wages: num(form.social_security_wages),
      social_security_tax_withheld: num(form.social_security_tax_withheld),
      medicare_wages: num(form.medicare_wages),
      medicare_tax_withheld: num(form.medicare_tax_withheld),
    }

    setTaxData({
      ...taxData,
      w2_forms: [...w2s, newW2 as W2Record],
    } as Parameters<typeof setTaxData>[0])

    setForm(EMPTY_FORM)
    setShowForm(false)
  }

  function handleRemove(index: number) {
    setTaxData({
      ...taxData,
      w2_forms: w2s.filter((_, i) => i !== index) as W2Record[],
    } as Parameters<typeof setTaxData>[0])
  }

  return (
    <div>
      <h2 className="text-[18px] font-bold text-ink mb-4">W-2 Income</h2>

      {w2s.length === 0 && !showForm && (
        <p className="text-[13px] text-muted mb-4">No W-2s added yet.</p>
      )}

      {(w2s as W2Record[]).map((w2, i) => (
        <W2Card key={i} w2={w2} index={i} onRemove={() => handleRemove(i)} />
      ))}

      {/* Inline add form */}
      {showForm && (
        <div className="bg-white border border-green rounded-xl p-5 mb-3">
          <p className="text-[14px] font-semibold text-ink mb-4">New W-2</p>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="col-span-2">
              <FormField label="Employer Name" value={form.employer_name} onChange={set('employer_name')} placeholder="Acme Corp" />
            </div>
            <FormField label="EIN" value={form.ein} onChange={set('ein')} mono placeholder="12-3456789" />
            <FormField label="Wages & Salary" value={form.wages} onChange={set('wages')} mono placeholder="0.00" />
            <FormField label="Federal Tax Withheld" value={form.federal_tax_withheld} onChange={set('federal_tax_withheld')} mono placeholder="0.00" />
            <FormField label="State Tax Withheld" value={form.state_tax_withheld} onChange={set('state_tax_withheld')} mono placeholder="0.00" />
            <FormField label="SS Wages" value={form.social_security_wages} onChange={set('social_security_wages')} mono placeholder="0.00" />
            <FormField label="SS Tax Withheld" value={form.social_security_tax_withheld} onChange={set('social_security_tax_withheld')} mono placeholder="0.00" />
            <FormField label="Medicare Wages" value={form.medicare_wages} onChange={set('medicare_wages')} mono placeholder="0.00" />
            <FormField label="Medicare Tax Withheld" value={form.medicare_tax_withheld} onChange={set('medicare_tax_withheld')} mono placeholder="0.00" />
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleAdd}
              disabled={!form.employer_name.trim()}
              className="bg-green text-white text-[13px] font-semibold px-5 py-2 rounded-lg hover:bg-green-mid transition-colors disabled:opacity-40"
            >
              Add W-2
            </button>
            <button
              onClick={() => { setShowForm(false); setForm(EMPTY_FORM) }}
              className="text-[13px] text-muted hover:text-ink transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {!showForm && (
        <button
          onClick={() => setShowForm(true)}
          className="text-green text-[14px] font-medium cursor-pointer mt-2 hover:text-green-mid transition-colors"
        >
          + Add {w2s.length > 0 ? 'Another' : 'a'} W-2
        </button>
      )}
    </div>
  )
}
