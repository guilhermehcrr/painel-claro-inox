import * as React from 'react'
import { LogOut, Menu, X, type LucideIcon } from 'lucide-react'
import type { Pagina } from '@/lib/rota'
import { cn } from '@/lib/utils'

export interface ItemMenu {
  id: Pagina
  nome: string
  icone: LucideIcon
  /** Número ao lado do nome (pendências) */
  qtd?: number
  /** Cor do número: verde para mensagens, brasa para atraso */
  tom?: 'ok' | 'warn' | 'neutro'
}

interface Props {
  atual: Pagina
  itens: ItemMenu[]
  nome: string
  papel: string
  onSair: () => void
  /** Conversas ocupa a altura toda, sem rolagem da página */
  cheia?: boolean
  children: React.ReactNode
}

function Marca() {
  return (
    <a href="#/inicio" className="flex items-center gap-2.5 px-2 py-1">
      {/* Chapa de inox escovado: o material que a oficina trabalha */}
      <span
        aria-hidden
        className="grid h-8 w-8 place-items-center rounded-md text-[15px] font-semibold text-grafite"
        style={{ background: 'linear-gradient(135deg,#F4F6F8 0%,#B9C1CA 45%,#E6EAEE 60%,#9AA4AF 100%)' }}
      >
        C
      </span>
      <span className="leading-tight">
        <span className="block text-[15px] font-semibold text-white">Claro Inox</span>
        <span className="block text-[12px] text-grafite-texto">Gestão da oficina</span>
      </span>
    </a>
  )
}

function Itens({ itens, atual, aoClicar }: { itens: ItemMenu[]; atual: Pagina; aoClicar?: () => void }) {
  return (
    <nav className="flex flex-col gap-0.5" aria-label="Menu">
      {itens.map((i) => {
        const ativo = atual === i.id || (atual === 'pedido' && i.id === 'producao')
        const Icone = i.icone
        return (
          <a
            key={i.id}
            href={`#/${i.id}`}
            onClick={aoClicar}
            aria-current={ativo ? 'page' : undefined}
            className={cn(
              'relative flex items-center gap-3 rounded-md px-3 py-2 text-[14px] transition-colors',
              ativo ? 'bg-grafite-2 font-medium text-white' : 'text-grafite-texto hover:bg-grafite-2/60 hover:text-white',
            )}
          >
            {ativo && <span className="absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-[#7FA4E0]" />}
            <Icone className="h-[18px] w-[18px] shrink-0" strokeWidth={1.75} />
            <span className="flex-1">{i.nome}</span>
            {!!i.qtd && (
              <span
                className={cn(
                  'tnum min-w-[22px] rounded-full px-1.5 text-center text-[12px] font-medium',
                  i.tom === 'ok' && 'bg-ok text-white',
                  i.tom === 'warn' && 'bg-warn text-white',
                  (!i.tom || i.tom === 'neutro') && 'bg-grafite-3 text-white',
                )}
              >
                {i.qtd}
              </span>
            )}
          </a>
        )
      })}
    </nav>
  )
}

function Usuario({ nome, papel, onSair }: { nome: string; papel: string; onSair: () => void }) {
  return (
    <div className="flex items-center gap-3 border-t border-grafite-3 px-3 pt-4">
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-grafite-3 text-[13px] font-medium text-white">
        {nome.slice(0, 1).toUpperCase()}
      </span>
      <span className="min-w-0 flex-1 leading-tight">
        <span className="block truncate text-[14px] text-white">{nome}</span>
        <span className="block text-[12px] text-grafite-texto">{papel}</span>
      </span>
      <button
        onClick={onSair}
        className="rounded-md p-2 text-grafite-texto hover:bg-grafite-2 hover:text-white"
        aria-label="Sair"
        title="Sair"
      >
        <LogOut className="h-4 w-4" strokeWidth={1.75} />
      </button>
    </div>
  )
}

export function Shell({ atual, itens, nome, papel, onSair, cheia, children }: Props) {
  const [aberto, setAberto] = React.useState(false)
  const atualItem = itens.find((i) => i.id === atual || (atual === 'pedido' && i.id === 'producao'))
  const pendencias = itens.reduce((s, i) => s + (i.qtd ?? 0), 0)

  React.useEffect(() => setAberto(false), [atual])

  return (
    <div className="flex h-dvh bg-paper">
      {/* Menu lateral (computador) */}
      <aside className="hidden w-60 shrink-0 flex-col gap-6 bg-grafite px-3 py-5 md:flex">
        <Marca />
        <div className="min-h-0 flex-1 overflow-y-auto">
          <Itens itens={itens} atual={atual} />
        </div>
        <Usuario nome={nome} papel={papel} onSair={onSair} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Barra de cima (celular) */}
        <header className="flex h-14 shrink-0 items-center gap-2 bg-grafite px-2 md:hidden">
          <button
            onClick={() => setAberto(true)}
            className="relative rounded-md p-2.5 text-white"
            aria-label="Abrir menu"
          >
            <Menu className="h-5 w-5" strokeWidth={1.75} />
            {pendencias > 0 && <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-[#7FA4E0]" />}
          </button>
          <a href="#/inicio" className="flex-1 truncate text-[16px] font-semibold text-white">Claro Inox</a>
          {atualItem && <span className="truncate pr-2 text-[13px] text-grafite-texto">{atualItem.nome}</span>}
        </header>

        <main className={cn('min-h-0 flex-1', cheia ? 'flex flex-col' : 'overflow-y-auto')}>{children}</main>
      </div>

      {/* Gaveta do menu (celular) */}
      {aberto && (
        <div className="fixed inset-0 z-40 md:hidden">
          <button className="absolute inset-0 bg-ink/50" onClick={() => setAberto(false)} aria-label="Fechar menu" />
          <aside className="relative flex h-full w-72 max-w-[85%] flex-col gap-6 bg-grafite px-3 py-4">
            <div className="flex items-center justify-between">
              <Marca />
              <button onClick={() => setAberto(false)} className="rounded-md p-2 text-grafite-texto" aria-label="Fechar menu">
                <X className="h-5 w-5" strokeWidth={1.75} />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
              <Itens itens={itens} atual={atual} aoClicar={() => setAberto(false)} />
            </div>
            <Usuario nome={nome} papel={papel} onSair={onSair} />
          </aside>
        </div>
      )}
    </div>
  )
}
