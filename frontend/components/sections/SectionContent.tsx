'use client'

import { useShallow } from 'zustand/react/shallow'
import { useStore } from '@/store'
import { TAX_SECTIONS, SECTION_GROUPS } from '@/lib/types'
import { isSectionComplete } from '@/lib/sectionUtils'

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

const allSubsections = SECTION_GROUPS.flatMap((g) => g.subsections)

export function SectionContent() {
  const { activeSection, taxData, visitedSections, setActiveSection } = useStore(
    useShallow((s) => ({
      activeSection: s.activeSection,
      taxData: s.taxData,
      visitedSections: s.visitedSections,
      setActiveSection: s.setActiveSection,
    })),
  )

  const currentIdx = TAX_SECTIONS.indexOf(activeSection)
  const nextKey =
    currentIdx >= 0 && currentIdx < TAX_SECTIONS.length - 1
      ? TAX_SECTIONS[currentIdx + 1]
      : null
  const nextLabel = allSubsections.find((s) => s.key === nextKey)?.label
  const isComplete = isSectionComplete(
    activeSection,
    taxData,
    visitedSections.includes(activeSection),
  )

  function renderSection() {
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

  return (
    <div>
      {renderSection()}
      {isComplete && nextKey && (
        <div className="flex justify-end mt-8 pb-2">
          <button
            onClick={() => setActiveSection(nextKey)}
            className="bg-green text-white text-[13px] font-semibold px-5 py-2.5 rounded-xl hover:opacity-90 transition-opacity cursor-pointer flex items-center gap-2"
          >
            {nextLabel ?? 'Next'} <span aria-hidden>→</span>
          </button>
        </div>
      )}
    </div>
  )
}
