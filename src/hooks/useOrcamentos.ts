import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Orcamento, StatusOrcamento } from '@/lib/types'

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

  /**
   * Grava a decisão e desliga o agente para aquele lead.
   *
   * Aprovado  -> lead vira 'orcamento_enviado' (o PDF sai, agente fora)
   * Rejeitado -> lead vira 'com_ramon' (ele assume a conversa na mão)
   *
   * O update em `orcamentos` é o gatilho: é a mudança de status que o
   * Database Webhook do Supabase escuta para disparar o envio do PDF.
   */
  const decidir = useCallback(
    async (o: Orcamento, status: Extract<StatusOrcamento, 'aprovado' | 'rejeitado'>) => {
      const { error } = await supabase
        .from('orcamentos')
        .update({ status, aprovado_em: new Date().toISOString() })
        .eq('orcamento_id', o.orcamento_id)

      if (error) throw new Error(error.message)

      // Rejeitar não mexe na IA: o cliente pode ter outro orçamento em aberto.
      // Para pausar a IA de um cliente, use o botão na tela de Conversas.
      if (o.telefone && status === 'aprovado') {
        await supabase
          .from('leads')
          .update({
            status: 'orcamento_enviado',
            atualizado_em: new Date().toISOString(),
          })
          .eq('telefone', o.telefone)
      }

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