import { useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Plus, Trash2 } from 'lucide-react'
import type { Lancamento, Pedido } from '@/lib/types'
import { dataCurta, hojeISO, primeiroDiaMes, somarMeses, tituloMes, ultimoDiaMes } from '@/lib/datas'
import { brl } from '@/lib/format'
import { irPara } from '@/lib/rota'
import { useCaixa } from '@/hooks/useCaixa'
import { mensagemErro } from '@/hooks/useAoVivo'
import { Button } from '@/components/ui/button'
import { Abas, Carregando, Erro, Pagina, Vazio } from '@/components/ui/page'
import { NovoLancamento } from './NovoLancamento'
import { Relatorio, Totais } from './Relatorio'
import { AReceberLista } from './AReceber'
import { Categorias } from './Categorias'
import { cn } from '@/lib/utils'

type Aba = 'lancamentos' | 'relatorio' | 'receber' | 'categorias'

interface Props {
  pedidos: Pedido[]
  /** "pagar-12" abre o lançamento já com o pedido 12 */
  acao: string | null
}

function Lancamentos({
  lancamentos,
  nomeCategoria,
  numeroPedido,
  excluir,
}: {
  lancamentos: Lancamento[]
  nomeCategoria: (id: number) => string
  numeroPedido: (id: number | null) => string | null
  excluir: (id: number) => Promise<void>
}) {
  const [filtro, setFiltro] = useState<'todos' | 'entrada' | 'saida'>('todos')
  const [verExcluidos, setVerExcluidos] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const ativos = lancamentos.filter((l) => !l.excluido_em)
  const excluidos = lancamentos.filter((l) => l.excluido_em)
  const lista = (verExcluidos ? lancamentos : ativos).filter((l) => filtro === 'todos' || l.tipo === filtro)

  async function apagar(l: Lancamento) {
    if (!window.confirm(`Excluir ${l.tipo === 'entrada' ? 'a entrada' : 'a saída'} de ${brl(l.valor)}? Fica registrado quem excluiu.`)) return
    try {
      await excluir(l.id)
    } catch (e) {
      setErro(mensagemErro(e))
    }
  }

  return (
    <>
      {erro && <Erro>{erro}</Erro>}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-1 rounded-md bg-hair/60 p-1 text-[13px]">
          {(['todos', 'entrada', 'saida'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFiltro(f)}
              className={cn('rounded px-3 py-1', filtro === f ? 'bg-card font-medium text-ink shadow-sm' : 'text-muted')}
            >
              {f === 'todos' ? 'Todos' : f === 'entrada' ? 'Entradas' : 'Saídas'}
            </button>
          ))}
        </div>
        {excluidos.length > 0 && (
          <button onClick={() => setVerExcluidos((v) => !v)} className="text-[13px] text-muted hover:text-body">
            {verExcluidos ? 'Esconder excluídos' : `Mostrar excluídos (${excluidos.length})`}
          </button>
        )}
      </div>

      <div className="overflow-hidden rounded-lg border border-hair bg-card">
        {!lista.length ? (
          <Vazio titulo="Nenhum lançamento neste mês">Use "Novo lançamento" para registrar uma entrada ou saída.</Vazio>
        ) : (
          <ul>
            {lista.map((l) => {
              const pedido = numeroPedido(l.pedido_id)
              return (
                <li
                  key={l.id}
                  className={cn('flex items-center gap-3 border-b border-hair px-4 py-3 last:border-b-0', l.excluido_em && 'opacity-50')}
                >
                  <span className="tnum w-11 shrink-0 text-[13px] text-muted">{dataCurta(l.data)}</span>
                  <span className="min-w-0 flex-1">
                    <span className={cn('block truncate text-[14px] text-ink', l.excluido_em && 'line-through')}>
                      {l.descricao || nomeCategoria(l.categoria_id)}
                    </span>
                    <span className="block truncate text-[12px] text-muted">
                      {l.descricao ? nomeCategoria(l.categoria_id) : ''}
                      {pedido && (
                        <>
                          {l.descricao ? ', ' : ''}
                          <a href={`#/pedido/${l.pedido_id}`} className="text-indigo hover:underline">
                            pedido {pedido}
                          </a>
                        </>
                      )}
                      {l.excluido_em
                        ? `, excluído por ${l.excluido_por_nome ?? '?'}`
                        : l.criado_por_nome
                          ? `${l.descricao || pedido ? ', ' : ''}por ${l.criado_por_nome}`
                          : ''}
                    </span>
                  </span>
                  <span className={cn('tnum shrink-0 text-[15px] font-medium', l.tipo === 'entrada' ? 'text-ok' : 'text-warn')}>
                    {l.tipo === 'saida' ? '− ' : '+ '}
                    {brl(l.valor)}
                  </span>
                  {!l.excluido_em ? (
                    <button
                      onClick={() => apagar(l)}
                      className="shrink-0 rounded p-1.5 text-faint hover:bg-warn-tint hover:text-warn"
                      aria-label="Excluir lançamento"
                    >
                      <Trash2 className="h-4 w-4" strokeWidth={1.75} />
                    </button>
                  ) : (
                    <span className="w-7 shrink-0" />
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </>
  )
}

export function Caixa({ pedidos, acao }: Props) {
  const hoje = hojeISO()
  const [aba, setAba] = useState<Aba>('lancamentos')
  const [mes, setMes] = useState(hoje.slice(0, 7))
  const [novo, setNovo] = useState<{ pedido: number | null } | null>(null)
  const caixa = useCaixa(primeiroDiaMes(mes), ultimoDiaMes(mes))

  // Veio do botão "Lançar pagamento" do pedido
  useEffect(() => {
    const m = acao?.match(/^pagar-(\d+)$/)
    if (m) {
      setNovo({ pedido: Number(m[1]) })
      irPara('caixa')
    }
  }, [acao])

  const nomes = useMemo(() => new Map(caixa.categorias.map((c) => [c.id, c.nome])), [caixa.categorias])
  const numeros = useMemo(() => new Map(pedidos.map((p) => [p.id, p.numero])), [pedidos])
  const ativos = caixa.lancamentos.filter((l) => !l.excluido_em)
  const entradas = ativos.filter((l) => l.tipo === 'entrada').reduce((s, l) => s + l.valor, 0)
  const saidas = ativos.filter((l) => l.tipo === 'saida').reduce((s, l) => s + l.valor, 0)
  const aReceber = caixa.aReceber.reduce((s, r) => s + r.saldo, 0)

  return (
    <Pagina
      titulo="Caixa"
      subtitulo="Entradas e saídas lançadas à mão. Só administradores veem esta tela."
      acoes={
        <Button size="sm" onClick={() => setNovo({ pedido: null })}>
          <Plus className="h-4 w-4" strokeWidth={2} />
          Novo lançamento
        </Button>
      }
    >
      <Abas
        className="mb-4"
        atual={aba}
        onTrocar={setAba}
        abas={[
          { id: 'lancamentos', nome: 'Lançamentos' },
          { id: 'relatorio', nome: 'Relatório' },
          { id: 'receber', nome: 'A receber', qtd: caixa.aReceber.filter((r) => r.saldo > 0).length },
          { id: 'categorias', nome: 'Categorias' },
        ]}
      />

      {caixa.erro && <Erro>{caixa.erro}</Erro>}
      {caixa.carregando ? (
        <Carregando />
      ) : (
        <>
          {aba === 'lancamentos' && (
            <>
              <div className="mb-3 flex items-center gap-1">
                <Button variant="outline" size="icon" onClick={() => setMes(somarMeses(mes, -1))} aria-label="Mês anterior">
                  <ChevronLeft className="h-4 w-4" strokeWidth={2} />
                </Button>
                <span className="w-44 text-center text-[15px] font-medium text-ink">{tituloMes(mes)}</span>
                <Button variant="outline" size="icon" onClick={() => setMes(somarMeses(mes, 1))} aria-label="Próximo mês">
                  <ChevronRight className="h-4 w-4" strokeWidth={2} />
                </Button>
                {mes !== hoje.slice(0, 7) && (
                  <Button variant="ghost" size="sm" onClick={() => setMes(hoje.slice(0, 7))}>
                    Este mês
                  </Button>
                )}
              </div>
              <Totais entradas={entradas} saidas={saidas} rotuloSaldo="Saldo do mês" />
              <p className="mb-4 mt-2 text-[13px] text-muted">
                A receber dos pedidos em aberto: <span className="tnum font-medium text-ink">{brl(aReceber)}</span>
              </p>
              <Lancamentos
                lancamentos={caixa.lancamentos}
                nomeCategoria={(id) => nomes.get(id) ?? 'Sem categoria'}
                numeroPedido={(id) => (id ? numeros.get(id) ?? null : null)}
                excluir={caixa.excluir}
              />
            </>
          )}
          {aba === 'relatorio' && <Relatorio pedidos={pedidos} />}
          {aba === 'receber' && <AReceberLista itens={caixa.aReceber} onLancar={(id) => setNovo({ pedido: id })} />}
          {aba === 'categorias' && <Categorias categorias={caixa.categorias} salvar={caixa.salvarCategoria} />}
        </>
      )}

      <NovoLancamento
        aberto={!!novo}
        onFechar={() => setNovo(null)}
        categorias={caixa.categorias}
        pedidos={pedidos}
        aReceber={caixa.aReceber}
        pedidoInicial={novo?.pedido ?? null}
        lancar={caixa.lancar}
      />
    </Pagina>
  )
}
