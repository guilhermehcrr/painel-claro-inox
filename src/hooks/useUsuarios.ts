import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Perfil } from '@/lib/types'

/** Tudo aqui passa pela Edge Function, que é quem tem a service_role. */
async function chamar<T>(corpo: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke('admin-usuarios', { body: corpo })
  if (error) {
    const detalhe = (data as { erro?: string } | null)?.erro
    throw new Error(detalhe || error.message)
  }
  if (data && typeof data === 'object' && 'erro' in data) {
    throw new Error(String((data as { erro: string }).erro))
  }
  return data as T
}

export function useUsuarios() {
  const [itens, setItens] = useState<Perfil[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  const carregar = useCallback(async () => {
    setCarregando(true)
    try {
      setItens(await chamar<Perfil[]>({ acao: 'listar' }))
      setErro(null)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'falhou')
    }
    setCarregando(false)
  }, [])

  useEffect(() => {
    carregar()
  }, [carregar])

  return {
    itens,
    carregando,
    erro,
    carregar,
    criar: async (email: string, senha: string, nome: string, papel: string) => {
      await chamar({ acao: 'criar', email, senha, nome, papel })
      await carregar()
    },
    convidar: async (email: string, nome: string, papel: string) => {
      await chamar({ acao: 'convidar', email, nome, papel })
      await carregar()
    },
    trocarPapel: async (id: string, papel: string) => {
      await chamar({ acao: 'papel', id, papel })
      await carregar()
    },
    remover: async (id: string) => {
      await chamar({ acao: 'remover', id })
      await carregar()
    },
  }
}
