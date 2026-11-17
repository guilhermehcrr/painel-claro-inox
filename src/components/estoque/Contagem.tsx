import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import type { Insumo } from '@/lib/types'
import { TIPOS_INSUMO, UNIDADES, emBarras, lerNumero, paraBusca, pecaCompra, qtd, qtdSinal } from '@/lib/estoque'
import { mensagemErro } from '@/hooks/useAoVivo'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Entrada, Rotulo, Texto } from '@/components/ui/campo'
import { cn } from '@/lib/utils'

interface Valor {
  /** Barras ou chapas inteiras */
  pecas: string
  /** O que sobrou solto, na unidade do insumo (ou a quantidade toda, quando não é barra) */
  resto: string
}

/** Total contado, ou null quando o campo está em branco. NaN = digitou errado. */
function totalContado(i: Insumo, v: Valor | undefined): number | null {
  if (!v || (!v.pecas.trim() && !v.resto.trim())) return null
  const pecas = v.pecas.trim() ? lerNumero(v.pecas) : 0
  const resto = v.resto.trim() ? lerNumero(v.resto) : 0
  if (!Number.isFinite(pecas) || !Number.isFinite(resto) || pecas < 0 || resto < 0) return NaN
  return Math.round((pecas * (pecaCompra(i) && i.por_compra ? i.por_compra : 0) + resto) * 10000) / 10000
}

function Linha({ i, valor, onMudar }: { i: Insumo; valor: Valor | undefined; onMudar: (v: Valor) => void }) {
  const p = pecaCompra(i)
  const v = valor ?? { pecas: '', resto: '' }
  const total = totalContado(i, valor)
  const un = UNIDADES[i.unidade].curto
  return (
    <li className="border-b border-hair px-1 py-3 last:border-b-0">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="min-w-0 flex-1 basis-56">
          <p className="text-[14px] font-medium text-ink">{i.nome}</p>
          <p className="text-[12px] text-muted">
            No sistema: <span className="tnum">{qtd(i.saldo, i.unidade)}</span>
            {emBarras(i.saldo, i) ? <span className="text-faint"> ({emBarras(i.saldo, i)})</span> : null}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          {p && (
            <>
              <Entrada
                inputMode="decimal"
                aria-label={`${p[1]} inteiras de ${i.nome}`}
                value={v.pecas}
                onChange={(e) => onMudar({ ...v, pecas: e.target.value })}
                className="h-9 w-16 text-right"
                placeholder="0"
              />
              <span className="text-[13px] text-muted">{p[1]} +</span>
            </>
          )}
          <Entrada
            inputMode="decimal"
            aria-label={p ? `${un} soltos de ${i.nome}` : `Quantidade contada de ${i.nome}`}
            value={v.resto}
            onChange={(e) => onMudar({ ...v, resto: e.target.value })}
            className={cn('h-9 text-right', p ? 'w-20' : 'w-24')}
            placeholder={p ? '0' : ''}
          />
          <span className="w-6 text-[13px] text-muted">{un}</span>
        </div>
      </div>
      {total != null && (
        <p className={cn('mt-1 text-right text-[12px]', Number.isNaN(total) ? 'text-warn' : 'text-muted')}>
          {Number.isNaN(total) ? (
            'Número que não entendi'
          ) : (
            <>
              {p ? <>Contou <span className="tnum">{qtd(total, i.unidade)}</span> · </> : null}
              {total === i.saldo ? (
                'sem diferença'
              ) : (
                <span className={cn('tnum font-medium', total > i.saldo ? 'text-ok' : 'text-warn')}>
                  {qtdSinal(total - i.saldo, i.unidade)}
                </span>
              )}
            </>
          )}
        </p>
      )}
    </li>
  )
}

/**
 * Contagem de estoque (ajuste de inventário). Serve para a contagem geral e
 * para acertar um insumo só. O saldo passa a ser o número contado; a diferença
 * fica registrada com a justificativa.
 */
