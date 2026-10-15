import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { FileText, LogOut, MessagesSquare, RefreshCw, Users } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { usePerfil } from '@/hooks/usePerfil'
import { useOrcamentos } from '@/hooks/useOrcamentos'
import { useConversas } from '@/hooks/useConversas'
import { OrcamentoCard } from '@/components/OrcamentoCard'
import { Usuarios } from '@/components/Usuarios'
import { Conversas } from '@/components/conversas/Conversas'
import { Login } from '@/components/Login'
import { DefinirSenha, EsqueciSenha } from '@/components/Senha'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type Aba = 'orcamentos' | 'conversas' | 'usuarios'

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
  const conversas = useConversas()

  async function atualizar() {
    setGirando(true)
    await (aba === 'conversas' ? conversas.recarregar() : carregar())
    setTimeout(() => setGirando(false), 400)
  }

  const abas = [
    ['orcamentos', 'Aprovações', FileText, itens.length],
    ['conversas', 'Conversas', MessagesSquare, conversas.naoLidas],
    ...(ehAdmin ? ([['usuarios', 'Usuários', Users, 0]] as const) : []),
  ] as const

  const largura = aba === 'conversas' ? 'max-w-6xl' : 'max-w-2xl'

  return (
    <div className="flex h-dvh flex-col">
      <header className="shrink-0 border-b border-hair bg-card">
        <div className={cn('mx-auto flex items-center justify-between gap-3 px-4 py-3', largura)}>
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
            {aba !== 'usuarios' && (
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

        <nav className={cn('mx-auto flex gap-1 overflow-x-auto px-3', largura)}>
          {abas.map(([id, rotulo, Icone, qtd]) => (
            <button
              key={id}
              onClick={() => setAba(id)}
              className={cn(
                'flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2 text-[13px] transition-colors',
                aba === id
                  ? 'border-indigo text-indigo'
                  : 'border-transparent text-muted hover:text-body',
              )}
            >
              <Icone className="h-4 w-4" strokeWidth={1.75} />
              {rotulo}
              {qtd > 0 && (
                <span
                  className={cn(
                    'tnum rounded-full px-1.5 font-mono text-[11px]',
                    id === 'conversas' ? 'bg-ok text-white' : '',
                  )}
                >
                  {qtd}
                </span>
              )}
            </button>
          ))}
        </nav>
      </header>

      {aba === 'conversas' ? (
        <main className="min-h-0 flex-1">
          <Conversas
            conversas={conversas.conversas}
            carregando={conversas.carregando}
            erro={conversas.erro}
          />
        </main>
      ) : (
        <main className="min-h-0 flex-1 overflow-y-auto">
          {aba === 'orcamentos' ? <Orcamentos /> : <Usuarios meuId={sessao.user.id} />}
        </main>
      )}
    </div>
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
