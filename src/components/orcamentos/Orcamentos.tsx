import { useMemo, useState } from 'react'
import { FileDown, Search } from 'lucide-react'
import type { Orcamento, Pedido, StatusOrcamento } from '@/lib/types'
import { brl, desde, telefoneBonito } from '@/lib/format'
import { useTodosOrcamentos } from '@/hooks/useTodosOrcamentos'
import { OrcamentoCard } from '@/components/OrcamentoCard'
import { Abas, Carregando, Erro, Pagina, Vazio } from '@/components/ui/page'
import { Selo } from '@/components/ui/selo'
import { estiloCampo } from '@/components/ui/campo'
import { cn } from '@/lib/utils'

type Aba = 'aprovar' | 'todos'

const SITUACAO: Record<StatusOrcamento, { nome: string; tom: 'palha' | 'indigo' | 'ok' | 'warn' }> = {
  aguardando_aprovacao: { nome: 'Para aprovar', tom: 'palha' },
  aprovado: { nome: 'Aprovado', tom: 'indigo' },
  enviado: { nome: 'Enviado ao cliente', tom: 'ok' },
  rejeitado: { nome: 'Rejeitado', tom: 'warn' },
}

interface Props {
  pendentes: Orcamento[]
  carregando: boolean
  erro: string | null
  decidir: (o: Orcamento, status: 'aprovado' | 'rejeitado') => Promise<void>
  pedidos: Pedido[]
}

function Todos({ pedidos }: { pedidos: Pedido[] }) {
  const { itens, carregando, erro } = useTodosOrcamentos()
  const [busca, setBusca] = useState('')
  const [filtro, setFiltro] = useState<StatusOrcamento | 'todos'>('todos')
  const pedidoDe = useMemo(() => new Map(pedidos.map((p) => [p.orcamento_id, p])), [pedidos])

  const termo = busca.trim().toLowerCase()
  const digitos = termo.replace(/\D/g, '')
  const lista = itens.filter(
    (o) =>
      (filtro === 'todos' || o.status === filtro) &&
      (!termo ||
        (o.nome_cliente ?? '').toLowerCase().includes(termo) ||
        (o.numero_proposta ?? '').includes(termo) ||
        (digitos.length > 2 && (o.telefone ?? '').includes(digitos))),
  )

  if (carregando) return <Carregando />
  return (
    <>
      {erro && <Erro>{erro}</Erro>}
      <div className="mb-3 flex flex-wrap gap-2">
        <label className={cn(estiloCampo, 'flex max-w-sm flex-1 items-center gap-2')}>
          <Search className="h-4 w-4 shrink-0 text-faint" strokeWidth={1.75} />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Cliente, telefone ou nº da proposta"
            className="w-full bg-transparent outline-none placeholder:text-faint"
          />
        </label>
        <select
          value={filtro}
          onChange={(e) => setFiltro(e.target.value as StatusOrcamento | 'todos')}
          className={cn(estiloCampo, 'w-auto')}
          aria-label="Filtrar por situação"
        >
          <option value="todos">Todas as situações</option>
          {Object.entries(SITUACAO).map(([id, s]) => (
            <option key={id} value={id}>
              {s.nome}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-hidden rounded-lg border border-hair bg-card">
        {!lista.length && <Vazio titulo="Nenhum orçamento encontrado" />}
        {lista.length > 0 && (
          <table className="w-full text-left text-[14px]">
            <thead className="hidden border-b border-hair bg-paper/60 text-[13px] text-muted md:table-header-group">
              <tr>
                <th className="px-4 py-2.5 font-medium">Cliente</th>
                <th className="px-4 py-2.5 font-medium">Proposta</th>
                <th className="px-4 py-2.5 font-medium">Medidas</th>
                <th className="px-4 py-2.5 text-right font-medium">Total</th>
                <th className="px-4 py-2.5 font-medium">Situação</th>
                <th className="px-4 py-2.5 font-medium">Chegou</th>
              </tr>
            </thead>
            <tbody>
              {lista.map((o) => {
                const s = SITUACAO[o.status]
                const pedido = pedidoDe.get(o.id)
                return (
                  <tr key={o.id} className="block border-b border-hair px-4 py-3 last:border-b-0 md:table-row md:p-0">
                    <td className="block md:table-cell md:px-4 md:py-3">
                      <span className="block font-medium text-ink">{o.nome_cliente || 'Sem nome'}</span>
                      <span className="block text-[13px] text-muted">{telefoneBonito(o.telefone)}</span>
                    </td>
                    <td className="tnum hidden text-muted md:table-cell md:px-4 md:py-3">
                      {o.numero_proposta || '—'}
                      {o.pdf_url && (
                        <a
                          href={o.pdf_url}
                          target="_blank"
                          rel="noreferrer"
                          className="ml-2 inline-flex items-center gap-1 text-[13px] text-indigo hover:underline"
                        >
                          <FileDown className="h-3.5 w-3.5" strokeWidth={1.75} />
                          PDF
                        </a>
                      )}
                    </td>
                    <td className="mt-1 block text-[13px] text-muted md:mt-0 md:table-cell md:px-4 md:py-3 md:text-[14px]">
                      {o.resumo?.medidas_cm ? `${o.resumo.medidas_cm} cm` : '—'}
                      {o.resumo?.modelo && <span className="text-faint">, {o.resumo.modelo === 'apoio' ? 'apoio' : 'fixo'}</span>}
                      <span className="md:hidden"> — {brl(o.resumo?.total)}</span>
                    </td>
                    <td className="tnum hidden text-right font-medium text-ink md:table-cell md:px-4 md:py-3">
                      {brl(o.resumo?.total)}
                    </td>
                    <td className="mt-2 flex flex-wrap items-center gap-1.5 md:mt-0 md:table-cell md:px-4 md:py-3">
                      <Selo tom={s.tom}>{s.nome}</Selo>
                      {pedido && (
                        <a href={`#/pedido/${pedido.id}`} className="ml-1.5 text-[13px] text-indigo hover:underline">
                          Pedido {pedido.numero}
                        </a>
                      )}
                      {o.decidido_por_nome && o.status !== 'aguardando_aprovacao' && (
                        <span className="block text-[12px] text-faint md:mt-0.5">por {o.decidido_por_nome}</span>
                      )}
                    </td>
                    <td className="hidden text-[13px] text-muted md:table-cell md:px-4 md:py-3">{desde(o.criado_em)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </>
  )
}

export function Orcamentos({ pendentes, carregando, erro, decidir, pedidos }: Props) {
  const [aba, setAba] = useState<Aba>('aprovar')

  return (
    <Pagina titulo="Orçamentos" subtitulo="Aprove o que a IA calculou e acompanhe o que já saiu.">
      <Abas
        className="mb-4"
        atual={aba}
        onTrocar={setAba}
        abas={[
          { id: 'aprovar', nome: 'Para aprovar', qtd: pendentes.length },
          { id: 'todos', nome: 'Todos' },
        ]}
      />
      {aba === 'aprovar' ? (
        <div className="max-w-2xl">
          {erro && <Erro>Não consegui carregar: {erro}</Erro>}
          {carregando && <Carregando />}
          {!carregando && !pendentes.length && !erro && (
            <Vazio titulo="Nenhum orçamento para aprovar">Quando a IA montar um orçamento, ele aparece aqui.</Vazio>
          )}
          {pendentes.map((o) => (
            <OrcamentoCard key={o.orcamento_id} orcamento={o} onDecidir={decidir} />
          ))}
        </div>
      ) : (
        <Todos pedidos={pedidos} />
      )}
    </Pagina>
  )
}
