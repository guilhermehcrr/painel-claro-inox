import type { Movimento, TipoMovimento } from '@/lib/types'
import { brl, hora, rotuloDia } from '@/lib/format'
import { UNIDADES, emBarras, pecaCompra, qtd, qtdSinal } from '@/lib/estoque'
import { Selo } from '@/components/ui/selo'
import { Vazio } from '@/components/ui/page'
import { cn } from '@/lib/utils'

export const TIPOS_MOV: Record<TipoMovimento, { nome: string; tom: 'ok' | 'indigo' | 'warn' | 'aco' }> = {
  entrada: { nome: 'Compra', tom: 'ok' },
  ajuste: { nome: 'Contagem', tom: 'indigo' },
  saida: { nome: 'Baixa', tom: 'warn' },
  estorno: { nome: 'Estorno', tom: 'aco' },
}

/** Uma movimentação: quando, o quê, quanto e quem */
function Item({ m, ehAdmin, mostrarInsumo, onInsumo }: { m: Movimento; ehAdmin: boolean; mostrarInsumo: boolean; onInsumo?: (id: number) => void }) {
  const un = m.insumos?.unidade ?? 'un'
  const tipo = TIPOS_MOV[m.tipo]
  const p = m.insumos ? pecaCompra(m.insumos) : null
  const detalhes: string[] = []
  if (m.tipo === 'entrada') {
    if (p && m.insumos?.por_compra) {
      const n = m.quantidade / m.insumos.por_compra
      if (Math.abs(n - Math.round(n)) < 1e-6) detalhes.push(`${n} ${n === 1 ? p[0] : p[1]}`)
    }
    if (m.fornecedor) detalhes.push(m.fornecedor)
    if (m.nota) detalhes.push(`NF ${m.nota}`)
    if (ehAdmin && m.custo_unitario != null) {
      detalhes.push(
        p && m.insumos?.por_compra
          ? `${brl(m.custo_unitario * m.insumos.por_compra)} a ${p[0]}`
          : `${brl(m.custo_unitario)}/${UNIDADES[un].curto}`,
      )
    }
  }
  if (m.tipo === 'ajuste') {
    detalhes.push(`contou ${qtd(m.saldo_depois, un)}, o sistema tinha ${qtd(m.saldo_antes, un)}`)
  }

  return (
    <li className="flex gap-3 border-b border-hair px-4 py-3 last:border-b-0">
      <span className="w-[74px] shrink-0 pt-0.5 text-[12px] leading-tight text-muted">
        <span className="block">{rotuloDia(m.feito_em)}</span>
        <span className="tnum block text-faint">{hora(m.feito_em)}</span>
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <Selo tom={tipo.tom}>{tipo.nome}</Selo>
          {mostrarInsumo && m.insumos && (
            onInsumo ? (
              <button onClick={() => onInsumo(m.insumo_id)} className="truncate text-left text-[14px] text-ink hover:underline">
                {m.insumos.nome}
              </button>
            ) : (
              <span className="truncate text-[14px] text-ink">{m.insumos.nome}</span>
            )
          )}
        </span>
        {detalhes.length > 0 && <span className="mt-1 block text-[13px] text-muted">{detalhes.join(' · ')}</span>}
        {m.justificativa && (
          <span className="mt-0.5 block text-[13px] text-body">
            {m.tipo === 'ajuste' ? 'Motivo: ' : 'Obs.: '}
            {m.justificativa}
          </span>
        )}
        <span className="mt-0.5 block text-[12px] text-faint">{m.feito_por_nome ? `por ${m.feito_por_nome}` : 'pelo sistema'}</span>
      </span>
      <span className="shrink-0 text-right">
        <span
          className={cn(
            'tnum block whitespace-nowrap text-[15px] font-medium',
            m.quantidade > 0 ? 'text-ok' : m.quantidade < 0 ? 'text-warn' : 'text-muted',
          )}
        >
          {m.quantidade === 0 ? 'sem diferença' : qtdSinal(m.quantidade, un)}
        </span>
        <span className="tnum block whitespace-nowrap text-[12px] text-faint">saldo {qtd(m.saldo_depois, un)}</span>
        {m.insumos && emBarras(m.saldo_depois, m.insumos) && (
          <span className="tnum hidden whitespace-nowrap text-[11px] text-faint sm:block">{emBarras(m.saldo_depois, m.insumos)}</span>
        )}
      </span>
    </li>
  )
}

export function ListaMovimentos({
  movimentos,
  ehAdmin,
  mostrarInsumo = true,
  onInsumo,
  vazio,
}: {
  movimentos: Movimento[]
  ehAdmin: boolean
  mostrarInsumo?: boolean
  onInsumo?: (id: number) => void
  vazio?: React.ReactNode
}) {
  if (!movimentos.length) return <>{vazio ?? <Vazio titulo="Nenhuma movimentação ainda" />}</>
  return (
    <ul>
      {movimentos.map((m) => (
        <Item key={m.id} m={m} ehAdmin={ehAdmin} mostrarInsumo={mostrarInsumo} onInsumo={onInsumo} />
      ))}
    </ul>
  )
}
