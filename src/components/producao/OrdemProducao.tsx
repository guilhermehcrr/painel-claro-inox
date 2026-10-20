import type { Pedido } from '@/lib/types'
import { dataBR, diaLocal } from '@/lib/datas'
import { telefoneBonito } from '@/lib/format'
import { cn } from '@/lib/utils'

/** mm -> "80,5 cm" */
const cm = (mm: number | null | undefined) =>
  mm == null || !Number.isFinite(Number(mm)) ? '—' : `${String(Math.round(Number(mm)) / 10).replace('.', ',')} cm`

const mmTexto = (mm: number | null | undefined) =>
  mm == null ? '' : `${Math.round(Number(mm)).toLocaleString('pt-BR')} mm`

function Secao({ titulo, children, className }: { titulo: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn('break-inside-avoid border-t border-hair px-5 py-4 print:px-0 print:py-2.5', className)}>
      <h3 className="mb-2.5 text-[13px] font-semibold text-muted">{titulo}</h3>
      {children}
    </section>
  )
}

function Medida({ rotulo, valor, texto }: { rotulo: string; valor: string; texto?: boolean }) {
  return (
    <div>
      <dt className="text-[12px] text-muted">{rotulo}</dt>
      <dd className={cn('text-[16px] text-ink', texto ? 'font-medium' : 'font-mono')}>{valor}</dd>
    </div>
  )
}

/**
 * Ordem de produção: o que a oficina precisa para cortar, soldar e conferir.
 * Sem preço. A mesma peça aparece na tela e no papel (Imprimir).
 */
export function OrdemProducao({ p, impressao }: { p: Pedido; impressao?: boolean }) {
  const e = p.detalhe?.entrada
  const qtd = Number(e?.quantidade ?? p.resumo?.quantidade) || 1
  const modelo = (e?.modelo ?? p.resumo?.modelo) === 'apoio' ? 'Flutuante (apoio)' : 'Fixo'
  const pecas = p.detalhe?.pecas ?? []
  const materiais = Array.isArray(p.detalhe?.materiais) ? p.detalhe!.materiais : []
  const temExternas = p.a_mm || p.b_mm || p.c_mm

  return (
    <article className={cn('bg-card text-body', !impressao && 'rounded-lg border border-hair')}>
      <header className="flex flex-wrap items-start justify-between gap-3 px-5 py-4 print:px-0 print:pb-2 print:pt-0">
        <div>
          <p className="text-[13px] text-muted">Claro Inox, ordem de produção</p>
          <h2 className="text-[20px] font-semibold text-ink">Pedido {p.numero}</h2>
        </div>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-1 text-[13px]">
          <dt className="text-muted">Fechado em</dt>
          <dd className="tnum text-ink">{dataBR(diaLocal(p.criado_em))}</dd>
          <dt className="text-muted">Entrega</dt>
          <dd className={cn('tnum font-medium', p.data_entrega ? 'text-ink' : 'text-palha')}>
            {p.data_entrega ? dataBR(p.data_entrega) : 'sem data'}
          </dd>
        </dl>
      </header>

      <Secao titulo="Cliente">
        <p className="text-[15px] font-medium text-ink">{p.nome_cliente || 'Sem nome'}</p>
        <p className="text-[13px] text-muted">
          {telefoneBonito(p.telefone)}
          {p.cep && <span>, CEP {p.cep.replace(/^(\d{5})(\d{3})$/, '$1-$2')}</span>}
        </p>
      </Secao>

      <Secao titulo={qtd > 1 ? `Medidas (${qtd} suportes iguais)` : 'Medidas'}>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
          <Medida rotulo="X, largura interna" valor={cm(e?.X)} />
          <Medida rotulo="Y, profundidade interna" valor={cm(e?.Y)} />
          <Medida rotulo="Altura do suporte" valor={cm(e?.altura)} />
          <Medida rotulo="Níveis de altura" valor={e?.niveis != null ? String(e.niveis) : String(p.resumo?.niveis ?? '—')} />
          <Medida rotulo="Modelo" valor={modelo} texto />
          {e?.perfil && <Medida rotulo="Perfil" valor={String(e.perfil)} texto />}
        </dl>
        {temExternas ? (
          <p className="mt-3 text-[13px] text-muted">
            Externas da churrasqueira: A {cm(p.a_mm)}, B {cm(p.b_mm)}, C {cm(p.c_mm)}
          </p>
        ) : null}
      </Secao>

      {pecas.length > 0 && (
        <Secao titulo="Peças">
          <ul className="space-y-2">
            {pecas.map((pc, i) => (
              <li key={i} className="flex gap-3">
                <span className="tnum w-8 shrink-0 text-right font-mono text-[15px] font-medium text-ink">{pc.quantidade}×</span>
                <span className="min-w-0">
                  <span className="block text-[14px] font-medium text-ink">{pc.nome}</span>
                  {pc.descricao && (
                    <span className="block text-[13px] text-muted">
                      {Array.isArray(pc.descricao) ? pc.descricao.join('. ') : pc.descricao}
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </Secao>
      )}

      {materiais.length > 0 && (
        <Secao titulo={qtd > 1 ? `Insumos de 1 suporte (multiplicar por ${qtd})` : 'Insumos'}>
          <table className="w-full text-left text-[13px]">
            <thead className="text-muted">
              <tr className="border-b border-hair">
                <th className="py-1.5 pr-3 font-medium">Item</th>
                <th className="py-1.5 pr-3 font-medium">Material</th>
                <th className="py-1.5 text-right font-medium">Medida</th>
              </tr>
            </thead>
            <tbody>
              {materiais.map((m, i) => (
                <tr key={i} className="border-b border-hair/70 last:border-b-0">
                  <td className="py-1.5 pr-3 text-ink">{m.descricao}</td>
                  <td className="py-1.5 pr-3 text-body">{m.material_nome}</td>
                  <td className="tnum whitespace-nowrap py-1.5 text-right font-mono text-ink">
                    {m.mm != null ? mmTexto(m.mm) : m.unidades != null ? `${m.unidades} un` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Secao>
      )}

      {p.observacoes && (
        <Secao titulo="Observações">
          <p className="whitespace-pre-wrap text-[14px] text-ink">{p.observacoes}</p>
        </Secao>
      )}

      {impressao && (
        <Secao titulo="Conferência na oficina">
          <div className="grid grid-cols-3 gap-y-3 text-[13px]">
            {['Corte', 'Solda', 'Acabamento', 'Medidas conferidas', 'Acessórios separados', 'Embalado'].map((t) => (
              <span key={t} className="flex items-center gap-2">
                <span className="inline-block h-4 w-4 border border-ink" /> {t}
              </span>
            ))}
          </div>
          <div className="mt-6 grid grid-cols-2 gap-8 text-[13px] text-muted print:mt-5">
            <span className="border-t border-ink pt-1">Responsável</span>
            <span className="border-t border-ink pt-1">Data</span>
          </div>
        </Secao>
      )}
    </article>
  )
}
