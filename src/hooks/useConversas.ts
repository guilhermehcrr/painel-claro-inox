import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Conversa, Etapa } from '@/lib/types'
import { mensagemErro } from './useAoVivo'

/**
 * Lista de conversas, mais recente primeiro. Atualiza sozinha quando chega
 * mensagem ou quando muda o lead (IA ligada/desligada, fila do funil).
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
      // Antes do SQL da etapa 8 a view não tem a fila: trata como primeiro contato
      setConversas(((data ?? []) as Conversa[]).map((c) => ({ ...c, etapa: c.etapa ?? 'novo' })))
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
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, agendar)
      .subscribe()
    return () => {
      clearTimeout(espera.current)
      supabase.removeChannel(canal)
    }
  }, [carregar, agendar])

  /** Muda a conversa de fila. A tela troca na hora e volta atrás se o banco recusar. */
  const definirEtapa = useCallback(
    async (telefone: string, etapa: Etapa) => {
      let antes: Conversa | undefined
      setConversas((atual) =>
        atual.map((c) => {
          if (c.telefone !== telefone) return c
          antes = c
          return { ...c, etapa, etapa_em: new Date().toISOString() }
        }),
      )
      const { error } = await supabase.rpc('definir_etapa', { p_telefone: telefone, p_etapa: etapa })
      if (error) {
        if (antes) {
          const volta = antes
          setConversas((atual) => atual.map((c) => (c.telefone === telefone ? volta : c)))
        }
        throw new Error(mensagemErro(error.message))
      }
      agendar()
    },
    [agendar],
  )

  const naoLidas = conversas.reduce((s, c) => s + (c.nao_lidas > 0 ? 1 : 0), 0)
  const comRamon = conversas.filter((c) => c.etapa === 'pendencia_ramon').length

  return { conversas, carregando, erro, recarregar: carregar, naoLidas, comRamon, definirEtapa }
}
