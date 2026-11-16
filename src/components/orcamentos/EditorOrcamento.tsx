import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Minus, Package, Plus, RefreshCw, RotateCcw, Trash2, Truck } from 'lucide-react'
import type { Orcamento, PecaOrcamento } from '@/lib/types'
import { brl, desde, telefoneBonito } from '@/lib/format'
import { irPara } from '@/lib/rota'
import {
  CATALOGO, KIT_BASICO, PERFIS, buscarOrcamento, calcular, comPrecosManuais, conferir, criarOrcamento,
  formularioDe, formularioVazio, manuaisDe, nomePeca, resultadoDe, salvarEdicao,
  type Formulario, type Resultado,
} from '@/lib/orcamento'
import { decidirOrcamento } from '@/hooks/useOrcamentos'
import { mensagemErro } from '@/hooks/useAoVivo'
import { Button } from '@/components/ui/button'
import { Entrada, Escolha, Rotulo, lerValor } from '@/components/ui/campo'
import { Carregando, Erro, Pagina, Painel, Vazio } from '@/components/ui/page'
import { cn } from '@/lib/utils'

interface Props {
  /** id do orçamento, ou "novo" para a calculadora */
  id: string | null
  ehAdmin: boolean
}

const grupos = Array.from(new Set(CATALOGO.map((c) => c.grupo)))
const linhaDescricao = (d: PecaOrcamento['descricao']) => (Array.isArray(d) ? d.join(' · ') : d ?? '')

/** Campo numérico curto com rótulo e unidade */
function Numero({
  rotulo, valor, onMudar, unidade, dica, placeholder,
}: {
  rotulo: string
  valor: string
  onMudar: (v: string) => void
  unidade?: string
  dica?: string
  placeholder?: string
}) {
  return (
    <div>
      <Rotulo dica={dica}>{rotulo}</Rotulo>
      <div className="relative">
        <Entrada
          inputMode="decimal"
          value={valor}
          placeholder={placeholder}
          onChange={(e) => onMudar(e.target.value.replace(/[^\d,.]/g, ''))}
          className={cn('tnum', unidade && 'pr-10')}
        />
        {unidade && (
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[13px] text-faint">
            {unidade}
          </span>
        )}
      </div>
    </div>
  )
}

/** Preço unitário de uma peça, editável. Vale ao sair do campo ou com Enter. */
function PrecoPeca({
  peca, onDefinir, onVoltar,
}: {
  peca: PecaOrcamento
  onDefinir: (v: number) => void
  onVoltar: () => void
}) {
  const atual = peca.preco_unitario_exibido ?? 0
  const [texto, setTexto] = useState(atual.toFixed(2).replace('.', ','))
  useEffect(() => setTexto(atual.toFixed(2).replace('.', ',')), [atual])

  function aplicar() {
    const v = lerValor(texto)
    if (!Number.isFinite(v) || v < 0) {
      setTexto(atual.toFixed(2).replace('.', ','))
      return
    }
    if (Math.abs(v - atual) >= 0.005) onDefinir(v)
  }

  return (
    <div className="flex items-center justify-end gap-1">
      {peca.preco_manual && (
        <button
          onClick={onVoltar}
          className="rounded p-1 text-faint hover:bg-paper hover:text-indigo"
          title={`Voltar ao calculado: ${brl(peca.preco_calculado)}`}
          aria-label="Voltar ao preço calculado"
        >
          <RotateCcw className="h-3.5 w-3.5" strokeWidth={1.75} />
        </button>
      )}
      <div className="relative">
        <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-[12px] text-faint">R$</span>
        <input
          inputMode="decimal"
          value={texto}
          onChange={(e) => setTexto(e.target.value.replace(/[^\d,.]/g, ''))}
          onBlur={aplicar}
          onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
          className={cn(
            'tnum h-9 w-[7.5rem] rounded-md border bg-card pl-7 pr-2 text-right font-mono text-[13px] outline-none focus:border-indigo',
            peca.preco_manual ? 'border-palha bg-palha-tint text-ink' : 'border-hair text-body',
          )}
          aria-label={`Preço unitário de ${peca.nome}`}
        />
      </div>
    </div>
  )
}

