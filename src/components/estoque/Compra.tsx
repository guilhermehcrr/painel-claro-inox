import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import type { Insumo } from '@/lib/types'
import type { ItemCompra } from '@/hooks/useEstoque'
import { TIPOS_INSUMO, UNIDADES, lerNumero, pecaCompra, qtd } from '@/lib/estoque'
import { brl } from '@/lib/format'
import { mensagemErro } from '@/hooks/useAoVivo'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Entrada, Escolha, Rotulo } from '@/components/ui/campo'

/** Lista de insumos agrupada por tipo, para os selects */
export function OpcoesInsumo({ insumos }: { insumos: Insumo[] }) {
  return (
    <>
      {TIPOS_INSUMO.map((t) => {
        const doTipo = insumos.filter((i) => i.tipo === t.id)
        if (!doTipo.length) return null
        return (
          <optgroup key={t.id} label={t.plural}>
            {doTipo.map((i) => (
              <option key={i.id} value={i.id}>
                {i.nome}
                {!i.ativo ? ' (desativado)' : ''}
              </option>
            ))}
          </optgroup>
        )
      })}
    </>
  )
}

interface Linha {
  chave: number
  insumo: string
  qtd: string
  preco: string
}

let chave = 0
const linhaVazia = (insumo = ''): Linha => ({ chave: ++chave, insumo, qtd: '', preco: '' })

/**
 * Entrada de compra. Tubo e barra entram em barras (o sistema converte para
 * metros); o preço, quando é admin que lança, é o da barra.
 */
