import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Check, Pencil, Plus, Trash2, X } from 'lucide-react'
import type { Insumo, LinhaTecnica, Variacao } from '@/lib/types'
import type { Produtos as DadosProdutos } from '@/hooks/useProdutos'
import { UNIDADES, lerNumero, numero, qtd } from '@/lib/estoque'
import { MEDIDAS_PADRAO, VARIAVEIS, tentarFormula, type Medidas } from '@/lib/formula'
import { brl, desde } from '@/lib/format'
import { irPara } from '@/lib/rota'
import { mensagemErro } from '@/hooks/useAoVivo'
import { Button } from '@/components/ui/button'
import { Entrada, Escolha } from '@/components/ui/campo'
import { Carregando, Erro, Pagina, Painel, Vazio } from '@/components/ui/page'
import { Selo } from '@/components/ui/selo'
import { FormLinha } from './FormLinha'
import { FormProduto } from './FormProduto'
import { cn } from '@/lib/utils'

const Voltar = () => (
  <a href="#/produtos" className="inline-flex items-center gap-1 text-[13px] text-muted hover:text-ink">
    <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2} />
    Produtos
  </a>
)

interface Calculo {
  linha: LinhaTecnica
  insumo?: Insumo
  vale: boolean
  /** Resultado da fórmula (mm, mm², kg ou un) */
  bruto?: number
  /** Na unidade do estoque */
  estoque?: number
  erro?: string
}