export function EditorOrcamento({ id, ehAdmin }: Props) {
  const novo = id === 'novo'
  const [orc, setOrc] = useState<Orcamento | null>(null)
  const [carregando, setCarregando] = useState(!novo)
  const [erroCarga, setErroCarga] = useState<string | null>(null)

  const [f, setF] = useState<Formulario>(formularioVazio)
  const [base, setBase] = useState<Resultado | null>(null)
  const [manuais, setManuais] = useState<Record<string, number>>({})
  const [sujo, setSujo] = useState(novo)
  const [alterado, setAlterado] = useState(false)

  const [calculando, setCalculando] = useState(false)
  const [errosCalculo, setErrosCalculo] = useState<string[]>([])
  const [salvando, setSalvando] = useState<null | 'salvar' | 'aprovar'>(null)
  const [erroSalvar, setErroSalvar] = useState<string | null>(null)

  useEffect(() => {
    if (novo || !id) return
    let vivo = true
    setCarregando(true)
    buscarOrcamento(Number(id))
      .then((o) => {
        if (!vivo) return
        setOrc(o)
        setF(formularioDe(o))
        const r = resultadoDe(o)
        setBase(r)
        setManuais(manuaisDe(o.detalhe))
        setSujo(!r)
      })
      .catch((e) => vivo && setErroCarga(mensagemErro(e)))
      .finally(() => vivo && setCarregando(false))
    return () => {
      vivo = false
    }
  }, [id, novo])

  const resultado = useMemo(() => (base ? comPrecosManuais(base, manuais) : null), [base, manuais])
  const cot = base?.detalhe.cotacao_frete
  const emb = base?.detalhe.embalagem
  const calc = emb?.calculada ?? emb
  const opcoes = cot?.opcoes ?? []

  function mudar(patch: Partial<Formulario>) {
    setF((atual) => ({ ...atual, ...patch }))
    setSujo(true)
    setAlterado(true)
  }
  const mudarCaixa = (k: keyof Formulario['caixa'], v: string) => mudar({ caixa: { ...f.caixa, [k]: v } })

  function qtdPeca(tipo: string, delta: number) {
    const itens = f.itens
      .map((i) => (i.tipo === tipo ? { ...i, qtd: i.qtd + delta } : i))
      .filter((i) => i.qtd > 0)
    mudar({ itens })
  }
  function porPeca(tipo: string) {
    if (!tipo) return
    const tem = f.itens.some((i) => i.tipo === tipo)
    mudar({ itens: tem ? f.itens.map((i) => (i.tipo === tipo ? { ...i, qtd: i.qtd + 1 } : i)) : [...f.itens, { tipo, qtd: 1 }] })
  }
  function porKit() {
    let itens = [...f.itens]
    for (const k of KIT_BASICO) {
      const i = itens.find((x) => x.tipo === k.tipo)
      itens = i ? itens.map((x) => (x.tipo === k.tipo ? { ...x, qtd: Math.max(x.qtd, k.qtd) } : x)) : [...itens, { ...k }]
    }
    mudar({ itens })
  }

  async function recalcular() {
    const erros = conferir(f, novo)
    if (erros.length) {
      setErrosCalculo(erros)
      return
    }
    setCalculando(true)
    setErrosCalculo([])
    setErroSalvar(null)
    const r = await calcular(f)
    setCalculando(false)
    if (!r.ok) {
      setErrosCalculo(r.erros)
      return
    }
    setBase(r.r)
    setSujo(false)
    setAlterado(true)
  }

  function definirPreco(tipo: string, v: number) {
    setManuais((m) => ({ ...m, [tipo]: v }))
    setAlterado(true)
  }
  function voltarPreco(tipo: string) {
    setManuais((m) => {
      const { [tipo]: _, ...resto } = m
      return resto
    })
    setAlterado(true)
  }

  async function concluir(aprovar: boolean) {
    if (!resultado || sujo) return
    const tel = (orc?.telefone ?? f.telefone).replace(/\D/g, '')
    if (aprovar) {
      const pergunta = tel
        ? 'Aprovar? O PDF da proposta vai para o WhatsApp do cliente.'
        : 'Aprovar? Sem telefone, o PDF só fica para baixar em Orçamentos > Todos.'
      if (!window.confirm(pergunta)) return
    }
    setSalvando(aprovar ? 'aprovar' : 'salvar')
    setErroSalvar(null)
    try {
      if (orc) {
        await salvarEdicao(orc, f, resultado)
        if (aprovar) await decidirOrcamento(orc, 'aprovado')
      } else {
        const novoId = await criarOrcamento(f, resultado)
        if (aprovar) await decidirOrcamento(await buscarOrcamento(novoId), 'aprovado')
      }
      setAlterado(false)
      irPara('orcamentos')
    } catch (e) {
      setErroSalvar(mensagemErro(e))
      setSalvando(null)
    }
  }

  function voltar() {
    if (alterado && !window.confirm('Sair sem salvar? As mudanças se perdem.')) return
    irPara('orcamentos')
  }

  const linkVoltar = (
    <button onClick={voltar} className="inline-flex items-center gap-1 text-[13px] text-muted hover:text-body">
      <ArrowLeft className="h-4 w-4" strokeWidth={1.75} />
      Orçamentos
    </button>
  )

  if (!ehAdmin) {
    return (
      <Pagina titulo="Orçamento" voltar={linkVoltar}>
        <Vazio titulo="Só administrador edita ou cria orçamento" />
      </Pagina>
    )
  }
  if (carregando) {
    return (
      <Pagina titulo="Editar orçamento" voltar={linkVoltar}>
        <Carregando />
      </Pagina>
    )
  }
  if (erroCarga || (!novo && !orc)) {
    return (
      <Pagina titulo="Editar orçamento" voltar={linkVoltar}>
        <Erro>{erroCarga ?? 'Orçamento não encontrado.'}</Erro>
      </Pagina>
    )
  }
  if (orc && orc.status !== 'aguardando_aprovacao') {
    return (
      <Pagina titulo="Editar orçamento" voltar={linkVoltar}>
        <Vazio titulo={`Esse orçamento já foi ${orc.status === 'rejeitado' ? 'rejeitado' : 'aprovado'}`}>
          Só dá para editar antes de aprovar. Para mudar, crie um orçamento novo.
        </Vazio>
      </Pagina>
    )
  }

  const totalIA = orc?.resumo_ia?.total ?? (orc?.origem !== 'painel' && !orc?.editado_em ? orc?.resumo?.total : null)

  return (
    <Pagina
      voltar={linkVoltar}
      className="pb-28 lg:pb-10"
      titulo={novo ? 'Novo orçamento' : 'Editar orçamento'}
      subtitulo={
        novo
          ? 'Mesma conta da IA. Com telefone, o PDF vai pelo WhatsApp ao aprovar.'
          : `${orc?.nome_cliente || 'Cliente sem nome'}${orc?.telefone ? `, ${telefoneBonito(orc.telefone)}` : ''}. Chegou ${desde(orc?.criado_em)}.`
      }
    >
      <div className="grid gap-5 lg:grid-cols-5">
        {/* ---------------- Formulário ---------------- */}
        <div className="space-y-4 lg:col-span-3">
          <Painel titulo="Cliente" corpo="grid gap-3 px-4 py-4 sm:grid-cols-3">
            <div className="sm:col-span-3">
              <Rotulo>Nome</Rotulo>
              <Entrada value={f.nome} onChange={(e) => mudar({ nome: e.target.value })} placeholder="Nome que vai no PDF" />
            </div>
            <div className="sm:col-span-2">
              <Rotulo dica={novo ? 'opcional' : undefined}>Telefone</Rotulo>
              {novo ? (
                <Entrada
                  inputMode="tel"
                  value={f.telefone}
                  onChange={(e) => mudar({ telefone: e.target.value })}
                  placeholder="(31) 99999-9999"
                />
              ) : (
                <div className="flex h-10 items-center text-[15px] text-muted">{telefoneBonito(orc?.telefone) || 'Sem telefone'}</div>
              )}
            </div>
            <div>
              <Rotulo>CEP</Rotulo>
              <Entrada inputMode="numeric" value={f.cep} onChange={(e) => mudar({ cep: e.target.value })} placeholder="00000-000" />
            </div>
          </Painel>

          <Painel titulo="Suporte" corpo="space-y-4 px-4 py-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Numero rotulo="Largura (X)" unidade="cm" valor={f.x_cm} onMudar={(v) => mudar({ x_cm: v })} />
              <Numero rotulo="Profundidade (Y)" unidade="cm" valor={f.y_cm} onMudar={(v) => mudar({ y_cm: v })} />
              <Numero rotulo="Altura" unidade="cm" valor={f.altura_cm} onMudar={(v) => mudar({ altura_cm: v })} />
              <Numero rotulo="Níveis" valor={f.niveis} onMudar={(v) => mudar({ niveis: v })} />
            </div>
            <div className="grid gap-3 sm:grid-cols-4">
              <div className="sm:col-span-2">
                <Rotulo>Modelo</Rotulo>
                <div className="grid h-10 grid-cols-2 rounded-md border border-hair bg-paper p-0.5" role="radiogroup">
                  {(['apoio', 'fixo'] as const).map((m) => (
                    <button
                      key={m}
                      role="radio"
                      aria-checked={f.modelo === m}
                      onClick={() => mudar({ modelo: m })}
                      className={cn(
                        'rounded text-[14px] transition-colors',
                        f.modelo === m ? 'bg-card font-medium text-ink shadow-sm' : 'text-muted hover:text-body',
                      )}
                    >
                      {m === 'apoio' ? 'Flutuante (apoio)' : 'Fixo'}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Rotulo>Base (perfil)</Rotulo>
                <Escolha value={f.perfil} onChange={(e) => mudar({ perfil: e.target.value })} disabled={f.modelo === 'fixo'}>
                  {PERFIS.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nome}
                    </option>
                  ))}
                </Escolha>
              </div>
              <Numero rotulo="Quantidade" valor={f.quantidade} onMudar={(v) => mudar({ quantidade: v })} />
            </div>
          </Painel>

          <Painel
            titulo="Peças"
            acao={
              <button onClick={porKit} className="text-[13px] text-indigo hover:underline">
                Pôr o kit básico
              </button>
            }
            corpo="px-4 py-3"
          >
            <p className="mb-2 text-[13px] text-muted">O suporte já entra sozinho. Aqui ficam as grelhas, espetos e o giratório.</p>
            {!f.itens.length && <p className="py-2 text-[14px] text-faint">Só o suporte, sem peças.</p>}
            <ul className="divide-y divide-hair">
              {f.itens.map((i) => (
                <li key={i.tipo} className="flex items-center gap-3 py-2">
                  <span className="min-w-0 flex-1 text-[14px] text-ink">{nomePeca(i.tipo)}</span>
                  <div className="flex items-center rounded-md border border-hair">
                    <button onClick={() => qtdPeca(i.tipo, -1)} className="p-2 text-muted hover:text-ink" aria-label="Menos uma">
                      <Minus className="h-3.5 w-3.5" strokeWidth={2} />
                    </button>
                    <span className="tnum w-7 text-center text-[14px] font-medium text-ink">{i.qtd}</span>
                    <button onClick={() => qtdPeca(i.tipo, 1)} className="p-2 text-muted hover:text-ink" aria-label="Mais uma">
                      <Plus className="h-3.5 w-3.5" strokeWidth={2} />
                    </button>
                  </div>
                  <button
                    onClick={() => qtdPeca(i.tipo, -i.qtd)}
                    className="rounded p-1.5 text-faint hover:bg-warn-tint hover:text-warn"
                    aria-label={`Tirar ${nomePeca(i.tipo)}`}
                  >
                    <Trash2 className="h-4 w-4" strokeWidth={1.75} />
                  </button>
                </li>
              ))}
            </ul>
            <Escolha value="" onChange={(e) => porPeca(e.target.value)} className="mt-2" aria-label="Adicionar peça">
              <option value="">Adicionar peça…</option>
              {grupos.map((g) => (
                <optgroup key={g} label={g}>
                  {CATALOGO.filter((c) => c.grupo === g).map((c) => (
                    <option key={c.tipo} value={c.tipo}>
                      {c.nome}
                    </option>
                  ))}
                </optgroup>
              ))}
            </Escolha>
          </Painel>

          <Painel titulo="Frete" corpo="space-y-4 px-4 py-4">
            <div>
              <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
                <span className="flex items-center gap-1.5 text-[13px] font-medium text-body">
                  <Package className="h-4 w-4 text-faint" strokeWidth={1.75} />
                  Caixa
                </span>
                <span className="text-[12px] text-faint">
                  {calc
                    ? `Calculada: ${calc.comprimento_cm} × ${calc.largura_cm} × ${calc.altura_cm} cm, ${calc.peso_kg ?? 15} kg`
                    : 'Em branco, o sistema calcula pelas medidas'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Numero rotulo="Comprimento" unidade="cm" valor={f.caixa.comprimento_cm} placeholder={calc ? String(calc.comprimento_cm) : ''} onMudar={(v) => mudarCaixa('comprimento_cm', v)} />
                <Numero rotulo="Largura" unidade="cm" valor={f.caixa.largura_cm} placeholder={calc ? String(calc.largura_cm) : ''} onMudar={(v) => mudarCaixa('largura_cm', v)} />
                <Numero rotulo="Altura" unidade="cm" valor={f.caixa.altura_cm} placeholder={calc ? String(calc.altura_cm) : ''} onMudar={(v) => mudarCaixa('altura_cm', v)} />
                <Numero rotulo="Peso" unidade="kg" valor={f.caixa.peso_kg} placeholder={calc?.peso_kg != null ? String(calc.peso_kg) : '15'} onMudar={(v) => mudarCaixa('peso_kg', v)} />
              </div>
              {Object.values(f.caixa).some((v) => v.trim()) && (
                <button
                  onClick={() => mudar({ caixa: { comprimento_cm: '', largura_cm: '', altura_cm: '', peso_kg: '' } })}
                  className="mt-2 text-[13px] text-indigo hover:underline"
                >
                  Voltar à caixa calculada
                </button>
              )}
            </div>

            <div>
              <span className="mb-2 flex items-center gap-1.5 text-[13px] font-medium text-body">
                <Truck className="h-4 w-4 text-faint" strokeWidth={1.75} />
                Transportadora
              </span>
              {!opcoes.length ? (
                <p className="text-[13px] text-muted">Recalcule para ver as opções do Melhor Envio para esse CEP e essa caixa.</p>
              ) : (
                <div className="space-y-1.5" role="radiogroup" aria-label="Transportadora">
                  {[{ servico: '', preco: null as number | null, prazo: null as number | null }, ...opcoes].map((op) => {
                    const marcado = f.frete_servico === op.servico
                    return (
                      <label
                        key={op.servico || 'auto'}
                        className={cn(
                          'flex cursor-pointer items-center gap-3 rounded-md border px-3 py-2 text-[14px]',
                          marcado ? 'border-indigo bg-indigo-tint/50' : 'border-hair hover:bg-paper',
                        )}
                      >
                        <input
                          type="radio"
                          name="transportadora"
                          checked={marcado}
                          onChange={() => mudar({ frete_servico: op.servico })}
                          className="accent-indigo"
                        />
                        <span className="flex-1 text-ink">
                          {op.servico || 'Automático'}
                          {!op.servico && <span className="text-[12px] text-muted"> (Correios PAC, ou a mais barata se o PAC não atender)</span>}
                        </span>
                        {op.preco != null && <span className="tnum font-mono text-[13px] text-body">{brl(op.preco)}</span>}
                        {op.prazo != null && <span className="w-16 text-right text-[12px] text-muted">{op.prazo} dias</span>}
                      </label>
                    )
                  })}
                  {f.frete_servico && !opcoes.some((o) => o.servico === f.frete_servico) && (
                    <p className="text-[13px] text-warn">{f.frete_servico} não apareceu na última cotação.</p>
                  )}
                </div>
              )}
            </div>
          </Painel>
        </div>

        {/* ---------------- Resultado ---------------- */}
        <div className="lg:col-span-2">
          <div className="space-y-3 lg:sticky lg:top-4">
            <Painel
              titulo="Orçamento"
              acao={
                <Button size="sm" variant={sujo ? 'default' : 'outline'} onClick={recalcular} disabled={calculando}>
                  <RefreshCw className={cn('h-4 w-4', calculando && 'animate-spin')} strokeWidth={1.75} />
                  {calculando ? 'Calculando…' : 'Recalcular'}
                </Button>
              }
              corpo=""
            >
              {sujo && !calculando && (
                <div className="border-b border-hair bg-palha-tint px-4 py-2.5 text-[13px] text-palha">
                  {resultado
                    ? 'Você mudou medidas, peças ou frete. Recalcule para ver o preço novo antes de salvar.'
                    : 'Preencha e clique em Recalcular para ver o preço.'}
                </div>
              )}
              {errosCalculo.length > 0 && (
                <ul className="space-y-1 border-b border-hair bg-warn-tint px-4 py-2.5 text-[13px] text-warn">
                  {errosCalculo.map((e, i) => (
                    <li key={i}>{e}</li>
                  ))}
                </ul>
              )}

              {resultado ? (
                <div className={cn('transition-opacity', (sujo || calculando) && 'opacity-50')}>
                  <ul className="divide-y divide-hair">
                    {(resultado.detalhe.pecas ?? []).map((p) => (
                      <li key={p.tipo} className="px-4 py-2.5">
                        <div className="flex items-start gap-2">
                          <span className="tnum w-7 shrink-0 pt-px text-[13px] font-semibold text-ink">{p.quantidade}×</span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-[14px] font-medium text-ink">{p.nome}</span>
                            <span className="block text-[12px] leading-snug text-muted">{linhaDescricao(p.descricao)}</span>
                          </span>
                          <PrecoPeca
                            peca={p}
                            onDefinir={(v) => definirPreco(p.tipo, v)}
                            onVoltar={() => voltarPreco(p.tipo)}
                          />
                        </div>
                        <div className="mt-1 flex justify-between pl-9 text-[12px] text-faint">
                          <span>{p.preco_manual ? `preço à mão, calculado era ${brl(p.preco_calculado)}` : 'preço unitário calculado'}</span>
                          {p.quantidade > 1 && <span className="tnum">{brl(p.preco_exibido)}</span>}
                        </div>
                      </li>
                    ))}
                  </ul>

                  <div className="grid grid-cols-3 border-t border-hair">
                    <div className="px-4 py-3">
                      <div className="text-[12px] text-muted">Total</div>
                      <div className="tnum text-[18px] font-semibold text-ink">{brl(resultado.resumo.total)}</div>
                    </div>
                    <div className="px-4 py-3">
                      <div className="text-[12px] text-muted">6x de</div>
                      <div className="tnum text-[15px] text-body">{brl(resultado.resumo.parcela_6x)}</div>
                    </div>
                    <div className="px-4 py-3">
                      <div className="text-[12px] text-muted">Pix à vista</div>
                      <div className="tnum text-[15px] text-body">{brl(resultado.resumo.a_vista_pix)}</div>
                    </div>
                  </div>

                  <div className="space-y-1 border-t border-hair px-4 py-3 text-[13px] text-muted">
                    {cot?.ok ? (
                      <div>
                        Frete incluso <span className="tnum font-mono text-body">{brl(resultado.detalhe.frete)}</span>
                        {cot.transportadora && `, ${cot.transportadora}`}
                        {cot.prazo_dias ? `, ${cot.prazo_dias} dias` : ''}
                        {cot.escolha === 'manual' && <span className="text-indigo"> (escolhida)</span>}
                      </div>
                    ) : (
                      <div className="text-warn">Frete não cotado{cot?.erro ? `: ${cot.erro}` : ''}. O total está sem frete.</div>
                    )}
                    {cot?.escolha_indisponivel && (
                      <div className="text-warn">
                        {cot.escolha_indisponivel} não atendeu esse CEP ou essa caixa. Ficou {cot.transportadora}.
                      </div>
                    )}
                    {totalIA != null && (
                      <div>
                        Versão da IA: <span className="tnum">{brl(totalIA)}</span>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                !sujo && <p className="px-4 py-4 text-[14px] text-muted">Sem cálculo ainda.</p>
              )}
            </Painel>

            {erroSalvar && <Erro>{erroSalvar}</Erro>}

            <div className="flex gap-2.5">
              <Button
                variant="outline"
                className="flex-1"
                disabled={!resultado || sujo || calculando || !!salvando}
                onClick={() => concluir(false)}
              >
                {salvando === 'salvar' ? 'Salvando…' : novo ? 'Criar orçamento' : 'Salvar'}
              </Button>
              <Button
                variant="approve"
                className="flex-1"
                disabled={!resultado || sujo || calculando || !!salvando}
                onClick={() => concluir(true)}
              >
                {salvando === 'aprovar' ? 'Aprovando…' : novo ? 'Criar e aprovar' : 'Salvar e aprovar'}
              </Button>
            </div>
            <p className="text-[12px] text-faint">
              {novo
                ? 'Criar deixa o orçamento em "Para aprovar". Criar e aprovar já gera o PDF.'
                : 'Salvar deixa em "Para aprovar" com a versão editada. A versão da IA fica guardada.'}
            </p>
          </div>
        </div>
      </div>

      {/* Celular: total e Recalcular sempre à mão, sem rolar até o fim */}
      <div className="fixed inset-x-0 bottom-0 z-20 flex items-center gap-3 border-t border-hair bg-card px-4 py-3 md:left-60 shadow-[0_-4px_12px_rgba(0,0,0,.06)] lg:hidden">
        <div className="min-w-0 flex-1">
          <div className="text-[12px] text-muted">{sujo ? 'Desatualizado' : 'Total'}</div>
          <div className={cn('tnum text-[17px] font-semibold', sujo ? 'text-faint' : 'text-ink')}>
            {resultado ? brl(resultado.resumo.total) : '—'}
          </div>
        </div>
        <Button size="sm" variant={sujo ? 'default' : 'outline'} onClick={recalcular} disabled={calculando}>
          <RefreshCw className={cn('h-4 w-4', calculando && 'animate-spin')} strokeWidth={1.75} />
          {calculando ? 'Calculando…' : 'Recalcular'}
        </Button>
      </div>
    </Pagina>
  )
}
