import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Estagio, Pedido, PedidoEvento } from '@/lib/types'
import { comoObjeto } from '@/lib/json'
import { mensagemErro, useAoVivo } from './useAoVivo'

const normalizar = (p: Pedido): Pedido => ({
  ...p,
  valor: Number(p.valor ?? 0),
  resumo: comoObjeto(p.resumo),
  detalhe: comoObjeto(p.detalhe),
})

/** Todos os pedidos (os da oficina e os já entregues), atualizando sozinho. */
export function usePedidos() {
  const [pedidos, setPedidos] = useState<Pedido[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  const carregar = useCallback(async () => {
    const { data, error } = await supabase
      .from('pedidos')
      .select('*')
      .order('criado_em', { ascending: false })
      .limit(1000)
    if (error) setErro(mensagemErro(error.message))
    else {
      setErro(null)
      setPedidos(((data ?? []) as Pedido[]).map(normalizar))
    }
    setCarregando(false)
  }, [])

  useEffect(() => {
    carregar()
  }, [carregar])
  useAoVivo(['pedidos'], carregar)

  const mudarEstagio = useCallback(
    async (id: number, estagio: Estagio, rastreio?: string) => {
      const { error } = await supabase.rpc('mudar_estagio', {
        p_pedido: id,
        p_estagio: estagio,
        p_rastreio: rastreio?.trim() || null,
      })
      if (error) throw new Error(mensagemErro(error.message))
      await carregar()
    },
    [carregar],
  )

  const salvar = useCallback(
    async (id: number, dataEntrega: string | null, observacoes: string | null) => {
      const { error } = await supabase.rpc('salvar_pedido', {
        p_pedido: id,
        p_data_entrega: dataEntrega || null,
        p_observacoes: observacoes ?? null,
      })
      if (error) throw new Error(mensagemErro(error.message))
      await carregar()
    },
    [carregar],
  )

  const salvarRastreio = useCallback(
    async (id: number, codigo: string) => {
      const { error } = await supabase.rpc('salvar_rastreio', { p_pedido: id, p_codigo: codigo.trim() || null })
      if (error) throw new Error(mensagemErro(error.message))
      await carregar()
    },
    [carregar],
  )

  const salvarValor = useCallback(
    async (id: number, valor: number) => {
      const { error } = await supabase.rpc('salvar_valor_pedido', { p_pedido: id, p_valor: valor })
      if (error) throw new Error(mensagemErro(error.message))
      await carregar()
    },
    [carregar],
  )

  return { pedidos, carregando, erro, recarregar: carregar, mudarEstagio, salvar, salvarValor, salvarRastreio }
}

export interface SituacaoAviso {
  wa_id: string | null
  criado_em: string
}

/** Histórico de um pedido, com a situação de cada aviso mandado ao cliente. */
export function useEventos(pedidoId: number | null, telefone: string | null) {
  const [eventos, setEventos] = useState<PedidoEvento[]>([])
  const [avisos, setAvisos] = useState<Record<number, SituacaoAviso>>({})

  const carregar = useCallback(async () => {
    if (!pedidoId) return
    const { data } = await supabase
      .from('pedido_eventos')
      .select('*')
      .eq('pedido_id', pedidoId)
      .order('criado_em', { ascending: false })
      .order('id', { ascending: false })
    const lista = (data ?? []) as PedidoEvento[]
    setEventos(lista)
    const ids = lista.map((e) => e.mensagem_id).filter((x): x is number => x != null)
    if (ids.length) {
      const { data: msgs } = await supabase.from('mensagens').select('id, wa_id, criado_em').in('id', ids)
      const mapa: Record<number, SituacaoAviso> = {}
      for (const m of (msgs ?? []) as { id: number; wa_id: string | null; criado_em: string }[]) {
        mapa[m.id] = { wa_id: m.wa_id, criado_em: m.criado_em }
      }
      setAvisos(mapa)
    }
  }, [pedidoId])

  useEffect(() => {
    setEventos([])
    setAvisos({})
    carregar()
  }, [carregar])
  useAoVivo(['pedido_eventos'], carregar, pedidoId ? `pedido_id=eq.${pedidoId}` : undefined, !!pedidoId)
  // O ✓ do aviso chega quando o eco do WhatsApp atualiza a mensagem
  useAoVivo(['mensagens'], carregar, telefone ? `telefone=eq.${telefone}` : undefined, !!telefone)

  return { eventos, avisos }
}

/** Textos dos avisos automáticos, para mostrar antes de mudar o estágio. */
export function useTextosAviso() {
  const [textos, setTextos] = useState<Record<string, string>>({})
  useEffect(() => {
    supabase
      .from('avisos_pedido')
      .select('estagio, texto, ativo')
      .then(({ data }) => {
        const m: Record<string, string> = {}
        for (const a of (data ?? []) as { estagio: string; texto: string; ativo: boolean }[]) {
          if (a.ativo) m[a.estagio] = a.texto
        }
        setTextos(m)
      })
  }, [])
  return textos
}
