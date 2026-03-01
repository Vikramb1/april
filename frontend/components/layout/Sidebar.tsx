"use client";

import { useState } from "react";
import { clsx } from "clsx";
import { useShallow } from "zustand/react/shallow";
import { useStore } from "@/store";
import { api } from "@/lib/api";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { SECTION_GROUPS } from "@/lib/types";
import type { TaxData } from "@/lib/types";
import { PAST_YEAR_DATA, CURRENT_TAX_YEAR } from "@/lib/dummyData";

// Optional sections are "complete" simply by being visited (nothing required)
const OPTIONAL_SECTIONS = new Set([
  'dependents', 'common-credits', 'other-credits',
  'misc-forms', 'federal-summary',
]);

// All required data present → green
function isSectionComplete(key: string, taxData: TaxData | null, visited: boolean): boolean {
  if (OPTIONAL_SECTIONS.has(key)) return visited;
  if (!taxData) return false;
  const tr = taxData.tax_return ?? {};
  const w2s = taxData.w2_forms ?? [];
  const cred = taxData.credits ?? {};
  const ded = taxData.deductions ?? {};
  const oi = taxData.other_income ?? {};
  const misc = taxData.misc_info ?? {};
  const si = taxData.state_info ?? {};

  switch (key) {
    case 'personal-info':
      return !!(tr.first_name && tr.last_name && tr.ssn && tr.address && tr.city && tr.state && tr.zip_code);
    case 'filing-status':
      return !!tr.filing_status;
    case 'identity-protection':
      return !!tr.identity_protection_pin;
    case 'w2-income':
      return w2s.length > 0 && w2s.every((w) => !!(w.employer_name && w.wages != null));
    case '1099-income': {
      const forms = taxData?.form_1099s ?? [];
      return forms.length > 0 && forms.every((f) => !!f.payer_name);
    }
    case 'other-income':
      return !!oi.has_cryptocurrency;
    case 'deductions':
      return [ded.has_homeowner, ded.has_donations, ded.has_medical, ded.has_taxes_paid,
              ded.has_investment_interest, ded.has_casualty, ded.has_other_itemized]
        .some((v) => v !== undefined);
    case 'health-insurance':
      return !!cred.has_marketplace_insurance;
    case 'refund-maximizer':
      return !!misc.refund_maximizer;
    case 'bank-refund':
      return !!tr.refund_type;
    case 'review':
      return false;
    case 'state-residency':
      return !!si.is_state_resident;
    case 'state-return':
      return !!si.is_state_resident;
    default:
      return false;
  }
}

// Has SOME data but not complete → amber (only when partially filled, not just visited)
function isSectionStarted(key: string, taxData: TaxData | null): boolean {
  if (!taxData) return false;
  const tr = taxData.tax_return ?? {};
  const ded = taxData.deductions ?? {};

  switch (key) {
    case 'personal-info': {
      // Started if ANY field filled, but complete requires all
      const hasAny = !!(tr.first_name || tr.last_name || tr.ssn || tr.address || tr.city || tr.state || tr.zip_code);
      const hasAll = !!(tr.first_name && tr.last_name && tr.ssn && tr.address && tr.city && tr.state && tr.zip_code);
      return hasAny && !hasAll;
    }
    case 'deductions': {
      // Started if SOME categories toggled (deductions complete = any toggled, so this is never halfway)
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
    activeSection,
    activeYear,
    taxData,
    visitedSections,
    setActiveSection,
    resetTaxData,
  } = useStore(
    useShallow((s) => ({
      userId: s.userId,
      activeSection: s.activeSection,
      activeYear: s.activeYear,
      taxData: s.taxData,
      visitedSections: s.visitedSections,
      setActiveSection: s.setActiveSection,
      resetTaxData: s.resetTaxData,
    })),
  );

  const [confirmReset, setConfirmReset] = useState(false);

  const isPastYear = activeYear !== CURRENT_TAX_YEAR;
  const pastYearRecord = isPastYear ? PAST_YEAR_DATA[activeYear] : null;

  const allSubKeys = SECTION_GROUPS.flatMap((g) => g.subsections.map((s) => s.key));
  const completedCount = isPastYear
    ? allSubKeys.length
    : allSubKeys.filter((k) =>
        isSectionComplete(k, taxData, visitedSections.includes(k)),
      ).length;
  const effectivePercent = Math.round((completedCount / allSubKeys.length) * 100);

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
          subLabel={isPastYear ? "filed" : "complete"}
        />
      </div>

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
            isPastYear ||
            isSectionComplete(sub.key, taxData, visitedSections.includes(sub.key)),
          );
          const anyProgress =
            !isPastYear &&
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
                    const complete = isSectionComplete(sub.key, taxData, visited);
                    const started = !complete && isSectionStarted(sub.key, taxData);

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
        <div className="mt-4 pb-4 px-1">
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
            <button
              onClick={() => setConfirmReset(true)}
              className="text-[11px] text-muted hover:text-red-500 transition-colors cursor-pointer"
            >
              Reset info
            </button>
          )}
        </div>
      )}
    </aside>
  );
}
