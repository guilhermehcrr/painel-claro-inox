import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'

const campo =
  'h-11 w-full border border-hair bg-card px-3 text-[15px] outline-none focus:border-indigo'

/** Pede o link de recuperação. Funciona com a chave anon, sem backend. */
export function EsqueciSenha({ onVoltar }: { onVoltar: () => void }) {
  const [email, setEmail] = useState('')
  const [enviado, setEnviado] = useState(false)
  const [enviando, setEnviando] = useState(false)

  async function pedir(e: React.FormEvent) {
    e.preventDefault()
    setEnviando(true)
    await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin })
    // Nunca revelamos se o e-mail existe: isso vira lista de usuários válidos.
    setEnviado(true)
    setEnviando(false)
  }

  if (enviado) {
    return (
      <div className="flex min-h-dvh items-center justify-center px-5">
        <div className="w-full max-w-sm">
          <p className="mb-2 font-medium text-ink">Link enviado</p>
          <p className="mb-6 text-sm text-muted">
            Se existir uma conta com esse e-mail, o link de troca de senha chega em instantes.
          </p>
          <Button variant="outline" className="w-full" onClick={onVoltar}>
            Voltar
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-dvh items-center justify-center px-5">
      <form onSubmit={pedir} className="w-full max-w-sm">
        <p className="mb-1 font-medium text-ink">Esqueci minha senha</p>
        <p className="mb-6 text-sm text-muted">Enviamos um link para você criar uma nova.</p>
        <input
          type="email"
          className={`${campo} mb-5`}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="seu@email.com"
          required
        />
        <Button type="submit" className="mb-2 w-full" disabled={enviando}>
          {enviando ? 'Enviando…' : 'Enviar link'}
        </Button>
        <Button type="button" variant="ghost" className="w-full" onClick={onVoltar}>
          Voltar
        </Button>
      </form>
    </div>
  )
}

/** Mostrada quando o usuário volta pelo link de recuperação. */
export function DefinirSenha({ onPronto }: { onPronto: () => void }) {
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  async function salvar(e: React.FormEvent) {
    e.preventDefault()
    setEnviando(true)
    setErro(null)
    const { error } = await supabase.auth.updateUser({ password: senha })
    if (error) setErro(error.message)
    else onPronto()
    setEnviando(false)
  }

  return (
    <div className="flex min-h-dvh items-center justify-center px-5">
      <form onSubmit={salvar} className="w-full max-w-sm">
        <p className="mb-1 font-medium text-ink">Criar nova senha</p>
        <p className="mb-6 text-sm text-muted">Mínimo de 8 caracteres.</p>
        <input
          type="password"
          className={`${campo} mb-5`}
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          minLength={8}
          autoComplete="new-password"
          required
        />
        {erro && <p className="mb-4 text-[13px] text-warn">{erro}</p>}
        <Button type="submit" className="w-full" disabled={enviando}>
          {enviando ? 'Salvando…' : 'Salvar'}
        </Button>
      </form>
    </div>
  )
}
