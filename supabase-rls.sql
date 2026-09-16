-- =============================================================================
-- Politicas de acesso e perfis de usuario do painel
--
-- O painel roda no navegador com a chave ANON, que respeita RLS. Sem isto ele
-- conecta mas nao ve nada, porque as tabelas estao com RLS ligado e sem policy.
-- O n8n usa service_role e ignora tudo isto.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- perfis: quem pode entrar e com que papel.
-- Uma linha por usuario do Supabase Auth, criada automaticamente no cadastro.
-- -----------------------------------------------------------------------------
create table if not exists public.perfis (
  id         uuid primary key references auth.users(id) on delete cascade,
  email      text not null,
  nome       text,
  papel      text not null default 'operador',
  criado_em  timestamptz not null default now(),

  constraint perfis_papel_valido check (papel in ('admin', 'operador'))
);

comment on column public.perfis.papel is
  'admin = aprova orcamentos e gerencia usuarios. operador = so aprova.';

-- Toda vez que nasce um usuario no Auth, nasce o perfil junto.
create or replace function public.criar_perfil()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.perfis (id, email, nome, papel)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'nome', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data ->> 'papel', 'operador')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists ao_criar_usuario on auth.users;
create trigger ao_criar_usuario
  after insert on auth.users
  for each row execute function public.criar_perfil();

-- Helper: o usuario atual e admin?
create or replace function public.eh_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.perfis
    where id = auth.uid() and papel = 'admin'
  );
$$;

-- -----------------------------------------------------------------------------
-- Policies
-- -----------------------------------------------------------------------------
alter table public.perfis enable row level security;

drop policy if exists "ve o proprio perfil" on public.perfis;
create policy "ve o proprio perfil"
  on public.perfis for select to authenticated
  using (id = auth.uid() or public.eh_admin());

drop policy if exists "admin edita perfis" on public.perfis;
create policy "admin edita perfis"
  on public.perfis for update to authenticated
  using (public.eh_admin()) with check (public.eh_admin());

drop policy if exists "painel le orcamentos" on public.orcamentos;
create policy "painel le orcamentos"
  on public.orcamentos for select to authenticated using (true);

drop policy if exists "painel atualiza orcamentos" on public.orcamentos;
create policy "painel atualiza orcamentos"
  on public.orcamentos for update to authenticated using (true) with check (true);

drop policy if exists "painel le leads" on public.leads;
create policy "painel le leads"
  on public.leads for select to authenticated using (true);

drop policy if exists "painel atualiza leads" on public.leads;
create policy "painel atualiza leads"
  on public.leads for update to authenticated using (true) with check (true);

-- Realtime: sem isto o painel nao recebe mudancas em tempo real.
alter publication supabase_realtime add table public.orcamentos;

-- =============================================================================
-- PRIMEIRO ADMIN
--
-- 1) Crie o usuario em Authentication > Users > Add user, marcando
--    "Auto Confirm User". O trigger acima cria o perfil como 'operador'.
--
-- 2) Promova a admin trocando o e-mail abaixo:
--
--    update public.perfis set papel = 'admin'
--    where email = 'claroinoxramon@gmail.com';
--
-- 3) Desligue o cadastro aberto, senao qualquer um cria conta e ve os precos:
--    Authentication > Sign In / Providers > Email > desmarcar "Enable signup".
--    A partir dai, usuario novo so pelo painel, na aba Usuarios.
-- =============================================================================
