import { useState } from 'react'
import type { Insumo, LinhaTecnica, Variacao } from '@/lib/types'
import type { DadosLinha } from '@/hooks/useProdutos'
import { UNIDADES, numero, qtd } from '@/lib/estoque'
import { VARIAVEIS, erroDaFormula, tentarFormula, type Medidas } from '@/lib/formula'
import { mensagemErro } from '@/hooks/useAoVivo'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Entrada, Escolha, Rotulo } from '@/components/ui/campo'
import { OpcoesInsumo } from '@/components/estoque/Compra'
import { cn } from '@/lib/utils'

/** Ajuda da fórmula: as letras, as funções e exemplos do próprio cálculo */
export function AjudaFormula() {
  return (
    <details className="rounded-md border border-hair bg-paper/60 px-3 py-2 text-[13px] text-body">
      <summary className="cursor-pointer select-none font-medium text-ink">Como escrever a fórmula</summary>
      <div className="mt-2 space-y-2">
        <p>
          Como no Excel. As medidas do pedido entram pelas letras, sempre em mm:{' '}
          {VARIAVEIS.map((v, i) => (
            <span key={v.id}>
              <b className="font-mono">{v.id}</b> {v.nome.toLowerCase()}
              {i < VARIAVEIS.length - 1 ? ', ' : '.'}
            </span>
          ))}
        </p>
        <p>
          Contas: <span className="font-mono">+ − * /</span> e parênteses. Funções:{' '}
          <span className="font-mono">SE(condição; sim; não)</span>, <span className="font-mono">INT()</span> arredonda para baixo,{' '}
          <span className="font-mono">TETO()</span> para cima, <span className="font-mono">MÁXIMO()</span>, <span className="font-mono">MÍNIMO()</span>.
          Dentro da função, separe com ponto e vírgula.
        </p>
        <ul className="space-y-1">
          <li><span className="font-mono">2*A</span> · duas torres na altura do suporte</li>
          <li><span className="font-mono">SE(X&gt;750; 2; 1)*A</span> · duas pernas quando a largura passa de 750 mm</li>
          <li><span className="font-mono">MÁXIMO(0; INT(X/2/20)-1)*(Y-8)</span> · uma ripa a cada 20 mm na meia grelha</li>
          <li><span className="font-mono">4</span> · número fixo (4 parafusos, 2 tampas)</li>
        </ul>
      </div>
    </details>
  )
}

/** Resultado da fórmula com as medidas da simulação, já na unidade do estoque */
export function ResultadoFormula({ formula, insumo, medidas }: { formula: string; insumo?: Insumo; medidas: Medidas }) {
  if (!formula.trim()) return null
  const erro = erroDaFormula(formula)
  const r = erro ? { erro } : tentarFormula(formula, medidas)
  if (r.erro != null) return <p className="mt-1.5 text-[13px] text-warn">{r.erro}</p>
  const u = insumo ? UNIDADES[insumo.unidade] : null
  return (
    <p className="mt-1.5 text-[13px] text-muted">
      Com X {medidas.X}, Y {medidas.Y}, A {medidas.A} e N {medidas.N}:{' '}
      <span className="tnum font-medium text-ink">
        {numero(r.valor!, 2)} {u?.receita ?? ''}
      </span>
      {insumo && u && u.fator !== 1 && <span className="tnum"> = {qtd(r.valor! / u.fator, insumo.unidade)}</span>}
    </p>
  )
}

