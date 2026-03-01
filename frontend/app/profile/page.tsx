'use client'

import { useState } from 'react'
import { clsx } from 'clsx'
import { useShallow } from 'zustand/react/shallow'
import { useStore } from '@/store'
import { TopNav } from '@/components/layout/TopNav'

interface FieldRowProps {
  label: string
  value: string
  mono?: boolean
}

function FieldRow({ label, value, mono }: FieldRowProps) {
  const [editing, setEditing] = useState(false)
  const [localVal, setLocalVal] = useState(value)

  return (
    <div className="border-b border-hairline py-3">
      <p className="text-[12px] text-muted mb-0.5">{label}</p>
      {editing ? (
        <input
          autoFocus
          value={localVal}
          onChange={(e) => setLocalVal(e.target.value)}
          onBlur={() => setEditing(false)}
          className={`text-[14px] border-b-2 border-green outline-none bg-transparent w-full ${mono ? 'font-mono' : ''}`}
        />
      ) : (
        <p
          className={`text-[14px] text-ink cursor-pointer hover:text-green transition-colors ${mono ? 'font-mono' : ''}`}
          onClick={() => setEditing(true)}
        >
          {localVal || '—'}
        </p>
      )}
    </div>
  )
}

const FILING_STATUSES = ['Single', 'Married Filing Jointly', 'Married Filing Separately', 'Head of Household']

export default function ProfilePage() {
  const { userEmail, taxData } = useStore(
    useShallow((s) => ({
      userEmail: s.userEmail,
      taxData: s.taxData,
    }))
  )
  const tr = taxData?.tax_return ?? {}

  const [filingStatus, setFilingStatus] = useState(tr.filing_status ?? 'Single')

  return (
    <div className="flex flex-col min-h-screen bg-cream">
      <TopNav />
      <main className="pt-14 max-w-2xl mx-auto w-full px-6 py-8">
        <h1 className="text-[24px] font-extrabold text-ink mb-8">Profile</h1>

        {/* Personal Information */}
        <section className="mb-8">
          <h2 className="text-[11px] uppercase tracking-widest text-muted font-semibold mb-3">
            Personal Information
          </h2>
          <div className="bg-white border border-hairline rounded-xl px-5">
            <FieldRow label="First Name" value={tr.first_name ?? ''} />
            <FieldRow label="Last Name" value={tr.last_name ?? ''} />
            <FieldRow label="Email" value={userEmail} />
            <FieldRow label="Date of Birth" value={tr.date_of_birth ?? ''} mono />
            <FieldRow label="Occupation" value={tr.occupation ?? ''} />
            <FieldRow label="Street Address" value={tr.address ?? ''} />
            <FieldRow label="City" value={tr.city ?? ''} />
            <FieldRow label="State" value={tr.state ?? ''} />
            <FieldRow label="ZIP Code" value={tr.zip_code ?? ''} mono />
          </div>
        </section>

        {/* Filing Preferences */}
        <section className="mb-8">
          <h2 className="text-[11px] uppercase tracking-widest text-muted font-semibold mb-3">
            Filing Preferences
          </h2>
          <div className="bg-white border border-hairline rounded-xl px-5 py-4">
            <p className="text-[12px] text-muted mb-2">Filing Status</p>
            <div className="flex flex-wrap gap-2 mb-4">
              {FILING_STATUSES.map((s) => (
                <button
                  key={s}
                  onClick={() => setFilingStatus(s)}
                  className={clsx(
                    'rounded-full px-3 py-1.5 text-[13px] font-medium transition-colors border',
                    filingStatus === s
                      ? 'bg-green text-white border-green'
                      : 'border-hairline text-muted hover:border-green'
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
            <div className="border-t border-hairline pt-4">
              <FieldRow label="CPA / Accountant Email (optional)" value="" />
            </div>
          </div>
        </section>

        {/* Security */}
        <section className="mb-8">
          <h2 className="text-[11px] uppercase tracking-widest text-muted font-semibold mb-3">
            Security
          </h2>
          <div className="bg-white border border-hairline rounded-xl px-5">
            <FieldRow label="Email" value={userEmail} />
            <div className="py-3 border-b border-hairline">
              <button className="text-[14px] text-ink hover:text-green transition-colors">
                Change password →
              </button>
            </div>
            <div className="py-4">
              <button className="text-[12px] text-red">Delete all my data</button>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
