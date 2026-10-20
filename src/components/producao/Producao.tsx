import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import type { Estagio, Pedido } from '@/lib/types'
import { ESTAGIOS, ativo } from '@/lib/estagios'
import { diaLocal, diasEntre, hojeISO } from '@/lib/datas'
import { Abas, Carregando, Erro, Pagina, Vazio } from '@/components/ui/page'
import { estiloCampo } from '@/components/ui/campo'
import { CartaoPedido } from './CartaoPedido'
import { cn } from '@/lib/utils'

interface Props {
  pedidos: Pedido[]
  carregando: boolean
  erro: string | null
}

/** Sem data primeiro (precisa de ação), depois pela data de entrega */
function ordenar(a: Pedido, b: Pedido) {
  if (!a.data_entrega !== !b.data_entrega) return a.data_entrega ? 1 : -1
  if (a.data_entrega && b.data_entrega && a.data_entrega !== b.data_entrega) return a.data_entrega < b.data_entrega ? -1 : 1
  return a.criado_em < b.criado_em ? -1 : 1
}

export function Producao({ pedidos, carregando, erro }: Props) {
  const [busca, setBusca] = useState('')
  const [aba, setAba] = useState<Estagio>('aguardando')
  const [verCancelados, setVerCancelados] = useState(false)
  const hoje = hojeISO()

  const termo = busca.trim().toLowerCase()
  const filtrados = useMemo(
    () =>
      pedidos.filter(
        (p) =>
          !termo ||
          (p.nome_cliente ?? '').toLowerCase().includes(termo) ||
          p.numero.toLowerCase().includes(termo) ||
          (termo.replace(/\D/g, '').length > 2 && (p.telefone ?? '').includes(termo.replace(/\D/g, ''))),
      ),
    [pedidos, termo],
  )

  // Entregues só dos últimos 30 dias, para o quadro não crescer para sempre
  const colunas = ESTAGIOS.map((e) => ({
    ...e,
    itens: filtrados
      .filter((p) => p.estagio === e.id)
      .filter((p) => e.id !== 'entregue' || diasEntre(diaLocal(p.estagio_em), hoje) <= 30)
      .sort(e.id === 'entregue' ? (a, b) => (a.estagio_em < b.estagio_em ? 1 : -1) : ordenar),
  }))
  const cancelados = filtrados.filter((p) => p.estagio === 'cancelado')
  const naOficina = pedidos.filter((p) => ativo(p.estagio)).length
  const coluna = colunas.find((c) => c.id === aba)!

  return (
    <Pagina
      titulo="Produção"
      subtitulo={
        naOficina
          ? `${naOficina} ${naOficina === 1 ? 'pedido' : 'pedidos'} na oficina. Clique num pedido para abrir a ordem de produção.`
          : 'O pedido entra aqui quando o pagamento é lançado no caixa.'
      }
      largura="max-w-[1500px]"
      acoes={
        <label className={cn(estiloCampo, 'flex w-64 max-w-full items-center gap-2')}>
          <Search className="h-4 w-4 shrink-0 text-faint" strokeWidth={1.75} />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Cliente ou nº do pedido"
            className="w-full bg-transparent outline-none placeholder:text-faint"
          />
        </label>
      }
    >
      {erro && <Erro>{erro}</Erro>}
      {carregando && <Carregando />}

      {!carregando && (
        <>
          {/* Quadro (computador) */}
          <div className="hidden gap-3 lg:grid lg:grid-cols-5">
            {colunas.map((c) => (
              <section key={c.id} className="min-w-0">
                <header className="mb-2 flex items-center gap-2 px-1">
                  <span className={cn('h-2.5 w-2.5 rounded-sm', c.cor)} />
                  <h2 className="text-[14px] font-semibold text-ink">{c.nome}</h2>
                  <span className="tnum text-[13px] text-faint">{c.itens.length}</span>
                </header>
                <div className="space-y-2 rounded-lg bg-hair/50 p-2">
                  {c.itens.map((p) => (
                    <CartaoPedido key={p.id} p={p} />
                  ))}
                  {!c.itens.length && <p className="px-2 py-6 text-center text-[13px] text-faint">Nenhum pedido</p>}
                </div>
                {c.id === 'entregue' && c.itens.length > 0 && (
                  <p className="mt-1.5 px-1 text-[12px] text-faint">Entregues nos últimos 30 dias</p>
                )}
              </section>
            ))}
          </div>

          {/* Lista por estágio (celular e tablet) */}
          <div className="lg:hidden">
            <Abas
              className="mb-3"
              atual={aba}
              onTrocar={setAba}
              abas={colunas.map((c) => ({ id: c.id, nome: c.nome, qtd: c.itens.length }))}
            />
            <div className="space-y-2">
              {coluna.itens.map((p) => (
                <CartaoPedido key={p.id} p={p} />
              ))}
              {!coluna.itens.length && <Vazio titulo={`Nenhum pedido em ${coluna.nome.toLowerCase()}`} />}
            </div>
          </div>

          {cancelados.length > 0 && (
            <div className="mt-6">
              <button onClick={() => setVerCancelados((v) => !v)} className="text-[13px] text-muted hover:text-body">
                {verCancelados ? 'Esconder' : 'Ver'} cancelados ({cancelados.length})
              </button>
              {verCancelados && (
                <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                  {cancelados.map((p) => (
                    <CartaoPedido key={p.id} p={p} className="opacity-60" />
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </Pagina>
  )
}
