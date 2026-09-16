import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { FileText, LogOut, RefreshCw, Users } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { usePerfil } from '@/hooks/usePerfil'
import { useOrcamentos } from '@/hooks/useOrcamentos'
import { OrcamentoCard } from '@/components/OrcamentoCard'
import { Usuarios } from '@/components/Usuarios'
import { Login } from '@/components/Login'
import { DefinirSenha, EsqueciSenha } from '@/components/Senha'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type Aba = 'orcamentos' | 'usuarios'

function Orcamentos() {
  const { itens, carregando, erro, decidir } = useOrcamentos()

  return (
    <main className="mx-auto max-w-2xl px-4 py-4">
      {erro && (
        <div className="mb-4 border border-warn bg-warn-tint p-4 text-[13px] text-warn">
          Não consegui carregar: {erro}
        </div>
      )}
      {carregando && <p className="py-20 text-center text-sm text-faint">Carregando…</p>}
      {!carregando && !itens.length && !erro && (
        <div className="py-20 text-center">
          <p className="font-medium text-ink">Nenhum orçamento pendente</p>
          <p className="mt-1 text-sm text-faint">Tudo aprovado por aqui.</p>
        </div>
      )}
      {itens.map((o) => (
        <OrcamentoCard key={o.orcamento_id} orcamento={o} onDecidir={decidir} />
      ))}
    </main>
  )
}

function Painel({ sessao }: { sessao: Session }) {
  const { perfil, ehAdmin } = usePerfil(sessao.user.id)
  const [aba, setAba] = useState<Aba>('orcamentos')
  const [girando, setGirando] = useState(false)
  const { itens, carregar } = useOrcamentos()

  async function atualizar() {
    setGirando(true)
    await carregar()
    setTimeout(() => setGirando(false), 400)
  }

  return (
    <>
      <header className="sticky top-0 z-10 border-b border-hair bg-card">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            <div className="font-semibold tracking-tight text-ink">
              Claro <span className="text-indigo">Inox</span>
            </div>
            <div className="truncate text-[12px] text-faint">
              {perfil?.nome || sessao.user.email}
              {ehAdmin && ' · admin'}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {aba === 'orcamentos' && (
              <Button variant="ghost" size="icon" onClick={atualizar} aria-label="Atualizar">
                <RefreshCw
                  className={cn('h-4 w-4', girando && 'animate-spin')}
                  strokeWidth={1.75}
                />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => supabase.auth.signOut()}
              aria-label="Sair"
            >
              <LogOut className="h-4 w-4" strokeWidth={1.75} />
            </Button>
          </div>
        </div>

        {ehAdmin && (
          <div className="mx-auto flex max-w-2xl gap-1 px-3 pb-1">
            {(
              [
                ['orcamentos', 'Orçamentos', FileText, itens.length],
                ['usuarios', 'Usuários', Users, 0],
              ] as const
            ).map(([id, rotulo, Icone, qtd]) => (
              <button
                key={id}
                onClick={() => setAba(id)}
                className={cn(
                  'flex items-center gap-1.5 border-b-2 px-3 py-2 text-[13px] transition-colors',
                  aba === id
                    ? 'border-indigo text-indigo'
                    : 'border-transparent text-muted hover:text-body',
                )}
              >
                <Icone className="h-4 w-4" strokeWidth={1.75} />
                {rotulo}
                {qtd > 0 && <span className="tnum font-mono text-[12px]">{qtd}</span>}
              </button>
            ))}
          </div>
        )}
      </header>

      {aba === 'orcamentos' ? <Orcamentos /> : <Usuarios meuId={sessao.user.id} />}
    </>
  )
}

export default function App() {
  const [sessao, setSessao] = useState<Session | null>(null)
  const [checando, setChecando] = useState(true)
  const [tela, setTela] = useState<'login' | 'esqueci' | 'nova-senha'>('login')

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSessao(data.session)
      setChecando(false)
    })
    const { data } = supabase.auth.onAuthStateChange((evento, s) => {
      setSessao(s)
      // Chegou pelo link de recuperação: cai direto na troca de senha.
      if (evento === 'PASSWORD_RECOVERY') setTela('nova-senha')
    })
    return () => data.subscription.unsubscribe()
  }, [])

  if (checando) return null
  if (tela === 'nova-senha') return <DefinirSenha onPronto={() => setTela('login')} />
  if (!sessao) {
    return tela === 'esqueci' ? (
      <EsqueciSenha onVoltar={() => setTela('login')} />
    ) : (
      <Login onEsqueci={() => setTela('esqueci')} />
    )
  }
  return <Painel sessao={sessao} />
}
