import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'

export function Login({ onEsqueci }: { onEsqueci: () => void }) {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  async function entrar(e: React.FormEvent) {
    e.preventDefault()
    setEnviando(true)
    setErro(null)
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha })
    if (error) setErro('E-mail ou senha incorretos.')
    setEnviando(false)
  }

  return (
    <div className="flex min-h-dvh items-center justify-center px-5">
      <form onSubmit={entrar} className="w-full max-w-sm">
        <div className="mb-1 text-xl font-semibold tracking-tight text-ink">
          Claro <span className="text-indigo">Inox</span>
        </div>
        <p className="mb-8 text-sm text-muted">Aprovação de orçamentos</p>

        <label className="mb-1.5 block text-[13px] text-muted">E-mail</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="username"
          className="mb-4 h-11 w-full border border-hair bg-card px-3 text-[15px] outline-none focus:border-indigo"
        />

        <label className="mb-1.5 block text-[13px] text-muted">Senha</label>
        <input
          type="password"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          required
          autoComplete="current-password"
          className="mb-6 h-11 w-full border border-hair bg-card px-3 text-[15px] outline-none focus:border-indigo"
        />

        {erro && <p className="mb-4 text-[13px] text-warn">{erro}</p>}

        <Button type="submit" disabled={enviando} className="w-full">
          {enviando ? 'Entrando…' : 'Entrar'}
        </Button>

        <button
          type="button"
          onClick={onEsqueci}
          className="mt-4 w-full text-center text-[13px] text-muted hover:text-indigo"
        >
          Esqueci minha senha
        </button>
      </form>
    </div>
  )
}
