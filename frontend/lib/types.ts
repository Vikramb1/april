export type Phase = 'collecting' | 'reviewing' | 'filing' | 'filed'

export type SectionStatus = 'pending' | 'in_progress' | 'complete'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
}

export interface W2Form {
  id?: number
  // Employer Info
  employer_name?: string
  ein?: string
  employer_address?: string
  employer_city?: string
  employer_state?: string
  employer_zip?: string
  employer_address_type?: string
  // Employee Info
  employee_name?: string
  employee_address?: string
  employee_city?: string
  employee_state?: string
  employee_zip?: string
  employee_address_type?: string
  // Boxes 1-11
  wages?: number
  federal_tax_withheld?: number
  social_security_wages?: number
  social_security_tax_withheld?: number
  medicare_wages?: number
  medicare_tax_withheld?: number
  social_security_tips?: number
  allocated_tips?: number
  dependent_care_benefits?: number
  nonqualified_plans?: number
  // Box 12
  box12_code1?: string
  box12_amount1?: number
  box12_code2?: string
  box12_amount2?: number
  // Box 13
  statutory_employee?: boolean
  retirement_plan?: boolean
  third_party_sick_pay?: boolean
  // Box 14-20
  box14_other?: string
  state?: string
  state_wages?: number
  state_tax_withheld?: number
  local_wages?: number
  local_tax?: number
  local_tax_state?: string
  locality_name?: string
  // W-2 Details
  w2_type?: string
  is_corrected?: string
  has_tip_income?: string
  has_overtime?: string
}

export interface Form1099 {
  id?: number
  form_type?: string
  payer_name?: string
  amount?: number
}

export interface TaxReturn {
  id?: number
  first_name?: string
  middle_initial?: string
  last_name?: string
  suffix?: string
  ssn?: string
  date_of_birth?: string
  occupation?: string
  address?: string
  apt?: string
  city?: string
  state?: string
  zip_code?: string
  zip_plus_4?: string
  addr_changed?: boolean
  filing_status?: string
  claimed_as_dependent?: string
  presidential_fund?: string
  blind?: string
  deceased?: string
  nonresident_alien?: string
  identity_protection_pin?: string
  identity_protection_pin_number?: string
  // Spouse (Married Filing Jointly)
  spouse_first_name?: string
  spouse_last_name?: string
  spouse_ssn?: string
  spouse_dob?: string
  // Bank & Refund Info (pages 35-36)
  refund_type?: string           // 'direct_deposit' | 'go2bank' | 'paper_check'
  is_multiple_deposit?: string   // 'Yes' | 'No'
  bank_account_nickname?: string
  bank_routing_number?: string
  bank_account_number?: string
  bank_account_type?: string
  bank_is_foreign?: boolean
  // Review (page 38)
  phone_option?: string          // phone number string, 'other', or 'none'
  refund_amount?: number
  tax_owed?: number
}

export interface Deductions {
  // Gate question
  has_itemized_deductions?: string   // 'Yes' | 'No'
  // Standard vs itemized helper
  standard_deduction?: number
  itemized_deduction?: number
  // Page 16 — category flags
  has_homeowner?: boolean
  has_donations?: boolean
  has_medical?: boolean
  has_taxes_paid?: boolean
  has_investment_interest?: boolean
  has_casualty?: boolean
  has_other_itemized?: boolean
  // Homeowner
  mortgage_interest?: number
  property_taxes?: number
  // Donations
  charitable_donations?: number  // kept for backward compat
  cash_donations?: number
  noncash_donations?: number
  // Medical
  medical_expenses?: number
  // Taxes paid
  state_local_income_tax?: number
  state_local_sales_tax?: number
  state_local_taxes?: number     // kept for backward compat
  // Investment interest
  investment_interest?: number
  // Casualty / theft
  casualty_loss?: number
  // Other
  other_itemized?: number
}

export interface Credits {
  // Legacy
  child_tax_credit?: number
  earned_income_credit?: number
  education_credit?: number
  // Page 18 — Health Insurance
  has_marketplace_insurance?: string  // 'Yes' | 'No'
  // Page 19 — Common Credits
  has_ira?: boolean
  ira_amount?: number
  ira_type?: string               // 'Traditional' | 'Roth'
  has_college_tuition?: boolean
  college_tuition_amount?: number
  has_student_loan?: boolean
  student_loan_interest?: number
  has_teacher_expenses?: boolean
  teacher_expenses?: number
  has_eic?: boolean
  eic_qualifying_children?: number
  has_car_loan?: boolean
  car_loan_interest?: number
  has_home_energy?: boolean
  home_energy_amount?: number
  has_child_care?: boolean
  child_care_expenses?: number
  child_care_qualifying_children?: number
  // Page 20 — Other Credits
  has_hsa?: boolean
  hsa_amount?: number
  has_msa?: boolean
  has_adoption?: boolean
  adoption_expenses?: number
  has_elderly?: boolean
  has_clean_vehicle?: boolean
  clean_vehicle_amount?: number
  has_alternative_fuel?: boolean
  has_mcc?: boolean
  has_employee_business?: boolean
  has_military_moving?: boolean
  has_claim_of_right?: boolean
  has_prior_year_min_tax?: boolean
  has_misc_adjustments?: boolean
}

