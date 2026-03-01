import type { TaxData } from './types'

export interface YearRecord {
  taxData: TaxData
  filedDate: string
  percentComplete: number
}

export const PAST_YEAR_DATA: Record<string, YearRecord> = {
  '2024': {
    filedDate: 'March 19, 2025',
    percentComplete: 100,
    taxData: {
      tax_return: {
        first_name: 'Jordan',
        last_name: 'Rivera',
        ssn: '***-**-4821',
        date_of_birth: '1992-07-14',
        filing_status: 'Single',
        occupation: 'Software Engineer',
        address: '412 Oak Street',
        city: 'Austin',
        state: 'TX',
        zip_code: '78701',
        bank_routing_number: '021000021',
        bank_account_number: '****3847',
        bank_account_type: 'Checking',
        refund_amount: 3214.50,
      },
      w2_forms: [
        {
          employer_name: 'Meridian Technologies',
          ein: '47-2918301',
          wages: 112000,
          federal_tax_withheld: 18200,
          social_security_wages: 112000,
          social_security_tax_withheld: 6944,
          medicare_wages: 112000,
          medicare_tax_withheld: 1624,
          state_tax_withheld: 5600,
        },
      ],
      form_1099s: [
        {
          form_type: 'INT',
          payer_name: 'Marcus Bank',
          amount: 847.12,
        },
      ],
      deductions: {
        standard_deduction: 14600,
        mortgage_interest: 0,
        charitable_donations: 0,
        state_local_taxes: 0,
      },
      credits: {
        child_tax_credit: 0,
        earned_income_credit: 0,
        education_credit: 0,
      },
    },
  },
  '2023': {
    filedDate: 'April 7, 2024',
    percentComplete: 100,
    taxData: {
      tax_return: {
        first_name: 'Jordan',
        last_name: 'Rivera',
        ssn: '***-**-4821',
        date_of_birth: '1992-07-14',
        filing_status: 'Single',
        occupation: 'Software Engineer',
        address: '412 Oak Street',
        city: 'Austin',
        state: 'TX',
        zip_code: '78701',
        bank_routing_number: '021000021',
        bank_account_number: '****3847',
        bank_account_type: 'Checking',
        refund_amount: 1923.00,
      },
      w2_forms: [
        {
          employer_name: 'Meridian Technologies',
          ein: '47-2918301',
          wages: 98000,
          federal_tax_withheld: 15680,
          social_security_wages: 98000,
          social_security_tax_withheld: 6076,
          medicare_wages: 98000,
          medicare_tax_withheld: 1421,
          state_tax_withheld: 4900,
        },
      ],
      form_1099s: [],
      deductions: {
        standard_deduction: 13850,
        mortgage_interest: 0,
        charitable_donations: 0,
        state_local_taxes: 0,
      },
      credits: {
        child_tax_credit: 0,
        earned_income_credit: 0,
        education_credit: 0,
      },
    },
  },
}

export const CURRENT_TAX_YEAR = '2025'
export const PAST_YEARS = ['2024', '2023'] as const
export const ALL_YEARS = [CURRENT_TAX_YEAR, ...PAST_YEARS] as const
