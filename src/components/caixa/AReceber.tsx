import { useState } from 'react'
import type { AReceber } from '@/lib/types'
import { dataBR } from '@/lib/datas'
import { brl } from '@/lib/format'
import { Vazio } from '@/components/ui/page'
import { SeloEstagio } from '@/components/ui/selo'
import { cn } from '@/lib/utils'

/** Conciliação: valor de cada pedido x o que já entrou no caixa para ele */
export function AReceberLista({ itens, onLancar }: { itens: AReceber[]; onLancar: (pedido: number) => void }) {
  const [soSaldo, setSoSaldo] = useState(true)
  const lista = itens.filter((r) => !soSaldo || r.saldo > 0)
  const total = itens.reduce((s, r) => s + r.saldo, 0)
  const vendido = itens.reduce((s, r) => s + r.valor, 0)
  const recebido = itens.reduce((s, r) => s + r.recebido, 0)

  return (
    <>
      <div className="mb-4 grid overflow-hidden rounded-lg border border-hair bg-card sm:grid-cols-3">
        {[
          ['Valor dos pedidos', vendido, 'text-ink'],
          ['Já recebido', recebido, 'text-ok'],
          ['Falta receber', total, total > 0 ? 'text-warn' : 'text-ink'],
        ].map(([r, v, c]) => (
          <div key={r as string} className="flex items-baseline justify-between gap-3 border-b border-hair px-4 py-2.5 last:border-b-0 sm:block sm:border-b-0 sm:border-r sm:py-3 sm:last:border-r-0">
            <div className="text-[13px] text-muted">{r}</div>
            <div className={cn('tnum whitespace-nowrap text-[16px] font-semibold sm:mt-0.5 md:text-[20px]', c as string)}>{brl(v as number)}</div>
          </div>
        ))}
      </div>

      <label className="mb-3 inline-flex items-center gap-2 text-[14px] text-body">
        <input type="checkbox" checked={soSaldo} onChange={(e) => setSoSaldo(e.target.checked)} className="h-4 w-4 accent-indigo" />
        Só pedidos com valor a receber
      </label>

      <div className="overflow-hidden rounded-lg border border-hair bg-card">
        {!lista.length ? (
          <Vazio titulo={soSaldo ? 'Nada a receber' : 'Nenhum pedido ainda'}>
            {soSaldo ? 'Todos os pedidos estão pagos.' : 'O pedido nasce quando a primeira entrada é lançada no caixa.'}
          </Vazio>
        ) : (
          <table className="w-full text-left text-[14px]">
            <thead className="hidden border-b border-hair bg-paper/60 text-[13px] text-muted md:table-header-group">
              <tr>
                <th className="px-4 py-2.5 font-medium">Pedido</th>
                <th className="px-4 py-2.5 font-medium">Estágio</th>
                <th className="px-4 py-2.5 text-right font-medium">Valor</th>
                <th className="px-4 py-2.5 text-right font-medium">Recebido</th>
                <th className="px-4 py-2.5 text-right font-medium">Falta</th>
                <th className="px-4 py-2.5 font-medium">Último pagamento</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {lista.map((r) => (
                <tr key={r.id} className="block border-b border-hair px-4 py-3 last:border-b-0 md:table-row md:p-0">
                  <td className="block md:table-cell md:px-4 md:py-3">
                    <a href={`#/pedido/${r.id}`} className="font-medium text-ink hover:text-indigo hover:underline">
                      {r.numero}
                    </a>
                    <span className="block text-[13px] text-muted">{r.nome_cliente || 'Sem nome'}</span>
                  </td>
                  <td className="mt-1 block md:mt-0 md:table-cell md:px-4 md:py-3">
                    <SeloEstagio estagio={r.estagio} />
                  </td>
                  <td className="tnum hidden text-right md:table-cell md:px-4 md:py-3">{brl(r.valor)}</td>
                  <td className="tnum hidden text-right text-ok md:table-cell md:px-4 md:py-3">{brl(r.recebido)}</td>
                  <td className={cn('tnum mt-1 block font-semibold md:mt-0 md:table-cell md:px-4 md:py-3 md:text-right', r.saldo > 0 ? 'text-warn' : 'text-ink')}>
                    <span className="font-normal text-muted md:hidden">Falta </span>
                    {brl(r.saldo)}
                    <span className="font-normal text-muted md:hidden"> de {brl(r.valor)}</span>
                  </td>
                  <td className="hidden text-[13px] text-muted md:table-cell md:px-4 md:py-3">{dataBR(r.ultimo_pagamento) || '—'}</td>
                  <td className="mt-2 block md:mt-0 md:table-cell md:px-4 md:py-3 md:text-right">
                    {r.saldo > 0 && (
                      <button onClick={() => onLancar(r.id)} className="text-[13px] font-medium text-indigo hover:underline">
                        Lançar pagamento
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  )
}
