'use client'

import { useState } from 'react'
import { clsx } from 'clsx'
import { useStore } from '@/store'
import type { Dependent, TaxData } from '@/lib/types'

const EMPTY_DEP: Dependent = {
  first_name: '',
  last_name: '',
  ssn: '',
  date_of_birth: '',
  relationship: '',
  months_lived: 12,
}

const RELATIONSHIPS = [
  'Son', 'Daughter', 'Stepchild', 'Foster Child',
  'Sibling', 'Grandchild', 'Niece/Nephew', 'Parent', 'Other',
]

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
    <div className="border border-hairline rounded-xl mb-2 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3">
        <button
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-2 text-left flex-1 cursor-pointer"
        >
          <span className="text-[14px] font-semibold text-ink">
            {dep.first_name && dep.last_name
              ? `${dep.first_name} ${dep.last_name}`
              : dep.first_name || 'New Dependent'}
          </span>
          {dep.relationship && (
            <span className="text-[12px] text-muted">{dep.relationship}</span>
          )}
          <span className="ml-auto text-[11px] text-muted">{open ? '▲' : '▼'}</span>
        </button>
        <button
          onClick={onRemove}
          className="text-[12px] text-muted hover:text-red transition-colors ml-4 cursor-pointer"
        >
          Remove
        </button>
      </div>

      {open && (
        <div className="border-t border-hairline px-4 pb-4 pt-4 bg-cream">
          <div className="grid grid-cols-2 gap-x-4 gap-y-3">
            <div>
              <p className="text-[11px] text-muted mb-0.5">First Name</p>
              <input
                value={dep.first_name ?? ''}
                onChange={(e) => onChange({ ...dep, first_name: e.target.value })}
                placeholder="Jane"
                className="w-full border-b border-hairline focus:border-green outline-none bg-transparent py-1 text-[13px] text-ink transition-colors"
              />
            </div>
            <div>
              <p className="text-[11px] text-muted mb-0.5">Last Name</p>
              <input
                value={dep.last_name ?? ''}
                onChange={(e) => onChange({ ...dep, last_name: e.target.value })}
                placeholder="Smith"
                className="w-full border-b border-hairline focus:border-green outline-none bg-transparent py-1 text-[13px] text-ink transition-colors"
              />
            </div>
            <div>
              <p className="text-[11px] text-muted mb-0.5">Date of Birth</p>
              <input
                value={dep.date_of_birth ?? ''}
                onChange={(e) => onChange({ ...dep, date_of_birth: e.target.value })}
                placeholder="YYYY-MM-DD"
                className="w-full border-b border-hairline focus:border-green outline-none bg-transparent py-1 text-[13px] font-mono text-ink transition-colors"
              />
            </div>
            <div>
              <p className="text-[11px] text-muted mb-0.5">SSN (last 4 or full)</p>
              <input
                value={dep.ssn ?? ''}
                onChange={(e) => onChange({ ...dep, ssn: e.target.value })}
                placeholder="XXX-XX-XXXX"
                className="w-full border-b border-hairline focus:border-green outline-none bg-transparent py-1 text-[13px] font-mono text-ink transition-colors"
              />
            </div>
            <div className="col-span-2">
              <p className="text-[11px] text-muted mb-1">Relationship</p>
              <div className="flex flex-wrap gap-1.5">
                {RELATIONSHIPS.map((r) => (
                  <button
                    key={r}
                    onClick={() => onChange({ ...dep, relationship: r })}
                    className={`px-2.5 py-0.5 text-[11px] rounded-full border transition-colors cursor-pointer ${
                      dep.relationship === r
                        ? 'bg-green text-white border-green'
                        : 'border-hairline text-muted hover:border-green hover:text-ink'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[11px] text-muted mb-0.5">Months Lived With You</p>
              <input
                type="number"
                min={1}
                max={12}
                value={dep.months_lived ?? 12}
                onChange={(e) =>
                  onChange({ ...dep, months_lived: parseInt(e.target.value) || 12 })
                }
                className="w-24 border-b border-hairline focus:border-green outline-none bg-transparent py-1 text-[13px] font-mono text-ink transition-colors"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export function DependentsSection() {
  const taxData = useStore((s) => s.taxData)
  const setTaxData = useStore((s) => s.setTaxData)

  const misc = taxData?.misc_info ?? {}
  const hasDependents = misc.has_dependents ?? ''
  const dependents: Dependent[] = (taxData?.dependents as Dependent[]) ?? []

  function setGate(val: string) {
    setTaxData({
      ...taxData,
      misc_info: { ...misc, has_dependents: hasDependents === val ? '' : val },
    } as TaxData)
  }

  function update(deps: Dependent[]) {
    setTaxData({ ...taxData, dependents: deps } as TaxData)
  }

  return (
    <div>
      <h2 className="text-[18px] font-bold text-ink mb-1">Dependents</h2>
      <p className="text-[13px] text-muted mb-5">
        Add qualifying children or other relatives you can claim as dependents on your 2025 return.
      </p>

      {/* Gate question */}
      <div className="border border-hairline rounded-xl p-4 mb-4">
        <p className="text-[14px] font-semibold text-ink mb-1">
          Do you have any dependents to claim on your 2025 return?<span className="text-red-500 ml-0.5">*</span>
        </p>
        <p className="text-[12px] text-muted mb-4 leading-relaxed">
          Dependents include qualifying children (under 19, or under 24 if a full-time student)
          and other qualifying relatives you financially support.
        </p>
        <div className="flex gap-2">
          {(['Yes', 'No'] as const).map((opt) => (
            <button
              key={opt}
              onClick={() => setGate(opt)}
              className={clsx(
                'rounded-full px-4 py-1.5 text-[13px] font-medium transition-colors border cursor-pointer',
                hasDependents === opt
                  ? 'bg-green text-white border-green'
                  : 'border-hairline text-muted hover:border-green hover:text-ink',
              )}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>

      {hasDependents === 'No' && (
        <div className="p-4 bg-amber-pale border border-amber rounded-xl">
          <p className="text-[13px] font-semibold text-amber mb-1">No dependents on your return</p>
          <p className="text-[12px] text-ink leading-relaxed">
            You will not claim any dependents. If your situation changes, you can update this answer.
          </p>
        </div>
      )}

      {hasDependents === 'Yes' && (
        <>
          {dependents.length === 0 ? (
            <div className="text-center py-10 border border-dashed border-hairline rounded-xl text-muted text-[13px]">
              No dependents added yet
            </div>
          ) : (
            dependents.map((dep, i) => (
              <DepRow
                key={i}
                dep={dep}
                onChange={(d) => update(dependents.map((x, j) => (j === i ? d : x)))}
                onRemove={() => update(dependents.filter((_, j) => j !== i))}
              />
            ))
          )}

          <button
            onClick={() => update([...dependents, { ...EMPTY_DEP }])}
            className="mt-4 text-green text-[14px] font-semibold cursor-pointer hover:text-green-mid transition-colors"
          >
            + Add Dependent
          </button>
        </>
      )}
    </div>
  )
}
