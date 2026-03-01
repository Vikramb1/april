"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { EASE, enter, StatusDot, OrganicBlob, useScrollY } from "./shared";

const SIDEBAR_SECTIONS = [
  { label: "Personal Info", status: "complete" },
  { label: "Filing Status", status: "complete" },
  { label: "W-2 Income", status: "complete" },
  { label: "1099 Income", status: "complete" },
  { label: "Deductions", status: "in_progress" },
  { label: "Credits", status: "pending" },
  { label: "Bank Info", status: "pending" },
  { label: "Review", status: "pending" },
] as const;

const TIMELINE_ROWS = [
  { label: "Personal Info", status: "complete", time: "00:01:23" },
  { label: "Filing Status", status: "complete", time: "00:01:45" },
  { label: "W-2 Income", status: "complete", time: "00:02:12" },
  { label: "1099 Income", status: "complete", time: "00:02:34" },
  { label: "Deductions", status: "in_progress", time: null },
  { label: "Credits", status: "pending", time: null },
  { label: "Bank Info", status: "pending", time: null },
  { label: "Review", status: "pending", time: null },
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
            Filing
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
            JP
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
            {/* Greeting */}
            <p
              style={{
                fontSize: 11,
                color: "#6B7280",
                margin: 0,
                fontFamily: "var(--font-jakarta)",
              }}
            >
              Good morning,
            </p>
            <h3
              style={{
                fontSize: 18,
                fontWeight: 800,
                color: "#0D0D0D",
                margin: "2px 0 14px",
                fontFamily: "var(--font-jakarta)",
              }}
            >
              Jathin
            </h3>

            {/* Progress ring */}
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                marginBottom: 14,
              }}
            >
              <ProgressRing pct={62} />
            </div>

            {/* Year label */}
            <p
              style={{
                fontSize: 9,
                fontWeight: 600,
                color: "#9CA3AF",
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                margin: "0 0 8px",
              }}
            >
              2025 Return
            </p>

            {/* Section list */}
            {SIDEBAR_SECTIONS.map(({ label, status }) => (
              <div
                key={label}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "5px 8px",
                  borderRadius: 6,
                  marginBottom: 2,
                  background:
                    status === "in_progress" ? "#1B4332" : "transparent",
                }}
              >
                <span
                  style={{
                    fontSize: 11,
                    fontFamily: "var(--font-jakarta)",
                    color:
                      status === "in_progress"
                        ? "#FAF7F2"
                        : status === "complete"
                          ? "#0D0D0D"
                          : "#9CA3AF",
                  }}
                >
                  {label}
                </span>
                {status === "complete" && (
                  <span
                    style={{ fontSize: 10, color: "#1B4332", fontWeight: 700 }}
                  >
                    ✓
                  </span>
                )}
                {status === "in_progress" && (
                  <span
                    style={{
                      width: 5,
                      height: 5,
                      borderRadius: "50%",
                      background: "#86EFAC",
                      display: "inline-block",
                    }}
                  />
                )}
                {status === "pending" && (
                  <span
                    style={{
                      width: 5,
                      height: 5,
                      borderRadius: "50%",
                      border: "1px solid #D1D5DB",
                      display: "inline-block",
                    }}
                  />
                )}
              </div>
            ))}
          </div>

          {/* Main: FilingTimeline matching actual component */}
          <div style={{ flex: 1, padding: "16px 20px", overflowY: "hidden" }}>
            <p
              style={{
                fontSize: 10,
                fontWeight: 600,
                color: "#9CA3AF",
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                margin: "0 0 12px",
                fontFamily: "var(--font-jakarta)",
              }}
            >
              Filing Progress
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {TIMELINE_ROWS.map(({ label, status, time }) => (
                <div
                  key={label}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "8px 10px",
                    borderRadius: 8,
                    background:
                      status === "in_progress" ? "#FEF3C7" : "transparent",
                    border:
                      status === "in_progress"
                        ? "1px solid #FDE68A"
                        : "1px solid transparent",
                    opacity: status === "pending" ? 0.55 : 1,
                  }}
                >
                  <StatusDot status={status} />
                  <span
                    style={{
                      fontSize: 13,
                      fontFamily: "var(--font-jakarta)",
                      color: status === "in_progress" ? "#0D0D0D" : "#0D0D0D",
                      flex: 1,
                    }}
                  >
                    {label}
                  </span>
                  <span
                    style={{
                      fontFamily: "var(--font-jetbrains)",
                      fontSize: 11,
                      color:
                        status === "complete"
                          ? "#6B7280"
                          : status === "in_progress"
                            ? "#D97706"
                            : "#9CA3AF",
                    }}
                  >
                    {status === "complete"
                      ? time
                      : status === "in_progress"
                        ? "Filing now…"
                        : "Pending"}
                  </span>
                </div>
              ))}
            </div>
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
                  Found your W-2 from Fidelity (
                  <span
                    style={{
                      fontFamily: "var(--font-jetbrains)",
                      fontSize: 11,
                    }}
                  >
                    $52,000
                  </span>
                  ) and 1099-B from Schwab. Filing deductions now.
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
                  Looks great!
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
