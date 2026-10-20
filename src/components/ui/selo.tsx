import type { Estagio } from '@/lib/types'
import { ESTAGIOS, infoEstagio, posicao } from '@/lib/estagios'
import { cn } from '@/lib/utils'

export function SeloEstagio({ estagio, className }: { estagio: Estagio; className?: string }) {
  const e = infoEstagio(estagio)
  return (
    <span className={cn('inline-flex items-center rounded-md px-2 py-0.5 text-[12px] font-medium', e.selo, className)}>
      {e.nome}
    </span>
  )
}

/**
 * Régua de 5 trechos: os estágios já vencidos ficam com a cor de têmpera
 * de cada um, os que faltam ficam em aço.
 */
export function ReguaEstagio({ estagio, className }: { estagio: Estagio; className?: string }) {
  const atual = posicao(estagio)
  return (
    <div className={cn('flex gap-0.5', className)} aria-label={`Estágio: ${infoEstagio(estagio).nome}`}>
      {ESTAGIOS.map((e, i) => (
        <span
          key={e.id}
          className={cn('h-1 flex-1 rounded-full', atual >= 0 && i <= atual ? e.cor : 'bg-hair')}
        />
      ))}
    </div>
  )
}

/** Selo genérico (status de orçamento, a receber etc.) */
export function Selo({ children, tom = 'aco' }: { children: React.ReactNode; tom?: 'aco' | 'ok' | 'warn' | 'indigo' | 'palha' }) {
  const cores = {
    aco: 'bg-aco-tint text-aco',
    ok: 'bg-ok-tint text-ok',
    warn: 'bg-warn-tint text-warn',
    indigo: 'bg-indigo-tint text-indigo',
    palha: 'bg-palha-tint text-palha',
  }
  return (
    <span className={cn('inline-flex items-center whitespace-nowrap rounded-md px-2 py-0.5 text-[12px] font-medium', cores[tom])}>
      {children}
    </span>
  )
}
