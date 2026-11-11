import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { CategoriaAnexo, PedidoAnexo } from '@/lib/types'
import { mensagemErro, useAoVivo } from './useAoVivo'

const BUCKET = 'anexos'
export const LIMITE_MB = 25

/** Nome do arquivo sem acento nem espaço, para o caminho no Storage */
function nomeSeguro(nome: string) {
  const limpo = nome
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^\w.-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
  return limpo.slice(-80) || 'arquivo'
}

/**
 * Anexos de um pedido (foto, nota fiscal, arquivo). Os arquivos ficam num
 * bucket privado: para abrir, o painel gera um link que vale por 1 hora.
 */
export function useAnexos(pedidoId: number | null) {
  const [anexos, setAnexos] = useState<PedidoAnexo[]>([])
  const [links, setLinks] = useState<Record<string, string>>({})
  const [erro, setErro] = useState<string | null>(null)

  const carregar = useCallback(async () => {
    if (!pedidoId) return
    const { data, error } = await supabase
      .from('pedido_anexos')
      .select('*')
      .eq('pedido_id', pedidoId)
      .order('criado_em', { ascending: false })
    if (error) {
      setErro(mensagemErro(error.message))
      return
    }
    setErro(null)
    const lista = (data ?? []) as PedidoAnexo[]
    setAnexos(lista)
    // Links das fotos para as miniaturas
    const fotos = lista.filter((a) => a.categoria === 'foto' || a.tipo?.startsWith('image/')).map((a) => a.caminho)
    if (fotos.length) {
      const { data: assinados } = await supabase.storage.from(BUCKET).createSignedUrls(fotos, 3600)
      const mapa: Record<string, string> = {}
      for (const s of assinados ?? []) if (s.path && s.signedUrl) mapa[s.path] = s.signedUrl
      setLinks(mapa)
    } else setLinks({})
  }, [pedidoId])

  useEffect(() => {
    setAnexos([])
    setLinks({})
    carregar()
  }, [carregar])
  useAoVivo(['pedido_anexos'], carregar, pedidoId ? `pedido_id=eq.${pedidoId}` : undefined, !!pedidoId)

  /** Sobe o arquivo e registra no pedido. Se o registro falhar, apaga o arquivo. */
  const anexar = useCallback(
    async (arquivo: File, categoria: CategoriaAnexo) => {
      if (!pedidoId) return
      if (arquivo.size > LIMITE_MB * 1024 * 1024) {
        throw new Error(`"${arquivo.name}" passa de ${LIMITE_MB} MB.`)
      }
      const caminho = `pedido/${pedidoId}/${Date.now().toString(36)}-${nomeSeguro(arquivo.name)}`
      const { error: erroEnvio } = await supabase.storage
        .from(BUCKET)
        .upload(caminho, arquivo, { contentType: arquivo.type || undefined, upsert: false })
      if (erroEnvio) throw new Error(mensagemErro(erroEnvio.message))

      const { error } = await supabase.rpc('registrar_anexo', {
        p_pedido: pedidoId,
        p_caminho: caminho,
        p_nome: arquivo.name,
        p_categoria: categoria,
        p_tipo: arquivo.type || null,
        p_tamanho: arquivo.size,
      })
      if (error) {
        await supabase.storage.from(BUCKET).remove([caminho])
        throw new Error(mensagemErro(error.message))
      }
      await carregar()
    },
    [pedidoId, carregar],
  )

  /** Apaga o arquivo e tira da lista (admin, ou quem anexou) */
  const remover = useCallback(
    async (a: PedidoAnexo) => {
      const { error: erroArquivo } = await supabase.storage.from(BUCKET).remove([a.caminho])
      if (erroArquivo) throw new Error(mensagemErro(erroArquivo.message))
      const { error } = await supabase.rpc('remover_anexo', { p_id: a.id })
      if (error) throw new Error(mensagemErro(error.message))
      await carregar()
    },
    [carregar],
  )

  /** Abre numa aba nova com link de 5 minutos */
  const abrir = useCallback(async (a: PedidoAnexo) => {
    // A aba abre antes da espera, senão o navegador bloqueia como pop-up
    const aba = window.open('', '_blank')
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(a.caminho, 300)
    if (error || !data?.signedUrl) {
      aba?.close()
      throw new Error(mensagemErro(error?.message ?? 'Não consegui abrir o arquivo.'))
    }
    if (aba) aba.location.href = data.signedUrl
    else window.location.href = data.signedUrl
  }, [])

  return { anexos, links, erro, anexar, remover, abrir }
}
