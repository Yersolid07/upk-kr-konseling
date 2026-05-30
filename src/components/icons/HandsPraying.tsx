// src/components/icons/HandsPraying.tsx
import React from 'react'

export function HandsPraying({ size = 24, className = "" }: { size?: number, className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="M18 8c0-1.1-.9-2-2-2h-3.5a2 2 0 0 0-2 2v6" />
      <path d="M10 18H6a2 2 0 0 1-2-2V8c0-1.1.9-2 2-2h3.5a2 2 0 0 1 2 2v10" />
      <path d="M14 18h4a2 2 0 0 0 2-2v-4" />
      <path d="M12 18V2" />
    </svg>
  )
}
