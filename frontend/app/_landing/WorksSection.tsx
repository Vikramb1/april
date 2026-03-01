"use client";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { EASE, SectionLabel, StatusDot } from "./shared";

// ─── Phase pill matching TopNav ────────────────────────────────────────────
const PHASE_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  collecting: { bg: "#FEF3C7", color: "#D97706", label: "Collecting" },
  reviewing:  { bg: "#EAF4EC", color: "#1B4332", label: "Reviewing"  },
  filing:     { bg: "#FEF3C7", color: "#D97706", label: "Filing"     },
};

function AppFrame({ phase, children }: { phase: string; children: React.ReactNode }) {
  const { bg, color, label } = PHASE_STYLES[phase];
  return (
    <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #E5E7EB", overflow: "hidden", boxShadow: "0 8px 40px rgba(0,0,0,0.07)" }}>
      {/* TopNav matching actual component */}
      <div style={{ height: 44, borderBottom: "1px solid #E5E7EB", display: "flex", alignItems: "center", padding: "0 16px", gap: 10, background: "#fff" }}>
        <Image src="/april-logo-no-bg.png" alt="April" width={60} height={20} style={{ objectFit: "contain", height: 18, width: "auto" }}/>
        <div style={{ display: "flex", gap: 2, background: "#F3F4F6", borderRadius: 999, padding: "2px", marginLeft: 4 }}>
          <div style={{ padding: "2px 9px", borderRadius: 999, fontSize: 10, color: "#6B7280", display: "flex", alignItems: "center", gap: 2, fontFamily: "var(--font-jakarta)" }}>
            2024 <span style={{ color: "#1B4332", fontSize: 8 }}>✓</span>
          </div>
          <div style={{ padding: "2px 9px", borderRadius: 999, background: "#1B4332", color: "#fff", fontSize: 10, fontWeight: 700, fontFamily: "var(--font-jakarta)" }}>2025</div>
        </div>
        <div style={{ padding: "2px 10px", borderRadius: 999, background: bg, color, fontSize: 10, fontWeight: 600, fontFamily: "var(--font-jakarta)" }}>{label}</div>
        <div style={{ flex: 1 }}/>
        <div style={{ width: 24, height: 24, borderRadius: "50%", background: "#1B4332", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, color: "#FAF7F2", fontWeight: 700, fontFamily: "var(--font-jakarta)" }}>JP</div>
      </div>
      <div style={{ height: 420, overflow: "hidden" }}>{children}</div>
    </div>
  );
}

// ─── Individual mockups ────────────────────────────────────────────────────

