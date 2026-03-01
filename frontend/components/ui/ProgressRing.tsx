'use client'

interface ProgressRingProps {
  percent: number
  subLabel?: string
}

const RADIUS = 52
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

export function ProgressRing({ percent, subLabel = 'complete' }: ProgressRingProps) {
  const offset = CIRCUMFERENCE * (1 - percent / 100)

  return (
    <svg width="120" height="120" aria-label={`${percent}% complete`}>
      <circle
        cx="60"
        cy="60"
        r={RADIUS}
        stroke="#E5E7EB"
        strokeWidth="6"
        fill="none"
      />
      <circle
        cx="60"
        cy="60"
        r={RADIUS}
        stroke="#1B4332"
        strokeWidth="6"
        fill="none"
        strokeDasharray={CIRCUMFERENCE}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform="rotate(-90 60 60)"
        style={{ transition: 'stroke-dashoffset 1.2s ease-out' }}
      />
      <text
        x="60"
        y="58"
        textAnchor="middle"
        fontFamily="var(--font-jetbrains)"
        fontWeight="700"
        fontSize="18"
        fill="#0D0D0D"
      >
        {percent}%
      </text>
      <text
        x="60"
        y="74"
        textAnchor="middle"
        fontSize="11"
        fill="#6B7280"
      >
        {subLabel}
      </text>
    </svg>
  )
}
