'use client'

import { useStore } from '@/store'

// Personal
import { PersonalSection } from './PersonalSection'
import { FilingStatusSection } from './FilingStatusSection'
import { DependentsSection } from './DependentsSection'
import { IdentityProtectionSection } from './IdentityProtectionSection'

// Income
import { W2Section } from './W2Section'
import { Form1099Section } from './Form1099Section'
import { OtherIncomeSection } from './OtherIncomeSection'

// Deductions & Credits
import { DeductionsSection } from './DeductionsSection'
import { HealthInsuranceSection } from './HealthInsuranceSection'
import { CommonCreditsSection } from './CommonCreditsSection'
import { OtherCreditsSection } from './OtherCreditsSection'

// Miscellaneous
import { MiscSection } from './MiscSection'
import { RefundMaximizerSection } from './RefundMaximizerSection'

// Summary
import { FederalSummarySection } from './FederalSummarySection'
import { BankSection } from './BankSection'
import { ReviewSection } from './ReviewSection'

// State
import { StateResidencySection } from './StateResidencySection'
import { StateReturnSection } from './StateReturnSection'

export function SectionContent() {
  const activeSection = useStore((s) => s.activeSection)

  switch (activeSection) {
    // Personal
    case 'personal-info':         return <PersonalSection />
    case 'filing-status':         return <FilingStatusSection />
    case 'dependents':            return <DependentsSection />
    case 'identity-protection':   return <IdentityProtectionSection />

    // Income
    case 'w2-income':             return <W2Section />
    case '1099-income':           return <Form1099Section />
    case 'other-income':          return <OtherIncomeSection />

    // Deductions & Credits
    case 'deductions':            return <DeductionsSection />
    case 'health-insurance':      return <HealthInsuranceSection />
    case 'common-credits':        return <CommonCreditsSection />
    case 'other-credits':         return <OtherCreditsSection />

    // Miscellaneous
    case 'misc-forms':            return <MiscSection />
    case 'refund-maximizer':      return <RefundMaximizerSection />

    // Summary
    case 'federal-summary':       return <FederalSummarySection />
    case 'bank-refund':           return <BankSection />
    case 'review':                return <ReviewSection />

    // State
    case 'state-residency':       return <StateResidencySection />
    case 'state-return':          return <StateReturnSection />

    // Legacy keys (backward compat)
    case 'Personal Information':  return <PersonalSection />
    case 'Filing Status':         return <FilingStatusSection />
    case 'W-2 Income':            return <W2Section />
    case '1099 Income':           return <Form1099Section />
    case 'Deductions':            return <DeductionsSection />
    case 'Credits':               return <CommonCreditsSection />
    case 'Bank Info':             return <BankSection />
    case 'Review':                return <ReviewSection />

    default:                      return <PersonalSection />
  }
}
