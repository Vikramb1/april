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
  bank_routing_number?: string
  bank_account_number?: string
  bank_account_type?: string
  refund_amount?: number
  tax_owed?: number
}

export interface Deductions {
  standard_deduction?: number
  itemized_deduction?: number
  mortgage_interest?: number
  charitable_donations?: number
  state_local_taxes?: number
}

export interface Credits {
  child_tax_credit?: number
  earned_income_credit?: number
  education_credit?: number
}

export interface TaxData {
  tax_return?: TaxReturn
  w2_forms?: W2Form[]
  form_1099s?: Form1099[]
  deductions?: Deductions
  credits?: Credits
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

export const TAX_SECTIONS = [
  'Personal Information',
  'Filing Status',
  'W-2 Income',
  '1099 Income',
  'Deductions',
  'Credits',
  'Bank Info',
  'Review',
] as const

export type TaxSection = typeof TAX_SECTIONS[number]
