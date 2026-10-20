import { useMemo, useState } from 'react'
import { Download } from 'lucide-react'
import type { Lancamento, Pedido, TipoLancamento } from '@/lib/types'
import { dataBR, diasEntre, hojeISO, primeiroDiaMes, somarMeses, tituloMes, ultimoDiaMes } from '@/lib/datas'
import { brl } from '@/lib/format'
import { useCaixa } from '@/hooks/useCaixa'
import { Button } from '@/components/ui/button'
import { Carregando, Erro, Painel } from '@/components/ui/page'
import { Entrada, Rotulo } from '@/components/ui/campo'
import { cn } from '@/lib/utils'

/** Entradas, saídas e saldo lado a lado */
export function Totais({ entradas, saidas, rotuloSaldo = 'Saldo' }: { entradas: number; saidas: number; rotuloSaldo?: string }) {
  const saldo = entradas - saidas
  return (
    <div className="grid overflow-hidden rounded-lg border border-hair bg-card sm:grid-cols-3">
      {[
        ['Entradas', entradas, 'text-ok'],
        ['Saídas', saidas, 'text-warn'],
        [rotuloSaldo, saldo, saldo < 0 ? 'text-warn' : 'text-ink'],
      ].map(([rotulo, v, cor]) => (
        <div key={rotulo as string} className="flex items-baseline justify-between gap-3 border-b border-hair px-4 py-2.5 last:border-b-0 sm:block sm:border-b-0 sm:border-r sm:py-3 sm:last:border-r-0">
          <div className="text-[13px] text-muted">{rotulo}</div>
          <div className={cn('tnum whitespace-nowrap text-[16px] font-semibold sm:mt-0.5 md:text-[20px]', cor as string)}>{brl(v as number)}</div>
        </div>
      ))}
    </div>
  )
}

/** Planilha que abre direto no Excel em português: ponto e vírgula e vírgula decimal */
function baixarPlanilha(
  lancs: Lancamento[],
  nomeCategoria: (id: number) => string,
  numeroPedido: (id: number | null) => string,
  de: string,
  ate: string,
) {
  const campo = (v: string) => `"${v.replace(/"/g, '""')}"`
  const linhas = [
    ['Data', 'Tipo', 'Categoria', 'Descrição', 'Pedido', 'Valor', 'Lançado por'].join(';'),
    ...lancs.map((l) =>
      [
        dataBR(l.data),
        l.tipo === 'entrada' ? 'Entrada' : 'Saída',
        campo(nomeCategoria(l.categoria_id)),
        campo(l.descricao ?? ''),
        numeroPedido(l.pedido_id),
        (l.tipo === 'saida' ? -l.valor : l.valor).toFixed(2).replace('.', ','),
        campo(l.criado_por_nome ?? ''),
      ].join(';'),
    ),
  ]
  const blob = new Blob(['﻿' + linhas.join('\r\n')], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `caixa-claro-inox-${de}-a-${ate}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

function PorCategoria({ tipo, lancs, nomeCategoria }: { tipo: TipoLancamento; lancs: Lancamento[]; nomeCategoria: (id: number) => string }) {
  const doTipo = lancs.filter((l) => l.tipo === tipo)
  const total = doTipo.reduce((s, l) => s + l.valor, 0)
  const grupos = [...doTipo.reduce((m, l) => m.set(l.categoria_id, (m.get(l.categoria_id) ?? 0) + l.valor), new Map<number, number>())]
    .sort((a, b) => b[1] - a[1])

  return (
    <Painel titulo={tipo === 'entrada' ? 'Entradas por categoria' : 'Saídas por categoria'}>
      {!grupos.length ? (
        <p className="px-4 py-4 text-[14px] text-muted">Nada no período.</p>
      ) : (
        <ul className="px-4 py-2">
          {grupos.map(([id, v]) => (
            <li key={id} className="py-2">
              <div className="flex justify-between gap-3 text-[14px]">
                <span className="truncate text-ink">{nomeCategoria(id)}</span>
                <span className="tnum shrink-0 text-body">
                  {brl(v)} <span className="text-[12px] text-faint">{Math.round((v / total) * 100)}%</span>
                </span>
              </div>
              <div className="mt-1 h-1.5 rounded-full bg-paper">
                <div className={cn('h-full rounded-full', tipo === 'entrada' ? 'bg-ok' : 'bg-warn')} style={{ width: `${(v / total) * 100}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </Painel>
  )
}

