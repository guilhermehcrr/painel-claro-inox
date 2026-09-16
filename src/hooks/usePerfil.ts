import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Perfil } from '@/lib/types'

export function usePerfil(userId: string | undefined) {
  const [perfil, setPerfil] = useState<Perfil | null>(null)
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    if (!userId) {
      setPerfil(null)
      setCarregando(false)
      return
    }
    supabase
      .from('perfis')
      .select('*')
      .eq('id', userId)
      .single()
      .then(({ data }) => {
        setPerfil((data as Perfil) ?? null)
        setCarregando(false)
      })
  }, [userId])

  return { perfil, ehAdmin: perfil?.papel === 'admin', carregando }
}
