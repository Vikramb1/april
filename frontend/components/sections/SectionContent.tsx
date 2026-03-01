'use client'

import { useStore } from '@/store'
import { PersonalSection } from './PersonalSection'
import { FilingStatusSection } from './FilingStatusSection'
import { W2Section } from './W2Section'
import { Form1099Section } from './Form1099Section'
import { DeductionsSection } from './DeductionsSection'
import { CreditsSection } from './CreditsSection'
import { BankSection } from './BankSection'
import { ReviewSection } from './ReviewSection'

export function SectionContent() {
  const activeSection = useStore((s) => s.activeSection)

  switch (activeSection) {
    case 'Personal Information': return <PersonalSection />
    case 'Filing Status':        return <FilingStatusSection />
    case 'W-2 Income':           return <W2Section />
    case '1099 Income':          return <Form1099Section />
    case 'Deductions':           return <DeductionsSection />
    case 'Credits':              return <CreditsSection />
    case 'Bank Info':            return <BankSection />
    case 'Review':               return <ReviewSection />
    default:                     return <PersonalSection />
  }
}
