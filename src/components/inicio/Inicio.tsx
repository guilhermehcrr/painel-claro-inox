import { CalendarX2, ChevronRight, Clock4, FileText, MessagesSquare } from 'lucide-react'
import type { Orcamento, Pedido } from '@/lib/types'
import { ESTAGIOS, ativo } from '@/lib/estagios'
import { dataCurta, diasEntre, hojeISO, nomeMes, primeiroDiaMes, prazoRelativo, ultimoDiaMes } from '@/lib/datas'
import { brl, desde } from '@/lib/format'
import { useCaixa } from '@/hooks/useCaixa'
import { Pagina, Painel } from '@/components/ui/page'
import { SeloEstagio } from '@/components/ui/selo'
import { cn } from '@/lib/utils'

function saudacao() {
  const h = Number(new Intl.DateTimeFormat('pt-BR', { hour: 'numeric', hour12: false, timeZone: 'America/Sao_Paulo' }).format(new Date()))
  return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite'
}

const hojeExtenso = () =>
  new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'America/Sao_Paulo' }).format(new Date())

interface Props {
  nome: string
  ehAdmin: boolean
  orcamentosPendentes: Orcamento[]
  conversasNaoLidas: number
  pedidos: Pedido[]
}

function Pendencia({
  href,
  icone: Icone,
  qtd,
  texto,
  detalhe,
  tom,
}: {
  href: string
  icone: typeof FileText
  qtd: number
  texto: string
  detalhe?: string
  tom: 'indigo' | 'ok' | 'warn' | 'palha'
}) {
  const cores = {
    indigo: 'bg-indigo-tint text-indigo',
    ok: 'bg-ok-tint text-ok',
    warn: 'bg-warn-tint text-warn',
    palha: 'bg-palha-tint text-palha',
  }
  return (
    <a href={href} className="flex items-center gap-3 border-b border-hair px-4 py-3 last:border-b-0 hover:bg-paper/60">
      <span className={cn('grid h-9 w-9 shrink-0 place-items-center rounded-md', cores[tom])}>
        <Icone className="h-[18px] w-[18px]" strokeWidth={1.75} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] text-ink">
          <span className="tnum font-semibold">{qtd}</span> {texto}
        </span>
        {detalhe && <span className="block truncate text-[13px] text-muted">{detalhe}</span>}
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-faint" strokeWidth={1.75} />
    </a>
  )
}

/** Barra de têmpera: quantos pedidos em cada estágio, na cor de cada um */
function Oficina({ pedidos }: { pedidos: Pedido[] }) {
  const estagios = ESTAGIOS.filter((e) => e.id !== 'entregue')
  const contagem = estagios.map((e) => ({ ...e, qtd: pedidos.filter((p) => p.estagio === e.id).length }))
  const total = contagem.reduce((s, c) => s + c.qtd, 0)
  const suportes = pedidos
    .filter((p) => ativo(p.estagio))
    .reduce((s, p) => s + (Number(p.resumo?.quantidade) || 1), 0)

  return (
    <Painel
      titulo="Oficina agora"
      acao={<a href="#/producao" className="text-[13px] text-indigo hover:underline">Ver produção</a>}
      corpo="px-4 py-4"
    >
      {total === 0 ? (
        <p className="text-[14px] text-muted">
          Nenhum pedido na oficina. O pedido entra aqui quando o pagamento é lançado no caixa.
        </p>
      ) : (
        <>
          <p className="mb-3 text-[14px] text-muted">
            <span className="tnum font-semibold text-ink">{suportes}</span> {suportes === 1 ? 'suporte' : 'suportes'} para
            fabricar em <span className="tnum font-semibold text-ink">{pedidos.filter((p) => ativo(p.estagio)).length}</span>{' '}
            pedidos
          </p>
          <div className="flex h-3 overflow-hidden rounded-full bg-hair">
            {contagem.map((c) =>
              c.qtd ? <span key={c.id} className={c.cor} style={{ width: `${(c.qtd / total) * 100}%` }} /> : null,
            )}
          </div>
          <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4">
            {contagem.map((c) => (
              <div key={c.id} className="flex items-center gap-2">
                <span className={cn('h-2.5 w-2.5 shrink-0 rounded-sm', c.cor)} />
                <dt className="text-[13px] text-muted">{c.nome}</dt>
                <dd className="tnum ml-auto text-[14px] font-semibold text-ink sm:ml-1">{c.qtd}</dd>
              </div>
            ))}
          </dl>
        </>
      )}
    </Painel>
  )
}

