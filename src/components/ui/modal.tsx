import * as React from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Janela por cima da tela. No celular sobe de baixo, ocupando a largura toda.
 * Fecha com Esc ou clicando fora.
 */
export function Modal({
  aberto,
  titulo,
  onFechar,
  children,
  rodape,
  largura = 'sm:max-w-lg',
}: {
  aberto: boolean
  titulo: string
  onFechar: () => void
  children: React.ReactNode
  rodape?: React.ReactNode
  largura?: string
}) {
  React.useEffect(() => {
    if (!aberto) return
    const tecla = (e: KeyboardEvent) => e.key === 'Escape' && onFechar()
    document.addEventListener('keydown', tecla)
    const antes = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', tecla)
      document.body.style.overflow = antes
    }
  }, [aberto, onFechar])

  if (!aberto) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label={titulo}>
      <button className="absolute inset-0 bg-ink/40" onClick={onFechar} aria-label="Fechar" tabIndex={-1} />
      <div className={cn('relative flex max-h-[92dvh] w-full flex-col rounded-t-lg bg-card shadow-xl sm:rounded-lg', largura)}>
        <div className="flex items-center justify-between gap-3 border-b border-hair px-5 py-3.5">
          <h2 className="text-[16px] font-semibold text-ink">{titulo}</h2>
          <button onClick={onFechar} className="rounded-md p-1.5 text-muted hover:bg-paper" aria-label="Fechar">
            <X className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {rodape && <div className="flex flex-wrap justify-end gap-2 border-t border-hair px-5 py-3">{rodape}</div>}
      </div>
    </div>
  )
}
