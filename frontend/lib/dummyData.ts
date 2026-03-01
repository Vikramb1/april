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

function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)] }
function randInt(min: number, max: number) { return Math.floor(Math.random() * (max - min + 1)) + min }
function randSSN() { return `${randInt(100,999)}-${randInt(10,99)}-${randInt(1000,9999)}` }
function randDOB() { return `${randInt(1970,2000)}-${String(randInt(1,12)).padStart(2,'0')}-${String(randInt(1,28)).padStart(2,'0')}` }
function randAcct() { return String(randInt(100000000, 999999999)) }

const FIRST_NAMES = ['John', 'Sarah', 'Michael', 'Emma', 'David', 'Olivia', 'James', 'Sophia', 'Daniel', 'Ava']
const LAST_NAMES = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Martinez', 'Wilson']
const OCCUPATIONS = ['Software Engineer', 'Product Manager', 'Data Scientist', 'Designer', 'Marketing Manager', 'Teacher', 'Accountant', 'Nurse']
const STREETS = ['123 Main St', '456 Oak Ave', '789 Elm Blvd', '321 Pine Rd', '654 Maple Dr', '987 Cedar Ln']
const CITIES = [['Austin', 'TX', '78701'], ['Denver', 'CO', '80202'], ['Portland', 'OR', '97201'], ['Seattle', 'WA', '98101'], ['Chicago', 'IL', '60601'], ['Miami', 'FL', '33101']]
const EMPLOYERS = [['Acme Corp', '12-3456789'], ['Meridian Tech', '47-2918301'], ['Vertex Labs', '83-1029384'], ['Nova Systems', '56-7891234'], ['Pinnacle Inc', '29-4857163']]
const BANKS = ['Chase Bank', 'Wells Fargo', 'Bank of America', 'Citi Bank', 'Capital One']
const FORM_TYPES = ['INT', 'DIV', 'MISC']

export function generateTestData(): TaxData {
  const firstName = pick(FIRST_NAMES)
  const lastName = pick(LAST_NAMES)
  const [city, state, zip] = pick(CITIES)
  const [empName, ein] = pick(EMPLOYERS)
  const wages = randInt(45, 150) * 1000
  const fedWithheld = Math.round(wages * (randInt(12, 22) / 100))
  const ssWithheld = Math.round(wages * 0.062)
  const medWithheld = Math.round(wages * 0.0145 * 100) / 100
  const interestAmt = Math.round(randInt(50, 2000) * 100) / 100

  return {
    tax_return: {
      first_name: firstName,
      last_name: lastName,
      ssn: randSSN(),
      date_of_birth: randDOB(),
      occupation: pick(OCCUPATIONS),
      address: pick(STREETS),
      city,
      state,
      zip_code: zip,
      filing_status: 'Single',
      claimed_as_dependent: 'No',
      presidential_fund: 'No',
      blind: 'No',
      deceased: 'No',
      nonresident_alien: 'No',
      identity_protection_pin: 'No',
      refund_type: 'direct_deposit',
      bank_routing_number: '021000021',
      bank_account_number: randAcct(),
      bank_account_type: pick(['Checking', 'Savings']),
      phone_option: 'none',
    },
    w2_forms: [
      {
        employer_name: empName,
        ein,
        employer_address: pick(STREETS),
        employer_city: city,
        employer_state: state,
        employer_zip: zip,
        employee_name: `${firstName} ${lastName}`,
        employee_address: pick(STREETS),
        employee_city: city,
        employee_state: state,
        employee_zip: zip,
        wages,
        federal_tax_withheld: fedWithheld,
        social_security_wages: wages,
        social_security_tax_withheld: ssWithheld,
        medicare_wages: wages,
        medicare_tax_withheld: medWithheld,
        state,
        state_wages: wages,
        state_tax_withheld: 0,
        w2_type: 'Standard W-2',
        is_corrected: 'No',
        has_tip_income: 'No',
        has_overtime: 'No',
      },
    ],
    form_1099s: [
      {
        form_type: pick(FORM_TYPES),
        payer_name: pick(BANKS),
        amount: interestAmt,
      },
    ],
    deductions: {
      has_itemized_deductions: 'No',
    },
    credits: {
      has_marketplace_insurance: 'No',
    },
    other_income: {
      has_1099_income: 'Yes',
      has_cryptocurrency: 'No',
    },
    dependents: [],
    misc_info: {
      has_estimated_payments: false,
      has_foreign_accounts: false,
      has_foreign_assets: false,
      refund_maximizer: 'skip',
      has_dependents: 'No',
    },
    state_info: {
      is_state_resident: 'Yes',
      is_full_year_resident: 'Yes',
      has_other_state_income: 'No',
    },
  }
}

export const CURRENT_TAX_YEAR = '2025'
export const PAST_YEARS = ['2024', '2023'] as const
export const ALL_YEARS = [CURRENT_TAX_YEAR, ...PAST_YEARS] as const