function CaixaDoMes() {
  const hoje = hojeISO()
  const mes = hoje.slice(0, 7)
  const { lancamentos, aReceber, erro } = useCaixa(primeiroDiaMes(mes), ultimoDiaMes(mes))
  const validos = lancamentos.filter((l) => !l.excluido_em)
  const entradas = validos.filter((l) => l.tipo === 'entrada').reduce((s, l) => s + l.valor, 0)
  const saidas = validos.filter((l) => l.tipo === 'saida').reduce((s, l) => s + l.valor, 0)
  const receber = aReceber.reduce((s, r) => s + r.saldo, 0)

  return (
    <Painel
      titulo={`Caixa de ${nomeMes(mes).split(' de ')[0]}`}
      acao={<a href="#/caixa" className="text-[13px] text-indigo hover:underline">Abrir caixa</a>}
      corpo="px-4 py-3"
    >
      {erro ? (
        <p className="text-[13px] text-warn">{erro}</p>
      ) : (
        <dl className="space-y-2 text-[14px]">
          <div className="flex justify-between">
            <dt className="text-muted">Entradas</dt>
            <dd className="tnum font-medium text-ok">{brl(entradas)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted">Saídas</dt>
            <dd className="tnum font-medium text-warn">{brl(saidas)}</dd>
          </div>
          <div className="flex justify-between border-t border-hair pt-2">
            <dt className="font-medium text-ink">Saldo do mês</dt>
            <dd className={cn('tnum font-semibold', entradas - saidas < 0 ? 'text-warn' : 'text-ink')}>
              {brl(entradas - saidas)}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted">A receber dos pedidos</dt>
            <dd className="tnum font-medium text-ink">{brl(receber)}</dd>
          </div>
        </dl>
      )}
    </Painel>
  )
}

export function Inicio({ nome, ehAdmin, orcamentosPendentes, conversasNaoLidas, pedidos }: Props) {
  const hoje = hojeISO()
  const naOficina = pedidos.filter((p) => ativo(p.estagio))
  const atrasados = naOficina.filter((p) => p.data_entrega && p.data_entrega < hoje)
  const semData = naOficina.filter((p) => !p.data_entrega)
  const proximas = pedidos
    .filter((p) => (ativo(p.estagio) || p.estagio === 'expedido') && p.data_entrega && p.data_entrega >= hoje)
    .sort((a, b) => (a.data_entrega! < b.data_entrega! ? -1 : 1))
    .slice(0, 6)
  const maisAntigo = orcamentosPendentes[0]

  const pendencias = [
    orcamentosPendentes.length > 0 && (
      <Pendencia
        key="orc"
        href="#/orcamentos"
        icone={FileText}
        tom="indigo"
        qtd={orcamentosPendentes.length}
        texto={orcamentosPendentes.length === 1 ? 'orçamento para aprovar' : 'orçamentos para aprovar'}
        detalhe={maisAntigo ? `O mais antigo chegou ${desde(maisAntigo.criado_em)}` : undefined}
      />
    ),
    conversasNaoLidas > 0 && (
      <Pendencia
        key="conv"
        href="#/conversas"
        icone={MessagesSquare}
        tom="ok"
        qtd={conversasNaoLidas}
        texto={conversasNaoLidas === 1 ? 'conversa com mensagem nova' : 'conversas com mensagem nova'}
      />
    ),
    atrasados.length > 0 && (
      <Pendencia
        key="atraso"
        href="#/producao"
        icone={Clock4}
        tom="warn"
        qtd={atrasados.length}
        texto={atrasados.length === 1 ? 'pedido passou da data de entrega' : 'pedidos passaram da data de entrega'}
        detalhe={atrasados.map((p) => p.numero).join(', ')}
      />
    ),
    semData.length > 0 && (
      <Pendencia
        key="semdata"
        href="#/producao"
        icone={CalendarX2}
        tom="palha"
        qtd={semData.length}
        texto={semData.length === 1 ? 'pedido sem data de entrega' : 'pedidos sem data de entrega'}
        detalhe="Defina a data para ele aparecer no calendário"
      />
    ),
  ].filter(Boolean)

  return (
    <Pagina titulo={`${saudacao()}, ${nome.split(' ')[0]}`} subtitulo={hojeExtenso()}>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Painel titulo="Precisa de você">
            {pendencias.length ? pendencias : <p className="px-4 py-5 text-[14px] text-muted">Nada pendente agora.</p>}
          </Painel>
          <Oficina pedidos={pedidos} />
        </div>

        <div className="space-y-4">
          <Painel
            titulo="Próximas entregas"
            acao={<a href="#/calendario" className="text-[13px] text-indigo hover:underline">Calendário</a>}
          >
            {proximas.length ? (
              <ul>
                {proximas.map((p) => {
                  const dias = diasEntre(hoje, p.data_entrega!)
                  return (
                    <li key={p.id} className="border-b border-hair last:border-b-0">
                      <a href={`#/pedido/${p.id}`} className="flex items-center gap-3 px-4 py-2.5 hover:bg-paper/60">
                        <span className="w-16 shrink-0 text-center">
                          <span className="tnum block text-[15px] font-semibold text-ink">{dataCurta(p.data_entrega)}</span>
                          <span className={cn('block whitespace-nowrap text-[11px]', dias <= 2 ? 'text-warn' : 'text-faint')}>
                            {prazoRelativo(p.data_entrega!)}
                          </span>
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[14px] text-ink">{p.nome_cliente || 'Sem nome'}</span>
                          <span className="block text-[12px] text-muted">Pedido {p.numero}</span>
                        </span>
                        <SeloEstagio estagio={p.estagio} />
                      </a>
                    </li>
                  )
                })}
              </ul>
            ) : (
              <p className="px-4 py-5 text-[14px] text-muted">Nenhuma entrega marcada daqui para frente.</p>
            )}
          </Painel>

          {ehAdmin && <CaixaDoMes />}
        </div>
      </div>
    </Pagina>
  )
}
