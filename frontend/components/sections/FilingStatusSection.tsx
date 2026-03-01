'use client'

import { clsx } from 'clsx'
import { useStore } from '@/store'

const STATUSES = [
  'Single',
  'Married Filing Jointly',
  'Married Filing Separately',
  'Head of Household',
  'Qualifying Surviving Spouse',
]

export function FilingStatusSection() {
  const taxData = useStore((s) => s.taxData)
  const setTaxData = useStore((s) => s.setTaxData)

  const selected = taxData?.tax_return?.filing_status ?? ''

  function handleStatusChange(status: string) {
    setTaxData({
      ...taxData,
      tax_return: { ...taxData?.tax_return, filing_status: status },
    } as Parameters<typeof setTaxData>[0])
  }

  const descriptions: Record<string, string> = {
    'Single': 'Unmarried, legally separated, or divorced as of December 31, 2025.',
    'Married Filing Jointly': 'Married and filing one return together. Generally provides the lowest tax.',
    'Married Filing Separately': 'Married but filing separate returns. Usually results in higher tax.',
    'Head of Household': 'Unmarried and paid more than half the cost of keeping up a home for a qualifying person.',
    'Qualifying Surviving Spouse': 'Widow or widower with a dependent child; spouse died in 2023 or 2024.',
  }

  return (
    <div>
      <h2 className="text-[18px] font-bold text-ink mb-1">
        Filing Status<span className="text-red-500 ml-0.5">*</span>
      </h2>
      <p className="text-[13px] text-muted mb-5">
        Choose the filing status that best describes your situation on December 31, 2025.
      </p>

      <div className="flex flex-col gap-2">
        {STATUSES.map((s) => (
          <div
            key={s}
            onClick={() => handleStatusChange(s)}
            className={clsx(
              'border rounded-xl p-4 cursor-pointer transition-colors',
              selected === s
                ? 'border-green bg-green-pale'
                : 'border-hairline bg-white hover:bg-[#F7F5F0]',
            )}
          >
            <div className="flex items-center gap-3">
              <div
                className={clsx(
                  'w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors',
                  selected === s ? 'border-green' : 'border-hairline',
                )}
              >
                {selected === s && <div className="w-2 h-2 rounded-full bg-green" />}
              </div>
              <div>
                <p className="text-[14px] font-semibold text-ink">{s}</p>
                <p className="text-[12px] text-muted mt-0.5 leading-relaxed">{descriptions[s]}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Additional fields for married statuses */}
      {selected === 'Married Filing Jointly' && (
        <div className="mt-5 p-4 bg-cream border border-hairline rounded-xl">
          <p className="text-[13px] font-semibold text-ink mb-1">Spouse Information</p>
          <p className="text-[12px] text-muted mb-3">
            You will need your spouse&apos;s SSN and date of birth to file jointly.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-[11px] text-muted mb-0.5">Spouse First Name<span className="text-red-500 ml-0.5">*</span></p>
              <input
                value={taxData?.tax_return?.spouse_first_name ?? ''}
                onChange={(e) =>
                  setTaxData({
                    ...taxData,
                    tax_return: { ...taxData?.tax_return, spouse_first_name: e.target.value },
                  } as Parameters<typeof setTaxData>[0])
                }
                placeholder="Jane"
                className="w-full border-b border-hairline focus:border-green outline-none bg-transparent py-1 text-[13px] text-ink transition-colors"
              />
            </div>
            <div>
              <p className="text-[11px] text-muted mb-0.5">Spouse Last Name<span className="text-red-500 ml-0.5">*</span></p>
              <input
                value={taxData?.tax_return?.spouse_last_name ?? ''}
                onChange={(e) =>
                  setTaxData({
                    ...taxData,
                    tax_return: { ...taxData?.tax_return, spouse_last_name: e.target.value },
                  } as Parameters<typeof setTaxData>[0])
                }
                placeholder="Smith"
                className="w-full border-b border-hairline focus:border-green outline-none bg-transparent py-1 text-[13px] text-ink transition-colors"
              />
            </div>
            <div>
              <p className="text-[11px] text-muted mb-0.5">Spouse SSN<span className="text-red-500 ml-0.5">*</span></p>
              <input
                value={taxData?.tax_return?.spouse_ssn ?? ''}
                onChange={(e) =>
                  setTaxData({
                    ...taxData,
                    tax_return: { ...taxData?.tax_return, spouse_ssn: e.target.value },
                  } as Parameters<typeof setTaxData>[0])
                }
                placeholder="XXX-XX-XXXX"
                className="w-full border-b border-hairline focus:border-green outline-none bg-transparent py-1 text-[13px] font-mono text-ink transition-colors"
              />
            </div>
            <div>
              <p className="text-[11px] text-muted mb-0.5">Spouse Date of Birth</p>
              <input
                value={taxData?.tax_return?.spouse_dob ?? ''}
                onChange={(e) =>
                  setTaxData({
                    ...taxData,
                    tax_return: { ...taxData?.tax_return, spouse_dob: e.target.value },
                  } as Parameters<typeof setTaxData>[0])
                }
                placeholder="YYYY-MM-DD"
                className="w-full border-b border-hairline focus:border-green outline-none bg-transparent py-1 text-[13px] font-mono text-ink transition-colors"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
