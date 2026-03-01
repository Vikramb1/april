export type Phase = 'collecting' | 'reviewing' | 'filing' | 'filed'

export type SectionStatus = 'pending' | 'in_progress' | 'complete'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
}

export interface W2Form {
  id?: number
  employer_name?: string
  ein?: string
  wages?: number
  federal_tax_withheld?: number
  state_tax_withheld?: number
  social_security_wages?: number
  social_security_tax_withheld?: number
  medicare_wages?: number
  medicare_tax_withheld?: number
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
  last_name?: string
  ssn?: string
  date_of_birth?: string
  address?: string
  city?: string
  state?: string
  zip_code?: string
  filing_status?: string
  occupation?: string
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
