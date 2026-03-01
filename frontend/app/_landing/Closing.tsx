"use client";
import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { EASE, useInView, enter, SectionLabel, OrganicBlob } from "./shared";

// ─── Pricing ─────────────────────────────────────────────────────────────────
export function Pricing() {
  const { ref, inView } = useInView();
  const tiers = [
    {
      name: "Complete", price: "$99",
      items: ["Everything in Simple", "+ Investment income", "+ Crypto & NFTs", "+ Freelance / 1099-NEC", "+ RSU & stock options", "+ Deduction optimization"],
      highlight: false,
    },
    {
      name: "Simple", price: "$49",
      items: ["Federal + state return", "W-2 income", "Auto document collection", "One-click filing"],
      highlight: true,
    },
    {
      name: "Professional", price: "$199",
      items: ["Everything in Complete", "+ K-1 partnership returns", "+ Multi-state filing", "+ Foreign income", "+ CPA handoff ready", "+ Audit support"],
      highlight: false,
    },
  ];

  return (
    <section id="pricing" ref={ref} style={{ background: "#1B4332", padding: "clamp(60px,8vw,100px) clamp(20px,5vw,60px)", position: "relative", overflow: "hidden", color: "#1B4332" }}>
      <OrganicBlob opacity={0.07} size={450} top="-15%" left="60%"/>
      <OrganicBlob opacity={0.05} size={300} top="40%" left="-5%" animName="drift2" duration={28}/>
      <div style={{ maxWidth: 900, margin: "0 auto", position: "relative", zIndex: 1 }}>
        <SectionLabel light>Pricing</SectionLabel>
        <h2 style={{ ...enter(inView), fontFamily: "var(--font-jakarta)", fontWeight: 700, fontSize: "clamp(28px,4vw,48px)", lineHeight: 1.15, color: "#FAF7F2", textAlign: "center", marginBottom: 48 }}>
          Simple pricing.<br/>No surprises.
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", borderTop: "1px solid rgba(250,247,242,0.2)", borderBottom: "1px solid rgba(250,247,242,0.2)" }}>
          {tiers.map(({ name, price, items, highlight }, i) => (
            <div key={name} style={{
              ...enter(inView, i * 80), padding: "clamp(20px,3vw,32px) clamp(16px,2.5vw,24px)",
              position: "relative", borderLeft: i > 0 ? "1px solid rgba(250,247,242,0.2)" : "none",
            }}>
              {highlight && (
                <div style={{
                  position: "absolute", top: 0, left: 0, right: 0, height: 2, background: "#86EFAC",
                  transform: inView ? "scaleX(1)" : "scaleX(0)", transformOrigin: "left",
                  transition: `transform 600ms ${EASE} 300ms`,
                }}/>
              )}
              <div style={{ fontFamily: "var(--font-jakarta)", fontWeight: 600, fontSize: 15, color: highlight ? "#86EFAC" : "rgba(250,247,242,0.7)", marginBottom: 6 }}>{name}</div>
              <div style={{ fontFamily: "var(--font-jetbrains)", fontSize: "clamp(28px,3.5vw,40px)", color: "#FAF7F2", fontWeight: 700, marginBottom: 20 }}>{price}</div>
              {items.map(item => (
                <div key={item} style={{ fontSize: 13, color: "rgba(250,247,242,0.65)", fontFamily: "var(--font-jakarta)", padding: "5px 0", borderBottom: "1px solid rgba(250,247,242,0.08)", display: "flex", gap: 6, alignItems: "flex-start" }}>
                  <span style={{ color: highlight ? "#86EFAC" : "rgba(250,247,242,0.4)", fontSize: 12, marginTop: 1, flexShrink: 0 }}>✓</span>
                  {item}
                </div>
              ))}
              <Link href="/dashboard">
                <button style={{
                  marginTop: 20, width: "100%", padding: "10px 0",
                  background: highlight ? "#FAF7F2" : "transparent",
                  color: highlight ? "#1B4332" : "#FAF7F2",
                  border: highlight ? "none" : "1px solid rgba(250,247,242,0.3)",
                  borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer",
                  fontFamily: "var(--font-jakarta)",
                }}>Get started →</button>
              </Link>
            </div>
          ))}
        </div>
        <p style={{ ...enter(inView, 400), textAlign: "center", fontSize: 13, color: "#86EFAC", marginTop: 20, fontFamily: "var(--font-jakarta)" }}>
          ★ 100% accuracy guarantee — if we miss a field, we&rsquo;ll refile for free
        </p>
      </div>
    </section>
  );
}

