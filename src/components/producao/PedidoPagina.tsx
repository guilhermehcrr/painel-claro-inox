import { useCallback, useEffect, useState } from 'react'
import { ArrowLeft, Check, Clock, MessageCircle, Pencil, Printer, TriangleAlert } from 'lucide-react'
import type { Estagio, Lancamento, Pedido, PedidoEvento } from '@/lib/types'
import { CANCELADO, ESTAGIOS, anterior, infoEstagio, posicao, proximo, type InfoEstagio } from '@/lib/estagios'
import { dataBR } from '@/lib/datas'
import { brl, desde, telefoneBonito } from '@/lib/format'
import { supabase } from '@/lib/supabase'
import { irPara } from '@/lib/rota'
import { useEventos, useTextosAviso, type SituacaoAviso } from '@/hooks/usePedidos'
import { mensagemErro, useAoVivo } from '@/hooks/useAoVivo'
import { Button } from '@/components/ui/button'
import { Carregando, Pagina, Painel, Vazio } from '@/components/ui/page'
import { SeloEstagio } from '@/components/ui/selo'
import { Modal } from '@/components/ui/modal'
import { Entrada, Rotulo, Texto, lerValor } from '@/components/ui/campo'
import { OrdemProducao } from './OrdemProducao'
import { cn } from '@/lib/utils'

interface Props {
  id: string | null
  pedidos: Pedido[]
  carregando: boolean
  ehAdmin: boolean
  mudarEstagio: (id: number, estagio: Estagio, rastreio?: string) => Promise<void>
  salvar: (id: number, dataEntrega: string | null, observacoes: string | null) => Promise<void>
  salvarValor: (id: number, valor: number) => Promise<void>
  salvarRastreio: (id: number, codigo: string) => Promise<void>
}

const Voltar = () => (
  <a href="#/producao" className="inline-flex items-center gap-1 text-[13px] text-muted hover:text-ink">
    <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2} />
    Produção
  </a>
)

/** Pagamentos lançados no caixa para este pedido (só admin enxerga) */
function usePagamentos(pedidoId: number | null, ligado: boolean) {
  const [itens, setItens] = useState<Lancamento[]>([])
  const carregar = useCallback(async () => {
    if (!pedidoId || !ligado) return
    const { data } = await supabase
      .from('lancamentos')
      .select('*')
      .eq('pedido_id', pedidoId)
      .is('excluido_em', null)
      .order('data', { ascending: true })
    setItens(((data ?? []) as Lancamento[]).map((l) => ({ ...l, valor: Number(l.valor) })))
  }, [pedidoId, ligado])
  useEffect(() => {
    carregar()
  }, [carregar])
  useAoVivo(['lancamentos'], carregar, pedidoId ? `pedido_id=eq.${pedidoId}` : undefined, ligado && !!pedidoId)
  return itens
}

function ConfirmarEstagio({
  p,
  destino,
  texto,
  onFechar,
  onConfirmar,
}: {
  p: Pedido
  destino: InfoEstagio
  texto: string | undefined
  onFechar: () => void
  onConfirmar: (rastreio: string) => Promise<void>
}) {
  const [rastreio, setRastreio] = useState(p.codigo_rastreio ?? '')
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const cancelar = destino.id === 'cancelado'
  const reativar = p.estagio === 'cancelado'
  const avanca = !cancelar && !reativar && posicao(destino.id) > posicao(p.estagio)
  const previa =
    avanca && texto
      ? texto
          .replace('{numero}', p.numero)
          .replace('{rastreio}', rastreio.trim() ? ` Código de rastreio: ${rastreio.trim()}.` : '')
      : null

  async function confirmar() {
    setEnviando(true)
    setErro(null)
    try {
      await onConfirmar(rastreio)
      onFechar()
    } catch (e) {
      setErro(mensagemErro(e))
      setEnviando(false)
    }
  }

  return (
    <Modal
      aberto
      titulo={cancelar ? 'Cancelar pedido' : reativar ? 'Reativar pedido' : destino.acao}
      onFechar={onFechar}
      rodape={
        <>
          <Button variant="outline" size="sm" onClick={onFechar} disabled={enviando}>
            Voltar
          </Button>
          <Button size="sm" variant={cancelar ? 'outline' : 'default'} onClick={confirmar} disabled={enviando}
            className={cancelar ? 'border-warn text-warn hover:bg-warn-tint' : undefined}>
            {enviando ? 'Salvando…' : cancelar ? 'Cancelar pedido' : reativar ? 'Reativar pedido' : destino.acao}
          </Button>
        </>
      }
    >
      <p className="text-[14px] text-body">
        Pedido <strong className="font-semibold text-ink">{p.numero}</strong> de {p.nome_cliente || 'cliente sem nome'} vai de{' '}
        <SeloEstagio estagio={p.estagio} /> para <SeloEstagio estagio={destino.id} />.
      </p>

      {destino.id === 'expedido' && (
        <div className="mt-4">
          <Rotulo htmlFor="rastreio" dica="opcional">Código de rastreio</Rotulo>
          <Entrada id="rastreio" value={rastreio} onChange={(e) => setRastreio(e.target.value)} placeholder="Ex.: JD123456789BR" />
        </div>
      )}

      {cancelar && (
        <p className="mt-3 text-[14px] text-muted">
          O pedido sai da produção e do calendário. O cliente não recebe mensagem, e os pagamentos lançados continuam no caixa.
        </p>
      )}

      {reativar && (
        <p className="mt-3 text-[14px] text-muted">O pedido volta para a produção como aguardando. O cliente não recebe mensagem.</p>
      )}
      {!cancelar && !reativar && !avanca && (
        <p className="mt-3 text-[14px] text-muted">Voltar um estágio serve para corrigir. O cliente não recebe mensagem.</p>
      )}

      {previa && p.telefone && (
        <div className="mt-4">
          <p className="mb-1.5 text-[13px] font-medium text-body">O cliente recebe no WhatsApp:</p>
          <div className="rounded-lg rounded-tr-sm bg-aco-tint px-3 py-2 text-[14px] text-ink">{previa}</div>
        </div>
      )}
      {previa && !p.telefone && (
        <p className="mt-3 text-[13px] text-warn">Este pedido não tem telefone. O estágio muda, mas ninguém é avisado.</p>
      )}

      {erro && <p className="mt-3 text-[13px] text-warn">{erro}</p>}
    </Modal>
  )
}

