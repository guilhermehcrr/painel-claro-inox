import { useEffect, useState } from 'react'

/**
 * Navegação pelo endereço (#/producao, #/pedido/12). Assim o botão voltar do
 * celular funciona, e dá para recarregar a página sem perder onde estava.
 */
export type Pagina =
  | 'inicio' | 'conversas' | 'orcamentos' | 'producao' | 'pedido' | 'calendario' | 'caixa' | 'usuarios'

export interface Rota {
  pagina: Pagina
  id: string | null
}

const PAGINAS: Pagina[] = ['inicio', 'conversas', 'orcamentos', 'producao', 'pedido', 'calendario', 'caixa', 'usuarios']

function ler(): Rota {
  const [p, id] = window.location.hash.replace(/^#\/?/, '').split('/')
  const pagina = (PAGINAS as string[]).includes(p) ? (p as Pagina) : 'inicio'
  return { pagina, id: id ? decodeURIComponent(id) : null }
}

export function irPara(pagina: Pagina, id?: string | number | null) {
  window.location.hash = id != null ? `/${pagina}/${encodeURIComponent(String(id))}` : `/${pagina}`
}

export function useRota() {
  const [rota, setRota] = useState<Rota>(ler)
  useEffect(() => {
    const mudou = () => {
      setRota(ler())
      window.scrollTo(0, 0)
    }
    window.addEventListener('hashchange', mudou)
    return () => window.removeEventListener('hashchange', mudou)
  }, [])
  return rota
}
