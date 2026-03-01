"use client";
import { useEffect, useRef, useState } from "react";

export const EASE = "cubic-bezier(0.16, 1, 0.30, 1)";

export function useScrollY() {
  const [y, setY] = useState(0);
  useEffect(() => {
    const fn = () => setY(window.scrollY);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);
  return y;
}

export function useWindowWidth() {
  const [w, setW] = useState(1280);
  useEffect(() => {
    setW(window.innerWidth);
    const fn = () => setW(window.innerWidth);
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, []);
  return w;
}

export function useInView(threshold = 0.12) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setInView(true); obs.disconnect(); } },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, inView };
}

export function useCountUp(target: number, inView: boolean, duration = 1200) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!inView) return;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
      setVal(Math.round(ease * target));
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [inView, target, duration]);
  return val;
}

export function enter(inView: boolean, delay = 0, dx = 0, dy = 20): React.CSSProperties {
  return {
    opacity: inView ? 1 : 0,
    transform: inView ? "none" : `translate(${dx}px,${dy}px)`,
    transition: `opacity 400ms ${EASE} ${delay}ms, transform 400ms ${EASE} ${delay}ms`,
  };
}

export function SectionLabel({ children, light = false }: { children: string; light?: boolean }) {
  return (
    <div style={{
      fontSize: 11, letterSpacing: "0.15em", textTransform: "uppercase",
      fontFamily: "var(--font-jakarta)", fontWeight: 600,
      color: light ? "rgba(250,247,242,0.5)" : "#6B7280",
      borderLeft: `2px solid ${light ? "#86EFAC" : "#1B4332"}`,
      paddingLeft: 10, marginBottom: 28,
    }}>
      {children}
    </div>
  );
}

export function OrganicBlob({
  opacity = 0.1, size = 400, top = "0%", left = "50%",
  animName = "drift", duration = 18,
}: {
  opacity?: number; size?: number; top?: string; left?: string;
  animName?: string; duration?: number;
}) {
  return (
    <div style={{
      position: "absolute", top, left,
      width: size, height: size, color: "currentColor", opacity,
      animation: `${animName} ${duration}s ease-in-out infinite`,
      pointerEvents: "none",
    }}>
      <svg viewBox="0 0 200 200" fill="currentColor">
        <path d="M100,30 C145,5 190,45 190,100 C190,155 150,195 100,190 C50,185 10,150 15,100 C20,50 55,55 100,30Z"/>
      </svg>
    </div>
  );
}

// Reusable status icon matching actual FilingTimeline
export function StatusDot({ status }: { status: "complete" | "in_progress" | "pending" }) {
  if (status === "complete") {
    return (
      <div style={{ width: 18, height: 18, borderRadius: "50%", background: "#1B4332", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
          <path d="M1 4L3.5 6.5L9 1" stroke="#FAF7F2" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
    );
  }
  if (status === "in_progress") {
    return <span style={{ width: 12, height: 12, borderRadius: "50%", background: "#D97706", display: "inline-block", flexShrink: 0, animation: "pulse-dot 1.5s infinite" }}/>;
  }
  return <span style={{ width: 12, height: 12, borderRadius: "50%", border: "1.5px solid #D1D5DB", display: "inline-block", flexShrink: 0 }}/>;
}