export function Relatorio({ pedidos }: { pedidos: Pedido[] }) {
  const hoje = hojeISO()
  const mes = hoje.slice(0, 7)
  const [de, setDe] = useState(primeiroDiaMes(mes))
  const [ate, setAte] = useState(ultimoDiaMes(mes))
  const valido = de && ate && de <= ate
  const { lancamentos, categorias, carregando, erro } = useCaixa(valido ? de : hoje, valido ? ate : hoje)

  const nomes = useMemo(() => new Map(categorias.map((c) => [c.id, c.nome])), [categorias])
  const numeros = useMemo(() => new Map(pedidos.map((p) => [p.id, p.numero])), [pedidos])
  const nomeCategoria = (id: number) => nomes.get(id) ?? 'Sem categoria'
  const ativos = lancamentos.filter((l) => !l.excluido_em)
  const entradas = ativos.filter((l) => l.tipo === 'entrada').reduce((s, l) => s + l.valor, 0)
  const saidas = ativos.filter((l) => l.tipo === 'saida').reduce((s, l) => s + l.valor, 0)

  // Fluxo: por dia até ~2 meses, por mês acima disso. Saldo acumulado no período.
  const porMes = valido && diasEntre(de, ate) > 62
  const fluxo = useMemo(() => {
    const m = new Map<string, { entrada: number; saida: number }>()
    for (const l of ativos) {
      const k = porMes ? l.data.slice(0, 7) : l.data
      const a = m.get(k) ?? { entrada: 0, saida: 0 }
      a[l.tipo] += l.valor
      m.set(k, a)
    }
    let acumulado = 0
    return [...m.entries()]
      .sort((a, b) => (a[0] < b[0] ? -1 : 1))
      .map(([k, v]) => {
        acumulado += v.entrada - v.saida
        return { k, ...v, acumulado }
      })
  }, [ativos, porMes])

  const atalhos: [string, string, string][] = [
    ['Este mês', primeiroDiaMes(mes), ultimoDiaMes(mes)],
    ['Mês passado', primeiroDiaMes(somarMeses(mes, -1)), ultimoDiaMes(somarMeses(mes, -1))],
    ['Últimos 3 meses', primeiroDiaMes(somarMeses(mes, -2)), ultimoDiaMes(mes)],
    ['Este ano', `${mes.slice(0, 4)}-01-01`, `${mes.slice(0, 4)}-12-31`],
  ]

  return (
    <>
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div>
          <Rotulo htmlFor="de">De</Rotulo>
          <Entrada id="de" type="date" value={de} onChange={(e) => setDe(e.target.value)} className="w-auto" />
        </div>
        <div>
          <Rotulo htmlFor="ate">Até</Rotulo>
          <Entrada id="ate" type="date" value={ate} onChange={(e) => setAte(e.target.value)} className="w-auto" />
        </div>
        <div className="flex flex-wrap gap-1">
          {atalhos.map(([nome, a, b]) => (
            <button
              key={nome}
              onClick={() => {
                setDe(a)
                setAte(b)
              }}
              className={cn(
                'rounded-md px-2.5 py-1.5 text-[13px]',
                de === a && ate === b ? 'bg-ink text-white' : 'bg-hair/60 text-body hover:bg-hair',
              )}
            >
              {nome}
            </button>
          ))}
        </div>
        <Button
          variant="outline"
          size="sm"
          className="ml-auto"
          disabled={!ativos.length}
          onClick={() => baixarPlanilha(ativos, nomeCategoria, (id) => (id ? numeros.get(id) ?? '' : ''), de, ate)}
        >
          <Download className="h-4 w-4" strokeWidth={1.75} />
          Baixar planilha
        </Button>
      </div>

      {!valido && <Erro>A data inicial precisa ser antes da final.</Erro>}
      {erro && <Erro>{erro}</Erro>}
      {carregando ? (
        <Carregando />
      ) : (
        <div className="space-y-4">
          <Totais entradas={entradas} saidas={saidas} rotuloSaldo="Resultado do período" />

          <div className="grid gap-4 md:grid-cols-2">
            <PorCategoria tipo="entrada" lancs={ativos} nomeCategoria={nomeCategoria} />
            <PorCategoria tipo="saida" lancs={ativos} nomeCategoria={nomeCategoria} />
          </div>

          <Painel titulo={porMes ? 'Fluxo de caixa por mês' : 'Fluxo de caixa por dia'}>
            {!fluxo.length ? (
              <p className="px-4 py-4 text-[14px] text-muted">Nenhum lançamento no período.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[480px] text-left text-[14px]">
                  <thead className="border-b border-hair bg-paper/60 text-[13px] text-muted">
                    <tr>
                      <th className="px-4 py-2 font-medium">{porMes ? 'Mês' : 'Dia'}</th>
                      <th className="px-4 py-2 text-right font-medium">Entradas</th>
                      <th className="px-4 py-2 text-right font-medium">Saídas</th>
                      <th className="px-4 py-2 text-right font-medium">Saldo acumulado</th>
                    </tr>
                  </thead>
                  <tbody className="tnum">
                    {fluxo.map((f) => (
                      <tr key={f.k} className="border-b border-hair last:border-b-0">
                        <td className="px-4 py-2 text-ink">{porMes ? tituloMes(f.k) : dataBR(f.k)}</td>
                        <td className="px-4 py-2 text-right text-ok">{f.entrada ? brl(f.entrada) : ''}</td>
                        <td className="px-4 py-2 text-right text-warn">{f.saida ? brl(f.saida) : ''}</td>
                        <td className={cn('px-4 py-2 text-right font-medium', f.acumulado < 0 ? 'text-warn' : 'text-ink')}>
                          {brl(f.acumulado)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Painel>
        </div>
      )}
    </>
  )
}
