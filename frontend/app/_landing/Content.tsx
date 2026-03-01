"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { EASE, useInView, useCountUp, enter, SectionLabel, OrganicBlob, StatusDot } from "./shared";

// ─── Product Reveal ───────────────────────────────────────────────────────────
const REVIEW_ROWS = [
  { label: "Filing Status",     val: "Single",         mono: false },
  { label: "Total Wages",       val: "$52,000.00",     mono: true  },
  { label: "Investment Income", val: "$16,811.00",     mono: true  },
  { label: "Total Income",      val: "$68,811.00",     mono: true  },
  { label: "Deductions",        val: "$(13,850.00)",   mono: true  },
  { label: "Federal Tax",       val: "$8,432.00",      mono: true  },
  { label: "Tax Withheld",      val: "$11,200.00",     mono: true  },
];

function CollectionPhase() {
  return (
    <div style={{ background: "#fff", border: "1px solid #E5E7EB", borderRadius: 12, overflow: "hidden", height: 380, display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "12px 16px", borderBottom: "1px solid #E5E7EB", display: "flex", alignItems: "center", gap: 7 }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: "#0D0D0D", fontFamily: "var(--font-jakarta)" }}>April</span>
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#1B4332" }}/>
      </div>
      <div style={{ flex: 1, padding: "16px 16px", display: "flex", flexDirection: "column", gap: 14, overflowY: "hidden" }}>
        <div style={{ borderLeft: "2px solid #1B4332", paddingLeft: 12 }}>
          <p style={{ fontSize: 14, lineHeight: "22px", color: "#0D0D0D", fontFamily: "var(--font-jakarta)", margin: 0 }}>
            I connected to your accounts and found these documents:
          </p>
        </div>
        <div style={{ borderLeft: "2px solid #1B4332", paddingLeft: 12 }}>
          <div style={{ fontSize: 13, fontFamily: "var(--font-jakarta)", display: "flex", flexDirection: "column", gap: 6 }}>
            {[
              { label: "Fidelity — W-2", detail: "wages: $52,000", done: true },
              { label: "Schwab — 1099-B", detail: "proceeds: $48,291", done: true },
              { label: "Schwab — 1099-INT", detail: "interest: $892", done: true },
              { label: "Coinbase — 1099-DA", detail: "not yet downloaded", done: false },
            ].map(({ label, detail, done }) => (
              <div key={label} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                <span style={{ color: done ? "#1B4332" : "#D97706", fontSize: 13, marginTop: 1 }}>{done ? "✓" : "○"}</span>
                <span>
                  <span style={{ color: "#0D0D0D" }}>{label}</span>
                  <span style={{ color: "#6B7280", fontFamily: "var(--font-jetbrains)", fontSize: 11 }}> ({detail})</span>
                </span>
              </div>
            ))}
          </div>
        </div>
        <div style={{ borderLeft: "2px solid #1B4332", paddingLeft: 12 }}>
          <p style={{ fontSize: 14, color: "#0D0D0D", fontFamily: "var(--font-jakarta)", margin: 0 }}>
            Should I log in to Coinbase and download your 1099-DA?
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {["Yes, find it →", "I'll upload it", "Skip for now"].map((chip, i) => (
            <div key={chip} style={{
              padding: "6px 14px", borderRadius: 999, fontSize: 12,
              fontFamily: "var(--font-jakarta)", fontWeight: 600,
              background: i === 0 ? "#EAF4EC" : "#F5F0E8",
              color: i === 0 ? "#1B4332" : "#6B7280",
              border: i === 0 ? "1px solid #1B4332" : "1px solid #E5E7EB",
              cursor: "default",
            }}>{chip}</div>
          ))}
        </div>
      </div>
      <div style={{ padding: "10px 14px", borderTop: "1px solid #E5E7EB" }}>
        <div style={{ background: "#FAF7F2", borderRadius: 10, padding: "8px 14px", fontSize: 13, color: "#9CA3AF", fontFamily: "var(--font-jakarta)" }}>Ask April anything…</div>
      </div>
    </div>
  );
}

