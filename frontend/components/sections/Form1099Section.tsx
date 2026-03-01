'use client'

import { useState } from 'react'
import { clsx } from 'clsx'
import { useShallow } from 'zustand/react/shallow'
import { useStore } from '@/store'
import type { OtherIncome, TaxData } from '@/lib/types'

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

function FormCard({ form, onRemove }: FormCardProps) {
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
      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-[12px] text-muted">Amount</p>
          <p className="font-mono text-[14px] text-ink">{formatMoney(form.amount as number | undefined)}</p>
        </div>
        {form.federal_tax_withheld != null && (
          <div>
            <p className="text-[12px] text-muted">Federal Tax Withheld</p>
            <p className="font-mono text-[14px] text-ink">{formatMoney(form.federal_tax_withheld as number | undefined)}</p>
          </div>
        )}
      </div>
    </div>
  )
}

const EMPTY_FORM = {
  form_type: 'NEC',
  payer_name: '',
  payer_tin: '',
  amount: '',
  federal_tax_withheld: '',
}

export function Form1099Section() {
  const { taxData, setTaxData } = useStore(
    useShallow((s) => ({ taxData: s.taxData, setTaxData: s.setTaxData }))
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

  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)

  function set(key: keyof typeof EMPTY_FORM) {
    return (v: string) => setForm((f) => ({ ...f, [key]: v }))
  }

  function handleAdd() {
    if (!form.payer_name.trim()) return

    const num = (s: string) => (s.trim() === '' ? undefined : parseFloat(s.replace(/,/g, '')))

    const newForm: Form1099Record = {
      form_type: form.form_type,
      payer_name: form.payer_name.trim(),
      payer_tin: form.payer_tin.trim() || undefined,
      amount: num(form.amount),
      federal_tax_withheld: num(form.federal_tax_withheld),
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
            <button
              onClick={() => setShowForm(true)}
              className="text-green text-[14px] font-medium cursor-pointer mt-2 hover:text-green-mid transition-colors"
            >
              + Add {forms.length > 0 ? 'Another' : 'a'} 1099
            </button>
          )}
        </>
      )}
    </div>
  )
}
