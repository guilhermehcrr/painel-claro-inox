import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { Pedido } from '@/lib/types'
import { ativo, infoEstagio } from '@/lib/estagios'
import {
  dataBR,
  dataCurta,
  diaSemana,
  hojeISO,
  inicioSemana,
  tituloMes,
  primeiroDiaMes,
  somarDias,
  somarMeses,
  ultimoDiaMes,
} from '@/lib/datas'
import { Button } from '@/components/ui/button'
import { Carregando, Erro, Pagina, Painel } from '@/components/ui/page'
import { CartaoPedido } from '@/components/producao/CartaoPedido'
import { cn } from '@/lib/utils'

interface Props {
  pedidos: Pedido[]
  carregando: boolean
  erro: string | null
}

const SEMANA = ['seg', 'ter', 'qua', 'qui', 'sex', 'sáb', 'dom']
const suportesDe = (p: Pedido) => Number(p.resumo?.quantidade) || 1

/** Carga das próximas 6 semanas: suportes com entrega marcada em cada uma */
function Carga({ pedidos, semData, onDia }: { pedidos: Pedido[]; semData: number; onDia: (d: string) => void }) {
  const hoje = hojeISO()
  const semanas = Array.from({ length: 6 }, (_, i) => {
    const ini = somarDias(inicioSemana(hoje), i * 7)
    const fim = somarDias(ini, 6)
    const lista = pedidos.filter((p) => p.data_entrega && p.data_entrega >= ini && p.data_entrega <= fim)
    return { ini, fim, pedidos: lista.length, suportes: lista.reduce((s, p) => s + suportesDe(p), 0) }
  })
  const maior = Math.max(1, ...semanas.map((s) => s.suportes))

  return (
    <Painel
      titulo="Carga das próximas semanas"
      acao={
        semData > 0 ? (
          <a href="#/producao" className="text-[13px] text-palha hover:underline">
            {semData} {semData === 1 ? 'pedido sem data' : 'pedidos sem data'}
          </a>
        ) : undefined
      }
      corpo="px-4 py-4"
    >
      <p className="mb-3 text-[13px] text-muted">
        Suportes com entrega marcada em cada semana, para prometer prazo sem apertar a oficina.
      </p>
      <div className="grid grid-cols-6 items-end gap-2">
        {semanas.map((s, i) => (
          <button key={s.ini} onClick={() => onDia(s.ini)} className="group text-center" title={`${dataBR(s.ini)} a ${dataBR(s.fim)}`}>
            <span className="tnum mb-1 block text-[14px] font-semibold text-ink">{s.suportes || ''}</span>
            <span className="flex h-20 items-end">
              <span
                className={cn('w-full rounded-t-md transition-colors group-hover:opacity-80', s.suportes ? 'bg-indigo' : 'bg-hair')}
                style={{ height: `${Math.max(6, (s.suportes / maior) * 100)}%` }}
              />
            </span>
            <span className="mt-1.5 block text-[12px] text-muted">{i === 0 ? 'Esta' : dataCurta(s.ini)}</span>
          </button>
        ))}
      </div>
    </Painel>
  )
}

