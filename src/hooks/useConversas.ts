import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Conversa } from '@/lib/types'

/**
 * Lista de conversas, mais recente primeiro. Atualiza sozinha quando chega
 * mensagem ou quando muda o status de um lead (IA ligada/desligada).
 */
export function useConversas() {
  const [conversas, setConversas] = useState<Conversa[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const espera = useRef<ReturnType<typeof setTimeout>>()

  const carregar = useCallback(async () => {
    const { data, error } = await supabase
      .from('v_conversas')
      .select('*')
      .order('ultima_em', { ascending: false })
      .limit(500)
    if (error) setErro(error.message)
    else {
      setErro(null)
      setConversas((data ?? []) as Conversa[])
    }
    setCarregando(false)
  }, [])

  // Várias mensagens chegando juntas viram uma recarga só
  const agendar = useCallback(() => {
    clearTimeout(espera.current)
    espera.current = setTimeout(carregar, 400)
  }, [carregar])

  // Nome único por instância: canal com nome repetido quebra o realtime
  const canalId = useRef(`conversas-${Math.random().toString(36).slice(2)}`)

  useEffect(() => {
    carregar()
    const canal = supabase
      .channel(canalId.current)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'mensagens' }, agendar)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'leads' }, agendar)
      .subscribe()
    return () => {
      clearTimeout(espera.current)
      supabase.removeChannel(canal)
    }
  }, [carregar, agendar])

  const naoLidas = conversas.reduce((s, c) => s + (c.nao_lidas > 0 ? 1 : 0), 0)

  return { conversas, carregando, erro, recarregar: carregar, naoLidas }
}