function Variacoes({
  produtoId,
  variacoes,
  ehAdmin,
  dados,
}: {
  produtoId: number
  variacoes: Variacao[]
  ehAdmin: boolean
  dados: DadosProdutos
}) {
  const [nova, setNova] = useState('')
  const [editando, setEditando] = useState<number | null>(null)
  const [nome, setNome] = useState('')
  const [erro, setErro] = useState<string | null>(null)

  async function rodar(f: () => Promise<void>) {
    setErro(null)
    try {
      await f()
      return true
    } catch (e) {
      setErro(mensagemErro(e))
      return false
    }
  }

  return (
    <Painel titulo="Variações">
      {variacoes.length ? (
        <ul>
          {variacoes.map((v) => (
            <li key={v.id} className="flex items-center gap-2 border-b border-hair px-4 py-2 last:border-b-0">
              {editando === v.id ? (
                <>
                  <Entrada value={nome} onChange={(e) => setNome(e.target.value)} className="h-8 flex-1" autoFocus
                    onKeyDown={(e) => e.key === 'Enter' && rodar(() => dados.salvarVariacao({ id: v.id, produto_id: produtoId, nome })).then((ok) => ok && setEditando(null))} />
                  <button onClick={() => rodar(() => dados.salvarVariacao({ id: v.id, produto_id: produtoId, nome })).then((ok) => ok && setEditando(null))}
                    className="rounded p-1.5 text-ok hover:bg-ok-tint" aria-label="Salvar nome">
                    <Check className="h-4 w-4" strokeWidth={2} />
                  </button>
                  <button onClick={() => setEditando(null)} className="rounded p-1.5 text-muted hover:bg-paper" aria-label="Cancelar">
                    <X className="h-4 w-4" strokeWidth={2} />
                  </button>
                </>
              ) : (
                <>
                  <span className="min-w-0 flex-1 text-[14px] text-ink">{v.nome}</span>
                  {ehAdmin && (
                    <>
                      <button onClick={() => { setEditando(v.id); setNome(v.nome) }} className="rounded p-1.5 text-faint hover:bg-paper hover:text-body" aria-label={`Renomear ${v.nome}`}>
                        <Pencil className="h-3.5 w-3.5" strokeWidth={1.75} />
                      </button>
                      <button
                        onClick={() => {
                          if (window.confirm(`Apagar a variação "${v.nome}"? As linhas da lista técnica que valem só para ela saem junto.`)) {
                            rodar(() => dados.excluirVariacao(v.id))
                          }
                        }}
                        className="rounded p-1.5 text-faint hover:bg-warn-tint hover:text-warn"
                        aria-label={`Apagar ${v.nome}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} />
                      </button>
                    </>
                  )}
                </>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="px-4 py-3 text-[13px] text-muted">
          Sem variações. Use quando a mesma peça tem versões com receita diferente, como meia e inteira.
        </p>
      )}
      {ehAdmin && (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            rodar(() => dados.salvarVariacao({ produto_id: produtoId, nome: nova })).then((ok) => ok && setNova(''))
          }}
          className="flex gap-2 border-t border-hair px-4 py-3"
        >
          <Entrada value={nova} onChange={(e) => setNova(e.target.value)} placeholder="Nova variação" className="h-9 flex-1" />
          <Button size="sm" type="submit" variant="outline" disabled={!nova.trim()}>
            <Plus className="h-4 w-4" strokeWidth={2} />
            Adicionar
          </Button>
        </form>
      )}
      {erro && <p className="px-4 pb-3 text-[13px] text-warn">{erro}</p>}
    </Painel>
  )
}

/** Produto: variações, lista técnica e a simulação de consumo com medidas */
export function ProdutoPagina({
  id,
  dados,
  insumos,
  ehAdmin,
}: {
  id: string | null
  dados: DadosProdutos
  insumos: Insumo[]
  ehAdmin: boolean
}) {
  const { produtos, variacoes, linhas, carregando, erro } = dados
  const produto = produtos.find((p) => String(p.id) === id)
  const vars = useMemo(
    () => variacoes.filter((v) => v.produto_id === produto?.id).sort((a, b) => a.ordem - b.ordem || a.id - b.id),
    [variacoes, produto?.id],
  )
  const lista = useMemo(() => linhas.filter((l) => l.produto_id === produto?.id), [linhas, produto?.id])

  const [texto, setTexto] = useState<Record<keyof Medidas, string>>({
    X: String(MEDIDAS_PADRAO.X), Y: String(MEDIDAS_PADRAO.Y), A: String(MEDIDAS_PADRAO.A), N: String(MEDIDAS_PADRAO.N),
  })
  const [variacao, setVariacao] = useState<number | null>(null)
  const [editLinha, setEditLinha] = useState<{ linha: LinhaTecnica | null } | null>(null)
  const [editProduto, setEditProduto] = useState(false)
  const [erroAcao, setErroAcao] = useState<string | null>(null)

  // Sempre tem uma variação escolhida na simulação (quando o produto tem variações)
  useEffect(() => {
    if (!vars.length) setVariacao(null)
    else if (variacao == null || !vars.some((v) => v.id === variacao)) setVariacao(vars[0].id)
  }, [vars, variacao])

  const medidas: Medidas = {
    X: lerNumero(texto.X), Y: lerNumero(texto.Y), A: lerNumero(texto.A), N: lerNumero(texto.N),
  }
  const medidasOk = Object.values(medidas).every((n) => Number.isFinite(n) && n >= 0)

  const calculos: Calculo[] = lista.map((linha) => {
    const insumo = insumos.find((i) => i.id === linha.insumo_id)
    const vale = linha.variacoes.length === 0 || (variacao != null && linha.variacoes.includes(variacao))
    if (!medidasOk) return { linha, insumo, vale }
    const r = tentarFormula(linha.formula, medidas)
    if (r.erro != null) return { linha, insumo, vale, erro: r.erro }
    const fator = insumo ? UNIDADES[insumo.unidade].fator : 1
    return { linha, insumo, vale, bruto: r.valor, estoque: r.valor! / fator }
  })

  // Consumo de uma peça, somado por insumo
  const consumo = useMemo(() => {
    const m = new Map<number, { insumo?: Insumo; total: number }>()
    for (const c of calculos) {
      if (!c.vale || c.estoque == null) continue
      const atual = m.get(c.linha.insumo_id) ?? { insumo: c.insumo, total: 0 }
      atual.total += c.estoque
      m.set(c.linha.insumo_id, atual)
    }
    return [...m.values()]
  }, [calculos])
  const custoPeca = consumo.reduce((s, c) => s + c.total * (c.insumo?.custo ?? 0), 0)
  const comErro = calculos.filter((c) => c.vale && c.erro).length

  if (carregando) return <Carregando />
  if (!produto) {
    return (
      <Pagina titulo="Produto não encontrado" voltar={<Voltar />}>
        <Vazio titulo="Esse produto não existe ou foi apagado">Volte para a lista e escolha outro.</Vazio>
      </Pagina>
    )
  }

  const nomeVar = (vid: number) => vars.find((v) => v.id === vid)?.nome ?? '?'
  // "Todas", "Fixo na parede" ou "Todas, menos Fixo na parede" (o que for mais curto de ler)
  const valePara = (l: LinhaTecnica) => {
    if (l.variacoes.length === 0) return 'Todas'
    const fora = vars.filter((v) => !l.variacoes.includes(v.id))
    if (!fora.length) return 'Todas'
    if (l.variacoes.length > 1 && fora.length < l.variacoes.length) return `Todas, menos ${fora.map((v) => v.nome).join(' e ')}`
    return l.variacoes.map(nomeVar).join(' · ')
  }
  const variacaoAtual = vars.find((v) => v.id === variacao)

  async function apagarLinha(l: LinhaTecnica) {
    if (!window.confirm(`Tirar "${l.descricao}" da lista técnica?`)) return
    setErroAcao(null)
    try {
      await dados.excluirLinha(l.id)
    } catch (e) {
      setErroAcao(mensagemErro(e))
    }
  }

  const Resultado = ({ c }: { c: Calculo }) => {
    if (!c.vale) return <span className="text-[12px] text-faint">não entra{variacaoAtual ? ` em ${variacaoAtual.nome}` : ''}</span>
    if (c.erro) return <span className="text-[12px] text-warn">{c.erro}</span>
    if (c.bruto == null || !c.insumo) return <span className="text-faint">—</span>
    const u = UNIDADES[c.insumo.unidade]
    return (
      <>
        <span className="tnum block whitespace-nowrap font-medium text-ink">
          {numero(c.bruto, 2)} {u.receita}
        </span>
        {u.fator !== 1 && <span className="tnum block whitespace-nowrap text-[12px] text-muted">{qtd(c.estoque!, c.insumo.unidade)}</span>}
      </>
    )
  }

  const Acoes = ({ l }: { l: LinhaTecnica }) =>
    ehAdmin ? (
      <span className="flex shrink-0 justify-end">
        <button onClick={() => setEditLinha({ linha: l })} className="rounded p-1.5 text-faint hover:bg-paper hover:text-body" aria-label={`Editar ${l.descricao}`}>
          <Pencil className="h-3.5 w-3.5" strokeWidth={1.75} />
        </button>
        <button onClick={() => apagarLinha(l)} className="rounded p-1.5 text-faint hover:bg-warn-tint hover:text-warn" aria-label={`Tirar ${l.descricao}`}>
          <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} />
        </button>
      </span>
    ) : null

  const NomeInsumo = ({ c }: { c: Calculo }) => (
    <>
      <span className="text-body">{c.insumo?.nome ?? 'Insumo apagado'}</span>
      {c.insumo && !c.insumo.ativo && <span className="ml-1.5 align-middle"><Selo tom="aco">desativado</Selo></span>}
    </>
  )

  return (
    <Pagina
      voltar={<Voltar />}
      titulo={
        <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
          {produto.nome}
          {!produto.ativo && <Selo tom="aco">Desativado</Selo>}
        </span>
      }
      subtitulo={
        <>
          {produto.categoria}
          {produto.descricao ? ` · ${produto.descricao}` : ''}
          {produto.atualizado_por_nome && (
            <span className="block text-[12px] text-faint">
              {produto.atualizado_por_nome === 'Carga inicial'
                ? 'Receita copiada do cálculo do orçamento'
                : `Alterado por ${produto.atualizado_por_nome} ${desde(produto.atualizado_em)}`}
            </span>
          )}
        </>
      }
      acoes={
        ehAdmin ? (
          <Button variant="outline" onClick={() => setEditProduto(true)}>
            <Pencil className="h-4 w-4" strokeWidth={1.75} />
            Editar produto
          </Button>
        ) : undefined
      }
    >
      {erro && <Erro>{erro}</Erro>}
      {erroAcao && <Erro>{erroAcao}</Erro>}

      <Painel titulo="Simular com as medidas" className="mb-4" corpo="px-4 py-3">
        <div className="flex flex-wrap items-end gap-3">
          {VARIAVEIS.map((v) => (
            <label key={v.id} className="w-[calc(50%-6px)] sm:w-28">
              <span className="mb-1 block text-[12px] text-muted">
                <b className="font-mono text-body">{v.id}</b> {v.nome.toLowerCase()}
                {v.unidade ? ` (${v.unidade})` : ''}
              </span>
              <Entrada
                inputMode="decimal"
                value={texto[v.id]}
                onChange={(e) => setTexto((t) => ({ ...t, [v.id]: e.target.value }))}
                className={cn('text-right', !Number.isFinite(medidas[v.id]) && 'border-warn')}
              />
            </label>
          ))}
          {vars.length > 0 && (
            <label className="w-full sm:w-auto sm:min-w-[200px] sm:flex-1">
              <span className="mb-1 block text-[12px] text-muted">Variação</span>
              <Escolha value={variacao ?? ''} onChange={(e) => setVariacao(Number(e.target.value))}>
                {vars.map((v) => (
                  <option key={v.id} value={v.id}>{v.nome}</option>
                ))}
              </Escolha>
            </label>
          )}
        </div>
        <p className="mt-2 text-[12px] text-faint">
          Só para conferir a receita: troque as medidas e veja quanto de cada insumo vai em uma peça.
          {!medidasOk && <span className="text-warn"> Confira as medidas: tem número que não entendi.</span>}
        </p>
      </Painel>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="min-w-0 lg:col-span-2">
          <Painel
            titulo="Lista técnica"
            acao={
              ehAdmin ? (
                <Button size="sm" variant="outline" onClick={() => setEditLinha({ linha: null })} disabled={!insumos.length}>
                  <Plus className="h-4 w-4" strokeWidth={2} />
                  Adicionar linha
                </Button>
              ) : undefined
            }
          >
            {!lista.length ? (
              <Vazio titulo="Lista técnica vazia">
                {ehAdmin ? 'Adicione uma linha para cada parte da peça: o insumo e a fórmula de quanto vai.' : 'O administrador monta a lista técnica.'}
              </Vazio>
            ) : (
              <>
                <table className="hidden w-full text-[14px] md:table">
                  <thead>
                    <tr className="border-b border-hair text-left text-[12px] text-faint">
                      <th className="w-[26%] px-4 py-2 font-medium">Parte</th>
                      <th className="px-3 py-2 font-medium">Insumo e fórmula</th>
                      {vars.length > 0 && <th className="w-[22%] px-3 py-2 font-medium">Vale para</th>}
                      <th className="w-[15%] px-3 py-2 text-right font-medium">Em 1 peça</th>
                      {ehAdmin && <th className="w-16" />}
                    </tr>
                  </thead>
                  <tbody>
                    {calculos.map((c) => (
                      <tr key={c.linha.id} className={cn('border-b border-hair align-top last:border-b-0', !c.vale && 'bg-paper/50')}>
                        <td className={cn('px-4 py-2.5 text-ink', !c.vale && 'text-faint')}>{c.linha.descricao}</td>
                        <td className={cn('px-3 py-2.5', !c.vale && 'opacity-60')}>
                          <NomeInsumo c={c} />
                          <span className="block font-mono text-[12px] text-muted">{c.linha.formula}</span>
                        </td>
                        {vars.length > 0 && <td className={cn('px-3 py-2.5 text-[13px] text-muted', !c.vale && 'opacity-60')}>{valePara(c.linha)}</td>}
                        <td className="px-3 py-2.5 text-right">
                          <Resultado c={c} />
                        </td>
                        {ehAdmin && (
                          <td className="py-2 pr-2">
                            <Acoes l={c.linha} />
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>

                <ul className="md:hidden">
                  {calculos.map((c) => (
                    <li key={c.linha.id} className={cn('border-b border-hair px-4 py-3 last:border-b-0', !c.vale && 'bg-paper/50')}>
                      <div className="flex items-start gap-3">
                        <div className={cn('min-w-0 flex-1 text-[14px]', !c.vale && 'opacity-60')}>
                          <p className="font-medium text-ink">{c.linha.descricao}</p>
                          <p><NomeInsumo c={c} /></p>
                          <p className="font-mono text-[12px] text-muted">{c.linha.formula}</p>
                          {vars.length > 0 && <p className="text-[12px] text-faint">Vale para: {valePara(c.linha)}</p>}
                        </div>
                        <div className="shrink-0 text-right text-[14px]">
                          <Resultado c={c} />
                        </div>
                      </div>
                      {ehAdmin && <div className="-mb-1 mt-1"><Acoes l={c.linha} /></div>}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </Painel>
          {comErro > 0 && (
            <p className="mt-2 text-[13px] text-warn">
              {comErro === 1 ? '1 linha com erro na fórmula' : `${comErro} linhas com erro na fórmula`}: ela não entra na conta até ser corrigida.
            </p>
          )}
        </div>

        <div className="space-y-4">
          <Painel titulo={variacaoAtual ? `Consumo: ${variacaoAtual.nome}` : 'Consumo de 1 peça'}>
            {consumo.length ? (
              <ul>
                {consumo.map((c, k) => (
                  <li key={k} className="flex items-baseline justify-between gap-3 border-b border-hair px-4 py-2 text-[14px] last:border-b-0">
                    <span className="min-w-0 text-body">{c.insumo?.nome ?? '?'}</span>
                    <span className="shrink-0 text-right">
                      <span className="tnum block font-medium text-ink">{c.insumo ? qtd(c.total, c.insumo.unidade) : numero(c.total)}</span>
                      {ehAdmin && c.insumo && c.insumo.custo > 0 && (
                        <span className="tnum block text-[12px] text-faint">{brl(c.total * c.insumo.custo)}</span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-4 py-3 text-[13px] text-muted">Nada para somar com essas medidas.</p>
            )}
            {ehAdmin && custoPeca > 0 && (
              <div className="flex justify-between border-t border-hair px-4 py-2.5 text-[14px]">
                <span className="font-medium text-ink">Custo de material</span>
                <span className="tnum font-semibold text-ink">{brl(custoPeca)}</span>
              </div>
            )}
          </Painel>

          <Variacoes produtoId={produto.id} variacoes={vars} ehAdmin={ehAdmin} dados={dados} />
        </div>
      </div>

      {editLinha && (
        <FormLinha
          produtoId={produto.id}
          linha={editLinha.linha}
          variacoes={vars}
          insumos={insumos}
          medidas={medidasOk ? medidas : MEDIDAS_PADRAO}
          onFechar={() => setEditLinha(null)}
          onSalvar={dados.salvarLinha}
        />
      )}

      {editProduto && (
        <FormProduto
          produto={produto}
          categorias={[...new Set(produtos.map((p) => p.categoria))]}
          onFechar={() => setEditProduto(false)}
          onSalvar={dados.salvarProduto}
          onExcluir={async () => {
            await dados.excluirProduto(produto.id)
            irPara('produtos')
          }}
        />
      )}
    </Pagina>
  )
}