function ReviewPhase() {
  return (
    <div style={{ background: "#fff", border: "1px solid #E5E7EB", borderRadius: 12, overflow: "hidden", height: 380 }}>
      <div style={{ background: "#EAF4EC", border: "none", borderBottom: "1px solid #D8F3DC", padding: "12px 20px", display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 15, color: "#1B4332" }}>✓</span>
        <div>
          <p style={{ fontSize: 13, fontWeight: 600, color: "#1B4332", margin: 0, fontFamily: "var(--font-jakarta)" }}>All information collected</p>
          <p style={{ fontSize: 12, color: "#2D6A4F", margin: 0, fontFamily: "var(--font-jakarta)" }}>Review your return below, then file when ready.</p>
        </div>
      </div>
      <div style={{ padding: "16px 20px" }}>
        {REVIEW_ROWS.map(({ label, val, mono }) => (
          <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "9px 0", borderBottom: "1px solid #F5F0E8" }}>
            <span style={{ fontSize: 13, color: "#6B7280", fontFamily: "var(--font-jakarta)" }}>{label}</span>
            <span style={{ fontSize: 13, color: "#0D0D0D", fontFamily: mono ? "var(--font-jetbrains)" : "var(--font-jakarta)", fontWeight: mono ? 400 : 500 }}>{val}</span>
          </div>
        ))}
        <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 0 16px" }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: "#0D0D0D", fontFamily: "var(--font-jakarta)" }}>Estimated Refund</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: "#1B4332", fontFamily: "var(--font-jetbrains)" }}>$2,768.00</span>
        </div>
        <Link href="/dashboard">
          <button style={{ width: "100%", background: "#1B4332", color: "#FAF7F2", border: "none", borderRadius: 8, padding: "11px 0", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-jakarta)" }}>
            File My Return →
          </button>
        </Link>
      </div>
    </div>
  );
}

