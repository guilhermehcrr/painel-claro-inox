import * as React from 'react'
import { cn } from '@/lib/utils'

export const estiloCampo =
  'h-10 w-full rounded-md border border-hair bg-card px-3 text-[15px] text-ink outline-none ' +
  'transition-colors placeholder:text-faint focus:border-indigo disabled:bg-paper disabled:text-muted'

export function Rotulo({ children, dica, htmlFor }: { children: React.ReactNode; dica?: React.ReactNode; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 flex items-baseline justify-between gap-2 text-[13px] font-medium text-body">
      <span>{children}</span>
      {dica && <span className="font-normal text-faint">{dica}</span>}
    </label>
  )
}

export const Entrada = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...p }, ref) => <input ref={ref} className={cn(estiloCampo, className)} {...p} />,
)
Entrada.displayName = 'Entrada'

export const Escolha = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, ...p }, ref) => <select ref={ref} className={cn(estiloCampo, 'pr-8', className)} {...p} />,
)
Escolha.displayName = 'Escolha'

export const Texto = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...p }, ref) => (
    <textarea ref={ref} className={cn(estiloCampo, 'h-auto min-h-[80px] py-2 leading-snug', className)} {...p} />
  ),
)
Texto.displayName = 'Texto'

/** "1.234,56", "1.500", "1234.56" ou "915" -> número */
export function lerValor(v: string): number {
  const limpo = v.replace(/[^\d,.-]/g, '')
  const normal = limpo.includes(',')
    ? limpo.replace(/\./g, '').replace(',', '.')
    : /^\d{1,3}(\.\d{3})+$/.test(limpo)
      ? limpo.replace(/\./g, '') // ponto de milhar: 1.500 = mil e quinhentos
      : limpo
  const n = Number(normal)
  return Number.isFinite(n) ? n : NaN
}
