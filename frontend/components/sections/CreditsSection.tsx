'use client'

import { useState } from 'react'
import { useStore } from '@/store'

interface CreditCardProps {
  title: string
  description: string
  value: number | undefined
  fieldKey: string
}

function CreditCard({ title, description, value }: CreditCardProps) {
  const [editing, setEditing] = useState(false)
  const [localVal, setLocalVal] = useState(String(value ?? ''))

  return (
    <div className="bg-white border border-hairline rounded-xl p-5 mb-3">
      <p className="text-[15px] font-bold text-ink">{title}</p>
      <p className="text-[13px] text-muted mt-1 mb-3">{description}</p>
      {editing ? (
        <input
          autoFocus
          value={localVal}
          onChange={(e) => setLocalVal(e.target.value)}
          onBlur={() => setEditing(false)}
          placeholder="0.00"
          className="text-[14px] font-mono border-b-2 border-green outline-none bg-transparent w-full"
        />
      ) : (
        <p
          className="font-mono text-[14px] text-ink cursor-pointer hover:text-green transition-colors"
          onClick={() => setEditing(true)}
        >
          {localVal ? `$${parseFloat(localVal).toFixed(2)}` : 'Click to enter amount'}
        </p>
      )}
    </div>
  )
}

export function CreditsSection() {
  const taxData = useStore((s) => s.taxData)
  const cred = taxData?.credits ?? {}

  return (
    <div>
      <h2 className="text-[18px] font-bold text-ink mb-4">Tax Credits</h2>
      <CreditCard
        title="Child Tax Credit"
        description="Up to $2,000 per qualifying child under age 17."
        value={cred.child_tax_credit as number | undefined}
        fieldKey="child_tax_credit"
      />
      <CreditCard
        title="Earned Income Credit"
        description="A benefit for working people with low to moderate income."
        value={cred.earned_income_credit as number | undefined}
        fieldKey="earned_income_credit"
      />
      <CreditCard
        title="Education Credit"
        description="American Opportunity or Lifetime Learning credit for education expenses."
        value={cred.education_credit as number | undefined}
        fieldKey="education_credit"
      />
    </div>
  )
}