// ─── Security ─────────────────────────────────────────────────────────────────
const SECURITY_CARDS = [
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <rect x="3" y="9" width="14" height="9" rx="2" stroke="#1B4332" strokeWidth="1.5"/>
        <path d="M7 9V6a3 3 0 016 0v3" stroke="#1B4332" strokeWidth="1.5" strokeLinecap="round"/>
        <circle cx="10" cy="13.5" r="1.5" fill="#1B4332"/>
      </svg>
    ),
    heading: "256-bit AES encryption",
    body: "Every document, credential, and field is encrypted end-to-end. Data is never stored in plaintext.",
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <circle cx="10" cy="10" r="7" stroke="#1B4332" strokeWidth="1.5"/>
        <path d="M10 6v4l3 3" stroke="#1B4332" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
    heading: "Session-only credentials",
    body: "We never store your bank passwords. Credentials exist only during the collection session, then are discarded.",
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path d="M10 2L17 5.5V10C17 14 13.5 17.5 10 18C6.5 17.5 3 14 3 10V5.5L10 2Z" stroke="#1B4332" strokeWidth="1.5" strokeLinejoin="round"/>
        <path d="M7 10l2 2 4-4" stroke="#1B4332" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    heading: "SOC 2 Type II certified",
    body: "Independently audited each year. Our security controls meet the highest industry standards.",
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path d="M4 6h12M4 10h8M4 14h6" stroke="#1B4332" strokeWidth="1.5" strokeLinecap="round"/>
        <rect x="13" y="11" width="4" height="5" rx="1" stroke="#1B4332" strokeWidth="1.2"/>
      </svg>
    ),
    heading: "Full audit trail",
    body: "Every agent action is logged with a timestamp. You can replay exactly what April did at any point.",
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path d="M10 3v10M6 13l4 4 4-4" stroke="#1B4332" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M3 17h14" stroke="#1B4332" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
    heading: "Portal sessions auto-expire",
    body: "As soon as collection is complete, all portal sessions are closed and cleared. No lingering access.",
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <circle cx="10" cy="10" r="7" stroke="#1B4332" strokeWidth="1.5"/>
        <path d="M7 10h6M10 7v6" stroke="#1B4332" strokeWidth="1.5" strokeLinecap="round"/>
        <path d="M13 7l-6 6" stroke="#1B4332" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
    heading: "Zero data sold",
    body: "Your tax data is yours. We don't sell, share, or use it to train models. Ever.",
  },
];

