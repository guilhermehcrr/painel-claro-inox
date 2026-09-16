import { useState } from 'react'
import { Trash2, UserPlus } from 'lucide-react'
import { useUsuarios } from '@/hooks/useUsuarios'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import type { Papel } from '@/lib/types'

const campo =
  'h-11 w-full border border-hair bg-card px-3 text-[15px] outline-none focus:border-indigo'

export function Usuarios({ meuId }: { meuId: string }) {
  const { itens, carregando, erro, criar, trocarPapel, remover } = useUsuarios()
  const [abrindo, setAbrindo] = useState(false)
  const [form, setForm] = useState({ nome: '', email: '', senha: '', papel: 'operador' as Papel })
  const [enviando, setEnviando] = useState(false)
  const [falha, setFalha] = useState<string | null>(null)

  async function adicionar(e: React.FormEvent) {
    e.preventDefault()
    setEnviando(true)
    setFalha(null)
    try {
      await criar(form.email.trim(), form.senha, form.nome.trim(), form.papel)
      setForm({ nome: '', email: '', senha: '', papel: 'operador' })
      setAbrindo(false)
    } catch (e) {
      setFalha(e instanceof Error ? e.message : 'falhou')
    }
    setEnviando(false)
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-4">
      {erro && (
        <div className="mb-4 border border-warn bg-warn-tint p-4 text-[13px] text-warn">{erro}</div>
      )}

      {!abrindo && (
        <Button className="mb-4 w-full" onClick={() => setAbrindo(true)}>
          <UserPlus className="h-4 w-4" strokeWidth={1.75} />
          Novo usuário
        </Button>
      )}

      {abrindo && (
        <Card className="mb-4 p-4">
          <form onSubmit={adicionar} className="space-y-3">
            <div>
              <label className="mb-1.5 block text-[13px] text-muted">Nome</label>
              <input
                className={campo}
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[13px] text-muted">E-mail</label>
              <input
                type="email"
                className={campo}
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[13px] text-muted">Senha provisória</label>
              <input
                className={campo}
                value={form.senha}
                onChange={(e) => setForm({ ...form, senha: e.target.value })}
                minLength={8}
                required
              />
              <p className="mt-1 text-[12px] text-faint">
                Mínimo 8 caracteres. A pessoa troca depois em Esqueci minha senha.
              </p>
            </div>
            <div>
              <label className="mb-1.5 block text-[13px] text-muted">Papel</label>
              <select
                className={campo}
                value={form.papel}
                onChange={(e) => setForm({ ...form, papel: e.target.value as Papel })}
              >
                <option value="operador">Operador, só aprova orçamentos</option>
                <option value="admin">Admin, também gerencia usuários</option>
              </select>
            </div>

            {falha && <p className="text-[13px] text-warn">{falha}</p>}

            <div className="flex gap-2.5 pt-1">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => setAbrindo(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" className="flex-1" disabled={enviando}>
                {enviando ? 'Criando…' : 'Criar'}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {carregando && <p className="py-16 text-center text-sm text-faint">Carregando…</p>}

      {itens.map((u) => (
        <Card key={u.id} className="mb-3 flex items-center gap-3 px-4 py-3">
          <div className="min-w-0 flex-1">
            <div className="truncate font-medium text-ink">{u.nome || u.email}</div>
            <div className="truncate text-[13px] text-muted">{u.email}</div>
          </div>
          {u.id === meuId ? (
            <span className="shrink-0 bg-indigo-tint px-2 py-1 text-[12px] text-indigo">você</span>
          ) : (
            <>
              <select
                className="shrink-0 border border-hair bg-card px-2 py-1.5 text-[13px] outline-none"
                value={u.papel}
                onChange={(e) => trocarPapel(u.id, e.target.value)}
              >
                <option value="operador">Operador</option>
                <option value="admin">Admin</option>
              </select>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Remover"
                onClick={() => {
                  if (window.confirm(`Remover ${u.email}?`)) remover(u.id)
                }}
              >
                <Trash2 className="h-4 w-4" strokeWidth={1.75} />
              </Button>
            </>
          )}
        </Card>
      ))}
    </div>
  )
}