function SituacaoDoAviso({ s }: { s: SituacaoAviso | undefined }) {
  const [, redesenhar] = useState(0)
  const idade = s ? Date.now() - new Date(s.criado_em).getTime() : 0
  // Passados 2 minutos sem confirmação, troca "enviando" pelo aviso
  useEffect(() => {
    if (!s || s.wa_id || idade >= 120_000) return
    const t = setTimeout(() => redesenhar((n) => n + 1), 120_000 - idade + 500)
    return () => clearTimeout(t)
  }, [s, idade])
  if (!s) return null
  if (s.wa_id)
    return (
      <span className="inline-flex items-center gap-1 text-ok">
        <Check className="h-3.5 w-3.5" strokeWidth={2.25} /> cliente avisado
      </span>
    )
  const recente = idade < 120_000
  return recente ? (
    <span className="inline-flex items-center gap-1 text-muted">
      <Clock className="h-3.5 w-3.5" strokeWidth={2} /> enviando aviso
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-warn">
      <TriangleAlert className="h-3.5 w-3.5" strokeWidth={2} /> aviso não confirmado, confira na conversa
    </span>
  )
}

function textoEvento(e: PedidoEvento) {
  switch (e.tipo) {
    case 'criado':
      return 'Pedido criado pelo lançamento no caixa'
    case 'estagio':
      return `Passou para ${infoEstagio(e.para as Estagio).nome.toLowerCase()}`
    case 'data_entrega':
      return e.para ? `Data de entrega marcada para ${dataBR(e.para)}` : 'Data de entrega removida'
    case 'valor':
      return `Valor do pedido alterado de ${brl(Number(e.de))} para ${brl(Number(e.para))}`
    case 'observacoes':
      return 'Observações editadas'
  }
}

