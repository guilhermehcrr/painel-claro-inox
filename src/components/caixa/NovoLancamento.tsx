import { useEffect, useMemo, useState } from 'react'
import type { AReceber, Categoria, Pedido, TipoLancamento } from '@/lib/types'
import { hojeISO } from '@/lib/datas'
import { brl } from '@/lib/format'
import { irPara } from '@/lib/rota'
import { useTodosOrcamentos } from '@/hooks/useTodosOrcamentos'
import { mensagemErro } from '@/hooks/useAoVivo'
import type { NovoLancamento as Dados } from '@/hooks/useCaixa'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Entrada, Escolha, Rotulo, lerValor } from '@/components/ui/campo'
import { cn } from '@/lib/utils'

interface Props {
  aberto: boolean
  onFechar: () => void
  categorias: Categoria[]
  pedidos: Pedido[]
  aReceber: AReceber[]
  /** Abre já com este pedido escolhido (vindo do botão "Lançar pagamento") */
  pedidoInicial?: number | null
  lancar: (d: Dados) => Promise<{ pedido: number | null; pedido_criado: boolean; numero: string | null; avisado: boolean }>
}

const formatar = (v: number) => v.toFixed(2).replace('.', ',')

export function NovoLancamento({ aberto, onFechar, categorias, pedidos, aReceber, pedidoInicial, lancar }: Props) {
  const [tipo, setTipo] = useState<TipoLancamento>('entrada')
  const [valor, setValor] = useState('')
  const [data, setData] = useState(hojeISO())
  const [categoria, setCategoria] = useState<number | ''>('')
  const [descricao, setDescricao] = useState('')
  const [vinculo, setVinculo] = useState('')
  const [valorPedido, setValorPedido] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [criado, setCriado] = useState<{ id: number; numero: string; avisado: boolean } | null>(null)

  const orcs = useTodosOrcamentos(aberto)
  const comPedido = useMemo(() => new Set(pedidos.map((p) => p.orcamento_id)), [pedidos])
  const orcamentosLivres = orcs.itens.filter(
    (o) => (o.status === 'aprovado' || o.status === 'enviado') && !comPedido.has(o.id),
  )
  const saldoDe = useMemo(() => new Map(aReceber.map((r) => [r.id, r.saldo])), [aReceber])
  const pedidosAbertos = pedidos.filter((p) => p.estagio !== 'cancelado' && ((saldoDe.get(p.id) ?? 0) > 0 || p.id === pedidoInicial))
  const daCategoria = categorias.filter((c) => c.tipo === tipo && c.ativa)

  // Toda vez que abre, começa limpo
  useEffect(() => {
    if (!aberto) return
    setTipo('entrada')
    setValor('')
    setData(hojeISO())
    setDescricao('')
    setErro(null)
    setCriado(null)
    setVinculo(pedidoInicial ? `p:${pedidoInicial}` : '')
    const saldo = pedidoInicial ? saldoDe.get(pedidoInicial) : undefined
    if (saldo) setValor(formatar(saldo))
  }, [aberto, pedidoInicial]) // eslint-disable-line react-hooks/exhaustive-deps

  // Categoria padrão: venda quando é entrada vinculada, senão a primeira da lista
  useEffect(() => {
    const venda = daCategoria.find((c) => /venda/i.test(c.nome))
    setCategoria((atual) =>
      atual !== '' && daCategoria.some((c) => c.id === atual) ? atual : (tipo === 'entrada' && venda ? venda.id : daCategoria[0]?.id ?? ''),
    )
  }, [tipo, categorias]) // eslint-disable-line react-hooks/exhaustive-deps

  const orcEscolhido =
    tipo === 'entrada' && vinculo.startsWith('o:') ? orcamentosLivres.find((o) => `o:${o.id}` === vinculo) : undefined
  useEffect(() => {
    if (orcEscolhido) setValorPedido(formatar(Number(orcEscolhido.resumo?.total ?? 0)))
  }, [orcEscolhido?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  async function salvar(e: React.FormEvent) {
    e.preventDefault()
    setErro(null)
    const v = lerValor(valor)
    if (!Number.isFinite(v) || v <= 0) return setErro('Informe o valor, por exemplo 915,00.')
    if (!categoria) return setErro('Escolha a categoria.')
    const vp = orcEscolhido ? lerValor(valorPedido) : null
    if (orcEscolhido && (!Number.isFinite(vp!) || vp! <= 0)) return setErro('Informe o valor total do pedido.')

    setEnviando(true)
    try {
      const r = await lancar({
        tipo,
        data,
        valor: v,
        categoria: Number(categoria),
        descricao,
        pedido: tipo === 'entrada' && vinculo.startsWith('p:') ? Number(vinculo.slice(2)) : null,
        orcamento: tipo === 'entrada' && orcEscolhido ? orcEscolhido.id : null,
        valorPedido: vp,
      })
      if (r.pedido_criado && r.pedido) {
        setCriado({ id: r.pedido, numero: r.numero ?? String(r.pedido), avisado: r.avisado })
      } else {
        onFechar()
      }
    } catch (e) {
      setErro(mensagemErro(e))
    }
    setEnviando(false)
  }

  if (criado) {
    return (
      <Modal
        aberto={aberto}
        titulo="Pagamento lançado"
        onFechar={onFechar}
        rodape={
          <>
            <Button variant="outline" size="sm" onClick={onFechar}>
              Fechar
            </Button>
            <Button size="sm" onClick={() => irPara('pedido', criado.id)}>
              Abrir pedido
            </Button>
          </>
        }
      >
        <p className="text-[15px] text-ink">O pedido {criado.numero} foi criado e entrou na produção como aguardando.</p>
        <p className="mt-2 text-[14px] text-muted">
          {criado.avisado
            ? 'A mensagem de confirmação foi enviada ao cliente no WhatsApp.'
            : 'O cliente não foi avisado automaticamente (sem telefone válido ou falha no envio). Avise por fora, se precisar.'}{' '}
          Abra o pedido para marcar a data de entrega.
        </p>
      </Modal>
    )
  }

  return (
    <Modal
      aberto={aberto}
      titulo="Novo lançamento"
      onFechar={onFechar}
      rodape={
        <>
          <Button variant="outline" size="sm" onClick={onFechar} disabled={enviando}>
            Cancelar
          </Button>
          <Button size="sm" type="submit" form="form-lancamento" disabled={enviando}>
            {enviando ? 'Salvando…' : tipo === 'entrada' ? 'Lançar entrada' : 'Lançar saída'}
          </Button>
        </>
      }
    >
      <form id="form-lancamento" onSubmit={salvar} className="space-y-4">
        <div className="grid grid-cols-2 gap-1 rounded-md bg-paper p-1" role="radiogroup" aria-label="Tipo">
          {(['entrada', 'saida'] as const).map((t) => (
            <button
              key={t}
              type="button"
              role="radio"
              aria-checked={tipo === t}
              onClick={() => setTipo(t)}
              className={cn(
                'rounded py-2 text-[14px] font-medium transition-colors',
                tipo === t ? (t === 'entrada' ? 'bg-card text-ok shadow-sm' : 'bg-card text-warn shadow-sm') : 'text-muted',
              )}
            >
              {t === 'entrada' ? 'Entrada' : 'Saída'}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Rotulo htmlFor="valor">Valor (R$)</Rotulo>
            <Entrada id="valor" inputMode="decimal" placeholder="0,00" value={valor} onChange={(e) => setValor(e.target.value)} autoFocus />
          </div>
          <div>
            <Rotulo htmlFor="data">Data</Rotulo>
            <Entrada id="data" type="date" value={data} onChange={(e) => setData(e.target.value)} required />
          </div>
        </div>

        {tipo === 'entrada' && (
          <div>
            <Rotulo htmlFor="vinculo" dica="opcional">De qual pedido é esse dinheiro?</Rotulo>
            <Escolha id="vinculo" value={vinculo} onChange={(e) => setVinculo(e.target.value)}>
              <option value="">Não é de pedido</option>
              {pedidosAbertos.length > 0 && (
                <optgroup label="Pedidos com valor a receber">
                  {pedidosAbertos.map((p) => (
                    <option key={p.id} value={`p:${p.id}`}>
                      {p.numero}, {p.nome_cliente || 'sem nome'} (falta {brl(saldoDe.get(p.id) ?? 0)})
                    </option>
                  ))}
                </optgroup>
              )}
              {orcamentosLivres.length > 0 && (
                <optgroup label="Orçamentos aprovados (cria o pedido)">
                  {orcamentosLivres.map((o) => (
                    <option key={o.id} value={`o:${o.id}`}>
                      {o.numero_proposta ? `Proposta ${o.numero_proposta}` : 'Orçamento'}, {o.nome_cliente || 'sem nome'},{' '}
                      {brl(o.resumo?.total)}
                    </option>
                  ))}
                </optgroup>
              )}
            </Escolha>
            {orcs.carregando && <p className="mt-1 text-[12px] text-faint">Carregando orçamentos…</p>}
          </div>
        )}

        {orcEscolhido && (
          <div className="rounded-md border border-indigo/30 bg-indigo-tint px-3 py-3">
            <Rotulo htmlFor="valor-pedido" dica="o que o cliente vai pagar no total">Valor do pedido (R$)</Rotulo>
            <Entrada id="valor-pedido" inputMode="decimal" value={valorPedido} onChange={(e) => setValorPedido(e.target.value)} />
            <div className="mt-1.5 flex flex-wrap gap-1.5 text-[12px]">
              {orcEscolhido.resumo?.total ? (
                <button type="button" className="rounded bg-card px-2 py-0.5 text-body hover:text-ink" onClick={() => setValorPedido(formatar(Number(orcEscolhido.resumo!.total)))}>
                  Em 6x: {brl(orcEscolhido.resumo.total)}
                </button>
              ) : null}
              {orcEscolhido.resumo?.a_vista_pix ? (
                <button type="button" className="rounded bg-card px-2 py-0.5 text-body hover:text-ink" onClick={() => setValorPedido(formatar(Number(orcEscolhido.resumo!.a_vista_pix)))}>
                  À vista no PIX: {brl(orcEscolhido.resumo.a_vista_pix)}
                </button>
              ) : null}
            </div>
            <p className="mt-2 text-[13px] text-indigo">
              Ao salvar, o pedido entra na produção como aguardando e o cliente recebe a mensagem de confirmação no WhatsApp.
            </p>
          </div>
        )}

        <div>
          <Rotulo htmlFor="categoria">Categoria</Rotulo>
          <Escolha id="categoria" value={categoria} onChange={(e) => setCategoria(e.target.value ? Number(e.target.value) : '')}>
            {daCategoria.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </Escolha>
        </div>

        <div>
          <Rotulo htmlFor="descricao" dica="opcional">Descrição</Rotulo>
          <Entrada
            id="descricao"
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            placeholder={tipo === 'entrada' ? 'Ex.: sinal de 50% no PIX' : 'Ex.: 6 barras de tubo 20x30'}
          />
        </div>

        {erro && <p className="text-[13px] text-warn">{erro}</p>}
      </form>
    </Modal>
  )
}
