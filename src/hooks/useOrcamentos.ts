import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Orcamento, StatusOrcamento } from '@/lib/types'

/**
 * Grava a decisão. Aprovado vira o PDF (o Database Webhook do Supabase escuta a
 * mudança de status e dispara o envio no n8n) e o lead vai para
 * 'orcamento_enviado'. Rejeitar não mexe na IA.
 * Fica fora do hook porque o editor de orçamento também aprova.
 */
export async function decidirOrcamento(
  o: Pick<Orcamento, 'orcamento_id' | 'telefone'>,
  status: Extract<StatusOrcamento, 'aprovado' | 'rejeitado'>,
) {
  const { error } = await supabase
    .from('orcamentos')
    .update({ status, aprovado_em: new Date().toISOString() })
    .eq('orcamento_id', o.orcamento_id)
  if (error) throw new Error(error.message)

  if (o.telefone && status === 'aprovado') {
    await supabase
      .from('leads')
      .update({ status: 'orcamento_enviado', atualizado_em: new Date().toISOString() })
      .eq('telefone', o.telefone)
  }
}

export function useOrcamentos() {
  const [itens, setItens] = useState<Orcamento[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const primeiraCarga = useRef(true)

  const carregar = useCallback(async () => {
    if (primeiraCarga.current) setCarregando(true)
    const { data, error } = await supabase
      .from('orcamentos')
      .select('*')
      .eq('status', 'aguardando_aprovacao')
      .order('criado_em', { ascending: true })

    if (error) setErro(error.message)
    else {
      setErro(null)
      setItens(data as Orcamento[])
    }
    setCarregando(false)
    primeiraCarga.current = false
  }, [])

  /** Grava a decisão (ver decidirOrcamento) e tira o cartão da lista */
  const decidir = useCallback(
    async (o: Orcamento, status: Extract<StatusOrcamento, 'aprovado' | 'rejeitado'>) => {
      await decidirOrcamento(o, status)
      setItens((atual) => atual.filter((x) => x.orcamento_id !== o.orcamento_id))
    },
    [],
  )

  // Realtime: outro dispositivo aprovando some da tela deste aqui.
  //
  // O nome do canal precisa ser único por instância. Nome fixo quebra quando o
  // hook monta duas vezes (StrictMode em dev, ou dois componentes usando ele):
  // o Supabase reaproveita o canal pelo nome e recusa registrar callback depois
  // do subscribe.
  const canalId = useRef(`orcamentos-${Math.random().toString(36).slice(2)}`)

  useEffect(() => {
    carregar()
    const canal = supabase
      .channel(canalId.current)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orcamentos' }, () =>
        carregar(),
      )
      .subscribe()
    return () => {
      supabase.removeChannel(canal)
    }
  }, [carregar])

  return { itens, carregando, erro, carregar, decidir }
}