export function Security() {
  const { ref, inView } = useInView();
  return (
    <section ref={ref} style={{ background: "#fff", padding: "clamp(60px,8vw,100px) clamp(20px,5vw,60px)" }}>
      <div style={{ maxWidth: 1000, margin: "0 auto" }}>
        <SectionLabel>Security</SectionLabel>
        <h2 style={{ ...enter(inView), fontFamily: "var(--font-jakarta)", fontWeight: 700, fontSize: "clamp(24px,3vw,38px)", lineHeight: 1.2, color: "#0D0D0D", marginBottom: 48 }}>
          Built for your most<br/>sensitive data.
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "clamp(16px,2.5vw,28px)" }}>
          {SECURITY_CARDS.map(({ icon, heading, body }, i) => (
            <div key={heading} style={{
              ...enter(inView, i * 60),
              background: "#FAF7F2", borderRadius: 12,
              border: "1px solid #E5DDD0", padding: "clamp(16px,2vw,24px)",
            }}>
              <div style={{ width: 40, height: 40, background: "#EAF4EC", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
                {icon}
              </div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#0D0D0D", fontFamily: "var(--font-jakarta)", marginBottom: 6 }}>{heading}</div>
              <p style={{ fontSize: 13, color: "#6B7280", fontFamily: "var(--font-jakarta)", lineHeight: "20px", margin: 0 }}>{body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── FAQ ─────────────────────────────────────────────────────────────────────
export function FAQ() {
  const { ref, inView } = useInView();
  const [open, setOpen] = useState<number | null>(null);
  const faqs = [
    { q: "How does April access my accounts?",        a: "April uses a browser agent that navigates portals exactly like a human — logging in, clicking through menus, and downloading documents. No screen-scraping APIs or bank integrations required." },
    { q: "Do you store my credentials?",              a: "Never. Credentials are used only for the duration of the session and are never written to disk or our database. Sessions are destroyed the moment collection is complete." },
    { q: "What if a portal blocks automated access?", a: "April handles CAPTCHA prompts, MFA flows, and unusual portal layouts. In rare cases where a portal is truly inaccessible, April flags the document and guides you to upload it manually." },
    { q: "How accurate is the data extraction?",      a: "99.2% field-level accuracy measured across our 2025 tax season dataset. Backed by a 100% accuracy guarantee — if we miss a field, we refile for free." },
    { q: "Can I review before April submits?",        a: "Yes, always. April pauses before each section and waits for your explicit approval. You can edit any field before anything is sent to FreeTaxUSA." },
    { q: "What tax situations does April handle?",    a: "W-2 income, investments (stocks, crypto, ETFs), freelance/1099-NEC, RSU vesting, K-1 partnerships, multi-state filing, and most common deductions and credits." },
    { q: "What if something goes wrong?",             a: "Every action April takes is logged with a timestamp. You can review the full agent log, roll back any section, and our support team has full visibility. Our accuracy guarantee covers refiling at no cost." },
    { q: "Which filing platform does April use?",     a: "April files through FreeTaxUSA — which supports federal + state returns at no additional cost. April's fee covers the AI collection, extraction, and filing automation layer on top." },
  ];

  return (
    <section id="faq" ref={ref} style={{ background: "#fff", padding: "clamp(60px,8vw,100px) clamp(20px,5vw,60px)" }}>
      <div style={{ maxWidth: 680, margin: "0 auto" }}>
        <SectionLabel>FAQ</SectionLabel>
        <h2 style={{ ...enter(inView), fontFamily: "var(--font-jakarta)", fontWeight: 700, fontSize: "clamp(24px,3vw,38px)", lineHeight: 1.2, color: "#0D0D0D", marginBottom: 40 }}>
          Common questions.
        </h2>
        {faqs.map(({ q, a }, i) => (
          <div key={i} style={{ borderBottom: "1px solid #E5DDD0" }}>
            <button
              onClick={() => setOpen(open === i ? null : i)}
              style={{
                width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "18px 0", background: "none", border: "none", cursor: "pointer",
                fontFamily: "var(--font-jakarta)", fontSize: "clamp(14px,1.5vw,16px)", fontWeight: 600, color: "#0D0D0D", textAlign: "left",
              }}
            >
              {q}
              <span style={{
                fontSize: 20, color: "#1B4332", fontWeight: 300, flexShrink: 0, marginLeft: 16,
                display: "inline-block", lineHeight: 1,
                transform: open === i ? "rotate(45deg)" : "none",
                transition: `transform 200ms cubic-bezier(0.34,1.56,0.64,1)`,
              }}>+</span>
            </button>
            <div style={{ maxHeight: open === i ? 240 : 0, overflow: "hidden", transition: "max-height 300ms ease-out" }}>
              <p style={{ padding: "0 0 20px", fontFamily: "var(--font-jakarta)", fontSize: 15, lineHeight: "24px", color: "#6B7280", margin: 0 }}>{a}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── Final CTA ────────────────────────────────────────────────────────────────
export function FinalCTA() {
  const { ref, inView } = useInView();
  const [hov, setHov] = useState(false);

  return (
    <section ref={ref} style={{ background: "#1B4332", padding: "clamp(80px,10vw,120px) clamp(20px,5vw,60px)", textAlign: "center", position: "relative", overflow: "hidden", color: "#1B4332" }}>
      <OrganicBlob opacity={0.07} size={500} top="-20%" left="55%" duration={25}/>
      <OrganicBlob opacity={0.05} size={340} top="30%" left="-5%" animName="drift2" duration={30}/>
      <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", opacity: 0.06, animation: "breathe-scale 12s ease-in-out infinite", pointerEvents: "none" }}>
        <svg width="200" height="200" viewBox="0 0 200 200" fill="#FAF7F2">
          <path d="M100 10L120 70H180L132 106L150 170L100 136L50 170L68 106L20 70H80L100 10Z"/>
        </svg>
      </div>
      <div style={{ position: "relative", zIndex: 1 }}>
        <h2 style={{ fontFamily: "var(--font-jakarta)", fontWeight: 700, fontSize: "clamp(32px,5vw,64px)", lineHeight: 1.12, color: "#FAF7F2", margin: "0 0 40px" }}>
          {["File your 2025 taxes.", "April handles", "everything."].map((line, i) => (
            <span key={i} style={{
              display: "block",
              clipPath: inView ? "inset(0 0% 0 0)" : "inset(0 100% 0 0)",
              transition: `clip-path 700ms ${EASE} ${i * 120}ms`,
            }}>{line}</span>
          ))}
        </h2>
        <Link href="/dashboard">
          <button
            onMouseEnter={() => setHov(true)}
            onMouseLeave={() => setHov(false)}
            style={{
              background: "#FAF7F2", color: "#1B4332",
              border: hov ? "1px solid rgba(250,247,242,0.4)" : "1px solid transparent",
              borderRadius: 10, padding: "0 40px", height: 52,
              fontSize: 16, fontWeight: 600, cursor: "pointer",
              fontFamily: "var(--font-jakarta)",
              transform: hov ? "translateY(-3px)" : "none",
              transition: `transform 150ms ${EASE}, border 150ms`,
              marginBottom: 20,
            }}
          >Start for free →</button>
        </Link>
        <p style={{ fontFamily: "var(--font-jetbrains)", fontSize: 12, color: "#86EFAC", margin: 0 }}>
          ~10 min · 100% accuracy guarantee · starts at $49
        </p>
      </div>
    </section>
  );
}

// ─── Footer ──────────────────────────────────────────────────────────────────
export function Footer() {
  const { ref, inView } = useInView();
  return (
    <footer ref={ref} style={{ ...enter(inView), background: "#F5F0E8", borderTop: "1px solid #E5DDD0", padding: "40px clamp(20px,5vw,60px) 32px" }}>
      <div style={{ maxWidth: 1000, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 20 }}>
        <Image src="/april-logo-no-bg.png" alt="April" width={80} height={28} style={{ objectFit: "contain", height: 22, width: "auto" }}/>
        <div style={{ display: "flex", gap: 24, alignItems: "center" }}>
          {[["How it Works","#how-it-works"],["Pricing","#pricing"],["FAQ","#faq"]].map(([label, href]) => (
            <a key={href} href={href} style={{ fontSize: 13, color: "#9CA3AF", fontFamily: "var(--font-jakarta)", textDecoration: "none" }}
              onMouseEnter={e => (e.currentTarget.style.color="#0D0D0D")}
              onMouseLeave={e => (e.currentTarget.style.color="#9CA3AF")}
            >{label}</a>
          ))}
        </div>
        <p style={{ fontSize: 12, color: "#9CA3AF", fontFamily: "var(--font-jakarta)", margin: 0 }}>
          © 2026 April. Built in San Francisco.
        </p>
      </div>
    </footer>
  );
}
