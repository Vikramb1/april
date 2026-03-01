'use client'

import { useState, useEffect } from 'react'
import { clsx } from 'clsx'
import { useShallow } from 'zustand/react/shallow'
import { useStore } from '@/store'
import type { OtherIncome, TaxData } from '@/lib/types'
import { api } from '@/lib/api'

type Form1099Record = Record<string, unknown>

const FORM_TYPES = ['NEC', 'INT', 'DIV', 'B', 'MISC', 'R', 'SSA']

function formatMoney(val: number | undefined) {
  if (val == null) return '—'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val)
}

interface FormCardProps {
  form: Form1099Record
  onRemove: () => void
}

const FIELD_LABELS: Record<string, string> = {
  total_ordinary_dividends: 'Ordinary Dividends',
  qualified_dividends: 'Qualified Dividends',
  total_capital_gain_distributions: 'Capital Gain Distributions',
  section_199a_dividends: 'Section 199A Dividends',
  interest_income: 'Interest Income',
  total_proceeds: 'Total Proceeds',
  total_cost_basis: 'Total Cost Basis',
  total_realized_gain_loss: 'Realized Gain/Loss',
  other_income: 'Other Income',
  substitute_payments: 'Substitute Payments',
  federal_withheld: 'Federal Tax Withheld',
  federal_tax_withheld: 'Federal Tax Withheld',
  amount: 'Amount',
  nondividend_distributions: 'Non-Dividend Distributions',
  foreign_tax_paid: 'Foreign Tax Paid',
}

