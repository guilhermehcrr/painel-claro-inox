import { useState } from 'react'
import { ChevronRight, Plus } from 'lucide-react'
import type { Produtos as DadosProdutos } from '@/hooks/useProdutos'
import { irPara } from '@/lib/rota'
import { Button } from '@/components/ui/button'
import { Carregando, Erro, Pagina, Painel, Vazio } from '@/components/ui/page'
import { Selo } from '@/components/ui/selo'
import { FormProduto } from './FormProduto'
import { cn } from '@/lib/utils'

/** Lista de produtos por categoria */
export function Produtos({ dados, ehAdmin }: { dados: DadosProdutos; ehAdmin: boolean }) {
  const { produtos, variacoes, linhas, carregando, erro } = dados
  const [novo, setNovo] = useState(false)

  const categorias = [...new Set(produtos.map((p) => p.categoria))]
  const grupos = categorias.map((c) => ({
    nome: c,
    itens: produtos.filter((p) => p.categoria === c).sort((a, b) => Number(b.ativo) - Number(a.ativo)),
  }))

  return (
    <Pagina
      titulo="Produtos"
      subtitulo="O que a oficina fabrica e a matéria-prima de cada peça."
      largura="max-w-4xl"
      acoes={
        ehAdmin ? (
          <Button onClick={() => setNovo(true)}>
            <Plus className="h-4 w-4" strokeWidth={2} />
            Novo produto
          </Button>
        ) : undefined
      }
    >
      {erro && <Erro>{erro}</Erro>}
      <p className="mb-4 max-w-2xl text-[14px] text-muted">
        A lista técnica de cada produto diz quanto de cada insumo vai na peça, calculado com as medidas do pedido.
        É com ela que o estoque vai dar baixa sozinho quando o pedido entrar em produção.
      </p>

      {carregando ? (
        <Carregando />
      ) : !produtos.length ? (
        <Painel>
          <Vazio titulo="Nenhum produto cadastrado">{ehAdmin ? 'Use "Novo produto" para começar.' : 'O administrador cadastra os produtos.'}</Vazio>
        </Painel>
      ) : (
        <div className="space-y-4">
          {grupos.map((g) => (
            <Painel key={g.nome} titulo={g.nome}>
              <ul>
                {g.itens.map((p) => {
                  const vs = variacoes.filter((v) => v.produto_id === p.id)
                  const n = linhas.filter((l) => l.produto_id === p.id).length
                  return (
                    <li key={p.id} className="border-b border-hair last:border-b-0">
                      <a href={`#/produto/${p.id}`} className={cn('flex items-center gap-3 px-4 py-3 hover:bg-paper/60', !p.ativo && 'opacity-60')}>
                        <span className="min-w-0 flex-1">
                          <span className="flex flex-wrap items-center gap-2 text-[15px] text-ink">
                            {p.nome}
                            {!p.ativo && <Selo tom="aco">Desativado</Selo>}
                          </span>
                          <span className="block truncate text-[13px] text-muted">
                            {vs.length ? vs.map((v) => v.nome).join(' · ') : 'Sem variações'}
                          </span>
                        </span>
                        <span className={cn('shrink-0 text-right text-[13px]', n ? 'text-muted' : 'text-warn')}>
                          {n ? `${n} ${n === 1 ? 'item' : 'itens'} na lista técnica` : 'Lista técnica vazia'}
                        </span>
                        <ChevronRight className="h-4 w-4 shrink-0 text-faint" strokeWidth={1.75} />
                      </a>
                    </li>
                  )
                })}
              </ul>
            </Painel>
          ))}
        </div>
      )}

      {novo && (
        <FormProduto
          categorias={categorias}
          onFechar={() => setNovo(false)}
          onSalvar={async (d) => {
            const id = await dados.salvarProduto(d)
            irPara('produto', id)
            return id
          }}
        />
      )}
    </Pagina>
  )
}
