"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { EASE, enter, OrganicBlob, useScrollY } from "./shared";

const SIDEBAR_GROUPS = [
  {
    label: "Personal", complete: true, open: true,
    subs: [
      { label: "Personal Info", active: true },
      { label: "Filing Status", complete: true },
      { label: "Dependents", complete: true },
      { label: "Identity Protection", complete: true },
    ],
  },
  { label: "Income", amber: true, open: false, subs: [] },
  { label: "Deductions & Credits", open: false, subs: [] },
  { label: "Miscellaneous", open: false, subs: [] },
  { label: "State", open: false, subs: [] },
  { label: "Summary", open: false, subs: [] },
] as const;

const PERSONAL_FIELDS = [
  { label: "First Name", value: "Alex", mono: false, required: true },
  { label: "Last Name", value: "Rivera", mono: false, required: true },
  { label: "Social Security Number", value: "···-··-7834", mono: true, required: true },
  { label: "Date of Birth", value: "1991-07-22", mono: true, required: true },
  { label: "Street Address", value: "4802 Maple Ave", mono: false, required: true },
  { label: "City", value: "Denver", mono: false, required: true },
] as const;

// Progress ring matching actual ProgressRing component
function ProgressRing({ pct }: { pct: number }) {
  const r = 30,
    circ = 2 * Math.PI * r;
  return (
    <svg width="76" height="76" viewBox="0 0 80 80">
      <circle
        cx="40"
        cy="40"
        r={r}
        fill="none"
        stroke="#E5E7EB"
        strokeWidth="7"
      />
      <circle
        cx="40"
        cy="40"
        r={r}
        fill="none"
        stroke="#1B4332"
        strokeWidth="7"
        strokeDasharray={`${(pct / 100) * circ} ${circ}`}
        strokeLinecap="round"
        transform="rotate(-90 40 40)"
      />
      <text
        x="40"
        y="37"
        textAnchor="middle"
        fontSize="13"
        fontWeight="700"
        fill="#0D0D0D"
        fontFamily="var(--font-jakarta)"
      >
        {pct}%
      </text>
      <text
        x="40"
        y="51"
        textAnchor="middle"
        fontSize="8.5"
        fill="#6B7280"
        fontFamily="var(--font-jakarta)"
      >
        complete
      </text>
    </svg>
  );
}

