import * as React from 'react'
import { cn } from '@/lib/utils'

export const Card = ({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('overflow-hidden rounded-lg border border-hair bg-card', className)} {...p} />
)

export const CardRow = ({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('border-b border-hair last:border-b-0', className)} {...p} />
)

export function Stat({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="min-w-0 border-r border-hair px-3 py-3 last:border-r-0 sm:px-4">
      <div className="text-[12px] text-faint">{label}</div>
      <div
        className={cn(
          'tnum mt-0.5 whitespace-nowrap text-ink',
          strong ? 'text-[17px] font-semibold sm:text-lg' : 'text-[15px] font-medium',
        )}
      >
        {value}
      </div>
    </div>
  )
}
