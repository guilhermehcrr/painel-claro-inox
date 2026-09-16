import * as React from 'react'
import { cn } from '@/lib/utils'

export const Card = ({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('border border-hair bg-card', className)} {...p} />
)

export const CardRow = ({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('border-b border-hair last:border-b-0', className)} {...p} />
)

export function Stat({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="border-r border-hair px-4 py-3 last:border-r-0">
      <div className="text-[11px] uppercase tracking-wide text-faint">{label}</div>
      <div
        className={cn(
          'tnum mt-0.5 font-mono text-ink',
          strong ? 'text-lg font-medium' : 'text-[15px]',
        )}
      >
        {value}
      </div>
    </div>
  )
}
