// src/components/brand/Logo.tsx
// Custom brand mark — a stylised cross forming a "small group" (three figures
// gathered around it). Vector, currentColor-driven, no external assets.

interface LogoProps {
  size?: number
  className?: string
  /** Renders the mark in a rounded gradient tile (used in headers/sidebar). */
  tile?: boolean
}

export function LogoMark({ size = 28, className = '' }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Cross */}
      <path
        d="M16 4.5v23M8.5 12.5h15"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
      {/* Gathered circle (small group / fellowship) */}
      <circle cx="16" cy="16" r="13" stroke="currentColor" strokeWidth="1.4" opacity="0.42" />
      {/* Three members around the cross */}
      <circle cx="16" cy="27.4" r="1.7" fill="currentColor" />
      <circle cx="5.6" cy="11" r="1.7" fill="currentColor" />
      <circle cx="26.4" cy="11" r="1.7" fill="currentColor" />
    </svg>
  )
}

export function Logo({ size = 40, className = '', tile = false }: LogoProps) {
  if (tile) {
    return (
      <div
        className={`flex items-center justify-center rounded-[14px] text-white shadow-[0_4px_14px_rgba(58,39,24,0.18)] ${className}`}
        style={{
          width: size,
          height: size,
          background: 'linear-gradient(150deg, var(--terra), var(--brown))',
        }}
      >
        <LogoMark size={size * 0.62} />
      </div>
    )
  }
  return <LogoMark size={size} className={className} />
}
