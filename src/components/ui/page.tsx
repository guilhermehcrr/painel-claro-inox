import * as React from 'react'
import { cn } from '@/lib/utils'

/** Cabeçalho + conteúdo de cada tela. O menu lateral fica no Shell. */
export function Pagina({
  titulo,
  subtitulo,
  voltar,
  acoes,
  children,
  largura = 'max-w-6xl',
  className,
}: {
  titulo: React.ReactNode
  subtitulo?: React.ReactNode
  voltar?: React.ReactNode
  acoes?: React.ReactNode
  children: React.ReactNode
  largura?: string
  className?: string
}) {
  return (
    <div className={cn('mx-auto w-full px-4 pb-10 pt-5 md:px-8 md:pt-7', largura, className)}>
      <header className="mb-5 flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
        <div className="min-w-0">
          {voltar && <div className="mb-1.5">{voltar}</div>}
          <h1 className="text-[22px] font-semibold leading-tight tracking-tight text-ink md:text-[26px]">
            {titulo}
          </h1>
          {subtitulo && <p className="mt-1 text-[14px] text-muted">{subtitulo}</p>}
        </div>
        {acoes && <div className="flex flex-wrap items-center gap-2">{acoes}</div>}
      </header>
      {children}
    </div>
  )
}

/** Bloco com borda, título opcional e ação à direita */
export function Painel({
  titulo,
  acao,
  children,
  className,
  corpo,
}: {
  titulo?: React.ReactNode
  acao?: React.ReactNode
  children: React.ReactNode
  className?: string
  corpo?: string
}) {
  return (
    <section className={cn('rounded-lg border border-hair bg-card', className)}>
      {(titulo || acao) && (
        <div className="flex items-center justify-between gap-3 border-b border-hair px-4 py-3">
          <h2 className="text-[15px] font-semibold text-ink">{titulo}</h2>
          {acao}
        </div>
      )}
      <div className={corpo}>{children}</div>
    </section>
  )
}

/** Abas simples (sublinhado) */
export function Abas<T extends string>({
  abas,
  atual,
  onTrocar,
  className,
}: {
  abas: { id: T; nome: string; qtd?: number }[]
  atual: T
  onTrocar: (id: T) => void
  className?: string
}) {
  return (
    <div className={cn('flex gap-1 overflow-x-auto border-b border-hair', className)} role="tablist">
      {abas.map((a) => (
        <button
          key={a.id}
          role="tab"
          aria-selected={atual === a.id}
          onClick={() => onTrocar(a.id)}
          className={cn(
            '-mb-px flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2.5 text-[14px] transition-colors',
            atual === a.id ? 'border-indigo font-medium text-ink' : 'border-transparent text-muted hover:text-body',
          )}
        >
          {a.nome}
          {a.qtd != null && a.qtd > 0 && (
            <span className="tnum rounded-full bg-paper px-1.5 text-[12px] text-muted">{a.qtd}</span>
          )}
        </button>
      ))}
    </div>
  )
}

/** Tela vazia que diz o que fazer */
export function Vazio({ titulo, children }: { titulo: string; children?: React.ReactNode }) {
  return (
    <div className="px-4 py-14 text-center">
      <p className="font-medium text-ink">{titulo}</p>
      {children && <div className="mx-auto mt-1 max-w-sm text-[14px] text-muted">{children}</div>}
    </div>
  )
}

export function Erro({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-4 rounded-lg border border-warn/30 bg-warn-tint px-4 py-3 text-[14px] text-warn">{children}</div>
  )
}

export function Carregando() {
  return <p className="py-16 text-center text-[14px] text-faint">Carregando…</p>
}
