"use client";

import { useState } from "react";
import { clsx } from "clsx";
import { useShallow } from "zustand/react/shallow";
import { useStore } from "@/store";
import { api } from "@/lib/api";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { TAX_SECTIONS } from "@/lib/types";
import { PAST_YEAR_DATA, CURRENT_TAX_YEAR } from "@/lib/dummyData";

function isSectionComplete(
  sectionLabel: string,
  missingFields: string[],
  percentComplete: number,
): boolean {
  if (percentComplete === 0) return false;
  return !missingFields.some((f) =>
    f.toLowerCase().startsWith(sectionLabel.toLowerCase()),
  );
}

export function Sidebar() {
  const {
    userId,
    activeSection,
    activeYear,
    percentComplete,
    missingFields,
    setActiveSection,
    resetTaxData,
  } = useStore(
    useShallow((s) => ({
      userId: s.userId,
      activeSection: s.activeSection,
      activeYear: s.activeYear,
      percentComplete: s.percentComplete,
      missingFields: s.missingFields,
      setActiveSection: s.setActiveSection,
      resetTaxData: s.resetTaxData,
    })),
  );

  const [confirmReset, setConfirmReset] = useState(false);

  const isPastYear = activeYear !== CURRENT_TAX_YEAR;
  const pastYearRecord = isPastYear ? PAST_YEAR_DATA[activeYear] : null;
  const effectivePercent = isPastYear ? 100 : Math.round(percentComplete);

  async function handleReset() {
    if (userId) {
      await api.resetData(userId).catch(() => {});
    }
    resetTaxData();
    setConfirmReset(false);
  }

  return (
    <aside className="w-1/5 bg-cream-deep border-r border-hairline overflow-y-auto flex flex-col pt-8 px-4">
      {/* Greeting */}
      <div className="mb-5">
        <h2 className="text-2xl font-extrabold text-ink">Welcome back</h2>
      </div>

      {/* Progress ring */}
      <div className="flex justify-center mb-5">
        <ProgressRing
          percent={effectivePercent}
          subLabel={isPastYear ? "filed" : "complete"}
        />
      </div>

      {/* Year label + filed date for past years */}
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] uppercase tracking-widest text-muted font-semibold">
          {activeYear} Return
        </p>
        {isPastYear && pastYearRecord && (
          <span className="text-[10px] font-mono text-green font-semibold">
            ✓ {pastYearRecord.filedDate.split(",")[0]}
          </span>
        )}
      </div>

      {/* Sections */}
      <nav className="flex-1">
        {TAX_SECTIONS.map((section) => {
          const isActive = activeSection === section && !isPastYear;
          const complete =
            isPastYear ||
            isSectionComplete(section, missingFields, percentComplete);
          const hasStarted = percentComplete > 0 || isPastYear;

          return (
            <button
              key={section}
              onClick={() => {
                if (!isPastYear) setActiveSection(section);
              }}
              className={clsx(
                "flex items-center justify-between w-full text-left py-1.5 px-2 text-[13px] rounded transition-colors mb-0.5",
                isActive
                  ? "bg-green text-white font-semibold"
                  : isPastYear
                    ? "text-muted cursor-default"
                    : complete
                      ? "bg-green-pale text-green cursor-pointer hover:opacity-80"
                      : "text-ink hover:bg-[#F0EDE6] cursor-pointer",
              )}
            >
              <span>{section}</span>

              {/* Status indicator */}
              {complete ? (
                <span
                  className={clsx(
                    "text-[11px] font-bold ml-2 flex-shrink-0",
                    isActive ? "text-white" : "text-green",
                  )}
                >
                  ✓
                </span>
              ) : hasStarted ? (
                <span className="text-[13px] ml-2 flex-shrink-0 text-amber font-bold leading-none">
                  ⚠
                </span>
              ) : null}
            </button>
          );
        })}
      </nav>

      {/* Reset info */}
      {!isPastYear && (
        <div className="mt-4 pb-4">
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
