# Painel de Orçamentos — Claro Inox

Aprovação de orçamentos do agente de WhatsApp. O Ramon abre no celular,
confere o que o sistema calculou e aprova ou rejeita.

Vite + React + TypeScript + Tailwind, conversando direto com o Supabase.

---

## Como funciona

O agente do WhatsApp levanta as medidas e chama o `gerar_orcamento` no n8n,
que calcula a peça, cota o frete na Melhor Envio e grava em `orcamentos` com
status `aguardando_aprovacao`. O agente nunca vê o preço.

Este painel lista o que está pendente. Ao aprovar:

1. `orcamentos.status` vira `aprovado` — é o gatilho do envio do PDF
2. `leads.status` vira `orcamento_enviado` — desliga o agente daquele cliente

Ao rejeitar, o lead vira `com_ramon` e ele assume a conversa na mão.

---

## Rodar local

```bash
npm install
cp .env.example .env    # preencher com a URL e a chave anon
npm run dev
```

## Configurar o Supabase

1. Rodar `supabase-rls.sql` no SQL Editor. Ele cria a tabela `perfis`, o trigger
   que gera perfil a cada usuário novo, e as policies. Sem isso o painel conecta
   e não vê nada.

2. Criar o primeiro usuário: **Authentication → Users → Add user**, marcando
   *Auto Confirm User*. Depois promover a admin:

   ```sql
   update public.perfis set papel = 'admin' where email = 'seu@email.com';
   ```

3. Desligar cadastro aberto: **Authentication → Sign In / Providers → Email**,
   desmarcar *Enable signup*. Daí em diante, usuário novo só pela aba Usuários.

4. Publicar a Edge Function de gestão de usuários:

   ```bash
   npx supabase link --project-ref SEU_REF
   npx supabase functions deploy admin-usuarios
   ```

   Ela roda no servidor porque criar usuário exige `service_role`, que não pode
   ir para o navegador. A função confere o JWT de quem chamou e só age se a
   pessoa for admin.

## Papéis

| Papel | Pode |
|---|---|
| `operador` | Aprovar e rejeitar orçamentos |
| `admin` | O mesmo, mais criar, promover e remover usuários |

A aba **Usuários** só aparece para admin. O RLS garante isso do lado do banco
também: mesmo chamando a API na mão, operador não gerencia ninguém.

## Recuperação de senha

O link *Esqueci minha senha* usa o `resetPasswordForEmail` do Supabase e depende
do SMTP configurado no projeto. O SMTP padrão do Supabase tem limite baixo de
envio; para uso real, configurar um em **Project Settings → Auth → SMTP**.

Enquanto isso, um admin pode criar a pessoa de novo com senha provisória.

## Deploy

O workflow em `.github/workflows/deploy.yml` publica no GitHub Pages a cada push
na `main`. Antes do primeiro deploy:

- **Settings → Pages → Source: GitHub Actions**
- **Settings → Secrets and variables → Actions**, criar `VITE_SUPABASE_URL`
  e `VITE_SUPABASE_ANON_KEY`

Vercel e Netlify também funcionam sem ajuste: build `npm run build`, saída `dist`,
e as mesmas duas variáveis de ambiente.

---

## Sobre a chave anon no navegador

A chave anon vai embutida no bundle, e isso é esperado: ela é pública por
natureza. Quem protege os dados é o RLS mais o login. Sem sessão válida, a
chave não lê nada.

O que **não** pode ir para cá é a `service_role`, que ignora RLS. Ela fica
só no n8n.

---

## Estrutura

```
src/
├── lib/
│   ├── supabase.ts     cliente
│   ├── types.ts        contrato do orçamento, espelha o motor de cálculo
│   ├── format.ts       moeda e tempo relativo
│   └── utils.ts        cn()
├── hooks/
│   └── useOrcamentos.ts   busca, realtime e a decisão de aprovar
├── components/
│   ├── OrcamentoCard.tsx
│   ├── Login.tsx
│   └── ui/             button, card, alert
└── App.tsx
```

## Ainda não existe

- Editar o orçamento antes de aprovar (hoje é aprovar ou rejeitar)
- Histórico dos já decididos
- Geração do PDF, que é disparada pelo `enviar_orcamento` no n8n