export function Calendario({ pedidos, carregando, erro }: Props) {
  const hoje = hojeISO()
  const [mes, setMes] = useState(hoje.slice(0, 7))
  const [dia, setDia] = useState<string>(hoje)

  // No calendário: o que está na oficina, expedido e entregue (cancelado fica fora)
  const comData = useMemo(() => pedidos.filter((p) => p.data_entrega && p.estagio !== 'cancelado'), [pedidos])
  const naOficina = pedidos.filter((p) => ativo(p.estagio))
  const semData = naOficina.filter((p) => !p.data_entrega).length

  const porDia = useMemo(() => {
    const m = new Map<string, Pedido[]>()
    for (const p of comData) {
      const k = p.data_entrega!.slice(0, 10)
      m.set(k, [...(m.get(k) ?? []), p])
    }
    return m
  }, [comData])

  // Grade do mês começando na segunda-feira
  const ini = inicioSemana(primeiroDiaMes(mes))
  const fim = ultimoDiaMes(mes)
  const dias: string[] = []
  for (let d = ini; d <= fim || dias.length % 7 !== 0; d = somarDias(d, 1)) dias.push(d)

  const doDia = porDia.get(dia) ?? []

  function escolher(d: string) {
    setDia(d)
    if (d.slice(0, 7) !== mes) setMes(d.slice(0, 7))
  }

  return (
    <Pagina
      titulo="Calendário de entregas"
      subtitulo="Clique num dia para ver os pedidos que saem nele."
      largura="max-w-[1400px]"
      acoes={
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" onClick={() => setMes(somarMeses(mes, -1))} aria-label="Mês anterior">
            <ChevronLeft className="h-4 w-4" strokeWidth={2} />
          </Button>
          <span className="w-40 text-center text-[15px] font-medium text-ink">{tituloMes(mes)}</span>
          <Button variant="outline" size="icon" onClick={() => setMes(somarMeses(mes, 1))} aria-label="Próximo mês">
            <ChevronRight className="h-4 w-4" strokeWidth={2} />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => escolher(hoje)}>
            Hoje
          </Button>
        </div>
      }
    >
      {erro && <Erro>{erro}</Erro>}
      {carregando ? (
        <Carregando />
      ) : (
        <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
          <div className="space-y-4">
            <section className="overflow-hidden rounded-lg border border-hair bg-card">
              <div className="grid grid-cols-7 border-b border-hair bg-paper/60">
                {SEMANA.map((s) => (
                  <div key={s} className="px-2 py-2 text-center text-[12px] font-medium text-muted">
                    {s}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7">
                {dias.map((d) => {
                  const lista = porDia.get(d) ?? []
                  const foraDoMes = d.slice(0, 7) !== mes
                  const atrasado = lista.some((p) => ativo(p.estagio) && d < hoje)
                  return (
                    <button
                      key={d}
                      onClick={() => escolher(d)}
                      aria-label={`${dataBR(d)}: ${lista.length} pedidos`}
                      aria-pressed={d === dia}
                      className={cn(
                        'relative flex min-h-[64px] flex-col items-stretch gap-1 border-b border-r border-hair p-1.5 text-left transition-colors last:border-r-0 sm:min-h-[104px] sm:p-2',
                        '[&:nth-child(7n)]:border-r-0',
                        foraDoMes && 'bg-paper/50',
                        d === dia ? 'bg-indigo-tint/60' : 'hover:bg-paper/70',
                      )}
                    >
                      <span
                        className={cn(
                          'tnum grid h-6 w-6 place-items-center rounded-full text-[13px]',
                          d === hoje ? 'bg-ink font-semibold text-white' : foraDoMes ? 'text-faint' : 'text-body',
                        )}
                      >
                        {Number(d.slice(8, 10))}
                      </span>

                      {/* Celular: bolinhas. Computador: nome do cliente */}
                      {lista.length > 0 && (
                        <span className="flex flex-wrap gap-0.5 sm:hidden">
                          {lista.slice(0, 4).map((p) => (
                            <span key={p.id} className={cn('h-1.5 w-1.5 rounded-full', infoEstagio(p.estagio).cor)} />
                          ))}
                        </span>
                      )}
                      <span className="hidden flex-col gap-0.5 sm:flex">
                        {lista.slice(0, 3).map((p) => (
                          <span
                            key={p.id}
                            className={cn('truncate rounded px-1.5 py-0.5 text-[12px]', infoEstagio(p.estagio).selo)}
                          >
                            {p.nome_cliente?.split(' ')[0] || p.numero}
                          </span>
                        ))}
                        {lista.length > 3 && <span className="px-1 text-[12px] text-muted">+{lista.length - 3}</span>}
                      </span>
                      {atrasado && <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-warn" title="Tem pedido atrasado" />}
                    </button>
                  )
                })}
              </div>
            </section>
            <Carga pedidos={naOficina} semData={semData} onDia={escolher} />
          </div>

          <aside>
            <Painel
              titulo={
                <span>
                  {dia === hoje ? 'Hoje' : `${diaSemana(dia)}, ${dataBR(dia)}`}
                  <span className="ml-2 text-[13px] font-normal text-muted">
                    {doDia.length ? `${doDia.length} ${doDia.length === 1 ? 'pedido' : 'pedidos'}` : ''}
                  </span>
                </span>
              }
              corpo="space-y-2 p-3"
            >
              {doDia.length ? (
                doDia.map((p) => <CartaoPedido key={p.id} p={p} />)
              ) : (
                <p className="px-1 py-3 text-[14px] text-muted">Nenhuma entrega marcada neste dia.</p>
              )}
            </Painel>
          </aside>
        </div>
      )}
    </Pagina>
  )
}
