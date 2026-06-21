-- ============================================================================
-- FINGEST - Schema do banco de dados COM AUTENTICACAO (Supabase / PostgreSQL)
-- Execute este script completo no SQL Editor do Supabase (Project > SQL Editor)
--
-- IMPORTANTE: Este script substitui o supabase_schema.sql anterior (sem login).
-- Se voce ja executou o script antigo, pode rodar este por cima com seguranca -
-- ele recria as tabelas do zero.
-- ============================================================================

-- Limpa tabelas existentes (seguro re-executar este script do zero)
drop table if exists audit_logs cascade;
drop table if exists transactions cascade;
drop table if exists investments cascade;
drop table if exists budgets cascade;
drop table if exists bank_accounts cascade;
drop table if exists cost_centers cascade;
drop table if exists subcategories cascade;
drop table if exists categories cascade;
drop table if exists projects cascade;
drop table if exists funders cascade;
drop table if exists profiles cascade;

-- ============================================================================
-- PERFIS DE USUARIO (vinculados ao Supabase Auth)
-- ============================================================================
-- A tabela auth.users e gerenciada automaticamente pelo Supabase Auth (e-mail,
-- senha com hash, etc). Aqui guardamos apenas o nome e o papel (role) de cada
-- usuario, vinculado por id ao auth.users.

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  role text not null default 'Usuario' check (role in ('Administrador', 'Usuario')),
  active boolean default true,
  created_at timestamptz default now()
);

-- Cria automaticamente um registro em profiles quando um novo usuario se
-- cadastra via convite (Auth). O papel default e 'Usuario' - o Administrador
-- pode promover depois pela tela de Usuarios.
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'role', 'Usuario')
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ── FINANCIADORES ──────────────────────────────────────────────────────────
create table funders (
  id text primary key,
  name text not null,
  type text,
  active boolean default true,
  budget numeric default 0,
  created_at timestamptz default now()
);

-- ── PROJETOS ────────────────────────────────────────────────────────────────
create table projects (
  id text primary key,
  name text not null,
  funder_id text references funders(id),
  status text default 'Ativo',
  start_date date,
  end_date date,
  created_at timestamptz default now()
);

-- ── CATEGORIAS E SUBCATEGORIAS ──────────────────────────────────────────────
create table categories (
  name text primary key
);

create table subcategories (
  id bigint generated always as identity primary key,
  category text references categories(name),
  name text not null
);

-- ── CENTROS DE CUSTO ────────────────────────────────────────────────────────
create table cost_centers (
  id text primary key,
  name text not null
);

-- ── CONTAS BANCARIAS ────────────────────────────────────────────────────────
create table bank_accounts (
  id text primary key,
  name text not null,
  funder_id text references funders(id)
);

-- ── LANCAMENTOS (MOVIMENTOS) ────────────────────────────────────────────────
create table transactions (
  id text primary key,
  date date not null,
  competence text,
  funder_id text references funders(id),
  project_id text references projects(id),
  cost_center_id text references cost_centers(id),
  bank_account_id text references bank_accounts(id),
  source text,
  type text not null,
  category text,
  subcategory text,
  description text,
  document text,
  planned numeric default 0,
  realized numeric default 0,
  status text default 'Previsto',
  user_id uuid references profiles(id),
  notes text,
  created_at timestamptz default now()
);

-- ── ORCAMENTO ───────────────────────────────────────────────────────────────
create table budgets (
  id text primary key,
  project_id text references projects(id),
  funder_id text references funders(id),
  category text,
  approved numeric default 0,
  revised numeric default 0,
  created_at timestamptz default now()
);

-- ── RENDIMENTOS (APLICACOES) ────────────────────────────────────────────────
create table investments (
  id text primary key,
  date date not null,
  account text,
  funder_id text references funders(id),
  initial_balance numeric default 0,
  deposit numeric default 0,
  monthly_rate numeric default 0,
  yield_amount numeric default 0,
  withdrawal numeric default 0,
  notes text,
  created_at timestamptz default now()
);

-- ── AUDITORIA ───────────────────────────────────────────────────────────────
create table audit_logs (
  id text primary key,
  date text not null,
  user_id uuid references profiles(id),
  user_name text,
  table_name text,
  operation text,
  record text,
  description text,
  created_at timestamptz default now()
);

-- ============================================================================
-- DADOS INICIAIS (categorias, subcategorias e centros de custo padrao)
-- ============================================================================