function MockupHunt() {
  return (
    <AppFrame phase="collecting">
      <div style={{ padding: "16px 20px", height: "100%" }}>
        <p style={{ fontSize: 10, fontWeight: 600, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 14px", fontFamily: "var(--font-jakarta)" }}>Agent Log</p>
        {[
          { time: "10:42:01", msg: "Navigating to schwab.com…", done: true  },
          { time: "10:42:04", msg: "Logging in with credentials…", done: true  },
          { time: "10:42:08", msg: "Clicking 'Tax Documents 2025'…", done: true  },
          { time: "10:42:11", msg: "Downloading 1099-B_2025.pdf…", done: true  },
          { time: "10:42:13", msg: "Downloading 1099-INT_2025.pdf…", done: true  },
          { time: "10:42:16", msg: "Navigating to fidelity.com…", done: true  },
          { time: "10:42:20", msg: "Clicking 'Tax Forms'…", done: true  },
          { time: "10:42:23", msg: "Downloading W2_2025.pdf…", done: true  },
          { time: "10:42:26", msg: "Navigating to coinbase.com…", done: false },
        ].map(({ time, msg, done }, i) => (
          <div key={i} style={{ fontFamily: "var(--font-jetbrains)", fontSize: 12, marginBottom: 8, display: "flex", gap: 12, alignItems: "flex-start" }}>
            <span style={{ color: "#9CA3AF", flexShrink: 0, fontSize: 11 }}>{time}</span>
            <span style={{ color: done ? "#0D0D0D" : "#D97706" }}>{msg}{done ? "  ✓" : ""}</span>
          </div>
        ))}
      </div>
    </AppFrame>
  );
}

function MockupDetect() {
  return (
    <AppFrame phase="collecting">
      <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "12px 16px", borderBottom: "1px solid #E5E7EB", display: "flex", alignItems: "center", gap: 7 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: "#0D0D0D", fontFamily: "var(--font-jakarta)" }}>April</span>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#1B4332" }}/>
        </div>
        <div style={{ flex: 1, padding: "16px", display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ borderLeft: "2px solid #1B4332", paddingLeft: 12 }}>
            <p style={{ fontSize: 13, color: "#0D0D0D", fontFamily: "var(--font-jakarta)", margin: "0 0 10px", lineHeight: "20px" }}>I found all your documents. Here's the full picture:</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              {[
                { label: "Fidelity — W-2",      detail: "$52,000 wages",           done: true  },
                { label: "Schwab — 1099-B",     detail: "$48,291 proceeds",        done: true  },
                { label: "Schwab — 1099-INT",   detail: "$892 interest",           done: true  },
                { label: "Coinbase — 1099-DA",  detail: "not found yet",           done: false },
              ].map(({ label, detail, done }) => (
                <div key={label} style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 13 }}>
                  <span style={{ color: done ? "#1B4332" : "#D97706", marginTop: 1 }}>{done ? "✓" : "○"}</span>
                  <span style={{ fontFamily: "var(--font-jakarta)" }}>
                    <span style={{ color: "#0D0D0D" }}>{label}</span>
                    <span style={{ color: "#9CA3AF", fontFamily: "var(--font-jetbrains)", fontSize: 11 }}> — {detail}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div style={{ borderLeft: "2px solid #1B4332", paddingLeft: 12 }}>
            <p style={{ fontSize: 13, color: "#0D0D0D", fontFamily: "var(--font-jakarta)", margin: 0 }}>Should I log into Coinbase and download your 1099-DA?</p>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {[["Yes, find it →", true], ["I'll upload it", false], ["Skip", false]].map(([label, primary]) => (
              <div key={String(label)} style={{ padding: "6px 14px", borderRadius: 999, fontSize: 12, fontFamily: "var(--font-jakarta)", fontWeight: 600, background: primary ? "#EAF4EC" : "#F5F0E8", color: primary ? "#1B4332" : "#6B7280", border: primary ? "1px solid #1B4332" : "1px solid #E5E7EB", cursor: "default" }}>{String(label)}</div>
            ))}
          </div>
        </div>
        <div style={{ padding: "10px 14px", borderTop: "1px solid #E5E7EB" }}>
          <div style={{ background: "#FAF7F2", borderRadius: 10, padding: "8px 14px", fontSize: 12, color: "#9CA3AF", fontFamily: "var(--font-jakarta)" }}>Ask April anything…</div>
        </div>
      </div>
    </AppFrame>
  );
}

