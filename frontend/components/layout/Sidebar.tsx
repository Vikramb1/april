"use client";

import { useState } from "react";
import { clsx } from "clsx";
import { useShallow } from "zustand/react/shallow";
import { useStore } from "@/store";
import { api } from "@/lib/api";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { SECTION_GROUPS } from "@/lib/types";
import type { TaxData } from "@/lib/types";
import { isSectionComplete, OPTIONAL_SECTIONS } from "@/lib/sectionUtils";
import { PAST_YEAR_DATA, CURRENT_TAX_YEAR, generateTestData } from "@/lib/dummyData";

// ── Refund estimate helpers ──────────────────────────────────────────────────
function calcTaxSingle(income: number): number {
  if (income <= 0) return 0;
  const brackets = [
    { limit: 11925, rate: 0.10 }, { limit: 48475, rate: 0.12 },
    { limit: 103350, rate: 0.22 }, { limit: 197300, rate: 0.24 },
    { limit: 250525, rate: 0.32 }, { limit: 626350, rate: 0.35 },
    { limit: Infinity, rate: 0.37 },
  ];
  let tax = 0; let prev = 0;
  for (const { limit, rate } of brackets) {
    if (income <= prev) break;
    tax += (Math.min(income, limit) - prev) * rate;
    prev = limit;
  }
  return Math.round(tax);
}

function calcTaxMFJ(income: number): number {
  if (income <= 0) return 0;
  const brackets = [
    { limit: 23850, rate: 0.10 }, { limit: 96950, rate: 0.12 },
    { limit: 206700, rate: 0.22 }, { limit: 394600, rate: 0.24 },
    { limit: 501050, rate: 0.32 }, { limit: 751600, rate: 0.35 },
    { limit: Infinity, rate: 0.37 },
  ];
  let tax = 0; let prev = 0;
  for (const { limit, rate } of brackets) {
    if (income <= prev) break;
    tax += (Math.min(income, limit) - prev) * rate;
    prev = limit;
  }
  return Math.round(tax);
}

const STD_DED: Record<string, number> = {
  'Single': 15000, 'Married Filing Jointly': 30000,
  'Married Filing Separately': 15000, 'Head of Household': 22500,
  'Qualifying Surviving Spouse': 30000,
};

function computeRefundEstimate(taxData: TaxData | null): { amount: number; isRefund: boolean } | null {
  if (!taxData) return null;
  const w2s = taxData.w2_forms ?? [];
  const totalWages = w2s.reduce((s, w) => s + (w.wages ?? 0), 0);
  const totalWithheld = w2s.reduce((s, w) => s + (w.federal_tax_withheld ?? 0), 0);
  if (totalWages === 0 && totalWithheld === 0) return null;
  const filingStatus = taxData.tax_return?.filing_status ?? 'Single';
  const deduction = STD_DED[filingStatus] ?? 15000;
  const taxable = Math.max(0, totalWages - deduction);
  const calcFn = filingStatus === 'Married Filing Jointly' ? calcTaxMFJ : calcTaxSingle;
  const tax = calcFn(taxable);
  const diff = totalWithheld - tax;
  return { amount: Math.abs(diff), isRefund: diff >= 0 };
}

function fmtMoney(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
}


// Has SOME data but not complete → amber (only when partially filled, not just visited)
function isSectionStarted(key: string, taxData: TaxData | null): boolean {
  if (!taxData) return false;
  const tr = taxData.tax_return ?? {};
  const ded = taxData.deductions ?? {};
  const oi = taxData.other_income ?? {};

  const mi = taxData.misc_info ?? {}

  switch (key) {
    case 'personal-info': {
      const hasAny = !!(tr.first_name || tr.last_name || tr.ssn || tr.date_of_birth ||
                        tr.address || tr.city || tr.state || tr.zip_code);
      const hasAll = !!(tr.first_name && tr.last_name && tr.ssn && tr.date_of_birth &&
                        tr.address && tr.city && tr.state && tr.zip_code &&
                        tr.claimed_as_dependent && tr.blind && tr.deceased && tr.nonresident_alien);
      return hasAny && !hasAll;
    }
    case 'dependents': {
      // Amber if gate answered Yes but no dependents added yet
      if (mi.has_dependents === 'Yes') {
        return (taxData.dependents ?? []).length === 0
      }
      return false
    }
    case 'misc-forms': {
      // Amber if any item engaged but both Yes/No gates not yet answered
      const eitherAnswered =
        mi.has_foreign_accounts !== undefined ||
        mi.has_foreign_assets !== undefined ||
        !!mi.has_estimated_payments ||
        !!mi.apply_refund_next_year
      const bothAnswered =
        mi.has_foreign_accounts !== undefined && mi.has_foreign_assets !== undefined
      return eitherAnswered && !bothAnswered
    }
    case '1099-income': {
      // Amber if gate answered Yes but no forms added yet
      if (oi.has_1099_income === 'Yes') {
        const forms = taxData.form_1099s ?? [];
        return forms.length === 0;
      }
      return false;
    }
    case 'deductions': {
      // Amber if gate answered Yes but no categories toggled yet
      if (ded.has_itemized_deductions === 'Yes') {
        const anyToggled = [ded.has_homeowner, ded.has_donations, ded.has_medical, ded.has_taxes_paid,
                            ded.has_investment_interest, ded.has_casualty, ded.has_other_itemized]
          .some((v) => v === true);
        return !anyToggled;
      }
      return false;
    }
    default:
      // For most sections, started === complete (no meaningful halfway state)
      return false;
  }
}