// Pages 11-13 — Other income types
export interface OtherIncome {
  has_1099_income?: string          // 'Yes' | 'No'
  has_cryptocurrency?: string       // 'Yes' | 'No'
  has_investments?: boolean
  investment_income?: number
  has_unemployment?: boolean
  unemployment_amount?: number
  has_social_security?: boolean
  social_security_amount?: number
  has_retirement_income?: boolean
  retirement_income?: number
  has_state_refund?: boolean
  state_refund_amount?: number
  has_capital_loss_carryover?: boolean
  has_business_rental?: boolean
  business_income?: number
  rental_income?: number
}

// Page 3 — Dependents
export interface Dependent {
  id?: number
  first_name?: string
  last_name?: string
  ssn?: string
  date_of_birth?: string
  relationship?: string
  months_lived?: number
}

// Pages 23-24 — Miscellaneous
export interface MiscInfo {
  has_estimated_payments?: boolean
  estimated_q1?: number
  estimated_q2?: number
  estimated_q3?: number
  estimated_q4?: number
  extension_payment?: number
  apply_refund_next_year?: boolean
  next_year_amount?: number
  has_foreign_accounts?: boolean
  has_foreign_assets?: boolean
  refund_maximizer?: string        // 'maximize' | 'skip'
  has_dependents?: string          // 'Yes' | 'No'
}

// Pages 27-29 — State residency
export interface StateInfo {
  is_state_resident?: string       // 'Yes' | 'No'
  is_full_year_resident?: string   // 'Yes' | 'No'
  has_other_state_income?: string  // 'Yes' | 'No'
}

export interface TaxData {
  tax_return?: TaxReturn
  w2_forms?: W2Form[]
  form_1099s?: Form1099[]
  deductions?: Deductions
  credits?: Credits
  other_income?: OtherIncome
  dependents?: Dependent[]
  misc_info?: MiscInfo
  state_info?: StateInfo
}

export interface SectionResult {
  section_name: string
  success: boolean
  error?: string
  timestamp?: string
}

export interface FilingEvent {
  type: 'section_complete' | 'complete' | 'timeout' | 'error'
  section?: string
  success?: boolean
  overall_success?: boolean
  timestamp?: string
  message?: string
}

export interface FilingLogEntry {
  time: string
  message: string
}

// ── Section structure (matches FreeTaxUSA navigation) ──────────────────────

export interface SubSection {
  key: string
  label: string
  backendKey: string  // prefix used in missingFields from the backend
}

export interface SectionGroup {
  key: string
  label: string
  subsections: SubSection[]
}

export const SECTION_GROUPS: SectionGroup[] = [
  {
    key: 'personal',
    label: 'Personal',
    subsections: [
      { key: 'personal-info',       label: 'Personal Info',       backendKey: 'Personal Information' },
      { key: 'filing-status',       label: 'Filing Status',       backendKey: 'Filing Status' },
      { key: 'dependents',          label: 'Dependents',          backendKey: 'Personal Information' },
      { key: 'identity-protection', label: 'Identity Protection', backendKey: 'Personal Information' },
    ],
  },
  {
    key: 'income',
    label: 'Income',
    subsections: [
      { key: 'w2-income',    label: 'W-2 Wages',    backendKey: 'Income' },
      { key: '1099-income',  label: '1099 Income',  backendKey: 'Income' },
      { key: 'other-income', label: 'Other Income',  backendKey: 'Income' },
    ],
  },
  {
    key: 'deductions-credits',
    label: 'Deductions & Credits',
    subsections: [
      { key: 'deductions',       label: 'Itemized Deductions', backendKey: 'Deductions' },
      { key: 'health-insurance', label: 'Health Insurance',    backendKey: 'Credits' },
      { key: 'common-credits',   label: 'Common Credits',      backendKey: 'Credits' },
      { key: 'other-credits',    label: 'Other Credits',       backendKey: 'Credits' },
    ],
  },
  {
    key: 'miscellaneous',
    label: 'Miscellaneous',
    subsections: [
      { key: 'misc-forms',        label: 'Forms & Topics',   backendKey: 'Miscellaneous' },
      { key: 'refund-maximizer',  label: 'Refund Maximizer', backendKey: 'Miscellaneous' },
    ],
  },
  {
    key: 'state',
    label: 'State',
    subsections: [
      { key: 'state-residency', label: 'State Residency', backendKey: 'State' },
      { key: 'state-return',    label: 'State Return',    backendKey: 'State' },
    ],
  },
  {
    key: 'summary',
    label: 'Summary',
    subsections: [
      { key: 'federal-summary', label: 'Federal Summary', backendKey: 'Summary' },
      { key: 'bank-refund',     label: 'Bank & Refund',   backendKey: 'Bank/Refund Info' },
      { key: 'review',          label: 'Review & File',   backendKey: 'Review' },
    ],
  },
]

export const TAX_SECTIONS = SECTION_GROUPS.flatMap((g) => g.subsections.map((s) => s.key))
export type TaxSection = string
