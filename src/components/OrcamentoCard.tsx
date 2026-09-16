import { useState } from 'react'
import { ChevronDown, Package, Truck } from 'lucide-react'
import { Card, Stat } from '@/components/ui/card'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { brl, desde } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { Orcamento } from '@/lib/types'

interface Props {
  orcamento: Orcamento
  onDecidir: (o: Orcamento, status: 'aprovado' | 'rejeitado') => Promise<void>
}

export function OrcamentoCard({ orcamento: o, onDecidir }: Props) {
  const [aberto, setAberto] = useState(false)
  const [ocupado, setOcupado] = useState<'aprovado' | 'rejeitado' | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  // O n8n pode gravar jsonb como string se alguem deixar JSON.stringify no
  // insert. Nesse caso o Postgres guarda texto e o app recebe string.
  // Toleramos aqui em vez de virar botao morto na tela do Ramon.
  const comoObjeto = <T,>(v: T | string | null | undefined): T | null => {
    if (v == null) return null
    if (typeof v !== 'string') return v
    try {
      return JSON.parse(v) as T
    } catch {
      return null
    }
  }

  const r = comoObjeto(o.resumo)
  const d = comoObjeto(o.detalhe)
  const c = d?.cotacao_frete
  const emb = d?.embalagem
  const materiais = Array.isArray(d?.materiais) ? d.materiais : []

  async function agir(status: 'aprovado' | 'rejeitado') {
    const pergunta = status === 'aprovado' ? 'Aprovar este orçamento?' : 'Rejeitar este orçamento?'
    if (!window.confirm(pergunta)) return
    setOcupado(status)
    setErro(null)
    try {
      await onDecidir(o, status)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Falhou. Tente de novo.')
      setOcupado(null)
    }
  }

  return (
    <Card className={cn('mb-4 transition-opacity', ocupado && 'pointer-events-none opacity-40')}>
      <div className="border-b border-hair px-4 py-3.5">
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-[17px] font-semibold text-ink">{o.nome_cliente || 'Sem nome'}</span>
          <span className="shrink-0 text-[12px] text-faint">{desde(o.criado_em)}</span>
        </div>
        <div className="mt-0.5 text-[13px] text-muted">
          {r?.medidas_cm} cm · suporte de {r?.modelo}
          {(r?.quantidade ?? 1) > 1 && ` · ${r?.quantidade} unidades`}
          {o.cep && ` · CEP ${o.cep}`}
        </div>
        <div className="mt-1 font-mono text-[11px] text-faint">{o.orcamento_id}</div>
      </div>

      <div className="grid grid-cols-3 border-b border-hair">
        <Stat label="Total" value={brl(r?.total)} strong />
        <Stat label="6x de" value={brl(r?.parcela_6x)} />
        <Stat label="Pix à vista" value={brl(r?.a_vista_pix)} />
      </div>

      {o.frete_pendente ? (
        <Alert>Frete não cotado. O total abaixo está sem frete.</Alert>
      ) : c?.fallback ? (
        <Alert>
          PAC indisponível para o trecho. Usei {c.transportadora || 'outra transportadora'}.
        </Alert>
      ) : null}

      <div className="space-y-1.5 border-b border-hair px-4 py-3 text-[13px] text-muted">
        <div className="flex items-start gap-2">
          <Truck className="mt-0.5 h-4 w-4 shrink-0 text-faint" strokeWidth={1.75} />
          <span>
            Frete <span className="tnum font-mono text-body">{brl(d?.frete)}</span>
            {c?.transportadora && ` · ${c.transportadora}`}
            {c?.prazo_dias ? ` · ${c.prazo_dias} dias` : ''}
          </span>
        </div>
        {emb && (
          <div className="flex items-start gap-2">
            <Package className="mt-0.5 h-4 w-4 shrink-0 text-faint" strokeWidth={1.75} />
            <span className="tnum">
              {emb.comprimento_cm} × {emb.largura_cm} × {emb.altura_cm} cm · {emb.peso_kg} kg
            </span>
          </div>
        )}
      </div>

      <div className="border-b border-hair">
        <button
          onClick={() => setAberto(!aberto)}
          className="flex w-full items-center gap-1.5 px-4 py-2.5 text-left text-[13px] text-indigo"
        >
          <ChevronDown
            className={cn('h-4 w-4 transition-transform', aberto && 'rotate-180')}
            strokeWidth={2}
          />
          Material e custo
        </button>
        {aberto && !materiais.length && (
          <p className="px-4 pb-3 text-[13px] text-faint">
            Este orçamento foi salvo sem o detalhamento de material.
          </p>
        )}
        {aberto && d && materiais.length > 0 && (
          <div className="px-4 pb-3">
            <table className="w-full text-[13px]">
              <tbody>
                {materiais.map((m, i) => (
                  <tr key={i} className="border-b border-hair last:border-b-0">
                    <td className="py-1.5 pr-3 text-muted">{m.descricao}</td>
                    <td className="py-1.5 text-right text-faint">
                      {m.mm ? `${m.mm} mm` : `${m.unidades} un`}
                    </td>
                    <td className="tnum py-1.5 pl-3 text-right font-mono text-body">
                      {brl(m.custo)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-hair">
                  <td className="py-2 font-medium text-ink" colSpan={2}>
                    Material por suporte
                  </td>
                  <td className="tnum py-2 text-right font-mono font-medium text-ink">
                    {brl(d.custo_material_unitario)}
                  </td>
                </tr>
                <tr>
                  <td className="pb-1 text-muted" colSpan={2}>
                    Preço da peça, sem frete
                  </td>
                  <td className="tnum pb-1 text-right font-mono">{brl(d.base)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {erro && (
        <div className="border-b border-hair bg-warn-tint px-4 py-2 text-[13px] text-warn">
          {erro}
        </div>
      )}

      <div className="flex gap-2.5 p-3.5">
        <Button variant="outline" className="flex-1" onClick={() => agir('rejeitado')}>
          Rejeitar
        </Button>
        <Button variant="approve" className="flex-1" onClick={() => agir('aprovado')}>
          Aprovar
        </Button>
      </div>
    </Card>
  )
}