import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Insumo, Movimento } from '@/lib/types'
import { emAlerta, ordenarInsumos } from '@/lib/estoque'
import { mensagemErro, useAoVivo } from './useAoVivo'

const numeros = (i: Insumo): Insumo => ({
  ...i,
  custo: Number(i.custo),
  saldo: Number(i.saldo),
  minimo: Number(i.minimo),
  por_compra: i.por_compra == null ? null : Number(i.por_compra),
})

export interface DadosInsumo {
  id?: number
  codigo: string
  nome: string
  tipo: Insumo['tipo']
  unidade: Insumo['unidade']
  por_compra: number | null
  custo: number
  minimo: number
  ativo: boolean
  observacao: string
  /** Só no cadastro: quanto tem hoje */
  saldo_inicial?: number | null
}

export interface ItemCompra {
  insumo: number
  /** Na unidade do insumo (metros, não barras) */
  quantidade: number
  /** R$ por unidade do insumo. Só conta para admin. */
  custo: number | null
}

/** Insumos do estoque, ao vivo. Usado no menu (alerta), no Início e na tela do estoque. */
export function useEstoque() {
  const [insumos, setInsumos] = useState<Insumo[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  const carregar = useCallback(async () => {
    const { data, error } = await supabase.from('insumos').select('*').order('nome')
    if (error) setErro(mensagemErro(error.message))
    else {
      setErro(null)
      setInsumos(ordenarInsumos(((data ?? []) as Insumo[]).map(numeros)))
    }
    setCarregando(false)
  }, [])

  useEffect(() => {
    carregar()
  }, [carregar])
  useAoVivo(['insumos'], carregar)

  const salvarInsumo = useCallback(
    async (d: DadosInsumo) => {
      const { data, error } = await supabase.rpc('salvar_insumo', { p: d })
      if (error) throw new Error(mensagemErro(error.message))
      await carregar()
      return data as number
    },
    [carregar],
  )

  const registrarCompra = useCallback(
    async (itens: ItemCompra[], fornecedor: string, nota: string, observacao: string) => {
      const { data, error } = await supabase.rpc('registrar_entrada', {
        p_itens: itens,
        p_fornecedor: fornecedor.trim() || null,
        p_nota: nota.trim() || null,
        p_observacao: observacao.trim() || null,
      })
      if (error) throw new Error(mensagemErro(error.message))
      await carregar()
      return data as number
    },
    [carregar],
  )

  const registrarContagem = useCallback(
    async (itens: { insumo: number; contado: number }[], justificativa: string) => {
      const { data, error } = await supabase.rpc('registrar_contagem', { p_itens: itens, p_justificativa: justificativa.trim() })
      if (error) throw new Error(mensagemErro(error.message))
      await carregar()
      return data as { contados: number; com_diferenca: number }
    },
    [carregar],
  )

  const alertas = insumos.filter(emAlerta)

  return { insumos, carregando, erro, recarregar: carregar, alertas, salvarInsumo, registrarCompra, registrarContagem }
}

export type Estoque = ReturnType<typeof useEstoque>

/** Movimentações do estoque, mais recentes primeiro. Com insumo: só as dele. */
export function useMovimentos(insumoId?: number | null, limite = 300) {
  const [movimentos, setMovimentos] = useState<Movimento[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  const carregar = useCallback(async () => {
    let q = supabase
      .from('estoque_movimentos')
      .select('*, insumos(nome, unidade, por_compra, tipo, codigo)')
      .order('feito_em', { ascending: false })
      .order('id', { ascending: false })
      .limit(limite)
    if (insumoId) q = q.eq('insumo_id', insumoId)
    const { data, error } = await q
    if (error) setErro(mensagemErro(error.message))
    else {
      setErro(null)
      setMovimentos(
        ((data ?? []) as Movimento[]).map((m) => ({
          ...m,
          quantidade: Number(m.quantidade),
          saldo_antes: Number(m.saldo_antes),
          saldo_depois: Number(m.saldo_depois),
          custo_unitario: m.custo_unitario == null ? null : Number(m.custo_unitario),
          insumos: m.insumos ? { ...m.insumos, por_compra: m.insumos.por_compra == null ? null : Number(m.insumos.por_compra) } : null,
        })),
      )
    }
    setCarregando(false)
  }, [insumoId, limite])

  useEffect(() => {
    carregar()
  }, [carregar])
  useAoVivo(['estoque_movimentos'], carregar, insumoId ? `insumo_id=eq.${insumoId}` : undefined)

  return { movimentos, carregando, erro, recarregar: carregar }
}