function SubFormFields({ label, data }: { label: string; data: Record<string, unknown> }) {
  const entries = Object.entries(data).filter(
    ([, v]) => typeof v === 'number' && v !== 0
  )
  if (entries.length === 0) return null
  return (
    <div className="mt-3">
      <p className="text-[11px] font-semibold uppercase tracking-widest text-muted mb-1.5">{label}</p>
      <div className="grid grid-cols-2 gap-2">
        {entries.map(([key, val]) => (
          <div key={key}>
            <p className="text-[12px] text-muted">{FIELD_LABELS[key] ?? key.replace(/_/g, ' ')}</p>
            <p className="font-mono text-[14px] text-ink">{formatMoney(val as number)}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function FormCard({ form, onRemove }: FormCardProps) {
  const isConsolidated = form.form_type === 'CONSOLIDATED'
  const subForms = isConsolidated
    ? (['1099-DIV', '1099-INT', '1099-B', '1099-MISC', '1099-OID'] as const)
        .filter((k) => form[k] && typeof form[k] === 'object')
    : []

  const allTopFields: [string, unknown][] = [
    ['Amount', form.amount],
    ['Federal Tax Withheld', form.federal_tax_withheld],
    ['Ordinary Dividends', form.total_ordinary_dividends],
    ['Qualified Dividends', form.qualified_dividends],
    ['Capital Gain Distributions', form.total_capital_gain_distributions],
    ['Interest Income', form.interest_income],
    ['Total Proceeds', form.total_proceeds],
    ['Total Cost Basis', form.total_cost_basis],
    ['Realized Gain/Loss', form.total_realized_gain_loss],
  ]
  const topFields = allTopFields.filter(([, v]) => v != null && v !== 0)

  return (
    <div className="bg-cream-deep border border-hairline rounded-xl p-5 mb-3">
      <div className="flex items-baseline justify-between mb-3">
        <div className="flex items-baseline gap-2">
          <span className="text-[16px] font-bold text-ink">
            {(form.payer_name as string) ?? 'Unknown Payer'}
          </span>
          <span className="rounded-full bg-[#F3F4F6] text-muted text-[11px] px-2 py-0.5 font-mono">
            1099-{(form.form_type as string) ?? '?'}
          </span>
        </div>
        <button onClick={onRemove} className="text-[12px] text-muted hover:text-red transition-colors cursor-pointer">
          Remove
        </button>
      </div>

      {/* Top-level fields for simple 1099s */}
      {topFields.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          {topFields.map(([label, val]) => (
            <div key={label as string}>
              <p className="text-[12px] text-muted">{label as string}</p>
              <p className="font-mono text-[14px] text-ink">{formatMoney(val as number)}</p>
            </div>
          ))}
        </div>
      )}

      {/* Consolidated sub-form sections */}
      {subForms.map((key) => (
        <SubFormFields key={key} label={key} data={form[key] as Record<string, unknown>} />
      ))}
    </div>
  )
}

const EMPTY_FORM = {
  form_type: 'NEC',
  payer_name: '',
  payer_tin: '',
  amount: '',
  federal_tax_withheld: '',
  // 1099-DIV fields
  total_ordinary_dividends: '',
  qualified_dividends: '',
  total_capital_gain_distributions: '',
  unrecap_sec_1250_gain: '',
  collectibles_28pct_gain: '',
  nondividend_distributions: '',
  section_199a_dividends: '',
  investment_expenses: '',
  foreign_tax_paid: '',
  cash_liquidation_distributions: '',
  non_cash_liquidation_distributions: '',
  exempt_interest_dividends: '',
  specified_private_activity_bond_interest_dividends: '',
  has_us_gov_interest: '',
  has_state_tax_withheld: '',
  has_fatca: '',
}

// Persists form state across tab switches (component unmount/remount)
let _savedForm: typeof EMPTY_FORM | null = null
let _savedShowForm = false

export function Form1099Section() {
  const { taxData, setTaxData, userId } = useStore(
    useShallow((s) => ({ taxData: s.taxData, setTaxData: s.setTaxData, userId: s.userId }))
  )
  const forms = (taxData?.form_1099s ?? []) as Form1099Record[]

  const oi: OtherIncome = taxData?.other_income ?? {}
  const has1099 = oi.has_1099_income ?? ''

  function updateGate(val: string) {
    setTaxData({
      ...taxData,
      other_income: { ...oi, has_1099_income: val || undefined },
    } as TaxData)
  }

  const [showForm, setShowForm] = useState(_savedShowForm)
  const [form, setForm] = useState(_savedForm ?? EMPTY_FORM)
  const [importing, setImporting] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  // Sync form state to module-level vars so it survives tab switches
  useEffect(() => { _savedForm = form }, [form])
  useEffect(() => { _savedShowForm = showForm }, [showForm])

  function fieldsToForm(fields: Record<string, unknown>): typeof EMPTY_FORM {
    const s = (key: string) => fields[key] != null ? String(fields[key]) : ''
    // For consolidated 1099s, pull DIV fields from nested '1099-DIV' object
    const div = (typeof fields['1099-DIV'] === 'object' && fields['1099-DIV']) as Record<string, unknown> | null
    const d = (key: string) => {
      if (fields[key] != null) return String(fields[key])
      if (div && div[key] != null) return String(div[key])
      return ''
    }
    const formType = (fields.form_type as string || '').replace('1099-', '')
    return {
      form_type: formType || 'DIV',
      payer_name: s('payer_name'),
      payer_tin: s('payer_tin'),
      amount: s('amount'),
      federal_tax_withheld: s('federal_tax_withheld') || d('federal_withheld'),
      total_ordinary_dividends: d('total_ordinary_dividends'),
      qualified_dividends: d('qualified_dividends'),
      total_capital_gain_distributions: d('total_capital_gain_distributions'),
      unrecap_sec_1250_gain: d('unrecap_sec_1250_gain'),
      collectibles_28pct_gain: d('collectibles_28pct_gain'),
      nondividend_distributions: d('nondividend_distributions'),
      section_199a_dividends: d('section_199a_dividends'),
      investment_expenses: d('investment_expenses'),
      foreign_tax_paid: d('foreign_tax_paid'),
      cash_liquidation_distributions: d('cash_liquidation_distributions'),
      non_cash_liquidation_distributions: d('non_cash_liquidation_distributions'),
      exempt_interest_dividends: d('exempt_interest_dividends'),
      specified_private_activity_bond_interest_dividends: d('specified_private_activity_bond_interest_dividends'),
      has_us_gov_interest: '',
      has_state_tax_withheld: '',
      has_fatca: '',
    }
  }

  async function handleUpload1099() {
    if (!userId || uploading) return
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.pdf'
    input.onchange = async () => {
      const file = input.files?.[0]
      if (!file) return
      setUploading(true)
      setImportError(null)
      try {
        const res = await api.upload1099Pdf(userId, file)
        setForm(fieldsToForm(res.extracted_fields))
        setShowForm(true)
      } catch (e) {
        setImportError(e instanceof Error ? e.message : 'Upload failed')
      } finally {
        setUploading(false)
      }
    }
    input.click()
  }

  async function handleImportFidelity() {
    if (!userId || importing) return
    setImporting(true)
    setImportError(null)
    try {
      const res = await api.fetchFidelity1099(userId)
      setForm(fieldsToForm(res.extracted_fields))
      setShowForm(true)
    } catch (e) {
      setImportError(e instanceof Error ? e.message : 'Import failed')
    } finally {
      setImporting(false)
    }
  }

  function set(key: keyof typeof EMPTY_FORM) {
    return (v: string) => setForm((f) => ({ ...f, [key]: v }))
  }

  function handleAdd() {
    if (!form.payer_name.trim()) return

    const num = (s: string) => (s.trim() === '' ? undefined : parseFloat(s.replace(/,/g, '')))
    const str = (s: string) => s.trim() || undefined

    const newForm: Form1099Record = {
      form_type: form.form_type,
      payer_name: form.payer_name.trim(),
      payer_tin: str(form.payer_tin),
      amount: num(form.amount),
      federal_tax_withheld: num(form.federal_tax_withheld),
      total_ordinary_dividends: num(form.total_ordinary_dividends),
      qualified_dividends: num(form.qualified_dividends),
      total_capital_gain_distributions: num(form.total_capital_gain_distributions),
      unrecap_sec_1250_gain: num(form.unrecap_sec_1250_gain),
      collectibles_28pct_gain: num(form.collectibles_28pct_gain),
      nondividend_distributions: num(form.nondividend_distributions),
      section_199a_dividends: num(form.section_199a_dividends),
      investment_expenses: num(form.investment_expenses),
      foreign_tax_paid: num(form.foreign_tax_paid),
      cash_liquidation_distributions: num(form.cash_liquidation_distributions),
      non_cash_liquidation_distributions: num(form.non_cash_liquidation_distributions),
      exempt_interest_dividends: num(form.exempt_interest_dividends),
      specified_private_activity_bond_interest_dividends: num(form.specified_private_activity_bond_interest_dividends),
      has_us_gov_interest: str(form.has_us_gov_interest),
      has_state_tax_withheld: str(form.has_state_tax_withheld),
      has_fatca: str(form.has_fatca),
    }

    setTaxData({
      ...taxData,
      form_1099s: [...forms, newForm],
    } as Parameters<typeof setTaxData>[0])

    setForm(EMPTY_FORM)
    setShowForm(false)
  }

  function handleRemove(index: number) {
    setTaxData({
      ...taxData,
      form_1099s: forms.filter((_, i) => i !== index),
    } as Parameters<typeof setTaxData>[0])
  }

  return (
    <div>
      <h2 className="text-[18px] font-bold text-ink mb-4">1099 Income</h2>

      {/* Gate question */}
      <div className="border border-hairline rounded-xl p-4 mb-4">
        <p className="text-[14px] font-medium text-ink mb-3">
          Did you receive any 1099 income in 2025?
          <span className="text-red-500 ml-0.5">*</span>
        </p>
        <div className="flex gap-2">
          {(['Yes', 'No'] as const).map((opt) => (
            <button
              key={opt}
              onClick={() => updateGate(has1099 === opt ? '' : opt)}
              className={clsx(
                'rounded-full px-4 py-1.5 text-[13px] font-medium transition-colors border cursor-pointer',
                has1099 === opt
                  ? 'bg-green text-white border-green'
                  : 'border-hairline text-muted hover:border-green hover:text-ink',
              )}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>

      {/* No 1099 income */}
      {has1099 === 'No' && (
        <div className="p-4 bg-green-pale border border-green rounded-xl">
          <p className="text-[13px] font-semibold text-green">No 1099 income to report.</p>
          <p className="text-[12px] text-ink mt-1">This section is complete.</p>
        </div>
      )}

      {/* Has 1099 income — show forms */}
      {has1099 === 'Yes' && (
        <>
          {forms.length === 0 && !showForm && (
            <p className="text-[13px] text-muted mb-4">No 1099s added yet.</p>
          )}

          {forms.map((f, i) => (
            <FormCard key={i} form={f} onRemove={() => handleRemove(i)} />
          ))}

          {showForm && (
            <div className="bg-cream-deep border border-green rounded-xl p-5 mb-3">
              <p className="text-[14px] font-semibold text-ink mb-4">New 1099</p>

              {/* Form type selector */}
              <div className="mb-4">
                <p className="text-[12px] text-muted mb-1.5">Form Type</p>
                <div className="flex flex-wrap gap-2">
                  {FORM_TYPES.map((t) => (
                    <button
                      key={t}
                      onClick={() => setForm((f) => ({ ...f, form_type: t }))}
                      className={`rounded-full px-3 py-1 text-[12px] font-mono font-medium border transition-colors cursor-pointer ${
                        form.form_type === t
                          ? 'bg-green text-white border-green'
                          : 'border-hairline text-muted hover:border-green'
                      }`}
                    >
                      1099-{t}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="col-span-2">
                  <p className="text-[12px] text-muted mb-0.5">
                    Payer Name<span className="text-red-500 ml-0.5">*</span>
                  </p>
                  <input
                    value={form.payer_name}
                    onChange={(e) => set('payer_name')(e.target.value)}
                    placeholder="Marcus Bank"
                    className="w-full border-b border-hairline focus:border-green outline-none bg-transparent py-1 text-[14px] text-ink transition-colors"
                  />
                </div>
                <div>
                  <p className="text-[12px] text-muted mb-0.5">Payer TIN</p>
                  <input
                    value={form.payer_tin}
                    onChange={(e) => set('payer_tin')(e.target.value)}
                    placeholder="12-3456789"
                    className="w-full border-b border-hairline focus:border-green outline-none bg-transparent py-1 text-[14px] font-mono text-ink transition-colors"
                  />
                </div>
                <div>
                  <p className="text-[12px] text-muted mb-0.5">Amount</p>
                  <input
                    value={form.amount}
                    onChange={(e) => set('amount')(e.target.value)}
                    placeholder="0.00"
                    className="w-full border-b border-hairline focus:border-green outline-none bg-transparent py-1 text-[14px] font-mono text-ink transition-colors"
                  />
                </div>
                <div>
                  <p className="text-[12px] text-muted mb-0.5">Federal Tax Withheld</p>
                  <input
                    value={form.federal_tax_withheld}
                    onChange={(e) => set('federal_tax_withheld')(e.target.value)}
                    placeholder="0.00"
                    className="w-full border-b border-hairline focus:border-green outline-none bg-transparent py-1 text-[14px] font-mono text-ink transition-colors"
                  />
                </div>
              </div>

              {/* 1099-DIV specific fields */}
              {form.form_type === 'DIV' && (
                <>
                  <p className="text-[12px] font-semibold uppercase tracking-widest text-muted mt-5 mb-3">Dividend Details</p>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-[12px] text-muted mb-0.5">Box 1a — Ordinary Dividends</p>
                      <input value={form.total_ordinary_dividends} onChange={(e) => set('total_ordinary_dividends')(e.target.value)} placeholder="0.00" className="w-full border-b border-hairline focus:border-green outline-none bg-transparent py-1 text-[14px] font-mono text-ink transition-colors" />
                    </div>
                    <div>
                      <p className="text-[12px] text-muted mb-0.5">Box 1b — Qualified Dividends</p>
                      <input value={form.qualified_dividends} onChange={(e) => set('qualified_dividends')(e.target.value)} placeholder="0.00" className="w-full border-b border-hairline focus:border-green outline-none bg-transparent py-1 text-[14px] font-mono text-ink transition-colors" />
                    </div>
                    <div>
                      <p className="text-[12px] text-muted mb-0.5">Box 2a — Total Capital Gain Distributions</p>
                      <input value={form.total_capital_gain_distributions} onChange={(e) => set('total_capital_gain_distributions')(e.target.value)} placeholder="0.00" className="w-full border-b border-hairline focus:border-green outline-none bg-transparent py-1 text-[14px] font-mono text-ink transition-colors" />
                    </div>
                    <div>
                      <p className="text-[12px] text-muted mb-0.5">Box 2b — Unrecap. Sec. 1250 Gain</p>
                      <input value={form.unrecap_sec_1250_gain} onChange={(e) => set('unrecap_sec_1250_gain')(e.target.value)} placeholder="0.00" className="w-full border-b border-hairline focus:border-green outline-none bg-transparent py-1 text-[14px] font-mono text-ink transition-colors" />
                    </div>
                    <div>
                      <p className="text-[12px] text-muted mb-0.5">Box 2d — Collectibles (28%) Gain</p>
                      <input value={form.collectibles_28pct_gain} onChange={(e) => set('collectibles_28pct_gain')(e.target.value)} placeholder="0.00" className="w-full border-b border-hairline focus:border-green outline-none bg-transparent py-1 text-[14px] font-mono text-ink transition-colors" />
                    </div>
                    <div>
                      <p className="text-[12px] text-muted mb-0.5">Box 3 — Nondividend Distributions</p>
                      <input value={form.nondividend_distributions} onChange={(e) => set('nondividend_distributions')(e.target.value)} placeholder="0.00" className="w-full border-b border-hairline focus:border-green outline-none bg-transparent py-1 text-[14px] font-mono text-ink transition-colors" />
                    </div>
                    <div>
                      <p className="text-[12px] text-muted mb-0.5">Box 5 — Section 199A Dividends</p>
                      <input value={form.section_199a_dividends} onChange={(e) => set('section_199a_dividends')(e.target.value)} placeholder="0.00" className="w-full border-b border-hairline focus:border-green outline-none bg-transparent py-1 text-[14px] font-mono text-ink transition-colors" />
                    </div>
                    <div>
                      <p className="text-[12px] text-muted mb-0.5">Box 6 — Investment Expenses</p>
                      <input value={form.investment_expenses} onChange={(e) => set('investment_expenses')(e.target.value)} placeholder="0.00" className="w-full border-b border-hairline focus:border-green outline-none bg-transparent py-1 text-[14px] font-mono text-ink transition-colors" />
                    </div>
                    <div>
                      <p className="text-[12px] text-muted mb-0.5">Box 7 — Foreign Tax Paid</p>
                      <input value={form.foreign_tax_paid} onChange={(e) => set('foreign_tax_paid')(e.target.value)} placeholder="0.00" className="w-full border-b border-hairline focus:border-green outline-none bg-transparent py-1 text-[14px] font-mono text-ink transition-colors" />
                    </div>
                    <div>
                      <p className="text-[12px] text-muted mb-0.5">Box 9 — Cash Liquidation Distributions</p>
                      <input value={form.cash_liquidation_distributions} onChange={(e) => set('cash_liquidation_distributions')(e.target.value)} placeholder="0.00" className="w-full border-b border-hairline focus:border-green outline-none bg-transparent py-1 text-[14px] font-mono text-ink transition-colors" />
                    </div>
                    <div>
                      <p className="text-[12px] text-muted mb-0.5">Box 10 — Noncash Liquidation Distributions</p>
                      <input value={form.non_cash_liquidation_distributions} onChange={(e) => set('non_cash_liquidation_distributions')(e.target.value)} placeholder="0.00" className="w-full border-b border-hairline focus:border-green outline-none bg-transparent py-1 text-[14px] font-mono text-ink transition-colors" />
                    </div>
                    <div>
                      <p className="text-[12px] text-muted mb-0.5">Box 12 — Exempt-Interest Dividends</p>
                      <input value={form.exempt_interest_dividends} onChange={(e) => set('exempt_interest_dividends')(e.target.value)} placeholder="0.00" className="w-full border-b border-hairline focus:border-green outline-none bg-transparent py-1 text-[14px] font-mono text-ink transition-colors" />
                    </div>
                    <div>
                      <p className="text-[12px] text-muted mb-0.5">Box 13 — Specified Priv. Activity Bond Interest</p>
                      <input value={form.specified_private_activity_bond_interest_dividends} onChange={(e) => set('specified_private_activity_bond_interest_dividends')(e.target.value)} placeholder="0.00" className="w-full border-b border-hairline focus:border-green outline-none bg-transparent py-1 text-[14px] font-mono text-ink transition-colors" />
                    </div>
                  </div>

                  <p className="text-[12px] font-semibold uppercase tracking-widest text-muted mt-3 mb-3">Additional Questions</p>
                  <div className="grid grid-cols-1 gap-4 mb-4">
                    <div>
                      <p className="text-[12px] text-muted mb-1.5">Box 11 — FATCA filing requirement?</p>
                      <div className="flex gap-2">
                        {['Yes', 'No'].map((opt) => (
                          <button key={opt} onClick={() => set('has_fatca')(form.has_fatca === opt ? '' : opt)}
                            className={`rounded-full px-3 py-1 text-[12px] font-medium border transition-colors cursor-pointer ${form.has_fatca === opt ? 'bg-green text-white border-green' : 'border-hairline text-muted hover:border-green'}`}>
                            {opt}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-[12px] text-muted mb-1.5">Do any of these dividends include U.S. government interest?</p>
                      <div className="flex gap-2">
                        {['Yes', 'No'].map((opt) => (
                          <button key={opt} onClick={() => set('has_us_gov_interest')(form.has_us_gov_interest === opt ? '' : opt)}
                            className={`rounded-full px-3 py-1 text-[12px] font-medium border transition-colors cursor-pointer ${form.has_us_gov_interest === opt ? 'bg-green text-white border-green' : 'border-hairline text-muted hover:border-green'}`}>
                            {opt}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-[12px] text-muted mb-1.5">Was state tax withheld on this 1099?</p>
                      <div className="flex gap-2">
                        {['Yes', 'No'].map((opt) => (
                          <button key={opt} onClick={() => set('has_state_tax_withheld')(form.has_state_tax_withheld === opt ? '' : opt)}
                            className={`rounded-full px-3 py-1 text-[12px] font-medium border transition-colors cursor-pointer ${form.has_state_tax_withheld === opt ? 'bg-green text-white border-green' : 'border-hairline text-muted hover:border-green'}`}>
                            {opt}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </>
              )}

              <div className="flex gap-3">
                <button
                  onClick={handleAdd}
                  disabled={!form.payer_name.trim()}
                  className="bg-green text-white text-[13px] font-semibold px-5 py-2 rounded-lg hover:bg-green-mid transition-colors disabled:opacity-40 cursor-pointer"
                >
                  Add 1099
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
            <div className="grid grid-cols-3 gap-3 mt-2">
              <button
                onClick={() => setShowForm(true)}
                className="flex items-center justify-center gap-2 border border-green rounded-lg px-3 py-2 text-[13px] font-medium text-green hover:bg-green hover:text-white transition-colors cursor-pointer"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="flex-shrink-0">
                  <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
                </svg>
                Add Manually
              </button>
              <button
                onClick={handleUpload1099}
                disabled={uploading || !userId}
                className="flex items-center justify-center gap-2 border border-green rounded-lg px-3 py-2 text-[13px] font-medium text-green hover:bg-green hover:text-white transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {uploading ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Parsing...
                  </>
                ) : (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="flex-shrink-0">
                      <path d="M12 8V20M12 8l-4 4M12 8l4 4M4 4h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Upload PDF
                  </>
                )}
              </button>
              <button
                onClick={handleImportFidelity}
                disabled={importing || !userId}
                className="flex items-center justify-center gap-2 border border-green rounded-lg px-3 py-2 text-[13px] font-medium text-green hover:bg-green hover:text-white transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {importing ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Importing...
                  </>
                ) : (
                  <>
                    <img src="/fidelity.png" alt="Fidelity" width={16} height={16} className="rounded-full" />
                    Import from Fidelity
                  </>
                )}
              </button>
              <button
                disabled
                className="flex items-center justify-center gap-2 border border-hairline rounded-lg px-3 py-2 text-[13px] font-medium text-muted opacity-50 cursor-not-allowed"
                title="Coming soon"
              >
                <img src="/robinhood.png" alt="Robinhood" width={16} height={16} className="rounded-full" />
                Import from Robinhood
              </button>
              <button
                disabled
                className="flex items-center justify-center gap-2 border border-hairline rounded-lg px-3 py-2 text-[13px] font-medium text-muted opacity-50 cursor-not-allowed"
                title="Coming soon"
              >
                <img src="/schwab.jpeg" alt="Charles Schwab" width={16} height={16} className="rounded-full" />
                Import from Schwab
              </button>
              <button
                disabled
                className="flex items-center justify-center gap-2 border border-hairline rounded-lg px-3 py-2 text-[13px] font-medium text-muted opacity-50 cursor-not-allowed"
                title="Coming soon"
              >
                <img src="/vanguard.png" alt="Vanguard" width={16} height={16} className="rounded-full" />
                Import from Vanguard
              </button>
            </div>
          )}
          {importError && (
            <p className="text-[12px] text-red mt-2">{importError}</p>
          )}
        </>
      )}
    </div>
  )
}
