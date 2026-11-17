import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, ChevronRight, ClipboardCheck, Plus, Search, ShoppingCart } from 'lucide-react'
import type { Insumo, TipoInsumo, TipoMovimento } from '@/lib/types'
import type { Estoque as DadosEstoque } from '@/hooks/useEstoque'
import { useMovimentos } from '@/hooks/useEstoque'
import { SITUACOES, TIPOS_INSUMO, emAlerta, emBarras, paraBusca, pecaCompra, qtd, rotuloCompra, situacao, valorEstoque } from '@/lib/estoque'
import { brl, desde } from '@/lib/format'
import { irPara } from '@/lib/rota'
import { Button } from '@/components/ui/button'
import { Card, Stat } from '@/components/ui/card'
import { Entrada } from '@/components/ui/campo'
import { Abas, Carregando, Erro, Pagina, Painel, Vazio } from '@/components/ui/page'
import { Selo } from '@/components/ui/selo'
import { ListaMovimentos } from './Movimentos'
import { Compra } from './Compra'
import { Contagem } from './Contagem'
import { FormInsumo } from './FormInsumo'
import { FichaInsumo } from './FichaInsumo'
import { cn } from '@/lib/utils'

type Filtro = 'todos' | 'repor' | 'desativados' | TipoInsumo

function Pilula({ ativo, onClick, children, tom }: { ativo: boolean; onClick: () => void; children: React.ReactNode; tom?: 'warn' }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={ativo}
      className={cn(
        'shrink-0 rounded-full border px-3 py-1 text-[13px] transition-colors',
        ativo
          ? tom === 'warn' ? 'border-warn bg-warn text-white' : 'border-grafite bg-grafite text-white'
          : tom === 'warn' ? 'border-warn/40 bg-card text-warn hover:bg-warn-tint' : 'border-hair bg-card text-body hover:bg-paper',
      )}
    >
      {children}
    </button>
  )
}

function SeloSituacao({ i }: { i: Insumo }) {
  if (!i.ativo) return <Selo tom="aco">Desativado</Selo>
  const s = SITUACOES[situacao(i)]
  return s ? <Selo tom={s.tom}>{s.nome}</Selo> : null
}