export function PedidoPagina({ id, pedidos, carregando, ehAdmin, mudarEstagio, salvar, salvarValor, salvarRastreio }: Props) {
  const p = pedidos.find((x) => String(x.id) === id) ?? null
  const { eventos, avisos } = useEventos(p?.id ?? null, p?.telefone ?? null)
  const textos = useTextosAviso()
  const pagamentos = usePagamentos(p?.id ?? null, ehAdmin)
  const [destino, setDestino] = useState<InfoEstagio | null>(null)
  const [dataEntrega, setDataEntrega] = useState('')
  const [obs, setObs] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [aviso, setAviso] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null)
  const [editandoValor, setEditandoValor] = useState(false)
  const [valorTexto, setValorTexto] = useState('')
  const [rastreio, setRastreio] = useState('')

  // Quando o pedido muda no banco (outra pessoa salvou), o formulário acompanha
  useEffect(() => {
    setDataEntrega(p?.data_entrega ?? '')
    setObs(p?.observacoes ?? '')
  }, [p?.id, p?.data_entrega, p?.observacoes])
  useEffect(() => setRastreio(p?.codigo_rastreio ?? ''), [p?.id, p?.codigo_rastreio])

  if (carregando) return <Carregando />
  if (!p)
    return (
      <Pagina titulo="Pedido não encontrado" voltar={<Voltar />}>
        <Vazio titulo="Esse pedido não existe ou foi apagado">Volte para a produção e escolha outro.</Vazio>
      </Pagina>
    )

  const seguinte = p.estagio === 'cancelado' ? null : proximo(p.estagio)
  const anteriorEst = p.estagio === 'cancelado' ? (ehAdmin ? ESTAGIOS[0] : null) : anterior(p.estagio)
  const mudouForm = (dataEntrega || '') !== (p.data_entrega ?? '') || obs.trim() !== (p.observacoes ?? '')
  const recebido = pagamentos.filter((l) => l.tipo === 'entrada').reduce((s, l) => s + l.valor, 0)
  const falta = Math.max(p.valor - recebido, 0)

  async function salvarEntrega() {
    setSalvando(true)
    setAviso(null)
    try {
      await salvar(p!.id, dataEntrega || null, obs)
      setAviso({ tipo: 'ok', texto: 'Salvo.' })
    } catch (e) {
      setAviso({ tipo: 'erro', texto: mensagemErro(e) })
    }
    setSalvando(false)
  }

  async function salvarCodigo() {
    try {
      await salvarRastreio(p!.id, rastreio)
      setAviso({ tipo: 'ok', texto: 'Código salvo.' })
    } catch (e) {
      setAviso({ tipo: 'erro', texto: mensagemErro(e) })
    }
  }

  async function salvarNovoValor() {
    const v = lerValor(valorTexto)
    if (!Number.isFinite(v) || v < 0) {
      setAviso({ tipo: 'erro', texto: 'Valor inválido. Use o formato 1.830,00.' })
      return
    }
    try {
      await salvarValor(p!.id, v)
      setEditandoValor(false)
    } catch (e) {
      setAviso({ tipo: 'erro', texto: mensagemErro(e) })
    }
  }

  return (
    <Pagina
      voltar={<Voltar />}
      titulo={
        <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
          Pedido {p.numero} <SeloEstagio estagio={p.estagio} className="text-[13px]" />
        </span>
      }
      subtitulo={
        <span className="flex flex-wrap items-center gap-x-3">
          <span className="text-ink">{p.nome_cliente || 'Sem nome'}</span>
          {p.telefone && (
            <a href={`#/conversas/${p.telefone}`} className="inline-flex items-center gap-1 text-indigo hover:underline">
              <MessageCircle className="h-3.5 w-3.5" strokeWidth={1.75} />
              {telefoneBonito(p.telefone)}
            </a>
          )}
        </span>
      }
      acoes={
        <>
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="h-4 w-4" strokeWidth={1.75} />
            Imprimir ordem
          </Button>
          {seguinte && (
            <Button size="sm" onClick={() => setDestino(seguinte)}>
              {seguinte.acao}
            </Button>
          )}
        </>
      }
    >
      {/* Régua grande com o nome de cada estágio */}
      <ol className="mb-5 grid grid-cols-5 gap-1" aria-label="Estágios do pedido">
        {ESTAGIOS.map((e, i) => {
          const feito = p.estagio !== 'cancelado' && i <= posicao(p.estagio)
          return (
            <li key={e.id}>
              <span className={cn('block h-1.5 rounded-full', feito ? e.cor : 'bg-hair')} />
              <span className={cn('mt-1.5 block truncate text-[12px]', feito ? 'font-medium text-ink' : 'text-faint')}>
                {e.nome}
              </span>
            </li>
          )
        })}
      </ol>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <OrdemProducao p={p} />
        </div>

        <div className="space-y-4">
          <Painel titulo="Entrega" corpo="space-y-3 px-4 py-4">
            <div>
              <Rotulo htmlFor="data-entrega">Data de entrega</Rotulo>
              <Entrada id="data-entrega" type="date" value={dataEntrega} onChange={(e) => setDataEntrega(e.target.value)} />
            </div>
            {(p.estagio === 'expedido' || p.estagio === 'entregue') && (
              <div>
                <Rotulo htmlFor="rastreio-pedido" dica="corrigir não manda mensagem">Código de rastreio</Rotulo>
                <div className="flex gap-2">
                  <Entrada id="rastreio-pedido" value={rastreio} onChange={(e) => setRastreio(e.target.value)} className="font-mono" />
                  <Button size="sm" variant="outline" className="h-10" onClick={salvarCodigo}
                    disabled={rastreio.trim() === (p.codigo_rastreio ?? '')}>
                    Salvar
                  </Button>
                </div>
              </div>
            )}
            <div>
              <Rotulo htmlFor="obs">Observações para a oficina</Rotulo>
              <Texto id="obs" value={obs} onChange={(e) => setObs(e.target.value)} placeholder="Ex.: cliente pediu acabamento escovado" />
            </div>
            <div className="flex items-center gap-3">
              <Button size="sm" onClick={salvarEntrega} disabled={!mudouForm || salvando}>
                {salvando ? 'Salvando…' : 'Salvar'}
              </Button>
              {aviso && <span className={cn('text-[13px]', aviso.tipo === 'ok' ? 'text-ok' : 'text-warn')}>{aviso.texto}</span>}
            </div>
          </Painel>

          {ehAdmin && (
            <Painel
              titulo="Pagamento"
              acao={
                <button onClick={() => irPara('caixa', `pagar-${p.id}`)} className="text-[13px] text-indigo hover:underline">
                  Lançar pagamento
                </button>
              }
              corpo="px-4 py-3"
            >
              <dl className="space-y-2 text-[14px]">
                <div className="flex items-center justify-between gap-2">
                  <dt className="text-muted">Valor do pedido</dt>
                  {editandoValor ? (
                    <dd className="flex items-center gap-1.5">
                      <Entrada
                        autoFocus
                        inputMode="decimal"
                        value={valorTexto}
                        onChange={(e) => setValorTexto(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && salvarNovoValor()}
                        className="h-8 w-28 text-right"
                      />
                      <Button size="sm" className="h-8" onClick={salvarNovoValor}>
                        OK
                      </Button>
                    </dd>
                  ) : (
                    <dd className="flex items-center gap-1.5">
                      <span className="tnum font-medium text-ink">{brl(p.valor)}</span>
                      <button
                        onClick={() => {
                          setValorTexto(p.valor.toFixed(2).replace('.', ','))
                          setEditandoValor(true)
                        }}
                        className="rounded p-1 text-faint hover:bg-paper hover:text-body"
                        aria-label="Mudar valor do pedido"
                      >
                        <Pencil className="h-3.5 w-3.5" strokeWidth={1.75} />
                      </button>
                    </dd>
                  )}
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted">Recebido</dt>
                  <dd className="tnum font-medium text-ok">{brl(recebido)}</dd>
                </div>
                <div className="flex justify-between border-t border-hair pt-2">
                  <dt className="font-medium text-ink">Falta receber</dt>
                  <dd className={cn('tnum font-semibold', falta > 0 ? 'text-warn' : 'text-ink')}>{brl(falta)}</dd>
                </div>
              </dl>
              {pagamentos.length > 0 && (
                <ul className="mt-3 space-y-1 border-t border-hair pt-3 text-[13px]">
                  {pagamentos.map((l) => (
                    <li key={l.id} className="flex justify-between gap-2">
                      <span className="truncate text-muted">
                        {dataBR(l.data)}{l.descricao ? `, ${l.descricao}` : ''}
                      </span>
                      <span className={cn('tnum shrink-0', l.tipo === 'entrada' ? 'text-ok' : 'text-warn')}>
                        {l.tipo === 'saida' && '− '}
                        {brl(l.valor)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Painel>
          )}

          <Painel titulo="Histórico">
            {eventos.length ? (
              <ol className="px-4 py-3">
                {eventos.map((e) => (
                  <li key={e.id} className="relative border-l border-hair pb-3 pl-4 last:pb-0">
                    <span className="absolute -left-[4.5px] top-1.5 h-2 w-2 rounded-full bg-faint" />
                    <p className="text-[14px] text-ink">{textoEvento(e)}</p>
                    <p className="text-[12px] text-muted">
                      {e.feito_por_nome ? `${e.feito_por_nome}, ` : ''}
                      {desde(e.criado_em)}
                    </p>
                    {e.mensagem_id && (
                      <p className="mt-0.5 text-[12px]">
                        <SituacaoDoAviso s={avisos[e.mensagem_id]} />
                      </p>
                    )}
                  </li>
                ))}
              </ol>
            ) : (
              <p className="px-4 py-4 text-[14px] text-muted">Sem histórico ainda.</p>
            )}
          </Painel>

          <div className="flex flex-wrap gap-2">
            {anteriorEst && (
              <Button variant="ghost" size="sm" onClick={() => setDestino(anteriorEst)}>
                {p.estagio === 'cancelado' ? 'Reativar pedido' : `Voltar para ${anteriorEst.nome.toLowerCase()}`}
              </Button>
            )}
            {ehAdmin && p.estagio !== 'cancelado' && p.estagio !== 'entregue' && (
              <Button variant="ghost" size="sm" className="text-warn hover:bg-warn-tint hover:text-warn" onClick={() => setDestino(CANCELADO)}>
                Cancelar pedido
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Cópia limpa para o papel */}
      <div className="so-imprimir">
        <OrdemProducao p={p} impressao />
      </div>

      {destino && (
        <ConfirmarEstagio
          p={p}
          destino={destino}
          texto={textos[destino.id]}
          onFechar={() => setDestino(null)}
          onConfirmar={(rastreio) => mudarEstagio(p.id, destino.id, rastreio)}
        />
      )}
    </Pagina>
  )
}
