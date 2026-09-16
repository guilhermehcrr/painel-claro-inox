/**
 * Edge Function: gestao de usuarios do painel.
 *
 * Criar e remover usuario exige a chave service_role, que NAO pode ir para o
 * navegador. Por isso esta funcao roda no servidor do Supabase: ela recebe o
 * JWT de quem chamou, confere se a pessoa e admin, e so entao usa a
 * service_role para agir.
 *
 * Deploy:  supabase functions deploy admin-usuarios
 *
 * SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY sao injetadas automaticamente
 * pelo runtime, nao precisa configurar nada.
 */
import { createClient } from 'jsr:@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  const url = Deno.env.get('SUPABASE_URL')!
  const servico = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const admin = createClient(url, servico, { auth: { persistSession: false } })

  // 1. Quem esta chamando?
  const auth = req.headers.get('Authorization') ?? ''
  const token = auth.replace('Bearer ', '')
  if (!token) return json({ erro: 'sem token' }, 401)

  const { data: { user }, error: erroUser } = await admin.auth.getUser(token)
  if (erroUser || !user) return json({ erro: 'sessao invalida' }, 401)

  // 2. Essa pessoa e admin?
  const { data: perfil } = await admin
    .from('perfis').select('papel').eq('id', user.id).single()

  if (perfil?.papel !== 'admin') return json({ erro: 'apenas admin' }, 403)

  // 3. Agora sim.
  let corpo: { acao?: string; email?: string; nome?: string; papel?: string; id?: string }
  try {
    corpo = await req.json()
  } catch {
    return json({ erro: 'corpo invalido' }, 400)
  }

  const { acao, email, nome, papel, id } = corpo

  try {
    switch (acao) {
      case 'listar': {
        const { data, error } = await admin
          .from('perfis').select('*').order('criado_em', { ascending: true })
        if (error) throw error
        return json(data)
      }

      case 'convidar': {
        if (!email) return json({ erro: 'email obrigatorio' }, 400)
        const redirecionar = req.headers.get('Origin') ?? undefined
        const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
          data: { nome: nome ?? null, papel: papel ?? 'operador' },
          redirectTo: redirecionar,
        })
        if (error) throw error
        return json({ ok: true, usuario: data.user })
      }

      case 'criar': {
        // Alternativa ao convite: define a senha na hora, sem depender de e-mail.
        if (!email || !corpo['senha' as keyof typeof corpo]) {
          return json({ erro: 'email e senha obrigatorios' }, 400)
        }
        const { data, error } = await admin.auth.admin.createUser({
          email,
          password: String(corpo['senha' as keyof typeof corpo]),
          email_confirm: true,
          user_metadata: { nome: nome ?? null, papel: papel ?? 'operador' },
        })
        if (error) throw error
        return json({ ok: true, usuario: data.user })
      }

      case 'papel': {
        if (!id || !papel) return json({ erro: 'id e papel obrigatorios' }, 400)
        if (id === user.id) return json({ erro: 'nao da para mudar o proprio papel' }, 400)
        const { error } = await admin.from('perfis').update({ papel }).eq('id', id)
        if (error) throw error
        return json({ ok: true })
      }

      case 'remover': {
        if (!id) return json({ erro: 'id obrigatorio' }, 400)
        if (id === user.id) return json({ erro: 'nao da para remover a si mesmo' }, 400)
        const { error } = await admin.auth.admin.deleteUser(id)
        if (error) throw error
        return json({ ok: true })
      }

      default:
        return json({ erro: 'acao desconhecida' }, 400)
    }
  } catch (e) {
    return json({ erro: e instanceof Error ? e.message : 'falhou' }, 400)
  }
})