function FilingPhase() {
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
    <div style={{ background: "#fff", border: "1px solid #E5E7EB", borderRadius: 12, overflow: "hidden", height: 380, padding: "20px 24px" }}>
      <p style={{ fontSize: 11, fontWeight: 600, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.12em", margin: "0 0 16px", fontFamily: "var(--font-jakarta)" }}>Filing Progress</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
        {rows.map(({ label, status, time }) => (
          <div key={label} style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "8px 10px", borderRadius: 8,
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
    </div>
  );
}

export function ProductReveal() {
  const [phase, setPhase] = useState(2);
  const { ref, inView } = useInView();
  const phases = ["Collection", "Review", "Filing"];
  const forms = ["W-2","1099-INT","1099-DIV","1099-B","1099-R","K-1","Sched. D","Form 8949","1095-A","W-2G","1099-NEC","1099-MISC","SSA-1099","1099-G","5498","1098","1098-T","1098-E"];

  useEffect(() => {
    const t = setInterval(() => setPhase(p => (p + 1) % 3), 4000);
    return () => clearInterval(t);
  }, []);

  return (
    <section id="product" ref={ref} style={{ background: "#fff", padding: "clamp(60px,8vw,100px) clamp(20px,5vw,60px)" }}>
      <div style={{ maxWidth: 1000, margin: "0 auto" }}>
        <SectionLabel>Product</SectionLabel>
        <h2 style={{ ...enter(inView), fontFamily: "var(--font-jakarta)", fontWeight: 700, fontSize: "clamp(28px,3.5vw,44px)", lineHeight: 1.15, color: "#0D0D0D", marginBottom: 32 }}>
          Watch April file a return.<br/>In real time.
        </h2>

        {/* Phase pills */}
        <div style={{ display: "flex", gap: 8, marginBottom: 28, flexWrap: "wrap" }}>
          {phases.map((p, i) => (
            <button key={p} onClick={() => setPhase(i)} style={{
              padding: "8px 18px", borderRadius: 999, fontSize: 13, cursor: "pointer",
              fontFamily: "var(--font-jakarta)", fontWeight: 600,
              background: phase===i ? "#1B4332" : "#FAF7F2",
              color: phase===i ? "#FAF7F2" : "#6B7280",
              border: phase===i ? "1px solid #1B4332" : "1px solid #E5DDD0",
              transition: `background 300ms, color 300ms`,
              display: "flex", alignItems: "center", gap: 6,
            }}>
              {p}
              {phase===i && <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#86EFAC", display: "inline-block" }}/>}
            </button>
          ))}
        </div>

        {/* Phase content */}
        <div style={{ ...enter(inView, 120) }}>
          {phase === 0 && <CollectionPhase/>}
          {phase === 1 && <ReviewPhase/>}
          {phase === 2 && <FilingPhase/>}
        </div>

        {/* Form marquee */}
        <div style={{ overflow: "hidden", marginTop: 28, paddingTop: 16, borderTop: "1px solid #E5DDD0" }}>
          <div style={{ display: "flex", animation: "marquee 28s linear infinite", whiteSpace: "nowrap" }}>
            {[...forms, ...forms].map((f, i) => (
              <span key={i} style={{ fontFamily: "var(--font-jetbrains)", fontSize: 12, color: "#9CA3AF" }}>
                {f}&nbsp;<span style={{ color: "#1B4332" }}>·</span>&nbsp;
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── The Gap ─────────────────────────────────────────────────────────────────
export function TheGap() {
  const { ref, inView } = useInView();
  const competitors = ["TurboTax", "H&R Block", "TaxAct", "April"];
  const rows: { label: string; vals: boolean[] }[] = [
    { label: "Works with Robinhood",          vals: [true,  true,  true,  true]  },
    { label: "Works with major brokerages",   vals: [true,  true,  true,  true]  },
    { label: "Works with local credit unions",vals: [false, false, false, true]  },
    { label: "Knows what's missing",          vals: [false, false, false, true]  },
    { label: "Hunts down documents for you",  vals: [false, false, false, true]  },
    { label: "Remembers last year",           vals: [false, false, false, true]  },
    { label: "Files without you lifting a finger", vals: [false, false, false, true] },
  ];

  return (
    <section ref={ref} style={{ background: "#F5F0E8", padding: "clamp(60px,8vw,100px) clamp(20px,5vw,60px)" }}>
      <div style={{ maxWidth: 1000, margin: "0 auto", display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: "clamp(40px,6vw,80px)" }}>
        <div>
          <SectionLabel>The Problem</SectionLabel>
          <h2 style={{ ...enter(inView), fontFamily: "var(--font-jakarta)", fontWeight: 700, fontSize: "clamp(24px,3vw,38px)", lineHeight: 1.2, color: "#0D0D0D", marginBottom: 32 }}>
            TurboTax connects<br/>to 350 banks.<br/>April connects to all of them.
          </h2>

          {/* Comparison table */}
          <div style={{ overflowX: "auto" }}>
            <div style={{ minWidth: 380, fontFamily: "var(--font-jetbrains)", fontSize: 12 }}>
              {/* Header */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 56px 56px 56px 56px", borderBottom: "1px solid #1B4332", paddingBottom: 8, marginBottom: 4, gap: 4 }}>
                <span/>
                {competitors.map((c, i) => (
                  <span key={c} style={{ textAlign: "center", color: i === competitors.length-1 ? "#1B4332" : "#6B7280", fontWeight: i === competitors.length-1 ? 700 : 400, fontSize: 10, textDecoration: i === competitors.length-1 ? "underline" : "none" }}>{c.split(" ")[0]}</span>
                ))}
              </div>
              {rows.map(({ label, vals }, i) => (
                <div key={i} style={{
                  ...enter(inView, 60 * i),
                  display: "grid", gridTemplateColumns: "1fr 56px 56px 56px 56px",
                  padding: "9px 0", borderBottom: "1px solid #E5DDD0", gap: 4,
                }}>
                  <span style={{ color: "#0D0D0D", fontSize: 11 }}>{label}</span>
                  {vals.map((v, j) => (
                    <span key={j} style={{ textAlign: "center", color: v ? "#1B4332" : "#D1D5DB", fontWeight: v && j === vals.length-1 ? 700 : 400 }}>{v ? "✓" : "✗"}</span>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center" }}>
          <div style={{ ...enter(inView, 200, -30) }}>
            <blockquote style={{ fontFamily: "var(--font-jakarta)", fontWeight: 600, fontSize: "clamp(20px,2.2vw,30px)", lineHeight: 1.3, color: "#0D0D0D", margin: 0, borderLeft: "3px solid #1B4332", paddingLeft: 20 }}>
              &ldquo;Every other tool assumes you already have your documents.&rdquo;
            </blockquote>
            <p style={{ fontFamily: "var(--font-jakarta)", fontSize: 16, color: "#6B7280", marginTop: 20, lineHeight: "26px", paddingLeft: 23 }}>
              We built April because nobody solved the hard part — hunting down every document before you even start.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Stats ───────────────────────────────────────────────────────────────────
export function Stats() {
  const { ref, inView } = useInView(0.3);
  const c1 = useCountUp(10,   inView);
  const c2 = useCountUp(992,  inView);
  const c3 = useCountUp(2840, inView);

  return (
    <section ref={ref} style={{ background: "#1B4332", padding: "clamp(60px,8vw,100px) clamp(20px,5vw,60px)", position: "relative", overflow: "hidden", color: "#1B4332" }}>
      <OrganicBlob opacity={0.08} size={500} top="-20%" left="60%"/>
      <OrganicBlob opacity={0.06} size={340} top="30%" left="-5%" animName="drift2" duration={25}/>
      <div style={{ maxWidth: 1000, margin: "0 auto", position: "relative", zIndex: 1 }}>
        <SectionLabel light>Results</SectionLabel>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 0 }}>
          {[
            { val: `~${c1} min`,               label: "average to file",  delay: 0   },
            { val: `${(c2/10).toFixed(1)}%`,   label: "field accuracy",   delay: 100 },
            { val: `$${c3.toLocaleString()}`,  label: "avg refund found", delay: 200 },
          ].map(({ val, label, delay }, i) => (
            <div key={i} style={{
              ...enter(inView, delay),
              textAlign: "center", flex: "1 1 200px",
              padding: "0 clamp(16px,3vw,40px)",
              borderLeft: i > 0 ? "1px solid rgba(250,247,242,0.2)" : "none",
            }}>
              <div style={{ fontFamily: "var(--font-jetbrains)", fontSize: "clamp(36px,5vw,56px)", fontWeight: 700, color: "#FAF7F2", lineHeight: 1 }}>{val}</div>
              <div style={{ fontFamily: "var(--font-jakarta)", fontSize: 14, color: "#86EFAC", marginTop: 10 }}>{label}</div>
            </div>
          ))}
        </div>
        <p style={{ ...enter(inView, 300), textAlign: "center", fontSize: 13, color: "#86EFAC", marginTop: 36, fontFamily: "var(--font-jakarta)", opacity: 0.8 }}>
          Based on 2025 tax season data from April users.
        </p>
      </div>
    </section>
  );
}

// ─── How It Works ─────────────────────────────────────────────────────────────
export function HowItWorks() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      const wrap = wrapRef.current;
      if (!wrap) return;
      const { top, height } = wrap.getBoundingClientRect();
      setProgress(Math.max(0, Math.min(1, -top / (height - window.innerHeight))));
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const panels = [
    {
      num: "01", title: "Hunt",
      desc: "April logs into every financial account you have. Navigates the UI just like a human. Downloads tax documents automatically — no bank partnerships, no setup.",
      demo: (
        // Matches actual TerminalLog: bg-white border border-hairline rounded-xl font-mono text-[12px] text-muted
        <div style={{ width: 300, background: "#fff", border: "1px solid #E5E7EB", borderRadius: 12, padding: 16 }}>
          <p style={{ fontSize: 10, fontWeight: 600, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 12px", fontFamily: "var(--font-jakarta)" }}>Agent Log</p>
          {[
            { time: "10:42:01", msg: "Navigating to schwab.com…", done: true  },
            { time: "10:42:04", msg: "Logging in with credentials…", done: true  },
            { time: "10:42:08", msg: "Clicking 'Tax Documents 2025'…", done: true  },
            { time: "10:42:11", msg: "Downloading 1099-B_2025.pdf…", done: true  },
            { time: "10:42:14", msg: "Navigating to Coinbase…", done: false },
          ].map(({ time, msg, done }, i) => (
            <div key={i} style={{ fontFamily: "var(--font-jetbrains)", fontSize: 11, marginBottom: 6, display: "flex", gap: 8 }}>
              <span style={{ color: "#9CA3AF", flexShrink: 0 }}>{time}</span>
              <span style={{ color: done ? "#0D0D0D" : "#D97706" }}>{msg}</span>
            </div>
          ))}
        </div>
      ),
    },
    {
      num: "02", title: "Read",
      desc: "Claude reads every PDF — W-2s, 1099s, K-1s — extracting every field with 99.2% accuracy. Numbers are verified. Anomalies flagged. Nothing missed.",
      demo: (
        // Matches actual ChatMessage: border-l-2 border-green pl-3 text-[14px] text-ink
        <div style={{ width: 300, background: "#fff", border: "1px solid #E5E7EB", borderRadius: 12, overflow: "hidden" }}>
          <div style={{ padding: "10px 14px", borderBottom: "1px solid #E5E7EB", display: "flex", alignItems: "center", gap: 7 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "#0D0D0D", fontFamily: "var(--font-jakarta)" }}>April</span>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#1B4332" }}/>
          </div>
          <div style={{ padding: "14px 14px", display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ borderLeft: "2px solid #1B4332", paddingLeft: 10 }}>
              <p style={{ fontSize: 13, lineHeight: "20px", color: "#0D0D0D", fontFamily: "var(--font-jakarta)", margin: "0 0 8px" }}>Extracted your 1099-B from Schwab:</p>
              <div style={{ fontFamily: "var(--font-jetbrains)", fontSize: 11, display: "flex", flexDirection: "column", gap: 4 }}>
                {[["Box 1a Proceeds", "$48,291.00"],["Box 1b Cost Basis","$31,480.00"],["Box 4 Withheld","$0.00"],["Net Gain","$16,811.00"]].map(([k,v]) => (
                  <div key={k} style={{ display: "flex", justifyContent: "space-between", paddingBottom: 4, borderBottom: "1px solid #F5F0E8" }}>
                    <span style={{ color: "#6B7280" }}>{k}</span>
                    <span style={{ color: "#1B4332" }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ borderLeft: "2px solid #1B4332", paddingLeft: 10 }}>
              <p style={{ fontSize: 13, color: "#0D0D0D", fontFamily: "var(--font-jakarta)", margin: 0 }}>Does this look correct?</p>
            </div>
            <div style={{ textAlign: "right" }}>
              <p style={{ fontSize: 13, color: "#6B7280", fontFamily: "var(--font-jakarta)", margin: 0 }}>Yes, continue</p>
            </div>
          </div>
        </div>
      ),
    },
    {
      num: "03", title: "File",
      desc: "Your return is submitted section by section through FreeTaxUSA in real time. Watch every step. Stop to review. The agent waits for you.",
      demo: (
        // Matches actual FilingTimeline styling
        <div style={{ width: 300, background: "#fff", border: "1px solid #E5E7EB", borderRadius: 12, padding: 16 }}>
          <p style={{ fontSize: 10, fontWeight: 600, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.12em", margin: "0 0 12px", fontFamily: "var(--font-jakarta)" }}>Filing Progress</p>
          {[
            { label: "Personal Info",  status: "complete",    time: "00:01:23" },
            { label: "Filing Status",  status: "complete",    time: "00:01:45" },
            { label: "W-2 Income",     status: "complete",    time: "00:02:12" },
            { label: "1099 Income",    status: "complete",    time: "00:02:34" },
            { label: "Deductions",     status: "in_progress", time: null       },
            { label: "Credits",        status: "pending",     time: null       },
          ].map(({ label, status, time }) => (
            <div key={label} style={{
              display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", borderRadius: 6,
              background: status === "in_progress" ? "#FEF3C7" : "transparent",
              opacity: status === "pending" ? 0.5 : 1, marginBottom: 2,
            }}>
              <StatusDot status={status as "complete"|"in_progress"|"pending"}/>
              <span style={{ fontSize: 12, fontFamily: "var(--font-jakarta)", color: "#0D0D0D", flex: 1 }}>{label}</span>
              <span style={{ fontSize: 11, fontFamily: "var(--font-jetbrains)", color: status === "complete" ? "#9CA3AF" : status === "in_progress" ? "#D97706" : "#D1D5DB" }}>
                {status === "complete" ? time : status === "in_progress" ? "Filing…" : "—"}
              </span>
            </div>
          ))}
        </div>
      ),
    },
  ];

  return (
    <div id="how-it-works" ref={wrapRef} style={{ height: "400vh", position: "relative" }}>
      <div style={{ position: "sticky", top: 0, height: "100vh", overflow: "hidden", background: "#fff" }}>
        {/* Progress line */}
        <div style={{ height: 2, background: "#E5DDD0", position: "absolute", top: 0, left: 0, right: 0, zIndex: 2 }}>
          <div style={{ height: "100%", background: "#1B4332", width: `${progress * 100}%`, transition: "width 40ms" }}/>
        </div>

        <div style={{ padding: "56px 40px 0", borderBottom: "1px solid #E5DDD0" }}>
          <SectionLabel>How It Works</SectionLabel>
        </div>

        <div style={{ display: "flex", transform: `translateX(${-progress * 200}vw)`, transition: "transform 40ms linear", height: "calc(100vh - 96px)", alignItems: "center" }}>
          {panels.map(({ num, title, desc, demo }) => (
            <div key={num} style={{ minWidth: "100vw", height: "100%", padding: "clamp(32px,5vw,64px) clamp(40px,7vw,100px)", display: "flex", alignItems: "center", gap: "clamp(40px,6vw,80px)" }}>
              <div style={{ flex: 1, maxWidth: 480 }}>
                <div style={{ fontFamily: "var(--font-jakarta)", fontWeight: 400, fontSize: "clamp(56px,8vw,96px)", color: "#E5DDD0", lineHeight: 1 }}>{num}</div>
                <h3 style={{ fontFamily: "var(--font-jakarta)", fontWeight: 700, fontSize: "clamp(32px,4vw,48px)", color: "#0D0D0D", margin: "4px 0 16px" }}>{title}</h3>
                <p style={{ fontFamily: "var(--font-jakarta)", fontSize: "clamp(14px,1.5vw,17px)", lineHeight: "28px", color: "#6B7280", maxWidth: 420, borderLeft: "2px solid #1B4332", paddingLeft: 16, margin: 0 }}>{desc}</p>
              </div>
              <div style={{ flexShrink: 0 }}>{demo}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Feature row — individual component so hook is valid ─────────────────────
function FeatureRow({ num, title, body, bg, right }: {
  num: string; title: string; body: string; bg: string; right: React.ReactNode;
}) {
  const { ref, inView } = useInView();
  return (
    <section ref={ref} style={{ background: bg, padding: "clamp(60px,8vw,80px) clamp(20px,5vw,60px)" }}>
      <div style={{ maxWidth: 1000, margin: "0 auto", display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: "clamp(40px,5vw,72px)", alignItems: "center" }}>
        <div style={{ ...enter(inView, 0, -32) }}>
          <div style={{ fontFamily: "var(--font-jakarta)", fontWeight: 400, fontSize: "clamp(48px,6vw,72px)", color: "#E5DDD0", lineHeight: 1, marginBottom: 4 }}>{num}</div>
          <h3 style={{ fontFamily: "var(--font-jakarta)", fontWeight: 700, fontSize: "clamp(22px,2.5vw,30px)", color: "#0D0D0D", margin: "4px 0 14px" }}>{title}</h3>
          <p style={{ fontFamily: "var(--font-jakarta)", fontSize: "clamp(14px,1.4vw,16px)", lineHeight: "26px", color: "#6B7280", maxWidth: 440, borderLeft: "2px solid #1B4332", paddingLeft: 14, margin: 0 }}>{body}</p>
        </div>
        <div style={{ ...enter(inView, 140, 32), flexShrink: 0 }}>{right}</div>
      </div>
    </section>
  );
}

export function Features() {
  return (
    <div id="features">
      <FeatureRow num="01" title="Document Intelligence" bg="#fff"
        body="April knows what's missing. It maps your entire financial year and tells you exactly which documents haven't been collected yet — before you even ask."
        right={
          // Chat panel style matching actual component
          <div style={{ width: 280, background: "#fff", border: "1px solid #E5E7EB", borderRadius: 12, overflow: "hidden" }}>
            <div style={{ padding: "10px 14px", borderBottom: "1px solid #E5E7EB", display: "flex", alignItems: "center", gap: 7 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#0D0D0D", fontFamily: "var(--font-jakarta)" }}>April</span>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#1B4332" }}/>
            </div>
            <div style={{ padding: "14px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ borderLeft: "2px solid #1B4332", paddingLeft: 10 }}>
                <p style={{ fontSize: 12, lineHeight: "18px", color: "#0D0D0D", fontFamily: "var(--font-jakarta)", margin: 0 }}>
                  I found <span style={{ fontFamily: "var(--font-jetbrains)", fontSize: 11 }}>3</span> documents. Still missing your Coinbase 1099-DA. Should I log in and get it?
                </p>
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {["Yes, find it →", "I'll upload"].map((chip, i) => (
                  <div key={chip} style={{ padding: "4px 10px", borderRadius: 999, fontSize: 11, background: i===0?"#EAF4EC":"#F5F0E8", color: i===0?"#1B4332":"#6B7280", border: i===0?"1px solid #1B4332":"1px solid #E5E7EB", fontFamily: "var(--font-jakarta)", fontWeight: 600 }}>{chip}</div>
                ))}
              </div>
            </div>
          </div>
        }
      />

      <FeatureRow num="02" title="Browser-Native Filing" bg="#F5F0E8"
        body="No API partnerships required. April navigates any portal UI directly — Schwab's six-step download flow, your obscure local credit union, any government portal."
        right={
          // TerminalLog style: bg-white border rounded-xl font-mono text-[12px] text-muted
          <div style={{ width: 280, background: "#fff", border: "1px solid #E5E7EB", borderRadius: 12, padding: 16 }}>
            <p style={{ fontSize: 10, fontWeight: 600, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 10px", fontFamily: "var(--font-jakarta)" }}>Agent Log</p>
            {[
              { time: "10:42:01", msg: "Navigating to freeta…", ok: true  },
              { time: "10:42:04", msg: "Section: W-2 Income",   ok: true  },
              { time: "10:42:08", msg: "Section: 1099 Income",  ok: true  },
              { time: "10:42:12", msg: "Section: Deductions…",  ok: false },
            ].map(({ time, msg, ok }, i) => (
              <div key={i} style={{ fontFamily: "var(--font-jetbrains)", fontSize: 11, marginBottom: 6, display: "flex", gap: 8 }}>
                <span style={{ color: "#9CA3AF", flexShrink: 0 }}>{time}</span>
                <span style={{ color: ok ? "#0D0D0D" : "#D97706" }}>{msg}{ok ? " ✓" : ""}</span>
              </div>
            ))}
          </div>
        }
      />

      <FeatureRow num="03" title="Memory Across Years" bg="#fff"
        body="April remembers your financial life year over year — comparing documents, flagging new accounts, catching missing income before you even notice it's gone."
        right={
          <div style={{ width: 280, background: "#fff", border: "1px solid #E5E7EB", borderRadius: 12, overflow: "hidden" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", background: "#F5F0E8", padding: "8px 14px", fontSize: 11, fontFamily: "var(--font-jakarta)", fontWeight: 600, color: "#6B7280", borderBottom: "1px solid #E5E7EB" }}>
              <span>2024</span><span>2025</span>
            </div>
            {[
              { a: "Fidelity W-2",      b: "Fidelity W-2",      isNew: false, changed: false },
              { a: "Schwab 1099-B",     b: "Schwab 1099-B",     isNew: false, changed: false },
              { a: "Schwab 1099-INT",   b: "Schwab 1099-INT",   isNew: false, changed: false },
              { a: "—",                 b: "Coinbase 1099-DA",   isNew: true,  changed: false },
              { a: "RSU Income $28k",   b: "RSU Income $40k",   isNew: false, changed: true  },
            ].map(({ a, b, isNew, changed }) => (
              <div key={a} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", padding: "8px 14px", borderBottom: "1px solid #F5F0E8", fontSize: 12, fontFamily: "var(--font-jakarta)" }}>
                <span style={{ color: "#9CA3AF" }}>{a}</span>
                <span style={{ color: isNew?"#1B4332":changed?"#D97706":"#0D0D0D", background: isNew?"#D8F3DC":changed?"#FEF3C7":"transparent", padding: isNew||changed?"1px 5px":"0", borderRadius: 4 }}>
                  {b}{isNew?" 🆕":changed?" ↑":""}
                </span>
              </div>
            ))}
          </div>
        }
      />

      <FeatureRow num="04" title="You're In Control" bg="#F5F0E8"
        body="April pauses before every submission. Review every field, make any change. The agent waits. Nothing is submitted without your explicit approval."
        right={
          // FilingTimeline style, paused at Review
          <div style={{ width: 280, background: "#fff", border: "1px solid #E5E7EB", borderRadius: 12, padding: 16 }}>
            <p style={{ fontSize: 10, fontWeight: 600, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.12em", margin: "0 0 12px", fontFamily: "var(--font-jakarta)" }}>Filing Progress</p>
            {[
              { label: "Personal Info",  s: "complete", t: "00:01:23" },
              { label: "W-2 Income",     s: "complete", t: "00:02:12" },
              { label: "Deductions",     s: "complete", t: "00:03:01" },
              { label: "Credits",        s: "complete", t: "00:03:22" },
              { label: "Review",         s: "in_progress", t: null    },
            ].map(({ label, s, t }) => (
              <div key={label} style={{
                display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", borderRadius: 6, marginBottom: 2,
                background: s === "in_progress" ? "#FEF3C7" : "transparent",
              }}>
                <StatusDot status={s as "complete"|"in_progress"|"pending"}/>
                <span style={{ fontSize: 12, fontFamily: "var(--font-jakarta)", color: "#0D0D0D", flex: 1 }}>{label}</span>
                <span style={{ fontSize: 10, fontFamily: "var(--font-jetbrains)", color: s==="complete"?"#9CA3AF":"#D97706" }}>
                  {s === "complete" ? t : "Waiting for you"}
                </span>
              </div>
            ))}
            <div style={{ marginTop: 12, padding: "8px 0", borderTop: "1px solid #E5E7EB", fontSize: 12, color: "#1B4332", fontFamily: "var(--font-jakarta)", fontWeight: 600, textAlign: "center" }}>
              Ready to submit — your approval needed
            </div>
          </div>
        }
      />
    </div>
  );
}

// ─── Accuracy ─────────────────────────────────────────────────────────────────
export function Accuracy() {
  const { ref, inView } = useInView();
  const rows = [
    { label: "W-2 Wages & Withholding",           pct: 99.6 },
    { label: "1099-B Investment Transactions",      pct: 98.9 },
    { label: "1099-INT / DIV Interest & Dividends", pct: 99.4 },
    { label: "Schedule D Cost Basis",               pct: 98.7 },
    { label: "Self-Reported Figures (1099-NEC)",    pct: 99.1 },
  ];

  return (
    <section ref={ref} style={{ background: "#fff", padding: "clamp(60px,8vw,100px) clamp(20px,5vw,60px)" }}>
      <div style={{ maxWidth: 1000, margin: "0 auto", display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: "clamp(40px,6vw,80px)", alignItems: "start" }}>
        <div>
          <SectionLabel>Accuracy</SectionLabel>
          <h2 style={{ fontFamily: "var(--font-jakarta)", fontWeight: 700, fontSize: "clamp(24px,3vw,38px)", lineHeight: 1.2, color: "#0D0D0D", marginBottom: 16 }}>
            Field-level accuracy.<br/>Not document-level.
          </h2>
          <p style={{ fontFamily: "var(--font-jakarta)", fontSize: 16, lineHeight: "26px", color: "#6B7280", marginBottom: 32 }}>
            99.2% of individual fields extracted correctly across W-2s, 1099s, and Schedule D. Verified on 2025 tax season data.
          </p>
          {rows.map(({ label, pct }, i) => (
            <div key={label} style={{
              ...enter(inView, i * 70),
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "10px 0 10px 12px", borderBottom: "1px solid #E5E7EB",
              borderLeft: "2px solid #1B4332", marginBottom: 2,
            }}>
              <span style={{ fontSize: 13, color: "#0D0D0D", fontFamily: "var(--font-jakarta)" }}>{label}</span>
              <span style={{ fontFamily: "var(--font-jetbrains)", fontSize: 13, color: "#1B4332", fontWeight: 700, flexShrink: 0, marginLeft: 12 }}>{pct}%</span>
            </div>
          ))}
        </div>
        <div style={{ paddingTop: 80 }}>
          <div style={{ background: "#F5F0E8", borderRadius: 12, padding: 24 }}>
            <p style={{ fontSize: 12, color: "#6B7280", fontFamily: "var(--font-jakarta)", marginBottom: 20, fontWeight: 600 }}>Accuracy by document type</p>
            {rows.map(({ label, pct }, i) => (
              <div key={label} style={{ marginBottom: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                  <span style={{ fontSize: 11, color: "#6B7280", fontFamily: "var(--font-jakarta)" }}>{label.split(" ").slice(0, 2).join(" ")}</span>
                  <span style={{ fontSize: 11, fontFamily: "var(--font-jetbrains)", color: "#1B4332" }}>{pct}%</span>
                </div>
                <div style={{ height: 5, background: "#E5DDD0", borderRadius: 3, overflow: "hidden" }}>
                  <div style={{
                    height: "100%", background: "#1B4332", borderRadius: 3,
                    width: inView ? `${pct}%` : "0%",
                    transition: `width 1000ms ${EASE} ${i * 120}ms`,
                  }}/>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Testimonials ─────────────────────────────────────────────────────────────
const QUOTES = [
  { q: "I watched April log into Schwab and pull my 1099s. I actually said 'whoa' out loud.", by: "Michael Torres", meta: "filed in 8 minutes" },
  { q: "Finally understood what a Schedule D was because April explained it while it filed.", by: "Sarah Chen", meta: "W-2 + investments" },
  { q: "Caught a 1099 I'd completely forgotten about. Found it in my Coinbase account.", by: "Raj Patel", meta: "crypto + stocks" },
  { q: "The terminal log showing every click April makes is somehow the most reassuring thing I've ever seen in software.", by: "David Kim", meta: "RSU + 1099-NEC" },
  { q: "Set it up on a Saturday morning. By the time my coffee was done, my return was filed.", by: "Priya Nair", meta: "filed in 11 minutes" },
];

export function Testimonials() {
  const { ref, inView } = useInView();
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setIdx(p => (p + 1) % QUOTES.length), 4800);
    return () => clearInterval(t);
  }, []);

  return (
    <section ref={ref} style={{ background: "#F5F0E8", padding: "clamp(60px,8vw,100px) clamp(20px,5vw,60px)", textAlign: "center" }}>
      <div style={{ maxWidth: 760, margin: "0 auto" }}>
        <SectionLabel>What People Say</SectionLabel>

        {/* Big opening quote */}
        <div style={{
          ...enter(inView),
          fontFamily: "Georgia, 'Times New Roman', serif",
          fontSize: "clamp(80px,14vw,160px)", lineHeight: 0.7,
          color: "#1B4332", opacity: 0.13, userSelect: "none",
          marginBottom: "clamp(12px,2vw,24px)",
        }}>&ldquo;</div>

        {/* Quote carousel */}
        <div style={{ ...enter(inView, 60), position: "relative", height: "clamp(180px,22vw,240px)", marginBottom: 40 }}>
          {QUOTES.map(({ q, by, meta }, i) => (
            <div key={i} style={{
              position: "absolute", top: 0, left: 0, right: 0,
              opacity: idx === i ? 1 : 0,
              transform: idx === i ? "translateY(0)" : "translateY(14px)",
              transition: `opacity 550ms ${EASE}, transform 550ms ${EASE}`,
              pointerEvents: idx === i ? "auto" : "none",
            }}>
              <blockquote style={{
                fontFamily: "var(--font-jakarta)", fontWeight: 500,
                fontSize: "clamp(18px,2.2vw,28px)", lineHeight: 1.45,
                color: "#0D0D0D", margin: "0 0 20px",
              }}>{q}</blockquote>
              <p style={{ fontFamily: "var(--font-jakarta)", fontSize: 14, color: "#6B7280", margin: 0 }}>
                — {by}
                <span style={{ fontFamily: "var(--font-jetbrains)", fontSize: 11, color: "#9CA3AF", marginLeft: 8 }}>{meta}</span>
              </p>
            </div>
          ))}
        </div>

        {/* Progress dots */}
        <div style={{ display: "flex", justifyContent: "center", gap: 7 }}>
          {QUOTES.map((_, i) => (
            <div key={i} onClick={() => setIdx(i)} style={{
              width: idx === i ? 24 : 8, height: 8, borderRadius: 4,
              background: idx === i ? "#1B4332" : "#C8C0B5",
              cursor: "pointer",
              transition: `width 300ms ${EASE}, background 300ms`,
            }}/>
          ))}
        </div>
      </div>
    </section>
  );
}
