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
  placeholder?: string
}

function FieldRow({ label, value, mono, placeholder = '—' }: FieldRowProps) {
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
        className={`text-[14px] border-b-2 outline-none bg-transparent w-full transition-colors ${mono ? 'font-mono' : ''} ${editing ? 'border-green text-ink' : 'border-transparent cursor-pointer hover:text-green'} ${!editing && !localVal ? 'text-muted' : 'text-ink'}`}
      />
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
            <FieldRow label="First Name" value={tr.first_name ?? ''} placeholder="John" />
            <FieldRow label="Last Name" value={tr.last_name ?? ''} placeholder="Doe" />
            <FieldRow label="Email" value={userEmail} placeholder="you@example.com" />
            <FieldRow label="Date of Birth" value={tr.date_of_birth ?? ''} mono placeholder="YYYY-MM-DD" />
            <FieldRow label="Occupation" value={tr.occupation ?? ''} placeholder="Software Engineer" />
            <FieldRow label="Street Address" value={tr.address ?? ''} placeholder="123 Main St" />
            <FieldRow label="City" value={tr.city ?? ''} placeholder="New York" />
            <FieldRow label="State" value={tr.state ?? ''} placeholder="NY" />
            <FieldRow label="ZIP Code" value={tr.zip_code ?? ''} mono placeholder="10001" />
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
                    'rounded-full px-3 py-1.5 text-[13px] font-medium transition-colors border cursor-pointer',
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
              <FieldRow label="CPA / Accountant Email (optional)" value="" placeholder="cpa@example.com" />
            </div>
          </div>
        </section>

        {/* Security */}
        <section className="mb-8">
          <h2 className="text-[11px] uppercase tracking-widest text-muted font-semibold mb-3">
            Security
          </h2>
          <div className="bg-white border border-hairline rounded-xl px-5">
            <FieldRow label="Email" value={userEmail} placeholder="you@example.com" />
            <div className="py-3 border-b border-hairline">
              <button className="text-[14px] text-ink hover:text-green transition-colors cursor-pointer">
                Change password →
              </button>
            </div>
            <div className="py-4">
              <button className="text-[12px] text-red cursor-pointer hover:opacity-80 transition-opacity">Delete all my data</button>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
