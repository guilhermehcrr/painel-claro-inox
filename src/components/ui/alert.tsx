import { AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'

export function Alert({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'flex items-start gap-2 border-b border-hair bg-warn-tint px-4 py-3 text-[13px] text-warn',
        className,
      )}
    >
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.75} />
      <span>{children}</span>
    </div>
  )
}