export function Hero() {
  const [on, setOn] = useState(false);
  const [hov, setHov] = useState(false);
  const scrollY = useScrollY();
  useEffect(() => {
    const t = setTimeout(() => setOn(true), 100);
    return () => clearTimeout(t);
  }, []);

  // Scroll-driven reveal for the dashboard mockup
  // 0 → 320px scroll: mockup rises from below and fades in
  const sp = Math.min(scrollY / 320, 1);
  const se = sp < 0.5 ? 2 * sp * sp : -1 + (4 - 2 * sp) * sp; // ease-in-out

  const clip = (delay: number): React.CSSProperties => ({
    display: "block",
    clipPath: on ? "inset(0 0% 0 0)" : "inset(0 100% 0 0)",
    transition: `clip-path 700ms ${EASE} ${delay}ms`,
  });

  return (
    <section
      style={{
        position: "relative",
        overflow: "hidden",
        background: "#FAF7F2",
        paddingTop: "clamp(120px,14vw,160px)",
        paddingBottom: 0,
        minHeight: "115vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
        color: "#1B4332",
      }}
    >
      {/* Background blobs */}
      <OrganicBlob
        opacity={0.08}
        size={500}
        top="-10%"
        left="65%"
        animName="drift"
        duration={20}
      />
      <OrganicBlob
        opacity={0.06}
        size={380}
        top="20%"
        left="-8%"
        animName="drift2"
        duration={26}
      />
      <OrganicBlob
        opacity={0.05}
        size={280}
        top="55%"
        left="75%"
        animName="drift"
        duration={32}
      />

      {/* Announcement pill */}
      <div
        style={{
          ...enter(on, 0),
          position: "relative",
          zIndex: 1,
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          padding: "6px 14px",
          borderRadius: 999,
          background: "#EAF4EC",
          border: "1px solid #1B4332",
          fontSize: 13,
          color: "#1B4332",
          fontFamily: "var(--font-jakarta)",
          marginBottom: 32,
        }}
      >
        <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
          <path
            d="M5.5 0.5L7 4H11L8 6.3L9 10L5.5 8L2 10L3 6.3L0 4H4L5.5 0.5Z"
            fill="#1B4332"
          />
        </svg>
        No APIs. No partnerships. Any portal.
      </div>

      {/* Headline */}
      <h1
        style={{
          fontFamily: "var(--font-jakarta)",
          fontWeight: 700,
          fontSize: "clamp(44px,6.5vw,72px)",
          lineHeight: 1.1,
          color: "#0D0D0D",
          margin: "0 0 24px",
          position: "relative",
          zIndex: 1,
        }}
      >
        <span style={clip(160)}>Your taxes.</span>
        <span style={clip(280)}>Collected.</span>
        <span style={clip(400)}>Filed.</span>
      </h1>

      {/* Subheadline */}
      <p
        style={{
          ...enter(on, 650),
          position: "relative",
          zIndex: 1,
          fontFamily: "var(--font-jakarta)",
          fontSize: "clamp(15px,1.6vw,17px)",
          lineHeight: "28px",
          color: "#6B7280",
          maxWidth: 480,
          margin: "0 auto 36px",
        }}
      >
        April navigates directly to your financial accounts, downloads every
        document, extracts the data, and files your return. You just watch.
      </p>

      {/* CTA */}
      <div
        style={{
          ...enter(on, 850),
          display: "flex",
          gap: 16,
          marginBottom: 24,
          position: "relative",
          zIndex: 1,
          alignItems: "center",
        }}
      >
        <Link href="/dashboard">
          <button
            onMouseEnter={() => setHov(true)}
            onMouseLeave={() => setHov(false)}
            style={{
              background: "#1B4332",
              color: "#FAF7F2",
              border: "none",
              borderRadius: 10,
              padding: "0 28px",
              height: 48,
              fontSize: 16,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "var(--font-jakarta)",
              transform: hov ? "translateY(-3px)" : "none",
              filter: hov ? "brightness(1.05)" : "none",
              transition: `transform 150ms ${EASE}, filter 150ms`,
            }}
          >
            File my 2025 taxes →
          </button>
        </Link>
      </div>

      {/* Status strip */}
      <div
        style={{
          ...enter(on, 1000),
          position: "relative",
          zIndex: 1,
          fontFamily: "var(--font-jetbrains)",
          fontSize: 12,
          color: "#9CA3AF",
          display: "flex",
          gap: 10,
          alignItems: "center",
          marginBottom: 52,
        }}
      >
        <span>&lt;1 min setup</span>
        <span style={{ color: "#1B4332" }}>·</span>
        <span>99.2% accuracy</span>
        <span style={{ color: "#1B4332" }}>·</span>
        <span>$2,840 avg refund</span>
      </div>

      {/* ── Dashboard mockup — scroll-driven reveal ── */}
      <div
        style={{
          width: "min(90%, 1000px)",
          borderRadius: "12px 12px 0 0",
          border: "1px solid #E5E7EB",
          borderBottom: "none",
          background: "#fff",
          overflow: "hidden",
          position: "relative",
          zIndex: 1,
          textAlign: "left",
          // Scroll-driven: rises from +90px below, fades + scales in
          opacity: on ? se : 0,
          transform: `translateY(${(1 - se) * 90}px) scale(${0.96 + se * 0.04})`,
          boxShadow: `0 ${4 + se * 20}px ${20 + se * 40}px rgba(0,0,0,${0.03 + se * 0.06})`,
        }}
      >
        {/* TopNav bar matching actual component */}
        <div
          style={{
            height: 40,
            borderBottom: "1px solid #E5E7EB",
            display: "flex",
            alignItems: "center",
            padding: "0 16px",
            gap: 12,
            background: "#fff",
            flexShrink: 0,
          }}
        >
          <Image
            src="/april-logo-no-bg.png"
            alt="April"
            width={60}
            height={20}
            priority
            style={{ objectFit: "contain", height: 18, width: "auto" }}
          />

          {/* Year switcher */}
          <div
            style={{
              display: "flex",
              gap: 2,
              background: "#F3F4F6",
              borderRadius: 999,
              padding: "2px",
              marginLeft: 8,
            }}
          >
            <div
              style={{
                padding: "2px 10px",
                borderRadius: 999,
                fontSize: 11,
                color: "#6B7280",
                display: "flex",
                alignItems: "center",
                gap: 3,
              }}
            >
              2024 <span style={{ color: "#1B4332", fontSize: 9 }}>✓</span>
            </div>
            <div
              style={{
                padding: "2px 10px",
                borderRadius: 999,
                background: "#1B4332",
                color: "#fff",
                fontSize: 11,
                fontWeight: 700,
              }}
            >
              2025
            </div>
          </div>

          {/* Phase pill */}
          <div
            style={{
              background: "#FEF3C7",
              color: "#D97706",
              borderRadius: 999,
              padding: "2px 10px",
              fontSize: 11,
              fontWeight: 600,
              fontFamily: "var(--font-jakarta)",
            }}
          >
            Collecting
          </div>

          <div style={{ flex: 1 }} />
          {/* Avatar */}
          <div
            style={{
              width: 26,
              height: 26,
              borderRadius: "50%",
              background: "#1B4332",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 10,
              color: "#FAF7F2",
              fontWeight: 700,
              fontFamily: "var(--font-jakarta)",
            }}
          >
            AR
          </div>
        </div>

        {/* Body: sidebar + main + chat */}
        <div style={{ display: "flex", height: 360, overflow: "hidden" }}>
          {/* Sidebar matching actual Sidebar component */}
          <div
            style={{
              width: 168,
              background: "#F5F0E8",
              borderRight: "1px solid #E5E7EB",
              padding: "16px 14px",
              flexShrink: 0,
              overflowY: "hidden",
            }}
          >
            {/* Welcome heading */}
            <h2
              style={{
                fontSize: 17,
                fontWeight: 800,
                color: "#0D0D0D",
                margin: "0 0 12px",
                fontFamily: "var(--font-jakarta)",
              }}
            >
              Welcome back
            </h2>

            {/* Progress ring */}
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                marginBottom: 10,
              }}
            >
              <ProgressRing pct={62} />
            </div>

            {/* Refund estimate card */}
            <div
              style={{
                background: "#EAF4EC",
                border: "1px solid #1B4332",
                borderRadius: 10,
                padding: "7px 10px",
                marginBottom: 10,
              }}
            >
              <p
                style={{
                  fontSize: 8,
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  fontWeight: 600,
                  color: "#1B4332",
                  margin: "0 0 1px",
                  fontFamily: "var(--font-jakarta)",
                }}
              >
                Est. Refund
              </p>
              <p
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: "#1B4332",
                  margin: 0,
                  fontFamily: "var(--font-jetbrains)",
                }}
              >
                $2,768
              </p>
            </div>

            {/* Year label */}
            <p
              style={{
                fontSize: 9,
                fontWeight: 600,
                color: "#9CA3AF",
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                margin: "0 0 6px 2px",
                fontFamily: "var(--font-jakarta)",
              }}
            >
              2025 Return
            </p>

            {/* Section accordion groups */}
            {SIDEBAR_GROUPS.map((group) => (
              <div key={group.label} style={{ marginBottom: 1 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "5px 6px",
                    borderRadius: 7,
                    background: group.open ? "rgba(27,67,50,0.1)" : "transparent",
                    marginBottom: group.open ? 2 : 0,
                  }}
                >
                  <span
                    style={{
                      fontSize: 9,
                      fontWeight: 600,
                      textTransform: "uppercase",
                      letterSpacing: "0.1em",
                      fontFamily: "var(--font-jakarta)",
                      color: group.open
                        ? "#1B4332"
                        : "complete" in group && group.complete
                          ? "#2D6A4F"
                          : "amber" in group && group.amber
                            ? "#D97706"
                            : "#9CA3AF",
                    }}
                  >
                    {group.label}
                  </span>
                  {"complete" in group && group.complete && (
                    <span style={{ fontSize: 9, color: "#1B4332", fontWeight: 700 }}>✓</span>
                  )}
                  {"amber" in group && group.amber && (
                    <span style={{ fontSize: 10, color: "#D97706", fontWeight: 700 }}>⚠</span>
                  )}
                </div>
                {group.open && group.subs.length > 0 && (
                  <div style={{ marginLeft: 7, paddingBottom: 3 }}>
                    {group.subs.map((sub) => (
                      <div
                        key={sub.label}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "3px 7px",
                          borderRadius: 6,
                          marginBottom: 1,
                          fontSize: 10,
                          fontFamily: "var(--font-jakarta)",
                          background:
                            "active" in sub && sub.active
                              ? "#1B4332"
                              : "complete" in sub && sub.complete
                                ? "#EAF4EC"
                                : "transparent",
                          color:
                            "active" in sub && sub.active
                              ? "#FAF7F2"
                              : "complete" in sub && sub.complete
                                ? "#1B4332"
                                : "#9CA3AF",
                        }}
                      >
                        <span>{sub.label}</span>
                        {"complete" in sub && sub.complete && !("active" in sub && sub.active) && (
                          <span style={{ fontSize: 8, fontWeight: 700, color: "#1B4332" }}>✓</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Main: PersonalSection form matching actual component */}
          <div style={{ flex: 1, padding: "14px 18px", overflowY: "hidden" }}>
            <h2
              style={{
                fontSize: 15,
                fontWeight: 700,
                color: "#0D0D0D",
                margin: "0 0 10px",
                fontFamily: "var(--font-jakarta)",
              }}
            >
              Personal Information
            </h2>
            <p
              style={{
                fontSize: 9,
                fontWeight: 600,
                color: "#9CA3AF",
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                margin: "0 0 4px",
                fontFamily: "var(--font-jakarta)",
              }}
            >
              Name
            </p>
            {PERSONAL_FIELDS.slice(0, 2).map(({ label, value, required }) => (
              <div key={label} style={{ borderBottom: "1px solid #E5E7EB", padding: "6px 0" }}>
                <p style={{ fontSize: 9, color: "#9CA3AF", margin: "0 0 1px", fontFamily: "var(--font-jakarta)" }}>
                  {label}{required && <span style={{ color: "#EF4444", marginLeft: 2 }}>*</span>}
                </p>
                <p style={{ fontSize: 12, color: "#0D0D0D", margin: 0, fontFamily: "var(--font-jakarta)" }}>
                  {value}
                </p>
              </div>
            ))}
            <p
              style={{
                fontSize: 9,
                fontWeight: 600,
                color: "#9CA3AF",
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                margin: "10px 0 4px",
                fontFamily: "var(--font-jakarta)",
              }}
            >
              Contact &amp; Address
            </p>
            {PERSONAL_FIELDS.slice(2).map(({ label, value, mono, required }) => (
              <div key={label} style={{ borderBottom: "1px solid #E5E7EB", padding: "6px 0" }}>
                <p style={{ fontSize: 9, color: "#9CA3AF", margin: "0 0 1px", fontFamily: "var(--font-jakarta)" }}>
                  {label}{required && <span style={{ color: "#EF4444", marginLeft: 2 }}>*</span>}
                </p>
                <p style={{ fontSize: 12, color: "#0D0D0D", margin: 0, fontFamily: mono ? "var(--font-jetbrains)" : "var(--font-jakarta)" }}>
                  {value}
                </p>
              </div>
            ))}
          </div>

          {/* Chat panel matching actual ChatPanel */}
          <div
            style={{
              width: 210,
              borderLeft: "1px solid #E5E7EB",
              background: "#fff",
              display: "flex",
              flexDirection: "column",
              flexShrink: 0,
            }}
          >
            <div
              style={{
                padding: "10px 14px",
                borderBottom: "1px solid #E5E7EB",
                display: "flex",
                alignItems: "center",
                gap: 7,
              }}
            >
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: "#0D0D0D",
                  fontFamily: "var(--font-jakarta)",
                }}
              >
                April
              </span>
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: "#1B4332",
                }}
              />
            </div>
            <div
              style={{
                flex: 1,
                padding: "14px 12px",
                overflowY: "hidden",
                display: "flex",
                flexDirection: "column",
                gap: 12,
              }}
            >
              {/* April message — matches border-l-2 border-green pl-3 style */}
              <div style={{ borderLeft: "2px solid #1B4332", paddingLeft: 10 }}>
                <p
                  style={{
                    fontSize: 12,
                    lineHeight: "18px",
                    color: "#0D0D0D",
                    fontFamily: "var(--font-jakarta)",
                    margin: 0,
                  }}
                >
                  Hi! I&apos;m April. Let&apos;s get your personal info filled in. What&apos;s your full legal name and date of birth?
                </p>
              </div>
              {/* User message — matches text-right text-muted ml-8 */}
              <div style={{ textAlign: "right" }}>
                <p
                  style={{
                    fontSize: 12,
                    color: "#6B7280",
                    fontFamily: "var(--font-jakarta)",
                    margin: 0,
                  }}
                >
                  Alex Rivera, July 22 1991
                </p>
              </div>
              {/* Typing */}
              <div style={{ borderLeft: "2px solid #1B4332", paddingLeft: 10 }}>
                <div style={{ display: "flex", gap: 4, paddingTop: 4 }}>
                  {[0, 160, 320].map((d) => (
                    <div
                      key={d}
                      style={{
                        width: 5,
                        height: 5,
                        borderRadius: "50%",
                        background: "#1B4332",
                        animation: `pulse-dot 1.2s ease-in-out infinite ${d}ms`,
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
            {/* Input */}
            <div
              style={{ padding: "8px 10px", borderTop: "1px solid #E5E7EB" }}
            >
              <div
                style={{
                  background: "#FAF7F2",
                  borderRadius: 10,
                  padding: "7px 12px",
                  fontSize: 12,
                  color: "#9CA3AF",
                  fontFamily: "var(--font-jakarta)",
                }}
              >
                Ask April anything…
              </div>
            </div>
          </div>
        </div>
        {/* Bottom fade-out — dissolves mockup into page */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: 180,
            background:
              "linear-gradient(to bottom, transparent 0%, #FAF7F2 100%)",
            pointerEvents: "none",
            zIndex: 10,
          }}
        />
      </div>
    </section>
  );
}