export function Sidebar() {
  const {
    userId,
    phase,
    activeSection,
    activeYear,
    taxData,
    visitedSections,
    setActiveSection,
    setTaxData,
    resetTaxData,
  } = useStore(
    useShallow((s) => ({
      userId: s.userId,
      phase: s.phase,
      activeSection: s.activeSection,
      activeYear: s.activeYear,
      taxData: s.taxData,
      visitedSections: s.visitedSections,
      setActiveSection: s.setActiveSection,
      setTaxData: s.setTaxData,
      resetTaxData: s.resetTaxData,
    })),
  );

  const [confirmReset, setConfirmReset] = useState(false);

  const isPastYear = activeYear !== CURRENT_TAX_YEAR;
  const isFiled = phase === 'filed';
  const pastYearRecord = isPastYear ? PAST_YEAR_DATA[activeYear] : null;

  const allSubKeys = SECTION_GROUPS.flatMap((g) => g.subsections.map((s) => s.key));
  const countableKeys = allSubKeys.filter((k) => k !== 'review');
  const completedCount = (isPastYear || isFiled)
    ? countableKeys.length
    : countableKeys.filter((k) =>
        isSectionComplete(k, taxData, visitedSections.includes(k)),
      ).length;
  const effectivePercent = Math.round((completedCount / countableKeys.length) * 100);

  const activeGroup = SECTION_GROUPS.find((g) =>
    g.subsections.some((s) => s.key === activeSection),
  );
  const [openGroup, setOpenGroup] = useState<string | null>(
    activeGroup?.key ?? SECTION_GROUPS[0]?.key ?? null,
  );

  // Past years always collapse sidebar
  const effectiveOpenGroup = isPastYear ? null : openGroup;

  async function handleReset() {
    if (userId) await api.resetData(userId).catch(() => {});
    resetTaxData();
    setConfirmReset(false);
    setOpenGroup(SECTION_GROUPS[0]?.key ?? null);
  }

  return (
    <aside className="w-1/5 bg-cream-deep border-r border-hairline flex flex-col pt-8 px-3 overflow-hidden">
      <div className="mb-5 px-1">
        <h2 className="text-2xl font-extrabold text-ink">Welcome back</h2>
      </div>

      <div className="flex justify-center mb-5">
        <ProgressRing
          percent={effectivePercent}
          subLabel={isPastYear || isFiled ? "filed" : "complete"}
        />
      </div>

      {/* Refund estimate card */}
      {!isPastYear && (() => {
        const est = computeRefundEstimate(taxData);
        if (!est) return null;
        return (
          <div className={`mx-1 mb-3 px-3 py-2 rounded-xl border ${est.isRefund ? 'bg-green-pale border-green' : 'bg-amber/10 border-amber'}`}>
            <p className={`text-[10px] uppercase tracking-widest font-semibold mb-0.5 ${est.isRefund ? 'text-green' : 'text-amber'}`}>
              {est.isRefund ? 'Est. Refund' : 'Est. Owed'}
            </p>
            <p className={`text-[16px] font-bold font-mono ${est.isRefund ? 'text-green' : 'text-amber'}`}>
              {fmtMoney(est.amount)}
            </p>
          </div>
        );
      })()}

      <div className="flex items-center justify-between mb-3 px-1">
        <p className="text-[10px] uppercase tracking-widest text-muted font-semibold">
          {activeYear} Return
        </p>
        {isPastYear && pastYearRecord && (
          <span className="text-[10px] font-mono text-green font-semibold">
            ✓ {pastYearRecord.filedDate.split(",")[0]}
          </span>
        )}
      </div>

      <nav className="flex-1 overflow-hidden">
        {SECTION_GROUPS.map((group) => {
          const isOpen = effectiveOpenGroup === group.key;

          const allComplete = group.subsections.every((sub) =>
            isPastYear || isFiled ||
            isSectionComplete(sub.key, taxData, visitedSections.includes(sub.key)),
          );
          const anyProgress =
            !isPastYear && !isFiled &&
            !allComplete &&
            group.subsections.some((sub) => {
              const visited = visitedSections.includes(sub.key);
              return (
                isSectionComplete(sub.key, taxData, visited) ||
                isSectionStarted(sub.key, taxData)
              );
            });

          return (
            <div key={group.key} className="mb-0.5">
              <button
                onClick={() => {
                  setOpenGroup(group.key);
                  // Also navigate to first subsection (current year only)
                  if (!isPastYear && group.subsections.length > 0) {
                    setActiveSection(group.subsections[0].key);
                  }
                }}
                className={clsx(
                  "flex items-center justify-between w-full px-2 py-1.5 rounded-lg transition-colors cursor-pointer",
                  isOpen ? "bg-green/10" : "hover:bg-black/5",
                )}
              >
                <span
                  className={clsx(
                    "text-[11px] font-semibold uppercase tracking-widest",
                    isOpen
                      ? "text-green"
                      : allComplete
                        ? "text-green-mid"
                        : anyProgress
                          ? "text-amber"
                          : "text-muted",
                  )}
                >
                  {group.label}
                </span>
                <div className="flex items-center gap-1">
                  {allComplete && (
                    <span className="text-[10px] text-green font-bold">✓</span>
                  )}
                  {anyProgress && !allComplete && (
                    <span className="text-[11px] text-amber font-bold leading-none">⚠</span>
                  )}
                </div>
              </button>

              <div
                className={clsx(
                  "overflow-hidden transition-all duration-200",
                  isOpen ? "max-h-60 opacity-100" : "max-h-0 opacity-0",
                )}
              >
                <div className="ml-2 pt-0.5 pb-1">
                  {group.subsections.map((sub) => {
                    const isActive = activeSection === sub.key && !isPastYear;
                    const visited = visitedSections.includes(sub.key);
                    const complete = isFiled || isSectionComplete(sub.key, taxData, visited);
                    const started = !complete && !isFiled && isSectionStarted(sub.key, taxData);

                    return (
                      <button
                        key={sub.key}
                        onClick={() => {
                          if (!isPastYear) {
                            setActiveSection(sub.key);
                            setOpenGroup(group.key);
                          }
                        }}
                        className={clsx(
                          "flex items-center justify-between w-full text-left py-1 px-2 text-[12px] rounded-lg transition-colors mb-0.5 cursor-pointer",
                          isActive
                            ? "bg-green text-white font-semibold"
                            : isPastYear
                              ? "text-muted cursor-default"
                              : complete
                                ? "bg-green-pale text-green hover:opacity-80"
                                : started
                                  ? "bg-amber-pale text-amber hover:opacity-80"
                                  : "text-ink hover:bg-black/5",
                        )}
                      >
                        <span>{sub.label}</span>
                        {!isActive && complete && (
                          <span className="text-[9px] font-bold text-green flex-shrink-0">✓</span>
                        )}
                        {!isActive && started && (
                          <span className="text-[10px] font-bold text-amber flex-shrink-0 leading-none">⚠</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </nav>

      {!isPastYear && (
        <div className="mt-auto pb-4 px-1">
          {confirmReset ? (
            <div className="p-3 bg-red-50 border border-red rounded-lg">
              <p className="text-[12px] text-ink mb-2 font-medium">
                This will permanently remove all tax data. Continue?
              </p>
              <div className="flex gap-2">
                <button
                  onClick={handleReset}
                  className="text-[12px] text-white bg-red px-3 py-1 rounded-full font-medium cursor-pointer"
                >
                  Yes, reset
                </button>
                <button
                  onClick={() => setConfirmReset(false)}
                  className="text-[12px] text-muted hover:text-ink transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <button
                onClick={() => setConfirmReset(true)}
                className="text-[11px] text-muted hover:text-red-500 transition-colors cursor-pointer"
              >
                Reset info
              </button>
              <button
                onClick={() => {
                  setTaxData(generateTestData());
                  const allKeys = SECTION_GROUPS.flatMap((g) => g.subsections.map((s) => s.key));
                  useStore.setState({ visitedSections: allKeys });
                }}
                className="text-[11px] text-muted hover:text-green transition-colors cursor-pointer"
              >
                Test user
              </button>
            </div>
          )}
        </div>
      )}
    </aside>
  );
}