function MockupRemember() {
  return (
    <AppFrame phase="collecting">
      <div style={{ padding: "16px 20px", height: "100%" }}>
        <p style={{ fontSize: 11, fontWeight: 600, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 16px", fontFamily: "var(--font-jakarta)" }}>Year-over-Year Comparison</p>
        <div style={{ border: "1px solid #E5E7EB", borderRadius: 10, overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", background: "#F5F0E8", padding: "9px 16px", borderBottom: "1px solid #E5E7EB" }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: "#6B7280", fontFamily: "var(--font-jakarta)" }}>Document</span>
            <span style={{ fontSize: 11, fontWeight: 600, color: "#6B7280", fontFamily: "var(--font-jakarta)" }}>2024</span>
            <span style={{ fontSize: 11, fontWeight: 600, color: "#1B4332", fontFamily: "var(--font-jakarta)", textDecoration: "underline" }}>2025</span>
          </div>
          {[
            { doc: "Fidelity W-2",    old: "$44,000",  curr: "$52,000",        changed: true,  isNew: false },
            { doc: "Schwab 1099-B",   old: "$31,200",  curr: "$48,291",        changed: true,  isNew: false },
            { doc: "Schwab 1099-INT", old: "$640",     curr: "$892",           changed: true,  isNew: false },
            { doc: "Coinbase 1099-DA",old: "—",         curr: "Found!",        changed: false, isNew: true  },
            { doc: "RSU Income",      old: "$28,000",  curr: "$40,000",        changed: true,  isNew: false },
          ].map(({ doc, old, curr, changed, isNew }) => (
            <div key={doc} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", padding: "10px 16px", borderBottom: "1px solid #F5F0E8", alignItems: "center" }}>
              <span style={{ fontSize: 12, color: "#0D0D0D", fontFamily: "var(--font-jakarta)" }}>{doc}</span>
              <span style={{ fontSize: 12, color: "#9CA3AF", fontFamily: "var(--font-jetbrains)" }}>{old}</span>
              <span style={{ fontSize: 12, fontFamily: "var(--font-jetbrains)", display: "inline-flex", alignItems: "center", gap: 4,
                color: isNew ? "#1B4332" : changed ? "#D97706" : "#0D0D0D",
                background: isNew ? "#D8F3DC" : changed ? "#FEF3C7" : "transparent",
                padding: isNew || changed ? "2px 6px" : "0", borderRadius: 4,
              }}>
                {curr}{isNew ? " 🆕" : changed ? " ↑" : ""}
              </span>
            </div>
          ))}
        </div>
      </div>
    </AppFrame>
  );
}

function MockupRead() {
  return (
    <AppFrame phase="reviewing">
      <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "12px 16px", borderBottom: "1px solid #E5E7EB", display: "flex", alignItems: "center", gap: 7 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: "#0D0D0D", fontFamily: "var(--font-jakarta)" }}>April</span>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#1B4332" }}/>
        </div>
        <div style={{ flex: 1, padding: "16px", display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ borderLeft: "2px solid #1B4332", paddingLeft: 12 }}>
            <p style={{ fontSize: 13, color: "#0D0D0D", fontFamily: "var(--font-jakarta)", margin: "0 0 10px", lineHeight: "20px" }}>Extracted your 1099-B from Schwab. Here's what I found:</p>
            <div style={{ background: "#FAF7F2", borderRadius: 8, padding: "10px 12px" }}>
              <p style={{ fontSize: 10, fontWeight: 600, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 8px", fontFamily: "var(--font-jakarta)" }}>1099-B · Schwab</p>
              {[["Box 1a  Proceeds",   "$48,291.00"],["Box 1b  Cost Basis", "$31,480.00"],["Box 4   Withheld",   "$0.00"],["Covered Shares",     "Yes"],["Net Gain",           "$16,811.00"]].map(([k, v]) => (
                <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: "1px solid #E5DDD0" }}>
                  <span style={{ fontSize: 11, color: "#6B7280", fontFamily: "var(--font-jetbrains)" }}>{k}</span>
                  <span style={{ fontSize: 11, color: "#0D0D0D", fontFamily: "var(--font-jetbrains)", fontWeight: 700 }}>{v}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{ borderLeft: "2px solid #1B4332", paddingLeft: 12 }}>
            <p style={{ fontSize: 13, color: "#0D0D0D", fontFamily: "var(--font-jakarta)", margin: 0 }}>Does this look correct?</p>
          </div>
          <div style={{ textAlign: "right" }}>
            <p style={{ fontSize: 13, color: "#6B7280", fontFamily: "var(--font-jakarta)", margin: 0 }}>Yes, continue →</p>
          </div>
        </div>
        <div style={{ padding: "10px 14px", borderTop: "1px solid #E5E7EB" }}>
          <div style={{ background: "#FAF7F2", borderRadius: 10, padding: "8px 14px", fontSize: 12, color: "#9CA3AF", fontFamily: "var(--font-jakarta)" }}>Ask April anything…</div>
        </div>
      </div>
    </AppFrame>
  );
}

function MockupVerify() {
  return (
    <AppFrame phase="reviewing">
      <div style={{ padding: "0", height: "100%", display: "flex", flexDirection: "column" }}>
        <div style={{ background: "#EAF4EC", padding: "12px 20px", borderBottom: "1px solid #D8F3DC", display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 14, color: "#1B4332" }}>✓</span>
          <div>
            <p style={{ fontSize: 13, fontWeight: 600, color: "#1B4332", margin: 0, fontFamily: "var(--font-jakarta)" }}>All information collected</p>
            <p style={{ fontSize: 11, color: "#2D6A4F", margin: 0, fontFamily: "var(--font-jakarta)" }}>Review your return, then file when ready.</p>
          </div>
        </div>
        <div style={{ flex: 1, padding: "12px 20px", overflowY: "hidden" }}>
          {[
            { label: "Filing Status",      val: "Single",         mono: false },
            { label: "Total Wages",        val: "$52,000.00",     mono: true  },
            { label: "Investment Income",  val: "$16,811.00",     mono: true  },
            { label: "Total Income",       val: "$68,811.00",     mono: true  },
            { label: "Standard Deduction", val: "$(13,850.00)",   mono: true  },
            { label: "Federal Tax Owed",   val: "$8,432.00",      mono: true  },
            { label: "Tax Withheld",       val: "$11,200.00",     mono: true  },
          ].map(({ label, val, mono }) => (
            <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #F5F0E8" }}>
              <span style={{ fontSize: 12, color: "#6B7280", fontFamily: "var(--font-jakarta)" }}>{label}</span>
              <span style={{ fontSize: 12, color: "#0D0D0D", fontFamily: mono ? "var(--font-jetbrains)" : "var(--font-jakarta)" }}>{val}</span>
            </div>
          ))}
          <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", borderTop: "2px solid #E5E7EB", marginTop: 4 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: "#0D0D0D", fontFamily: "var(--font-jakarta)" }}>Estimated Refund</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: "#1B4332", fontFamily: "var(--font-jetbrains)" }}>$2,768.00</span>
          </div>
        </div>
        <div style={{ padding: "12px 20px", borderTop: "1px solid #E5E7EB" }}>
          <div style={{ background: "#1B4332", color: "#FAF7F2", borderRadius: 8, padding: "11px 0", textAlign: "center", fontSize: 14, fontWeight: 600, fontFamily: "var(--font-jakarta)" }}>File My Return →</div>
        </div>
      </div>
    </AppFrame>
  );
}

function MockupFile() {
  const rows = [
    { label: "Personal Info",  status: "complete",    time: "00:01:23" },
    { label: "Filing Status",  status: "complete",    time: "00:01:45" },
    { label: "W-2 Income",     status: "complete",    time: "00:02:12" },
    { label: "1099 Income",    status: "complete",    time: "00:02:34" },
    { label: "Deductions",     status: "in_progress", time: null       },
    { label: "Credits",        status: "pending",     time: null       },
    { label: "Bank Info",      status: "pending",     time: null       },
    { label: "Review",         status: "pending",     time: null       },
  ] as const;

  return (
    <AppFrame phase="filing">
      <div style={{ padding: "16px 20px" }}>
        <p style={{ fontSize: 10, fontWeight: 600, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.12em", margin: "0 0 14px", fontFamily: "var(--font-jakarta)" }}>Filing Progress</p>
        {rows.map(({ label, status, time }) => (
          <div key={label} style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "9px 10px", borderRadius: 8, marginBottom: 3,
            background: status === "in_progress" ? "#FEF3C7" : "transparent",
            border: status === "in_progress" ? "1px solid #FDE68A" : "1px solid transparent",
            opacity: status === "pending" ? 0.5 : 1,
          }}>
            <StatusDot status={status}/>
            <span style={{ fontSize: 13, fontFamily: "var(--font-jakarta)", color: "#0D0D0D", flex: 1 }}>{label}</span>
            <span style={{ fontFamily: "var(--font-jetbrains)", fontSize: 11,
              color: status === "complete" ? "#6B7280" : status === "in_progress" ? "#D97706" : "#9CA3AF" }}>
              {status === "complete" ? time : status === "in_progress" ? "Filing now…" : "Pending"}
            </span>
          </div>
        ))}
      </div>
    </AppFrame>
  );
}

function MockupControl() {
  const rows = [
    { label: "Personal Info",  time: "00:01:23" },
    { label: "Filing Status",  time: "00:01:45" },
    { label: "W-2 Income",     time: "00:02:12" },
    { label: "1099 Income",    time: "00:02:34" },
    { label: "Deductions",     time: "00:03:01" },
    { label: "Credits",        time: "00:03:22" },
    { label: "Bank Info",      time: "00:03:45" },
  ];

  return (
    <AppFrame phase="filing">
      <div style={{ padding: "16px 20px", height: "100%", display: "flex", flexDirection: "column" }}>
        <p style={{ fontSize: 10, fontWeight: 600, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.12em", margin: "0 0 12px", fontFamily: "var(--font-jakarta)" }}>Filing Progress</p>
        <div style={{ flex: 1 }}>
          {rows.map(({ label, time }) => (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 6, marginBottom: 2 }}>
              <StatusDot status="complete"/>
              <span style={{ fontSize: 13, fontFamily: "var(--font-jakarta)", color: "#0D0D0D", flex: 1 }}>{label}</span>
              <span style={{ fontFamily: "var(--font-jetbrains)", fontSize: 11, color: "#6B7280" }}>{time}</span>
            </div>
          ))}
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 10px", borderRadius: 8, background: "#FEF3C7", border: "1px solid #FDE68A", marginBottom: 2, marginTop: 2 }}>
            <StatusDot status="in_progress"/>
            <span style={{ fontSize: 13, fontFamily: "var(--font-jakarta)", color: "#0D0D0D", flex: 1 }}>Review</span>
            <span style={{ fontSize: 11, fontFamily: "var(--font-jetbrains)", color: "#D97706" }}>Waiting for you</span>
          </div>
        </div>
        <div style={{ marginTop: 12, background: "#1B4332", borderRadius: 8, padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <p style={{ fontSize: 12, fontWeight: 600, color: "#FAF7F2", margin: 0, fontFamily: "var(--font-jakarta)" }}>Ready to submit your return</p>
            <p style={{ fontSize: 11, color: "rgba(250,247,242,0.6)", margin: 0, fontFamily: "var(--font-jakarta)" }}>Est. refund: $2,768.00</p>
          </div>
          <div style={{ background: "#FAF7F2", color: "#1B4332", borderRadius: 6, padding: "6px 14px", fontSize: 12, fontWeight: 700, fontFamily: "var(--font-jakarta)", flexShrink: 0 }}>Submit →</div>
        </div>
      </div>
    </AppFrame>
  );
}

// ─── Step data ─────────────────────────────────────────────────────────────
const STEPS = [
  {
    phase: "Collect", num: "01", title: "Hunt",
    desc: "April logs into every financial account you own — Fidelity, Schwab, Robinhood, Coinbase, your local credit union — and navigates to tax documents automatically. No bank partnerships required.",
    Mockup: MockupHunt,
  },
  {
    phase: null, num: "02", title: "Detect",
    desc: "April maps your entire financial picture for the year. It knows which documents it's found, which are still missing, and exactly which portals to visit next. Nothing slips through.",
    Mockup: MockupDetect,
  },
  {
    phase: null, num: "03", title: "Remember",
    desc: "April compares this year's documents to last year's. New accounts, missing income, unusual changes in amounts — all flagged before you even see the return.",
    Mockup: MockupRemember,
  },
  {
    phase: "Extract", num: "04", title: "Read",
    desc: "Claude reads every PDF — W-2s, 1099s, K-1s — and extracts every field. Box numbers, amounts, employer IDs, withholding figures. All captured at 99.2% field-level accuracy.",
    Mockup: MockupRead,
  },
  {
    phase: null, num: "05", title: "Verify",
    desc: "Every number is reconciled into your complete return. You see the full picture — total income, deductions, tax owed, estimated refund — before a single field is submitted.",
    Mockup: MockupVerify,
  },
  {
    phase: "File", num: "06", title: "File",
    desc: "April works through FreeTaxUSA section by section in real time. You can watch every click in the terminal log. The filing timeline updates live as each section completes.",
    Mockup: MockupFile,
  },
  {
    phase: null, num: "07", title: "Control",
    desc: "April pauses before submitting. Every field is yours to review and change. Once you hit submit, the return is sent. Nothing happens without your explicit approval.",
    Mockup: MockupControl,
  },
];

// ─── Main section ─────────────────────────────────────────────────────────
export function WorksSection() {
  const [active, setActive] = useState(0);
  const stepRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const observers = STEPS.map((_, i) => {
      const obs = new IntersectionObserver(
        ([e]) => { if (e.isIntersecting) setActive(i); },
        { threshold: 0.45, rootMargin: "-15% 0px -15% 0px" }
      );
      if (stepRefs.current[i]) obs.observe(stepRefs.current[i]!);
      return obs;
    });
    return () => observers.forEach(o => o.disconnect());
  }, []);

  return (
    <section id="how-it-works" style={{ background: "#FAF7F2", padding: "clamp(60px,8vw,100px) clamp(20px,5vw,60px)" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <SectionLabel>How It Works</SectionLabel>
        <h2 style={{ fontFamily: "var(--font-jakarta)", fontWeight: 700, fontSize: "clamp(28px,3.5vw,44px)", lineHeight: 1.15, color: "#0D0D0D", marginBottom: "clamp(48px,6vw,72px)", maxWidth: 480 }}>
          Seven steps.<br/>Zero effort on your part.
        </h2>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "clamp(40px,6vw,80px)", alignItems: "start" }}>

          {/* Left: scrollable steps */}
          <div>
            {STEPS.map(({ phase, num, title, desc }, i) => (
              <div key={i}>
                {/* Phase divider */}
                {phase && (
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 28, marginTop: i > 0 ? 20 : 0 }}>
                    <div style={{ height: 1, flex: 1, background: "#E5DDD0" }}/>
                    <span style={{ fontSize: 10, fontWeight: 700, color: "#1B4332", textTransform: "uppercase", letterSpacing: "0.18em", fontFamily: "var(--font-jakarta)", background: "#FAF7F2", padding: "0 10px" }}>{phase}</span>
                    <div style={{ height: 1, flex: 1, background: "#E5DDD0" }}/>
                  </div>
                )}

                {/* Step item */}
                <div
                  ref={el => { stepRefs.current[i] = el; }}
                  style={{
                    marginBottom: "clamp(48px,6vw,72px)",
                    opacity: active === i ? 1 : 0.35,
                    transition: `opacity 350ms ${EASE}`,
                    paddingLeft: 20,
                    borderLeft: active === i ? "2px solid #1B4332" : "2px solid transparent",
                    transitionProperty: "opacity, border-color",
                  }}
                >
                  <div style={{ fontFamily: "var(--font-jetbrains)", fontSize: 11, color: "#1B4332", marginBottom: 6 }}>{num}</div>
                  <h3 style={{ fontFamily: "var(--font-jakarta)", fontWeight: 700, fontSize: "clamp(24px,2.8vw,34px)", color: "#0D0D0D", margin: "0 0 12px", lineHeight: 1.2 }}>{title}</h3>
                  <p style={{ fontFamily: "var(--font-jakarta)", fontSize: "clamp(14px,1.4vw,16px)", lineHeight: "26px", color: "#6B7280", margin: 0 }}>{desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Right: sticky mockup panel — vertically centered in viewport */}
          <div style={{ position: "sticky", top: "max(88px, calc(50vh - 260px))", height: "fit-content" }}>
            <div style={{ position: "relative", height: 464 }}>
              {STEPS.map(({ Mockup }, i) => (
                <div key={i} style={{
                  position: "absolute", inset: 0,
                  opacity: active === i ? 1 : 0,
                  pointerEvents: active === i ? "auto" : "none",
                  transition: `opacity 400ms ${EASE}`,
                }}>
                  <Mockup/>
                </div>
              ))}
            </div>

            {/* Step dots */}
            <div style={{ display: "flex", justifyContent: "center", gap: 6, marginTop: 16 }}>
              {STEPS.map((_, i) => (
                <div key={i} style={{
                  width: active === i ? 20 : 6, height: 6, borderRadius: 3,
                  background: active === i ? "#1B4332" : "#D1D5DB",
                  transition: `width 300ms ${EASE}, background 300ms`,
                }}/>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
