import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { AReceber, Categoria, Lancamento, TipoLancamento } from '@/lib/types'
import { mensagemErro, useAoVivo } from './useAoVivo'

export interface NovoLancamento {
  tipo: TipoLancamento
  data: string
  valor: number
  categoria: number
  descricao?: string
  pedido?: number | null
  orcamento?: number | null
  valorPedido?: number | null
}

/** Caixa de um período (datas YYYY-MM-DD). Só funciona para admin. */
export function useCaixa(de: string, ate: string, ligado = true) {
  const [lancamentos, setLancamentos] = useState<Lancamento[]>([])
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [aReceber, setAReceber] = useState<AReceber[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  const carregar = useCallback(async () => {
    const [l, c, r] = await Promise.all([
      supabase
        .from('lancamentos')
        .select('*')
        .gte('data', de)
        .lte('data', ate)
        .order('data', { ascending: false })
        .order('id', { ascending: false }),
      supabase.from('categorias_caixa').select('*').order('nome'),
      supabase.from('v_a_receber').select('*').order('criado_em', { ascending: false }),
    ])
    const falha = l.error || c.error || r.error
    if (falha) setErro(mensagemErro(falha.message))
    else {
      setErro(null)
      setLancamentos(((l.data ?? []) as Lancamento[]).map((x) => ({ ...x, valor: Number(x.valor) })))
      setCategorias((c.data ?? []) as Categoria[])
      setAReceber(
        ((r.data ?? []) as AReceber[]).map((x) => ({
          ...x,
          valor: Number(x.valor),
          recebido: Number(x.recebido),
          saldo: Number(x.saldo),
        })),
      )
    }
    setCarregando(false)
  }, [de, ate])

  useEffect(() => {
    if (ligado) carregar()
  }, [carregar, ligado])
  useAoVivo(['lancamentos', 'pedidos', 'categorias_caixa'], carregar, undefined, ligado)

  const lancar = useCallback(
    async (n: NovoLancamento) => {
      const { data, error } = await supabase.rpc('lancar_caixa', {
        p_tipo: n.tipo,
        p_data: n.data,
        p_valor: n.valor,
        p_categoria: n.categoria,
        p_descricao: n.descricao?.trim() || null,
        p_pedido: n.pedido ?? null,
        p_orcamento: n.orcamento ?? null,
        p_valor_pedido: n.valorPedido ?? null,
      })
      if (error) throw new Error(mensagemErro(error.message))
      await carregar()
      return data as { lancamento: number; pedido: number | null; pedido_criado: boolean; numero: string | null; avisado: boolean }
    },
    [carregar],
  )

  const excluir = useCallback(
    async (id: number) => {
      const { error } = await supabase.rpc('excluir_lancamento', { p_id: id })
      if (error) throw new Error(mensagemErro(error.message))
      await carregar()
    },
    [carregar],
  )

  const salvarCategoria = useCallback(
    async (c: { id?: number; nome: string; tipo: TipoLancamento; ativa?: boolean }) => {
      const nome = c.nome.trim()
      if (!nome) throw new Error('Escreva o nome da categoria.')
      const { error } = c.id
        ? await supabase.from('categorias_caixa').update({ nome, ativa: c.ativa ?? true }).eq('id', c.id)
        : await supabase.from('categorias_caixa').insert({ nome, tipo: c.tipo })
      if (error) {
        throw new Error(
          /duplicate|unique/i.test(error.message) ? 'Já existe uma categoria com esse nome.' : mensagemErro(error.message),
        )
      }
      await carregar()
    },
    [carregar],
  )

  return { lancamentos, categorias, aReceber, carregando, erro, recarregar: carregar, lancar, excluir, salvarCategoria }
}