/** Tabela no computador, lista no celular */
function ListaInsumos({ lista, ehAdmin, onAbrir }: { lista: Insumo[]; ehAdmin: boolean; onAbrir: (id: number) => void }) {
  return (
    <>
      <table className="hidden w-full text-[14px] md:table">
        <thead>
          <tr className="border-b border-hair text-left text-[12px] font-medium text-faint">
            <th className="px-4 py-2 font-medium">Insumo</th>
            <th className="px-3 py-2 text-right font-medium">Saldo</th>
            <th className="px-3 py-2 text-right font-medium">Mínimo</th>
            {ehAdmin && <th className="px-3 py-2 text-right font-medium">Custo</th>}
            {ehAdmin && <th className="px-3 py-2 text-right font-medium">Valor</th>}
            <th className="w-32 px-3 py-2 font-medium" />
          </tr>
        </thead>
        <tbody>
          {lista.map((i) => {
            const compra = rotuloCompra(i)
            const p = pecaCompra(i)
            return (
              <tr
                key={i.id}
                onClick={() => onAbrir(i.id)}
                className={cn('cursor-pointer border-b border-hair last:border-b-0 hover:bg-paper/60', !i.ativo && 'opacity-60')}
              >
                <td className="px-4 py-2.5">
                  <button onClick={() => onAbrir(i.id)} className="text-left text-ink hover:underline">{i.nome}</button>
                  <span className="block text-[12px] text-faint">
                    {i.codigo && <span className="font-mono">{i.codigo} · </span>}
                    {compra ?? TIPOS_INSUMO.find((t) => t.id === i.tipo)?.nome}
                  </span>
                </td>
                <td className="px-3 py-2.5 text-right">
                  <span className={cn('tnum font-medium', i.saldo < 0 ? 'text-warn' : 'text-ink')}>{qtd(i.saldo, i.unidade)}</span>
                  {emBarras(i.saldo, i) && <span className="tnum block text-[12px] text-faint">{emBarras(i.saldo, i)}</span>}
                </td>
                <td className="tnum px-3 py-2.5 text-right text-muted">{i.minimo > 0 ? qtd(i.minimo, i.unidade) : '—'}</td>
                {ehAdmin && (
                  <td className="tnum px-3 py-2.5 text-right text-muted">
                    {p && i.por_compra ? (
                      <>
                        {brl(i.custo * i.por_compra)}
                        <span className="block text-[12px] text-faint">a {p[0]}</span>
                      </>
                    ) : (
                      brl(i.custo)
                    )}
                  </td>
                )}
                {ehAdmin && <td className="tnum px-3 py-2.5 text-right text-body">{brl(Math.max(0, i.saldo) * i.custo)}</td>}
                <td className="px-3 py-2.5 text-right">
                  <SeloSituacao i={i} />
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>

      <ul className="md:hidden">
        {lista.map((i) => (
          <li key={i.id} className={cn('border-b border-hair last:border-b-0', !i.ativo && 'opacity-60')}>
            <button onClick={() => onAbrir(i.id)} className="flex w-full items-center gap-3 px-4 py-3 text-left">
              <span className="min-w-0 flex-1">
                <span className="block text-[14px] text-ink">{i.nome}</span>
                <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-muted">
                  <SeloSituacao i={i} />
                  {i.minimo > 0 && <span>mín. {qtd(i.minimo, i.unidade)}</span>}
                </span>
              </span>
              <span className="shrink-0 text-right">
                <span className={cn('tnum block text-[15px] font-medium', i.saldo < 0 ? 'text-warn' : 'text-ink')}>{qtd(i.saldo, i.unidade)}</span>
                {emBarras(i.saldo, i) && <span className="tnum block text-[11px] text-faint">{emBarras(i.saldo, i)}</span>}
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-faint" strokeWidth={1.75} />
            </button>
          </li>
        ))}
      </ul>
    </>
  )
}

function Movimentacoes({ ehAdmin, onInsumo }: { ehAdmin: boolean; onInsumo: (id: number) => void }) {
  const { movimentos, carregando, erro } = useMovimentos(null, 300)
  const [tipo, setTipo] = useState<'todos' | TipoMovimento>('todos')
  const lista = movimentos.filter((m) => tipo === 'todos' || m.tipo === tipo)
  return (
    <>
      {erro && <Erro>{erro}</Erro>}
      <div className="mb-3 flex gap-1 rounded-md bg-hair/60 p-1 text-[13px] sm:w-fit">
        {([
          ['todos', 'Todas'],
          ['entrada', 'Compras'],
          ['ajuste', 'Contagens'],
        ] as const).map(([id, nome]) => (
          <button
            key={id}
            onClick={() => setTipo(id)}
            className={cn('flex-1 rounded px-3 py-1 sm:flex-none', tipo === id ? 'bg-card font-medium text-ink shadow-sm' : 'text-muted')}
          >
            {nome}
          </button>
        ))}
      </div>
      <Card>
        {carregando ? (
          <Carregando />
        ) : (
          <ListaMovimentos
            movimentos={lista}
            ehAdmin={ehAdmin}
            onInsumo={onInsumo}
            vazio={<Vazio titulo="Nenhuma movimentação">Compras e contagens aparecem aqui, com quem fez e quando.</Vazio>}
          />
        )}
      </Card>
      {movimentos.length >= 300 && <p className="mt-2 text-[12px] text-faint">Mostrando as 300 mais recentes.</p>}
    </>
  )
}

export function Estoque({ estoque, ehAdmin, aba }: { estoque: DadosEstoque; ehAdmin: boolean; aba: string | null }) {
  const { insumos, carregando, erro, alertas } = estoque
  const [busca, setBusca] = useState('')
  const [filtro, setFiltro] = useState<Filtro>('todos')
  const [ficha, setFicha] = useState<number | null>(null)
  const [compra, setCompra] = useState<{ insumo: number | null } | null>(null)
  const [contagem, setContagem] = useState<{ insumo: number | null } | null>(null)
  const [form, setForm] = useState<{ insumo: Insumo | null } | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const atual: 'insumos' | 'movimentacoes' = aba === 'movimentacoes' ? 'movimentacoes' : 'insumos'

  useEffect(() => {
    if (!aviso) return
    const t = setTimeout(() => setAviso(null), 6000)
    return () => clearTimeout(t)
  }, [aviso])

  const ativos = insumos.filter((i) => i.ativo)
  const desativados = insumos.length - ativos.length
  const nuncaContado = ativos.length > 0 && ativos.every((i) => !i.contado_em && i.saldo === 0)
  const ultimaContagem = ativos.reduce<string | null>((m, i) => (i.contado_em && (!m || i.contado_em > m) ? i.contado_em : m), null)

  const lista = useMemo(() => {
    const b = paraBusca(busca.trim())
    return insumos.filter((i) => {
      if (b && !paraBusca(`${i.nome} ${i.codigo ?? ''}`).includes(b)) return false
      if (filtro === 'desativados') return !i.ativo
      if (!i.ativo) return false
      if (filtro === 'repor') return emAlerta(i)
      return filtro === 'todos' || i.tipo === filtro
    })
  }, [insumos, busca, filtro])

  const aberto = insumos.find((i) => i.id === ficha) ?? null
  const unicoContagem = contagem?.insumo ? insumos.find((i) => i.id === contagem.insumo) ?? null : null

  return (
    <Pagina
      titulo="Estoque"
      subtitulo="Matéria-prima da oficina. O saldo muda com as compras e as contagens."
      acoes={
        <>
          <Button variant="outline" onClick={() => setContagem({ insumo: null })} disabled={!ativos.length}>
            <ClipboardCheck className="h-4 w-4" strokeWidth={1.75} />
            Fazer contagem
          </Button>
          <Button onClick={() => setCompra({ insumo: null })} disabled={!ativos.length}>
            <ShoppingCart className="h-4 w-4" strokeWidth={1.75} />
            Registrar compra
          </Button>
        </>
      }
    >
      {erro && <Erro>{erro}</Erro>}
      {aviso && (
        <div className="mb-4 rounded-lg border border-ok/30 bg-ok-tint px-4 py-3 text-[14px] text-ok" role="status">
          {aviso}
        </div>
      )}

      {!carregando && nuncaContado && (
        <Painel className="mb-4 border-indigo/30" corpo="flex flex-wrap items-center gap-4 px-4 py-4">
          <div className="min-w-0 flex-1 basis-72">
            <p className="font-medium text-ink">Primeiro passo: contar o que tem na oficina</p>
            <p className="mt-0.5 text-[14px] text-muted">
              Os materiais do cálculo do orçamento já estão cadastrados, com saldo zero. Faça a contagem física e digite aqui.
              {ehAdmin ? ' Depois defina o estoque mínimo de cada um para o sistema avisar quando repor.' : ''}
            </p>
          </div>
          <Button onClick={() => setContagem({ insumo: null })}>
            <ClipboardCheck className="h-4 w-4" strokeWidth={1.75} />
            Começar a contagem
          </Button>
        </Painel>
      )}

      {!carregando && ativos.length > 0 && (
        <Card className={cn('mb-4 grid grid-cols-2', ehAdmin ? 'sm:grid-cols-4' : 'sm:grid-cols-3', '[&>*:nth-child(-n+2)]:border-b [&>*:nth-child(2)]:border-r-0 sm:[&>*]:!border-b-0 sm:[&>*:nth-child(2)]:border-r')}>
          <Stat label="Insumos" value={String(ativos.length)} />
          <Stat label="Para repor" value={String(alertas.length)} strong={alertas.length > 0} />
          <Stat label="Última contagem" value={ultimaContagem ? desde(ultimaContagem) : 'nunca'} />
          {ehAdmin && <Stat label="Valor em estoque" value={brl(valorEstoque(insumos))} strong />}
        </Card>
      )}

      {alertas.length > 0 && filtro !== 'repor' && atual === 'insumos' && (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-warn/30 bg-warn-tint px-4 py-3 text-[14px] text-warn">
          <AlertTriangle className="h-4 w-4 shrink-0" strokeWidth={1.75} />
          <span className="min-w-0 flex-1">
            <span className="font-medium">
              {alertas.length === 1 ? '1 insumo chegou no mínimo' : `${alertas.length} insumos chegaram no mínimo`}:
            </span>{' '}
            {alertas.slice(0, 4).map((i) => i.nome).join(', ')}
            {alertas.length > 4 ? ` e mais ${alertas.length - 4}` : ''}
          </span>
          <button onClick={() => setFiltro('repor')} className="font-medium underline-offset-2 hover:underline">
            Ver só esses
          </button>
        </div>
      )}

      <Abas
        className="mb-4"
        atual={atual}
        onTrocar={(a) => irPara('estoque', a === 'insumos' ? null : a)}
        abas={[
          { id: 'insumos', nome: 'Insumos' },
          { id: 'movimentacoes', nome: 'Movimentações' },
        ]}
      />

      {atual === 'movimentacoes' ? (
        <Movimentacoes ehAdmin={ehAdmin} onInsumo={setFicha} />
      ) : carregando ? (
        <Carregando />
      ) : (
        <>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <div className="relative w-full sm:w-64">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" strokeWidth={1.75} />
              <Entrada value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar insumo ou código" className="h-9 pl-9" />
            </div>
            <div className="-mx-4 flex w-[calc(100%+2rem)] gap-1.5 overflow-x-auto px-4 pb-1 sm:mx-0 sm:w-auto sm:flex-wrap sm:px-0 sm:pb-0">
              <Pilula ativo={filtro === 'todos'} onClick={() => setFiltro('todos')}>Todos</Pilula>
              {alertas.length > 0 && (
                <Pilula ativo={filtro === 'repor'} onClick={() => setFiltro('repor')} tom="warn">
                  Para repor ({alertas.length})
                </Pilula>
              )}
              {TIPOS_INSUMO.filter((t) => ativos.some((i) => i.tipo === t.id)).map((t) => (
                <Pilula key={t.id} ativo={filtro === t.id} onClick={() => setFiltro(t.id)}>
                  {t.plural}
                </Pilula>
              ))}
              {desativados > 0 && (
                <Pilula ativo={filtro === 'desativados'} onClick={() => setFiltro('desativados')}>
                  Desativados ({desativados})
                </Pilula>
              )}
            </div>
          </div>

          <Painel
            titulo={filtro === 'repor' ? 'Para repor' : 'Insumos'}
            acao={
              ehAdmin ? (
                <Button size="sm" variant="outline" onClick={() => setForm({ insumo: null })}>
                  <Plus className="h-4 w-4" strokeWidth={2} />
                  Novo insumo
                </Button>
              ) : undefined
            }
          >
            {lista.length ? (
              <ListaInsumos lista={lista} ehAdmin={ehAdmin} onAbrir={setFicha} />
            ) : insumos.length ? (
              <Vazio titulo="Nenhum insumo aqui">Troque o filtro ou a busca.</Vazio>
            ) : (
              <Vazio titulo="Nenhum insumo cadastrado">
                {ehAdmin ? 'Use "Novo insumo" para cadastrar a matéria-prima.' : 'Peça ao administrador para cadastrar a matéria-prima.'}
              </Vazio>
            )}
          </Painel>
        </>
      )}

      {aberto && !compra && !contagem && !form && (
        <FichaInsumo
          insumo={aberto}
          ehAdmin={ehAdmin}
          onFechar={() => setFicha(null)}
          onComprar={() => setCompra({ insumo: aberto.id })}
          onContar={() => setContagem({ insumo: aberto.id })}
          onEditar={() => setForm({ insumo: aberto })}
        />
      )}

      {compra && (
        <Compra
          aberto
          insumos={ativos}
          inicial={compra.insumo}
          ehAdmin={ehAdmin}
          onFechar={() => setCompra(null)}
          onSalvar={async (itens, fornecedor, nota, obs) => {
            const n = await estoque.registrarCompra(itens, fornecedor, nota, obs)
            setAviso(n === 1 ? 'Compra registrada. O saldo já foi atualizado.' : `Compra registrada: ${n} insumos. Os saldos já foram atualizados.`)
            return n
          }}
        />
      )}

      {contagem && (
        <Contagem
          aberto
          insumos={ativos}
          unico={unicoContagem}
          onFechar={() => setContagem(null)}
          onSalvar={async (itens, just) => {
            const r = await estoque.registrarContagem(itens, just)
            setAviso(
              `Contagem salva: ${r.contados} ${r.contados === 1 ? 'insumo' : 'insumos'}` +
                (r.com_diferenca ? `, ${r.com_diferenca} com diferença ajustada.` : ', tudo batendo com o sistema.'),
            )
            return r
          }}
        />
      )}

      {form && (
        <FormInsumo
          aberto
          insumo={form.insumo}
          onFechar={() => setForm(null)}
          onSalvar={async (d) => {
            const id = await estoque.salvarInsumo(d)
            setAviso(d.id ? 'Insumo salvo.' : `${d.nome} cadastrado.`)
            return id
          }}
        />
      )}
    </Pagina>
  )
}
