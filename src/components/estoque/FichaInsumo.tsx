import { useEffect, useState } from 'react'
import { ClipboardCheck, Pencil, ShoppingCart } from 'lucide-react'
import type { Insumo } from '@/lib/types'
import { supabase } from '@/lib/supabase'
import { SITUACOES, UNIDADES, emBarras, nomeTipo, qtd, rotuloCompra, situacao } from '@/lib/estoque'
import { brl, desde } from '@/lib/format'
import { useMovimentos } from '@/hooks/useEstoque'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Selo } from '@/components/ui/selo'
import { Carregando } from '@/components/ui/page'
import { ListaMovimentos } from './Movimentos'

/** Produtos cuja lista técnica usa o insumo */
function useUsadoEm(insumoId: number) {
  const [produtos, setProdutos] = useState<{ id: number; nome: string }[] | null>(null)
  useEffect(() => {
    let vivo = true
    supabase
      .from('lista_tecnica')
      .select('produto_id, produtos(nome)')
      .eq('insumo_id', insumoId)
      .then(({ data }) => {
        if (!vivo) return
        const vistos = new Map<number, string>()
        for (const l of (data ?? []) as unknown as { produto_id: number; produtos: { nome: string } | null }[]) {
          vistos.set(l.produto_id, l.produtos?.nome ?? '?')
        }
        setProdutos([...vistos].map(([id, nome]) => ({ id, nome })).sort((a, b) => a.nome.localeCompare(b.nome)))
      })
    return () => {
      vivo = false
    }
  }, [insumoId])
  return produtos
}

function Dado({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[12px] text-faint">{rotulo}</dt>
      <dd className="mt-0.5 text-[14px] text-ink">{children}</dd>
    </div>
  )
}

/** Ficha do insumo: saldo, mínimo, onde é usado e o histórico */
export function FichaInsumo({
  insumo,
  ehAdmin,
  onFechar,
  onComprar,
  onContar,
  onEditar,
}: {
  insumo: Insumo
  ehAdmin: boolean
  onFechar: () => void
  onComprar: () => void
  onContar: () => void
  onEditar: () => void
}) {
  const { movimentos, carregando } = useMovimentos(insumo.id, 100)
  const usadoEm = useUsadoEm(insumo.id)
  const s = SITUACOES[situacao(insumo)]
  const un = UNIDADES[insumo.unidade].curto
  const compra = rotuloCompra(insumo)

  return (
    <Modal aberto titulo={insumo.nome} onFechar={onFechar} largura="sm:max-w-2xl">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[12px] text-faint">Saldo</p>
          <p className="tnum text-[28px] font-semibold leading-tight text-ink">{qtd(insumo.saldo, insumo.unidade)}</p>
          {emBarras(insumo.saldo, insumo) && <p className="tnum text-[13px] text-muted">{emBarras(insumo.saldo, insumo)}</p>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {!insumo.ativo && <Selo tom="aco">Desativado</Selo>}
          {s && <Selo tom={s.tom}>{s.nome}</Selo>}
        </div>
      </div>

      {insumo.ativo && (
        <div className="mb-5 flex flex-wrap gap-2">
          <Button size="sm" onClick={onComprar}>
            <ShoppingCart className="h-4 w-4" strokeWidth={1.75} />
            Registrar compra
          </Button>
          <Button size="sm" variant="outline" onClick={onContar}>
            <ClipboardCheck className="h-4 w-4" strokeWidth={1.75} />
            Contar
          </Button>
          {ehAdmin && (
            <Button size="sm" variant="outline" onClick={onEditar}>
              <Pencil className="h-4 w-4" strokeWidth={1.75} />
              Editar
            </Button>
          )}
        </div>
      )}
      {!insumo.ativo && ehAdmin && (
        <Button size="sm" variant="outline" className="mb-5" onClick={onEditar}>
          <Pencil className="h-4 w-4" strokeWidth={1.75} />
          Editar e ativar
        </Button>
      )}

      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-lg bg-paper px-4 py-3 sm:grid-cols-3">
        <Dado rotulo="Estoque mínimo">{insumo.minimo > 0 ? qtd(insumo.minimo, insumo.unidade) : 'Sem mínimo'}</Dado>
        <Dado rotulo="Última contagem">{insumo.contado_em ? desde(insumo.contado_em) : 'Nunca contado'}</Dado>
        <Dado rotulo="Tipo">{nomeTipo(insumo.tipo)}</Dado>
        {compra && <Dado rotulo="Compra">{compra}</Dado>}
        {ehAdmin && (
          <Dado rotulo="Custo">
            <span className="tnum">
              {brl(insumo.custo)}/{un}
            </span>
            {insumo.por_compra && compra && (
              <span className="tnum block text-[12px] text-muted">{brl(insumo.custo * insumo.por_compra)} a {compra.split(' ')[0]}</span>
            )}
          </Dado>
        )}
        {insumo.codigo && (
          <Dado rotulo="Código">
            <span className="font-mono text-[13px]">{insumo.codigo}</span>
          </Dado>
        )}
      </dl>
      {insumo.observacao && <p className="mt-3 text-[13px] text-body">{insumo.observacao}</p>}

      <h3 className="mb-1.5 mt-5 text-[13px] font-medium text-body">Usado em</h3>
      {usadoEm == null ? (
        <p className="text-[13px] text-faint">Carregando…</p>
      ) : usadoEm.length ? (
        <div className="flex flex-wrap gap-1.5">
          {usadoEm.map((p) => (
            <a key={p.id} href={`#/produto/${p.id}`} onClick={onFechar} className="rounded-md border border-hair px-2 py-1 text-[13px] text-indigo hover:bg-indigo-tint">
              {p.nome}
            </a>
          ))}
        </div>
      ) : (
        <p className="text-[13px] text-muted">Nenhum produto usa este insumo na lista técnica.</p>
      )}

      <h3 className="mb-1 mt-5 text-[13px] font-medium text-body">Movimentações</h3>
      <div className="overflow-hidden rounded-lg border border-hair">
        {carregando ? (
          <Carregando />
        ) : (
          <ListaMovimentos
            movimentos={movimentos}
            ehAdmin={ehAdmin}
            mostrarInsumo={false}
            vazio={<p className="px-4 py-6 text-[14px] text-muted">Nenhuma compra ou contagem ainda.</p>}
          />
        )}
      </div>
    </Modal>
  )
}