export function Compra({
  aberto,
  insumos,
  inicial,
  ehAdmin,
  onFechar,
  onSalvar,
}: {
  aberto: boolean
  /** Insumos ativos */
  insumos: Insumo[]
  /** Abre já com este insumo */
  inicial?: number | null
  ehAdmin: boolean
  onFechar: () => void
  onSalvar: (itens: ItemCompra[], fornecedor: string, nota: string, observacao: string) => Promise<number>
}) {
  const [linhas, setLinhas] = useState<Linha[]>(() => [linhaVazia(inicial ? String(inicial) : '')])
  const [fornecedor, setFornecedor] = useState('')
  const [nota, setNota] = useState('')
  const [obs, setObs] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const insumoDe = (l: Linha) => insumos.find((i) => String(i.id) === l.insumo)
  const mudar = (k: number, d: Partial<Linha>) => setLinhas((ls) => ls.map((l) => (l.chave === k ? { ...l, ...d } : l)))

  // Cada linha já convertida para a unidade do insumo
  const calc = linhas.map((l) => {
    const i = insumoDe(l)
    const n = l.qtd.trim() ? lerNumero(l.qtd) : NaN
    const preco = l.preco.trim() ? lerNumero(l.preco) : null
    const fator = i && pecaCompra(i) && i.por_compra ? i.por_compra : 1
    return {
      l,
      i,
      n,
      preco,
      quantidade: Number.isFinite(n) ? Math.round(n * fator * 10000) / 10000 : NaN,
      custo: preco != null && Number.isFinite(preco) ? preco / fator : null,
      total: preco != null && Number.isFinite(preco) && Number.isFinite(n) ? preco * n : 0,
    }
  })
  const usadas = calc.filter((c) => c.l.insumo || c.l.qtd.trim() || c.l.preco.trim())
  const totalCompra = calc.reduce((s, c) => s + c.total, 0)

  async function salvar() {
    setErro(null)
    if (!usadas.length) return setErro('Escolha o insumo e a quantidade comprada.')
    for (const c of usadas) {
      if (!c.i) return setErro('Escolha o insumo em todas as linhas (ou tire a linha em branco).')
      if (!Number.isFinite(c.n) || c.n <= 0) return setErro(`Quantidade de ${c.i.nome}: digite um número maior que zero.`)
      if (c.preco != null && (!Number.isFinite(c.preco) || c.preco < 0)) return setErro(`Preço de ${c.i.nome}: número que não entendi.`)
    }
    setSalvando(true)
    try {
      await onSalvar(
        usadas.map((c) => ({ insumo: c.i!.id, quantidade: c.quantidade, custo: ehAdmin ? c.custo : null })),
        fornecedor,
        nota,
        obs,
      )
      onFechar()
    } catch (e) {
      setErro(mensagemErro(e))
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Modal
      aberto={aberto}
      titulo="Registrar compra"
      onFechar={onFechar}
      largura="sm:max-w-2xl"
      rodape={
        <>
          {ehAdmin && totalCompra > 0 && (
            <span className="tnum w-full self-center text-[14px] text-muted sm:mr-auto sm:w-auto">
              Total <span className="font-semibold text-ink">{brl(totalCompra)}</span>
            </span>
          )}
          <Button variant="outline" onClick={onFechar} disabled={salvando}>
            Cancelar
          </Button>
          <Button onClick={salvar} disabled={salvando}>
            {salvando ? 'Registrando…' : 'Registrar compra'}
          </Button>
        </>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Rotulo htmlFor="c-forn" dica="opcional">Fornecedor</Rotulo>
          <Entrada id="c-forn" value={fornecedor} onChange={(e) => setFornecedor(e.target.value)} placeholder="Ex.: Inox Center" />
        </div>
        <div>
          <Rotulo htmlFor="c-nota" dica="opcional">Nota fiscal</Rotulo>
          <Entrada id="c-nota" value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Número da NF" />
        </div>
      </div>

      <p className="mb-1 mt-4 text-[13px] font-medium text-body">O que chegou</p>
      <ul className="space-y-2">
        {calc.map((c) => {
          const p = c.i ? pecaCompra(c.i) : null
          const un = c.i ? UNIDADES[c.i.unidade].curto : ''
          return (
            <li key={c.l.chave} className="rounded-md border border-hair p-2.5">
              <div className="flex flex-wrap items-end gap-2">
                <div className="min-w-0 flex-1 basis-full sm:basis-60">
                  <label className="mb-1 block text-[12px] text-muted" htmlFor={`c-ins-${c.l.chave}`}>Insumo</label>
                  <Escolha id={`c-ins-${c.l.chave}`} value={c.l.insumo} onChange={(e) => mudar(c.l.chave, { insumo: e.target.value })}>
                    <option value="">Escolha…</option>
                    <OpcoesInsumo insumos={insumos} />
                  </Escolha>
                </div>
                <div className="w-28">
                  <label className="mb-1 block text-[12px] text-muted" htmlFor={`c-qtd-${c.l.chave}`}>
                    {p ? `Qtd. de ${p[1]}` : `Quantidade${un ? ` (${un})` : ''}`}
                  </label>
                  <Entrada id={`c-qtd-${c.l.chave}`} inputMode="decimal" value={c.l.qtd} onChange={(e) => mudar(c.l.chave, { qtd: e.target.value })} className="text-right" />
                </div>
                {ehAdmin && (
                  <div className="w-32">
                    <label className="mb-1 block text-[12px] text-muted" htmlFor={`c-preco-${c.l.chave}`}>
                      {p ? `Preço da ${p[0]}` : `Preço${un ? ` por ${un}` : ''}`}
                    </label>
                    <Entrada id={`c-preco-${c.l.chave}`} inputMode="decimal" value={c.l.preco} onChange={(e) => mudar(c.l.chave, { preco: e.target.value })} placeholder="R$" className="text-right" />
                  </div>
                )}
                {linhas.length > 1 && (
                  <button
                    onClick={() => setLinhas((ls) => ls.filter((l) => l.chave !== c.l.chave))}
                    className="mb-1 rounded p-1.5 text-faint hover:bg-paper hover:text-body"
                    aria-label="Tirar esta linha"
                  >
                    <X className="h-4 w-4" strokeWidth={2} />
                  </button>
                )}
              </div>
              {c.i && (
                <p className="mt-1.5 text-[12px] text-muted">
                  {p && Number.isFinite(c.quantidade) && c.quantidade > 0 ? <>Entra no estoque: <span className="tnum font-medium text-body">{qtd(c.quantidade, c.i.unidade)}</span>. </> : null}
                  Tem hoje: <span className="tnum">{qtd(c.i.saldo, c.i.unidade)}</span>
                  {ehAdmin && c.i.custo > 0 && (
                    <>
                      {' '}· custo atual{' '}
                      <span className="tnum">{p && c.i.por_compra ? `${brl(c.i.custo * c.i.por_compra)} a ${p[0]}` : `${brl(c.i.custo)}/${un}`}</span>
                    </>
                  )}
                </p>
              )}
            </li>
          )
        })}
      </ul>
      <Button variant="ghost" size="sm" className="mt-2" onClick={() => setLinhas((ls) => [...ls, linhaVazia()])}>
        <Plus className="h-4 w-4" strokeWidth={2} />
        Outro insumo
      </Button>

      <div className="mt-3">
        <Rotulo htmlFor="c-obs" dica="opcional">Observação</Rotulo>
        <Entrada id="c-obs" value={obs} onChange={(e) => setObs(e.target.value)} />
      </div>
      {ehAdmin && (
        <p className="mt-2 text-[12px] text-faint">
          Com preço, o custo do insumo vira a média entre o que já tinha e o que chegou. Sem preço, o custo não muda.
        </p>
      )}
      {erro && <p className="mt-3 text-[13px] text-warn">{erro}</p>}
    </Modal>
  )
}
