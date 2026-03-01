import type { TaxData } from './types'

// Optional sections are "complete" simply by being visited (nothing required)
export const OPTIONAL_SECTIONS = new Set([
  'common-credits', 'other-credits', 'federal-summary',
])

// All required data present → green (mirrors Sidebar completion logic)
export function isSectionComplete(key: string, taxData: TaxData | null, visited: boolean): boolean {
  if (OPTIONAL_SECTIONS.has(key)) return visited
  if (!taxData) return false
  const tr = taxData.tax_return ?? {}
  const w2s = taxData.w2_forms ?? []
  const cred = taxData.credits ?? {}
  const ded = taxData.deductions ?? {}
  const oi = taxData.other_income ?? {}
  const misc = taxData.misc_info ?? {}
  const si = taxData.state_info ?? {}

  switch (key) {
    case 'personal-info':
      return !!(tr.first_name && tr.last_name && tr.ssn && tr.date_of_birth &&
                tr.address && tr.city && tr.state && tr.zip_code &&
                tr.claimed_as_dependent && tr.blind && tr.deceased && tr.nonresident_alien)
    case 'filing-status': {
      if (!tr.filing_status) return false
      if (tr.filing_status === 'Married Filing Jointly') {
        return !!(tr.spouse_first_name && tr.spouse_last_name && tr.spouse_ssn)
      }
      return true
    }
    case 'dependents': {
      const hasDep = taxData?.misc_info?.has_dependents
      if (!hasDep) return false
      if (hasDep === 'No') return true
      const deps = taxData?.dependents ?? []
      return deps.length > 0 && deps.every((d) => !!d.first_name && !!d.last_name)
    }
    case 'identity-protection':
      if (!tr.identity_protection_pin) return false
      if (tr.identity_protection_pin === 'Yes') return !!tr.identity_protection_pin_number
      return true
    case 'w2-income':
      return w2s.length > 0 && w2s.every((w) => !!(w.employer_name && w.wages != null))
    case '1099-income': {
      if (oi.has_1099_income === 'No') return true
      if (oi.has_1099_income !== 'Yes') return false
      const forms = taxData?.form_1099s ?? []
      return forms.length > 0 && forms.every((f) => !!f.payer_name)
    }
    case 'other-income':
      return !!oi.has_cryptocurrency
    case 'deductions': {
      if (ded.has_itemized_deductions === 'No') return true
      if (ded.has_itemized_deductions !== 'Yes') return false
      return [ded.has_homeowner, ded.has_donations, ded.has_medical, ded.has_taxes_paid,
              ded.has_investment_interest, ded.has_casualty, ded.has_other_itemized]
        .some((v) => v === true)
    }
    case 'misc-forms': {
      const mi = taxData?.misc_info ?? {}
      return mi.has_foreign_accounts !== undefined && mi.has_foreign_assets !== undefined
    }
    case 'health-insurance':
      return !!cred.has_marketplace_insurance
    case 'refund-maximizer':
      return !!misc.refund_maximizer
    case 'bank-refund':
      return !!tr.refund_type
    case 'review':
      return false
    case 'state-residency':
      return !!si.is_state_resident
    case 'state-return':
      return !!si.is_state_resident
    default:
      return false
  }
}