export function Contagem({
  aberto,
  insumos,
  unico,
  onFechar,
  onSalvar,
}: {
  aberto: boolean
  /** Insumos ativos */
  insumos: Insumo[]
  /** Contar um insumo só */
  unico?: Insumo | null
  onFechar: () => void
  onSalvar: (itens: { insumo: number; contado: number }[], justificativa: string) => Promise<{ contados: number; com_diferenca: number }>
}) {
  const [valores, setValores] = useState<Record<number, Valor>>({})
  const [busca, setBusca] = useState('')
  const [justificativa, setJustificativa] = useState(unico ? '' : 'Contagem física')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const lista = unico ? [unico] : insumos
  const filtrados = useMemo(() => {
    const b = paraBusca(busca.trim())
    return b ? lista.filter((i) => paraBusca(`${i.nome} ${i.codigo ?? ''}`).includes(b)) : lista
  }, [lista, busca])

  const contados = lista
    .map((i) => ({ i, total: totalContado(i, valores[i.id]) }))
    .filter((x) => x.total != null)
  const invalido = contados.some((x) => Number.isNaN(x.total))
  const comDiferenca = contados.filter((x) => !Number.isNaN(x.total) && x.total !== x.i.saldo).length

  async function salvar() {
    setErro(null)
    if (invalido) return setErro('Tem número que não entendi. Confira os campos marcados.')
    if (!contados.length) return setErro('Digite o que você contou em pelo menos um insumo.')
    if (justificativa.trim().length < 3) return setErro('Escreva a justificativa da contagem.')
    setSalvando(true)
    try {
      await onSalvar(contados.map((x) => ({ insumo: x.i.id, contado: x.total as number })), justificativa)
      onFechar()
    } catch (e) {
      setErro(mensagemErro(e))
    } finally {
      setSalvando(false)
    }
  }

  // Agrupa por tipo na contagem geral, como o material fica na oficina
  const grupos = unico
    ? [{ id: 'um', nome: '', itens: filtrados }]
    : TIPOS_INSUMO.map((t) => ({ id: t.id, nome: t.plural, itens: filtrados.filter((i) => i.tipo === t.id) })).filter((g) => g.itens.length)

  return (
    <Modal
      aberto={aberto}
      titulo={unico ? `Contar ${unico.nome}` : 'Contagem de estoque'}
      onFechar={onFechar}
      largura={unico ? 'sm:max-w-lg' : 'sm:max-w-2xl'}
      rodape={
        <>
          {contados.length > 0 && (
            <span className="w-full self-center text-[13px] text-muted sm:mr-auto sm:w-auto">
              {contados.length} {contados.length === 1 ? 'contado' : 'contados'}, {comDiferenca} com diferença
            </span>
          )}
          <Button variant="outline" onClick={onFechar} disabled={salvando}>
            Cancelar
          </Button>
          <Button onClick={salvar} disabled={salvando || !contados.length}>
            {salvando ? 'Salvando…' : 'Salvar contagem'}
          </Button>
        </>
      }
    >
      <p className="mb-3 text-[13px] text-muted">
        {unico
          ? 'Digite quanto tem de verdade na oficina. O saldo passa a ser esse número e a diferença fica registrada.'
          : 'Digite só o que você contou. Insumo em branco fica como está. O saldo passa a ser o número contado e a diferença fica registrada.'}
        {lista.some((i) => pecaCompra(i)) && ' Tubo e barra: conte as barras inteiras e some os pedaços soltos em metros.'}
      </p>

      {!unico && (
        <div className="relative mb-2">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" strokeWidth={1.75} />
          <Entrada value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar insumo" className="pl-9" />
        </div>
      )}

      {grupos.map((g) => (
        <div key={g.id} className="mb-2">
          {g.nome && <p className="mt-3 border-b border-hair pb-1 text-[12px] font-medium uppercase tracking-wide text-faint">{g.nome}</p>}
          <ul>
            {g.itens.map((i) => (
              <Linha key={i.id} i={i} valor={valores[i.id]} onMudar={(v) => setValores((x) => ({ ...x, [i.id]: v }))} />
            ))}
          </ul>
        </div>
      ))}
      {!filtrados.length && <p className="py-6 text-center text-[14px] text-muted">Nenhum insumo com esse nome.</p>}

      <div className="mt-4">
        <Rotulo htmlFor="just-contagem">Justificativa</Rotulo>
        <Texto
          id="just-contagem"
          value={justificativa}
          onChange={(e) => setJustificativa(e.target.value)}
          placeholder="Ex.: conferência do mês; barra empenada descartada; sobra de corte jogada fora"
          className="min-h-[64px]"
        />
        <p className="mt-1 text-[12px] text-faint">Fica registrada junto com o seu nome em cada insumo ajustado.</p>
      </div>
      {erro && <p className="mt-3 text-[13px] text-warn">{erro}</p>}
    </Modal>
  )
}
