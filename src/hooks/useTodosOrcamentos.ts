import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Orcamento } from '@/lib/types'
import { comoObjeto } from '@/lib/json'
import { mensagemErro, useAoVivo } from './useAoVivo'

/** Histórico de orçamentos (todos os status), mais recente primeiro. */
export function useTodosOrcamentos(ligado = true) {
  const [itens, setItens] = useState<Orcamento[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  const carregar = useCallback(async () => {
    const { data, error } = await supabase
      .from('orcamentos')
      .select('*')
      .order('criado_em', { ascending: false })
      .limit(400)
    if (error) setErro(mensagemErro(error.message))
    else {
      setErro(null)
      setItens(
        ((data ?? []) as Orcamento[]).map((o) => ({
          ...o,
          resumo: comoObjeto(o.resumo),
          detalhe: comoObjeto(o.detalhe),
        })),
      )
    }
    setCarregando(false)
  }, [])

  useEffect(() => {
    if (ligado) carregar()
  }, [carregar, ligado])
  useAoVivo(['orcamentos'], carregar, undefined, ligado)

  return { itens, carregando, erro, recarregar: carregar }
}
