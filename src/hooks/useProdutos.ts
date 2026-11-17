import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { LinhaTecnica, Produto, Variacao } from '@/lib/types'
import { mensagemErro } from './useAoVivo'

/** Ordem das categorias na tela; as outras vêm depois, em ordem alfabética */
const CATEGORIAS = ['Suportes', 'Grelhas', 'Espetos e giratório']
export const ordemCategoria = (c: string) => {
  const i = CATEGORIAS.indexOf(c)
  return i < 0 ? CATEGORIAS.length : i
}

function erroAmigavel(m: string, oque: string) {
  if (/duplicate|unique/i.test(m)) return `Já existe ${oque} com esse nome.`
  return mensagemErro(m)
}

export interface DadosProduto {
  id?: number
  nome: string
  categoria: string
  descricao: string
  ativo: boolean
}

export interface DadosLinha {
  id?: number
  produto: number
  insumo: number
  descricao: string
  formula: string
  /** Vazio = todas as variações */
  variacoes: number[]
}

/** Produtos, variações e lista técnica (tudo junto: são poucos) */
export function useProdutos() {
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [variacoes, setVariacoes] = useState<Variacao[]>([])
  const [linhas, setLinhas] = useState<LinhaTecnica[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  const carregar = useCallback(async () => {
    const [p, v, l] = await Promise.all([
      supabase.from('produtos').select('*').order('ordem').order('nome'),
      supabase.from('produto_variacoes').select('*').order('ordem').order('id'),
      supabase.from('lista_tecnica').select('*, lista_tecnica_variacoes(variacao_id)').order('ordem').order('id'),
    ])
    const falha = p.error || v.error || l.error
    if (falha) setErro(mensagemErro(falha.message))
    else {
      setErro(null)
      setProdutos(
        ((p.data ?? []) as Produto[]).sort(
          (a, b) => ordemCategoria(a.categoria) - ordemCategoria(b.categoria) || a.categoria.localeCompare(b.categoria) || a.ordem - b.ordem || a.nome.localeCompare(b.nome),
        ),
      )
      setVariacoes((v.data ?? []) as Variacao[])
      setLinhas(
        ((l.data ?? []) as (Omit<LinhaTecnica, 'variacoes'> & { lista_tecnica_variacoes: { variacao_id: number }[] })[]).map(
          ({ lista_tecnica_variacoes, ...x }) => ({ ...x, variacoes: (lista_tecnica_variacoes ?? []).map((y) => y.variacao_id) }),
        ),
      )
    }
    setCarregando(false)
  }, [])

  useEffect(() => {
    carregar()
  }, [carregar])

  const salvarProduto = useCallback(
    async (d: DadosProduto) => {
      const dados = {
        nome: d.nome.trim(),
        categoria: d.categoria.trim() || 'Outros',
        descricao: d.descricao.trim() || null,
        ativo: d.ativo,
      }
      if (!dados.nome) throw new Error('Escreva o nome do produto.')
      const r = d.id
        ? await supabase.from('produtos').update(dados).eq('id', d.id).select('id').single()
        : await supabase.from('produtos').insert(dados).select('id').single()
      if (r.error) throw new Error(erroAmigavel(r.error.message, 'um produto'))
      await carregar()
      return (r.data as { id: number }).id
    },
    [carregar],
  )

  const excluirProduto = useCallback(
    async (id: number) => {
      const { error } = await supabase.from('produtos').delete().eq('id', id)
      if (error) throw new Error(mensagemErro(error.message))
      await carregar()
    },
    [carregar],
  )

  const salvarVariacao = useCallback(
    async (v: { id?: number; produto_id: number; nome: string }) => {
      const nome = v.nome.trim()
      if (!nome) throw new Error('Escreva o nome da variação.')
      const proxima = Math.max(0, ...variacoes.filter((x) => x.produto_id === v.produto_id).map((x) => x.ordem)) + 1
      const { error } = v.id
        ? await supabase.from('produto_variacoes').update({ nome }).eq('id', v.id)
        : await supabase.from('produto_variacoes').insert({ produto_id: v.produto_id, nome, ordem: proxima })
      if (error) throw new Error(erroAmigavel(error.message, 'uma variação'))
      await carregar()
    },
    [carregar, variacoes],
  )

  const excluirVariacao = useCallback(
    async (id: number) => {
      const { error } = await supabase.from('produto_variacoes').delete().eq('id', id)
      if (error) throw new Error(mensagemErro(error.message))
      await carregar()
    },
    [carregar],
  )

  const salvarLinha = useCallback(
    async (d: DadosLinha) => {
      const { error } = await supabase.rpc('salvar_linha_tecnica', { p: d })
      if (error) throw new Error(mensagemErro(error.message))
      await carregar()
    },
    [carregar],
  )

  const excluirLinha = useCallback(
    async (id: number) => {
      const { error } = await supabase.from('lista_tecnica').delete().eq('id', id)
      if (error) throw new Error(mensagemErro(error.message))
      await carregar()
    },
    [carregar],
  )

  return {
    produtos, variacoes, linhas, carregando, erro, recarregar: carregar,
    salvarProduto, excluirProduto, salvarVariacao, excluirVariacao, salvarLinha, excluirLinha,
  }
}

export type Produtos = ReturnType<typeof useProdutos>
