'use client'

import { useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { useStore } from '@/store'

const US_STATES = [
  'AL','AK','AZ','AR','AA','AE','AP','CA','CO','CT',
  'DE','DC','FL','GA','GU','HI','ID','IL','IN','IA',
  'KS','KY','LA','ME','MD','MA','MI','MN','MS','MO',
  'MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH',
  'OK','OR','PA','PR','RI','SC','SD','TN','TX','UT',
  'VT','VI','VA','WA','WV','WI','WY',
]

const BOX12_CODES = [
  'A','B','C','D','E','F','G','H','J','K','L','M','N',
  'P','Q','R','S','T','V','W','Y','Z','AA','BB','DD','EE','FF','GG','HH',
]

const W2_TYPES = ['Standard W-2', 'Corrected W-2', 'Multiple employers with same EIN']

function formatMoney(val: number | undefined) {
  if (val == null) return '—'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val)
}

type W2Record = Record<string, unknown>

function W2Card({ w2, onRemove }: { w2: W2Record; onRemove: () => void }) {
  return (
    <div className="bg-cream-deep border border-hairline rounded-xl p-5 mb-3">
      <div className="flex items-baseline justify-between mb-3">
        <div className="flex items-baseline gap-2">
          <span className="text-[16px] font-bold text-ink">
            {(w2.employer_name as string) ?? 'Unknown Employer'}
          </span>
          {!!w2.ein && (
            <span className="font-mono text-[13px] text-muted">{w2.ein as string}</span>
          )}
        </div>
        <button onClick={onRemove} className="text-[12px] text-muted hover:text-red transition-colors cursor-pointer">
          Remove
        </button>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {([
          ['Wages (Box 1)', w2.wages],
          ['Federal Withheld (Box 2)', w2.federal_tax_withheld],
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
  required?: boolean
}

function FormField({ label, value, onChange, mono, placeholder, required }: FieldProps) {
  return (
    <div>
      <p className="text-[12px] text-muted mb-0.5">
        {label}{required && <span className="text-amber ml-0.5">*</span>}
      </p>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? '—'}
        className={`w-full border-b border-hairline focus:border-green outline-none bg-transparent py-1 text-[14px] text-ink transition-colors ${mono ? 'font-mono' : ''}`}
      />
    </div>
  )
}

interface SelectFieldProps {
  label: string
  value: string
  onChange: (v: string) => void
  options: string[]
  placeholder?: string
}

function SelectField({ label, value, onChange, options, placeholder }: SelectFieldProps) {
  return (
    <div>
      <p className="text-[12px] text-muted mb-0.5">{label}</p>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border-b border-hairline focus:border-green outline-none bg-transparent py-1 text-[14px] text-ink transition-colors cursor-pointer"
      >
        <option value="">{placeholder ?? '—'}</option>
        {options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    </div>
  )
}

interface RadioFieldProps {
  label: string
  value: string
  onChange: (v: string) => void
  options?: string[]
}

function RadioField({ label, value, onChange, options = ['Yes', 'No'] }: RadioFieldProps) {
  return (
    <div>
      <p className="text-[12px] text-muted mb-1">{label}</p>
      <div className="flex gap-2">
        {options.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
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

interface CheckboxFieldProps {
  label: string
  checked: boolean
  onChange: (v: boolean) => void
}

function CheckboxField({ label, checked, onChange }: CheckboxFieldProps) {
  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="w-4 h-4 accent-green cursor-pointer flex-shrink-0"
      />
      <span className="text-[13px] text-ink">{label}</span>
    </label>
  )
}

function GroupLabel({ label }: { label: string }) {
  return (
    <div className="col-span-2 mt-5 mb-1">
      <p className="text-[11px] font-semibold uppercase tracking-widest text-muted">{label}</p>
      <hr className="border-hairline mt-1" />
    </div>
  )
}

const EMPTY_FORM = {
  // Employer Info
  employer_name: '',
  ein: '',
  employer_address_type: '',
  employer_address: '',
  employer_city: '',
  employer_state: '',
  employer_zip: '',
  // Employee Info
  employee_name: '',
  employee_address_type: '',
  employee_address: '',
  employee_city: '',
  employee_state: '',
  employee_zip: '',
  // Boxes 1-11
  wages: '',
  federal_tax_withheld: '',
  social_security_wages: '',
  social_security_tax_withheld: '',
  medicare_wages: '',
  medicare_tax_withheld: '',
  social_security_tips: '',
  allocated_tips: '',
  dependent_care_benefits: '',
  nonqualified_plans: '',
  // Box 12
  box12_code1: '',
  box12_amount1: '',
  box12_code2: '',
  box12_amount2: '',
  // Box 13
  statutory_employee: false,
  retirement_plan: false,
  third_party_sick_pay: false,
  // Box 14-20
  box14_other: '',
  state: '',
  state_wages: '',
  state_tax_withheld: '',
  local_wages: '',
  local_tax: '',
  local_tax_state: '',
  locality_name: '',
  // W-2 Details
  w2_type: '',
  is_corrected: '',
  has_tip_income: '',
  has_overtime: '',
}

type FormState = typeof EMPTY_FORM

export function W2Section() {
  const { taxData, setTaxData } = useStore(
    useShallow((s) => ({ taxData: s.taxData, setTaxData: s.setTaxData }))
  )
  const w2s = taxData?.w2_forms ?? []

  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)

  function setStr(key: keyof FormState) {
    return (v: string) => setForm((f) => ({ ...f, [key]: v }))
  }

  function setBool(key: keyof FormState) {
    return (v: boolean) => setForm((f) => ({ ...f, [key]: v }))
  }

  function handleAdd() {
    if (!form.employer_name.trim()) return

    const num = (s: string) => (s.trim() === '' ? undefined : parseFloat(s.replace(/,/g, '')))
    const str = (s: string) => s.trim() || undefined

    const newW2: W2Record = {
      employer_name: form.employer_name.trim(),
      ein: str(form.ein),
      employer_address_type: str(form.employer_address_type),
      employer_address: str(form.employer_address),
      employer_city: str(form.employer_city),
      employer_state: str(form.employer_state),
      employer_zip: str(form.employer_zip),
      employee_name: str(form.employee_name),
      employee_address_type: str(form.employee_address_type),
      employee_address: str(form.employee_address),
      employee_city: str(form.employee_city),
      employee_state: str(form.employee_state),
      employee_zip: str(form.employee_zip),
      wages: num(form.wages),
      federal_tax_withheld: num(form.federal_tax_withheld),
      social_security_wages: num(form.social_security_wages),
      social_security_tax_withheld: num(form.social_security_tax_withheld),
      medicare_wages: num(form.medicare_wages),
      medicare_tax_withheld: num(form.medicare_tax_withheld),
      social_security_tips: num(form.social_security_tips),
      allocated_tips: num(form.allocated_tips),
      dependent_care_benefits: num(form.dependent_care_benefits),
      nonqualified_plans: num(form.nonqualified_plans),
      box12_code1: str(form.box12_code1),
      box12_amount1: num(form.box12_amount1),
      box12_code2: str(form.box12_code2),
      box12_amount2: num(form.box12_amount2),
      statutory_employee: form.statutory_employee || undefined,
      retirement_plan: form.retirement_plan || undefined,
      third_party_sick_pay: form.third_party_sick_pay || undefined,
      box14_other: str(form.box14_other),
      state: str(form.state),
      state_wages: num(form.state_wages),
      state_tax_withheld: num(form.state_tax_withheld),
      local_wages: num(form.local_wages),
      local_tax: num(form.local_tax),
      local_tax_state: str(form.local_tax_state),
      locality_name: str(form.locality_name),
      w2_type: str(form.w2_type),
      is_corrected: str(form.is_corrected),
      has_tip_income: str(form.has_tip_income),
      has_overtime: str(form.has_overtime),
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
        <W2Card key={i} w2={w2} onRemove={() => handleRemove(i)} />
      ))}

      {/* Inline add form */}
      {showForm && (
        <div className="bg-cream-deep border border-green rounded-xl p-5 mb-3">
          <p className="text-[14px] font-semibold text-ink mb-4">New W-2</p>

          <div className="grid grid-cols-2 gap-4">
            {/* Employer Info */}
            <GroupLabel label="Employer Info" />
            <div className="col-span-2">
              <FormField label="Employer Name" value={form.employer_name} onChange={setStr('employer_name')} placeholder="Acme Corp" required />
            </div>
            <FormField label="EIN" value={form.ein} onChange={setStr('ein')} mono placeholder="12-3456789" />
            <SelectField label="Employer Address Type" value={form.employer_address_type} onChange={setStr('employer_address_type')} options={['U.S. Address', 'Foreign Address']} placeholder="U.S. Address" />
            <div className="col-span-2">
              <FormField label="Employer Address" value={form.employer_address} onChange={setStr('employer_address')} placeholder="123 Business Ave" />
            </div>
            <FormField label="Employer City" value={form.employer_city} onChange={setStr('employer_city')} placeholder="New York" />
            <SelectField label="Employer State" value={form.employer_state} onChange={setStr('employer_state')} options={US_STATES} />
            <FormField label="Employer ZIP" value={form.employer_zip} onChange={setStr('employer_zip')} mono placeholder="10001" />

            {/* Employee Info */}
            <GroupLabel label="Employee Info" />
            <div className="col-span-2">
              <FormField label="Employee Name" value={form.employee_name} onChange={setStr('employee_name')} placeholder="Jane Doe" />
            </div>
            <SelectField label="Employee Address Type" value={form.employee_address_type} onChange={setStr('employee_address_type')} options={['U.S. Address', 'Foreign Address']} placeholder="U.S. Address" />
            <div className="col-span-2 col-start-1">
              <FormField label="Employee Address" value={form.employee_address} onChange={setStr('employee_address')} placeholder="456 Home St" />
            </div>
            <FormField label="Employee City" value={form.employee_city} onChange={setStr('employee_city')} placeholder="Brooklyn" />
            <SelectField label="Employee State" value={form.employee_state} onChange={setStr('employee_state')} options={US_STATES} />
            <FormField label="Employee ZIP" value={form.employee_zip} onChange={setStr('employee_zip')} mono placeholder="11201" />

            {/* Wages & Tax Boxes 1-11 */}
            <GroupLabel label="Wages & Tax (Boxes 1–11)" />
            <FormField label="Box 1 — Wages, Tips, Other Comp" value={form.wages} onChange={setStr('wages')} mono placeholder="0.00" required />
            <FormField label="Box 2 — Federal Income Tax Withheld" value={form.federal_tax_withheld} onChange={setStr('federal_tax_withheld')} mono placeholder="0.00" />
            <FormField label="Box 3 — Social Security Wages" value={form.social_security_wages} onChange={setStr('social_security_wages')} mono placeholder="0.00" />
            <FormField label="Box 4 — Social Security Tax Withheld" value={form.social_security_tax_withheld} onChange={setStr('social_security_tax_withheld')} mono placeholder="0.00" />
            <FormField label="Box 5 — Medicare Wages & Tips" value={form.medicare_wages} onChange={setStr('medicare_wages')} mono placeholder="0.00" />
            <FormField label="Box 6 — Medicare Tax Withheld" value={form.medicare_tax_withheld} onChange={setStr('medicare_tax_withheld')} mono placeholder="0.00" />
            <div className="col-span-2">
              <RadioField label="Did you have any tip income included in Box 1 wages?" value={form.has_tip_income} onChange={setStr('has_tip_income')} />
            </div>
            {form.has_tip_income === 'Yes' && (
              <>
                <FormField label="Box 7 — Social Security Tips" value={form.social_security_tips} onChange={setStr('social_security_tips')} mono placeholder="0.00" />
                <FormField label="Box 8 — Allocated Tips" value={form.allocated_tips} onChange={setStr('allocated_tips')} mono placeholder="0.00" />
              </>
            )}
            <FormField label="Box 10 — Dependent Care Benefits" value={form.dependent_care_benefits} onChange={setStr('dependent_care_benefits')} mono placeholder="0.00" />
            <FormField label="Box 11 — Nonqualified Plans" value={form.nonqualified_plans} onChange={setStr('nonqualified_plans')} mono placeholder="0.00" />

            {/* Box 12 */}
            <GroupLabel label="Box 12" />
            <SelectField label="Code 1" value={form.box12_code1} onChange={setStr('box12_code1')} options={BOX12_CODES} />
            <FormField label="Amount 1" value={form.box12_amount1} onChange={setStr('box12_amount1')} mono placeholder="0.00" />
            <SelectField label="Code 2" value={form.box12_code2} onChange={setStr('box12_code2')} options={BOX12_CODES} />
            <FormField label="Amount 2" value={form.box12_amount2} onChange={setStr('box12_amount2')} mono placeholder="0.00" />

            {/* Box 13 */}
            <GroupLabel label="Box 13" />
            <div className="col-span-2 flex flex-wrap gap-6">
              <CheckboxField label="Statutory Employee" checked={form.statutory_employee} onChange={setBool('statutory_employee')} />
              <CheckboxField label="Retirement Plan" checked={form.retirement_plan} onChange={setBool('retirement_plan')} />
              <CheckboxField label="Third-Party Sick Pay" checked={form.third_party_sick_pay} onChange={setBool('third_party_sick_pay')} />
            </div>

            {/* Box 14-20 */}
            <GroupLabel label="Box 14–20" />
            <div className="col-span-2">
              <FormField label="Box 14 — Other" value={form.box14_other} onChange={setStr('box14_other')} placeholder="Description: Amount" />
            </div>
            <SelectField label="Box 15 — State" value={form.state} onChange={setStr('state')} options={US_STATES} />
            <FormField label="Box 16 — State Wages, Tips, Etc." value={form.state_wages} onChange={setStr('state_wages')} mono placeholder="0.00" />
            <FormField label="Box 17 — State Income Tax" value={form.state_tax_withheld} onChange={setStr('state_tax_withheld')} mono placeholder="0.00" />
            <FormField label="Box 18 — Local Wages, Tips, Etc." value={form.local_wages} onChange={setStr('local_wages')} mono placeholder="0.00" />
            <FormField label="Box 19 — Local Income Tax" value={form.local_tax} onChange={setStr('local_tax')} mono placeholder="0.00" />
            <FormField label="Box 20 — Locality Name" value={form.locality_name} onChange={setStr('locality_name')} placeholder="NYC" />
            <SelectField label="State for Local Tax" value={form.local_tax_state} onChange={setStr('local_tax_state')} options={US_STATES} />

            {/* W-2 Details */}
            <GroupLabel label="W-2 Details" />
            <div className="col-span-2">
              <RadioField
                label="W-2 Type"
                value={form.w2_type}
                onChange={setStr('w2_type')}
                options={W2_TYPES}
              />
            </div>
            <RadioField label="Corrected W-2?" value={form.is_corrected} onChange={setStr('is_corrected')} />
            <RadioField label="Overtime income?" value={form.has_overtime} onChange={setStr('has_overtime')} />
          </div>

          <div className="flex gap-3 mt-6">
            <button
              onClick={handleAdd}
              disabled={!form.employer_name.trim()}
              className="bg-green text-white text-[13px] font-semibold px-5 py-2 rounded-lg hover:bg-green-mid transition-colors disabled:opacity-40 cursor-pointer"
            >
              Add W-2
            </button>
            <button
              onClick={() => { setShowForm(false); setForm(EMPTY_FORM) }}
              className="text-[13px] text-muted hover:text-ink transition-colors cursor-pointer"
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
