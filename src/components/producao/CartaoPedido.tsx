import type { Pedido } from '@/lib/types'
import { ativo } from '@/lib/estagios'
import { dataCurta, hojeISO } from '@/lib/datas'
import { ReguaEstagio, Selo } from '@/components/ui/selo'
import { cn } from '@/lib/utils'

/** Medidas e modelo em uma linha: "80 × 50 cm, flutuante" */
export function linhaMedidas(p: Pedido) {
  const r = p.resumo
  if (!r?.medidas_cm) return 'Medidas no orçamento'
  const modelo = r.modelo === 'apoio' ? 'flutuante' : r.modelo === 'fixo' ? 'fixo' : ''
  return `${r.medidas_cm.replace(' x ', ' × ')} cm${modelo ? `, ${modelo}` : ''}`
}

export function DataEntrega({ p, compacto }: { p: Pedido; compacto?: boolean }) {
  const hoje = hojeISO()
  if (!p.data_entrega) return ativo(p.estagio) ? <Selo tom="palha">Sem data</Selo> : null
  if (ativo(p.estagio) && p.data_entrega < hoje) return <Selo tom="warn">Atrasado, {dataCurta(p.data_entrega)}</Selo>
  return (
    <span className="tnum whitespace-nowrap text-[13px] text-muted">
      {compacto ? '' : 'Entrega '}
      {dataCurta(p.data_entrega)}
    </span>
  )
}

export function CartaoPedido({ p, className }: { p: Pedido; className?: string }) {
  const qtd = Number(p.resumo?.quantidade) || 1
  const extras = (p.resumo?.itens ?? []).filter((i) => !/suporte/i.test(i))
  return (
    <a
      href={`#/pedido/${p.id}`}
      className={cn(
        'block rounded-lg border border-hair bg-card px-3 pb-3 pt-2.5 transition-colors hover:border-faint',
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="tnum text-[13px] text-muted">{p.numero}</span>
        <DataEntrega p={p} />
      </div>
      <div className="mt-1 truncate text-[15px] font-medium text-ink">{p.nome_cliente || 'Sem nome'}</div>
      <div className="text-[13px] text-body">
        {linhaMedidas(p)}
        {qtd > 1 && <span className="text-muted">, {qtd} suportes</span>}
      </div>
      {extras.length > 0 && <div className="mt-0.5 truncate text-[12px] text-muted">{extras.join(', ')}</div>}
      <ReguaEstagio estagio={p.estagio} className="mt-2.5" />
    </a>
  )
}