insert into categories (name) values
  ('Pessoal'), ('Custeio'), ('Serviços'), ('Viagens'),
  ('Equipamentos'), ('Transferências'), ('Outros');

insert into subcategories (category, name) values
  ('Pessoal', 'Salários'), ('Pessoal', 'Encargos Sociais'), ('Pessoal', 'Benefícios'),
  ('Custeio', 'Material de Escritório'), ('Custeio', 'Comunicação'), ('Custeio', 'Locação'),
  ('Serviços', 'Consultoria'), ('Serviços', 'Auditoria'), ('Serviços', 'Assessoria'),
  ('Viagens', 'Passagens'), ('Viagens', 'Hospedagem'), ('Viagens', 'Diárias'),
  ('Equipamentos', 'Aquisição'), ('Equipamentos', 'Manutenção'),
  ('Transferências', 'Repasse a Parceiros'),
  ('Outros', 'Despesas Diversas');

insert into cost_centers (id, name) values
  ('CC001', 'Administrativo'),
  ('CC002', 'Projetos'),
  ('CC003', 'Comunicação'),
  ('CC004', 'Financeiro');

-- Nenhum usuario, financiador, projeto, conta, lancamento, orcamento, rendimento
-- ou log de auditoria e inserido aqui. O primeiro usuario (Administrador) e
-- criado manualmente no painel do Supabase - ver Etapa 1.5 do guia.

-- ============================================================================
-- FUNCAO AUXILIAR: verifica se o usuario logado e Administrador
-- ============================================================================
create or replace function public.is_admin()
returns boolean as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'Administrador' and active = true
  );
$$ language sql security definer stable;

create or replace function public.is_active_user()
returns boolean as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and active = true
  );
$$ language sql security definer stable;

-- ============================================================================
-- ROW LEVEL SECURITY
-- Agora exige usuario autenticado E ativo (is_active_user) para qualquer
-- leitura/escrita nas tabelas operacionais. A tabela profiles tem regras
-- proprias: qualquer usuario ve todos os perfis (para listar responsaveis),
-- mas so o Administrador pode criar/editar/desativar outros perfis.
-- ============================================================================

alter table profiles enable row level security;
alter table funders enable row level security;
alter table projects enable row level security;
alter table categories enable row level security;
alter table subcategories enable row level security;
alter table cost_centers enable row level security;
alter table bank_accounts enable row level security;
alter table transactions enable row level security;
alter table budgets enable row level security;
alter table investments enable row level security;
alter table audit_logs enable row level security;

-- ── profiles: leitura por qualquer usuario logado; escrita so por admin ────
create policy "profiles_select_logged_in" on profiles
  for select using (auth.uid() is not null);
create policy "profiles_update_admin_or_self" on profiles
  for update using (is_admin() or id = auth.uid());
create policy "profiles_insert_admin" on profiles
  for insert with check (is_admin());
create policy "profiles_delete_admin" on profiles
  for delete using (is_admin());

-- ── tabelas operacionais: qualquer usuario ATIVO pode ler e escrever ───────
create policy "funders_all_active_users" on funders for all using (is_active_user()) with check (is_active_user());
create policy "projects_all_active_users" on projects for all using (is_active_user()) with check (is_active_user());
create policy "categories_all_active_users" on categories for all using (is_active_user()) with check (is_active_user());
create policy "subcategories_all_active_users" on subcategories for all using (is_active_user()) with check (is_active_user());
create policy "cost_centers_all_active_users" on cost_centers for all using (is_active_user()) with check (is_active_user());
create policy "bank_accounts_all_active_users" on bank_accounts for all using (is_active_user()) with check (is_active_user());
create policy "transactions_all_active_users" on transactions for all using (is_active_user()) with check (is_active_user());
create policy "budgets_all_active_users" on budgets for all using (is_active_user()) with check (is_active_user());
create policy "investments_all_active_users" on investments for all using (is_active_user()) with check (is_active_user());
create policy "audit_logs_all_active_users" on audit_logs for all using (is_active_user()) with check (is_active_user());

-- ============================================================================
-- NOTA SOBRE O PRIMEIRO ADMINISTRADOR
-- Como so um Administrador pode criar novos usuarios (policy profiles_insert
-- so libera insert para quem ja e admin), o PRIMEIRO usuario do sistema
-- precisa ser criado manualmente direto no painel do Supabase, e promovido a
-- Administrador manualmente via SQL. Veja o passo a passo na Etapa 1.5 do
-- guia de publicacao.
-- ============================================================================
