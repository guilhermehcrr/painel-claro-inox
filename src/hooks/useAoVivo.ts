import { useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'

let contador = 0

/**
 * Recarrega quando alguma das tabelas muda no banco (realtime do Supabase).
 * Várias mudanças juntas viram uma recarga só.
 */
export function useAoVivo(tabelas: string[], recarregar: () => void, filtro?: string, ligado = true) {
  const espera = useRef<ReturnType<typeof setTimeout>>()
  const chave = tabelas.join(',')

  useEffect(() => {
    if (!ligado) return
    const agendar = () => {
      clearTimeout(espera.current)
      espera.current = setTimeout(recarregar, 300)
    }
    // Nome novo a cada montagem: canal com nome repetido não registra callback
    let canal = supabase.channel(`vivo-${chave}-${++contador}`)
    for (const table of chave.split(',')) {
      canal = canal.on(
        'postgres_changes',
        { event: '*', schema: 'public', table, ...(filtro ? { filter: filtro } : {}) },
        agendar,
      )
    }
    canal.subscribe()
    return () => {
      clearTimeout(espera.current)
      supabase.removeChannel(canal)
    }
  }, [chave, recarregar, filtro, ligado])
}

/** Mensagem de erro do banco em português claro para a tela */
export function mensagemErro(e: unknown): string {
  const m = e instanceof Error ? e.message : typeof e === 'string' ? e : 'Falhou. Tente de novo.'
  if (/does not exist|schema cache/i.test(m)) {
    return 'Falta rodar o SQL da etapa 5 no Supabase (supabase-etapa5-producao-caixa.sql).'
  }
  if (/permission denied|row-level security/i.test(m)) return 'Seu usuário não tem permissão para isso.'
  if (/Failed to fetch|NetworkError/i.test(m)) return 'Sem conexão com o servidor. Confira a internet.'
  return m
}
