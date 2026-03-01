"use client";
import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { EASE } from "./shared";

const LINKS = [
  ["How it Works", "#how-it-works"],
  ["Features",     "#features"],
  ["Pricing",      "#pricing"],
  ["FAQ",          "#faq"],
];

export function Nav({ scrollY }: { scrollY: number }) {
  const [hov, setHov] = useState(false);
  const scrolled = scrollY > 40;

  return (
    <nav style={{
      position: "fixed", top: 0, left: 0, right: 0, height: 56, zIndex: 100,
      backdropFilter: "blur(12px)",
      background: scrolled ? "rgba(250,247,242,0.96)" : "rgba(250,247,242,0.7)",
      borderBottom: scrolled ? "1px solid #E5DDD0" : "1px solid transparent",
      display: "flex", alignItems: "center", padding: "0 40px", gap: 40,
      transition: `border-color 300ms ${EASE}, background 300ms ${EASE}`,
    }}>
      {/* Logo */}
      <Link href="/" style={{ display: "flex", alignItems: "center", flexShrink: 0, textDecoration: "none" }}>
        <Image src="/april-logo-no-bg.png" alt="April" width={90} height={30} priority style={{ objectFit: "contain", height: 28, width: "auto" }}/>
      </Link>

      {/* Nav links */}
      <div style={{ display: "flex", gap: 28, flex: 1 }}>
        {LINKS.map(([label, href]) => (
          <a
            key={href}
            href={href}
            style={{ fontSize: 14, color: "#6B7280", fontFamily: "var(--font-jakarta)", textDecoration: "none", fontWeight: 500, transition: "color 150ms" }}
            onMouseEnter={e => (e.currentTarget.style.color = "#0D0D0D")}
            onMouseLeave={e => (e.currentTarget.style.color = "#6B7280")}
          >{label}</a>
        ))}
      </div>

      {/* CTA */}
      <Link href="/dashboard" style={{ flexShrink: 0 }}>
        <button
          onMouseEnter={() => setHov(true)}
          onMouseLeave={() => setHov(false)}
          style={{
            background: hov ? "#2D6A4F" : "#1B4332",
            color: "#FAF7F2", border: "none", borderRadius: 8,
            padding: "9px 20px", fontSize: 14, fontWeight: 600,
            cursor: "pointer", transition: `background 150ms`,
            fontFamily: "var(--font-jakarta)",
          }}
        >File now →</button>
      </Link>
    </nav>
  );
}
