import type { TaxData } from './types'

export interface MissingField {
  section: string
  label: string
}

export function getMissingFields(taxData: TaxData | null): MissingField[] {
  const missing: MissingField[] = []

  const tr = taxData?.tax_return ?? {}
  const w2s = taxData?.w2_forms ?? []
  const oi = taxData?.other_income ?? {}
  const ded = taxData?.deductions ?? {}
  const cred = taxData?.credits ?? {}
  const misc = taxData?.misc_info ?? {}
  const si = taxData?.state_info ?? {}

  // personal-info
  if (!tr.first_name) missing.push({ section: 'Personal Info', label: 'First Name' })
  if (!tr.last_name) missing.push({ section: 'Personal Info', label: 'Last Name' })
  if (!tr.ssn) missing.push({ section: 'Personal Info', label: 'Social Security Number' })
  if (!tr.date_of_birth) missing.push({ section: 'Personal Info', label: 'Date of Birth' })
  if (!tr.address) missing.push({ section: 'Personal Info', label: 'Street Address' })
  if (!tr.city) missing.push({ section: 'Personal Info', label: 'City' })
  if (!tr.state) missing.push({ section: 'Personal Info', label: 'State' })
  if (!tr.zip_code) missing.push({ section: 'Personal Info', label: 'ZIP Code' })
  if (!tr.claimed_as_dependent) missing.push({ section: 'Personal Info', label: 'Claimed as dependent answer' })
  if (!tr.nonresident_alien) missing.push({ section: 'Personal Info', label: 'Nonresident Alien answer' })

  // filing-status
  if (!tr.filing_status) missing.push({ section: 'Filing Status', label: 'Filing Status' })
  if (tr.filing_status === 'Married Filing Jointly') {
    if (!tr.spouse_first_name) missing.push({ section: 'Filing Status', label: 'Spouse First Name' })
    if (!tr.spouse_last_name) missing.push({ section: 'Filing Status', label: 'Spouse Last Name' })
    if (!tr.spouse_ssn) missing.push({ section: 'Filing Status', label: 'Spouse SSN' })
  }

  // identity-protection
  if (!tr.identity_protection_pin) {
    missing.push({ section: 'Identity Protection', label: 'IP PIN answer required' })
  } else if (tr.identity_protection_pin === 'Yes' && !tr.identity_protection_pin_number) {
    missing.push({ section: 'Identity Protection', label: 'IP PIN number (6-digit)' })
  }

  // w2-income
  if (w2s.length === 0) {
    missing.push({ section: 'W-2 Income', label: 'At least one W-2 required' })
  } else {
    w2s.forEach((w, i) => {
      if (!w.employer_name) missing.push({ section: 'W-2 Income', label: `W-2 #${i + 1}: Employer Name` })
      if (w.wages == null) missing.push({ section: 'W-2 Income', label: `W-2 #${i + 1}: Wages` })
    })
  }

  // 1099-income
  if (!oi.has_1099_income) {
    missing.push({ section: '1099 Income', label: 'Answer required: Did you have 1099 income?' })
  } else if (oi.has_1099_income === 'Yes') {
    const forms = taxData?.form_1099s ?? []
    if (forms.length === 0) {
      missing.push({ section: '1099 Income', label: 'Add at least one 1099 form' })
    } else {
      forms.forEach((f, i) => {
        if (!f.payer_name) missing.push({ section: '1099 Income', label: `1099 #${i + 1}: Payer Name` })
      })
    }
  }

  // other-income
  if (!oi.has_cryptocurrency) {
    missing.push({ section: 'Other Income', label: 'Answer required: Cryptocurrency question' })
  }

  // deductions
  if (!ded.has_itemized_deductions) {
    missing.push({ section: 'Deductions', label: 'Answer required: Do you have itemized deductions?' })
  } else if (ded.has_itemized_deductions === 'Yes') {
    const anyToggled = [
      ded.has_homeowner, ded.has_donations, ded.has_medical, ded.has_taxes_paid,
      ded.has_investment_interest, ded.has_casualty, ded.has_other_itemized,
    ].some((v) => v === true)
    if (!anyToggled) {
      missing.push({ section: 'Deductions', label: 'Select at least one deduction category' })
    }
  }

  // health-insurance
  if (!cred.has_marketplace_insurance) {
    missing.push({ section: 'Health Insurance', label: 'Answer required: Marketplace insurance question' })
  }

  // refund-maximizer
  if (!misc.refund_maximizer) {
    missing.push({ section: 'Refund Maximizer', label: 'Select an option' })
  }

  // bank-refund
  if (!tr.refund_type) {
    missing.push({ section: 'Bank & Refund', label: 'Select refund delivery method' })
  }

  // state-residency — skip for no-income-tax states (TX, FL, etc.)
  const NO_INCOME_TAX = new Set(['AK','FL','NV','NH','SD','TN','TX','WY','WA'])
  if (tr.state && !NO_INCOME_TAX.has(tr.state) && !si.is_state_resident) {
    missing.push({ section: 'State Residency', label: 'Answer required: State residency question' })
  }

  return missing
}