/** Adicionar ou editar uma linha da lista técnica (só admin) */
export function FormLinha({
  produtoId,
  linha,
  variacoes,
  insumos,
  medidas,
  onFechar,
  onSalvar,
}: {
  produtoId: number
  linha?: LinhaTecnica | null
  variacoes: Variacao[]
  insumos: Insumo[]
  medidas: Medidas
  onFechar: () => void
  onSalvar: (d: DadosLinha) => Promise<void>
}) {
  const [descricao, setDescricao] = useState(linha?.descricao ?? '')
  const [insumo, setInsumo] = useState(linha ? String(linha.insumo_id) : '')
  const [formula, setFormula] = useState(linha?.formula ?? '')
  const [todas, setTodas] = useState(!linha || linha.variacoes.length === 0)
  const [marcadas, setMarcadas] = useState<number[]>(linha?.variacoes ?? [])
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const escolhido = insumos.find((i) => String(i.id) === insumo)
  // Insumo desativado continua aparecendo na linha que já usa ele
  const opcoes = insumos.filter((i) => i.ativo || String(i.id) === insumo)

  async function salvar() {
    setErro(null)
    if (!descricao.trim()) return setErro('Escreva qual parte da peça é.')
    if (!escolhido) return setErro('Escolha o insumo.')
    const e = erroDaFormula(formula)
    if (e) return setErro(`Fórmula: ${e}`)
    if (!todas && variacoes.length && !marcadas.length) return setErro('Marque pelo menos uma variação, ou escolha "Todas".')
    setSalvando(true)
    try {
      await onSalvar({
        id: linha?.id,
        produto: produtoId,
        insumo: escolhido.id,
        descricao: descricao.trim(),
        formula: formula.trim(),
        variacoes: todas ? [] : marcadas,
      })
      onFechar()
    } catch (x) {
      setErro(mensagemErro(x))
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Modal
      aberto
      titulo={linha ? 'Editar linha da lista técnica' : 'Nova linha da lista técnica'}
      onFechar={onFechar}
      rodape={
        <>
          <Button variant="outline" onClick={onFechar} disabled={salvando}>
            Cancelar
          </Button>
          <Button onClick={salvar} disabled={salvando}>
            {salvando ? 'Salvando…' : 'Salvar linha'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <Rotulo htmlFor="l-desc">Parte da peça</Rotulo>
          <Entrada id="l-desc" value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Ex.: Torres, Quadro, Ripas" autoFocus={!linha} />
        </div>
        <div>
          <Rotulo htmlFor="l-ins">Insumo</Rotulo>
          <Escolha id="l-ins" value={insumo} onChange={(e) => setInsumo(e.target.value)}>
            <option value="">Escolha…</option>
            <OpcoesInsumo insumos={opcoes} />
          </Escolha>
        </div>
        <div>
          <Rotulo htmlFor="l-form" dica={escolhido ? `resultado em ${UNIDADES[escolhido.unidade].receita}` : undefined}>
            Fórmula
          </Rotulo>
          <Entrada
            id="l-form"
            value={formula}
            onChange={(e) => setFormula(e.target.value)}
            className="font-mono"
            placeholder="Ex.: 2*A"
            spellCheck={false}
            autoCapitalize="characters"
            autoComplete="off"
          />
          <ResultadoFormula formula={formula} insumo={escolhido} medidas={medidas} />
          {escolhido?.unidade === 'm' && (
            <p className="mt-1 text-[12px] text-faint">Insumo em metros: a fórmula dá o comprimento em mm, o estoque converte.</p>
          )}
        </div>
        <AjudaFormula />

        {variacoes.length > 0 && (
          <fieldset>
            <legend className="mb-1.5 text-[13px] font-medium text-body">Vale para</legend>
            <div className="flex flex-col gap-1.5 text-[14px]">
              <label className="flex items-center gap-2">
                <input type="radio" checked={todas} onChange={() => setTodas(true)} className="h-4 w-4 accent-indigo" />
                Todas as variações
              </label>
              <label className="flex items-center gap-2">
                <input type="radio" checked={!todas} onChange={() => setTodas(false)} className="h-4 w-4 accent-indigo" />
                Só algumas
              </label>
            </div>
            {!todas && (
              <div className="ml-6 mt-2 flex flex-wrap gap-1.5">
                {variacoes.map((v) => {
                  const marcada = marcadas.includes(v.id)
                  return (
                    <label
                      key={v.id}
                      className={cn(
                        'flex cursor-pointer items-center gap-1.5 rounded-md border px-2.5 py-1 text-[13px]',
                        marcada ? 'border-indigo bg-indigo-tint text-indigo' : 'border-hair text-body hover:bg-paper',
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={marcada}
                        onChange={(e) => setMarcadas((m) => (e.target.checked ? [...m, v.id] : m.filter((x) => x !== v.id)))}
                        className="h-3.5 w-3.5 accent-indigo"
                      />
                      {v.nome}
                    </label>
                  )
                })}
              </div>
            )}
          </fieldset>
        )}
        {erro && <p className="text-[13px] text-warn">{erro}</p>}
      </div>
    </Modal>
  )
}
