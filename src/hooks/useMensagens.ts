import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Mensagem } from '@/lib/types'

/**
 * Mensagens de uma conversa, em tempo real, mais as ações da tela:
 * responder, ligar/desligar a IA e marcar como lida.
 */
export function useMensagens(telefone: string | null) {
  const [mensagens, setMensagens] = useState<Mensagem[]>([])
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const canalBase = useRef(Math.random().toString(36).slice(2))

  useEffect(() => {
    setMensagens([])
    setErro(null)
    if (!telefone) return

    let vivo = true
    setCarregando(true)
    supabase
      .from('mensagens')
      .select('*')
      .eq('telefone', telefone)
      .order('criado_em', { ascending: false })
      .order('id', { ascending: false })
      .limit(400)
      .then(({ data, error }) => {
        if (!vivo) return
        if (error) setErro(error.message)
        else setMensagens(((data ?? []) as Mensagem[]).reverse())
        setCarregando(false)
      })

    // Mensagem nova ou atualizada (ex.: transcrição do áudio chegou) entra na hora
    const canal = supabase
      .channel(`msg-${telefone}-${canalBase.current}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'mensagens', filter: `telefone=eq.${telefone}` },
        (p) => {
          if (p.eventType === 'DELETE') {
            const id = (p.old as Partial<Mensagem>).id
            setMensagens((atual) => atual.filter((m) => m.id !== id))
            return
          }
          const nova = p.new as Mensagem
          setMensagens((atual) => {
            const i = atual.findIndex((m) => m.id === nova.id)
            if (i >= 0) {
              const copia = atual.slice()
              copia[i] = nova
              return copia
            }
            return [...atual, nova].sort(
              (a, b) => a.criado_em.localeCompare(b.criado_em) || a.id - b.id,
            )
          })
        },
      )
      .subscribe()

    return () => {
      vivo = false
      supabase.removeChannel(canal)
    }
  }, [telefone])

  const responder = useCallback(
    async (texto: string) => {
      if (!telefone) return
      const { data, error } = await supabase.functions.invoke('enviar-whatsapp', {
        body: { telefone, texto },
      })
      if (error) {
        // A função devolve { erro } no corpo; o supabase-js põe a resposta em error.context
        let msg = error.message
        try {
          const corpo = await (error as { context?: Response }).context?.json()
          if (corpo?.erro) msg = corpo.erro
        } catch {
          /* mantém a mensagem genérica */
        }
        throw new Error(msg)
      }
      if (data?.erro) throw new Error(data.erro)
    },
    [telefone],
  )

  const definirIA = useCallback(
    async (ligada: boolean) => {
      if (!telefone) return
      const { error } = await supabase.rpc('definir_ia', { p_telefone: telefone, p_ligada: ligada })
      if (error) throw new Error(error.message)
    },
    [telefone],
  )

  const marcarLida = useCallback(async () => {
    if (!telefone) return
    await supabase.rpc('marcar_lida', { p_telefone: telefone })
  }, [telefone])

  return { mensagens, carregando, erro, responder, definirIA, marcarLida }
}
