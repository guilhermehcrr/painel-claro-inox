import { useState } from 'react'
import { Check, Pencil, Plus, X } from 'lucide-react'
import type { Categoria, TipoLancamento } from '@/lib/types'
import { mensagemErro } from '@/hooks/useAoVivo'
import { Painel } from '@/components/ui/page'
import { Entrada } from '@/components/ui/campo'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type Salvar = (c: { id?: number; nome: string; tipo: TipoLancamento; ativa?: boolean }) => Promise<void>

function Linha({ c, salvar, onErro }: { c: Categoria; salvar: Salvar; onErro: (m: string) => void }) {
  const [editando, setEditando] = useState(false)
  const [nome, setNome] = useState(c.nome)

  async function gravar(dados: { nome?: string; ativa?: boolean }) {
    try {
      await salvar({ id: c.id, tipo: c.tipo, nome: dados.nome ?? c.nome, ativa: dados.ativa ?? c.ativa })
      setEditando(false)
    } catch (e) {
      onErro(mensagemErro(e))
    }
  }

  return (
    <li className="flex items-center gap-2 border-b border-hair px-4 py-2 last:border-b-0">
      {editando ? (
        <>
          <Entrada value={nome} onChange={(e) => setNome(e.target.value)} className="h-8 flex-1" autoFocus
            onKeyDown={(e) => e.key === 'Enter' && gravar({ nome })} />
          <button onClick={() => gravar({ nome })} className="rounded p-1.5 text-ok hover:bg-ok-tint" aria-label="Salvar nome">
            <Check className="h-4 w-4" strokeWidth={2} />
          </button>
          <button onClick={() => { setNome(c.nome); setEditando(false) }} className="rounded p-1.5 text-muted hover:bg-paper" aria-label="Cancelar">
            <X className="h-4 w-4" strokeWidth={2} />
          </button>
        </>
      ) : (
        <>
          <span className={cn('flex-1 text-[14px]', c.ativa ? 'text-ink' : 'text-faint line-through')}>{c.nome}</span>
          <button onClick={() => setEditando(true)} className="rounded p-1.5 text-faint hover:bg-paper hover:text-body" aria-label={`Renomear ${c.nome}`}>
            <Pencil className="h-3.5 w-3.5" strokeWidth={1.75} />
          </button>
          <button onClick={() => gravar({ ativa: !c.ativa })} className="w-16 text-right text-[13px] text-muted hover:text-ink">
            {c.ativa ? 'Desativar' : 'Ativar'}
          </button>
        </>
      )}
    </li>
  )
}

function Grupo({ tipo, categorias, salvar }: { tipo: TipoLancamento; categorias: Categoria[]; salvar: Salvar }) {
  const [nova, setNova] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const lista = categorias.filter((c) => c.tipo === tipo).sort((a, b) => Number(b.ativa) - Number(a.ativa) || a.nome.localeCompare(b.nome))

  async function adicionar(e: React.FormEvent) {
    e.preventDefault()
    setErro(null)
    try {
      await salvar({ nome: nova, tipo })
      setNova('')
    } catch (e) {
      setErro(mensagemErro(e))
    }
  }

  return (
    <Painel titulo={tipo === 'entrada' ? 'Categorias de entrada' : 'Categorias de saída'}>
      <ul>
        {lista.map((c) => (
          <Linha key={c.id} c={c} salvar={salvar} onErro={setErro} />
        ))}
      </ul>
      <form onSubmit={adicionar} className="flex gap-2 border-t border-hair px-4 py-3">
        <Entrada value={nova} onChange={(e) => setNova(e.target.value)} placeholder="Nova categoria" className="h-9 flex-1" />
        <Button size="sm" type="submit" variant="outline" disabled={!nova.trim()}>
          <Plus className="h-4 w-4" strokeWidth={2} />
          Adicionar
        </Button>
      </form>
      {erro && <p className="px-4 pb-3 text-[13px] text-warn">{erro}</p>}
    </Painel>
  )
}

export function Categorias({ categorias, salvar }: { categorias: Categoria[]; salvar: Salvar }) {
  return (
    <>
      <p className="mb-4 max-w-2xl text-[14px] text-muted">
        Categoria desativada some da lista de novos lançamentos, mas os lançamentos antigos continuam com ela.
      </p>
      <div className="grid gap-4 md:grid-cols-2">
        <Grupo tipo="entrada" categorias={categorias} salvar={salvar} />
        <Grupo tipo="saida" categorias={categorias} salvar={salvar} />
      </div>
    </>
  )
}
