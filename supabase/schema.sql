-- =====================================================================
-- Byun: estrutura do banco no Supabase (versão com usuários e mascotes)
-- Como usar: Supabase > SQL Editor > New query > cole TUDO > Run.
-- Pode rodar de novo sem problema: ele só atualiza o que já existe.
-- =====================================================================

create extension if not exists pgcrypto with schema extensions;

-- limpa a versão antiga com convites, se existir
drop function if exists public.create_invite(text, int);
drop function if exists public.list_invites();
drop function if exists public.revoke_invite(text);
drop function if exists public.new_invite_code();
drop table if exists public.invites;

-- ---------- pessoas liberadas (só quem está aqui consegue ter conta) ----------
create table if not exists public.account_presets (
  username     text primary key check (username ~ '^[a-z0-9._-]{2,30}$'),
  display_name text not null,
  pet          jsonb,
  is_admin     boolean not null default false,
  claimed_at   timestamptz
);
alter table public.account_presets enable row level security;
revoke all on public.account_presets from anon, authenticated;

-- ---------- perfis: nome, mascote e se precisa trocar a senha ----------
create table if not exists public.profiles (
  user_id      uuid primary key references auth.users(id) on delete cascade,
  username     text unique not null,
  display_name text not null,
  pet          jsonb not null default '{}'::jsonb,
  must_change  boolean not null default true,
  created_at   timestamptz not null default now(),
  constraint pet_size check (pg_column_size(pet) < 4000)
);
alter table public.profiles enable row level security;
drop policy if exists "perfil le"       on public.profiles;
drop policy if exists "perfil atualiza" on public.profiles;
create policy "perfil le"       on public.profiles for select to authenticated using ((select auth.uid()) = user_id);
create policy "perfil atualiza" on public.profiles for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant update (display_name, pet, must_change) on public.profiles to authenticated;  -- o usuário não muda o próprio username

-- ---------- carteiras: os dados de gastos de cada pessoa ----------
create table if not exists public.wallets (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  constraint wallet_size check (pg_column_size(data) < 2000000)
);
alter table public.wallets enable row level security;
drop policy if exists "dono le"       on public.wallets;
drop policy if exists "dono cria"     on public.wallets;
drop policy if exists "dono atualiza" on public.wallets;
drop policy if exists "dono apaga"    on public.wallets;
create policy "dono le"       on public.wallets for select to authenticated using ((select auth.uid()) = user_id);
create policy "dono cria"     on public.wallets for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "dono atualiza" on public.wallets for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "dono apaga"    on public.wallets for delete to authenticated using ((select auth.uid()) = user_id);
revoke all on public.wallets from anon, authenticated;
grant select, insert, update, delete on public.wallets to authenticated;   -- explícito: funciona mesmo com "expose new tables" desligado

-- ---------- administradores ----------
create table if not exists public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);
alter table public.admins enable row level security;
revoke all on public.admins from anon, authenticated;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

-- ---------- quando uma conta é criada ----------
-- Só aceita usernames liberados em account_presets. Mesmo que o cadastro público
-- esteja ligado por engano, ninguém de fora consegue criar conta.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_local text := lower(split_part(coalesce(new.email, ''), '@', 1));
  -- aceita "seuemail+layla@gmail.com" (usa o que vem depois do +) ou "layla@..."
  v_user  text := case when position('+' in v_local) > 0 then split_part(v_local, '+', 2) else v_local end;
  p public.account_presets;
begin
  select * into p from public.account_presets where username = v_user and claimed_at is null for update;
  if not found then
    raise exception 'BYUN_USUARIO_NAO_LIBERADO' using errcode = 'P0001';
  end if;
  update public.account_presets set claimed_at = now() where username = v_user;
  insert into public.profiles (user_id, username, display_name, pet, must_change)
  values (new.id, v_user, p.display_name, coalesce(p.pet, '{}'::jsonb), true);
  insert into public.wallets (user_id) values (new.id) on conflict do nothing;
  if p.is_admin then insert into public.admins (user_id) values (new.id) on conflict do nothing; end if;
  return new;
end $$;

drop trigger if exists byun_on_auth_user_created on auth.users;
create trigger byun_on_auth_user_created
  after insert on auth.users for each row execute function public.handle_new_user();

-- ---------- ferramentas da conta admin ----------
create or replace function public.admin_list_users()
returns table (username text, display_name text, pet jsonb, must_change boolean, is_admin boolean, created_at timestamptz, last_sign_in_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Sem permissão'; end if;
  return query
    select pr.username, pr.display_name, pr.pet, pr.must_change,
           exists (select 1 from public.admins a where a.user_id = pr.user_id),
           pr.created_at, u.last_sign_in_at
      from public.profiles pr join auth.users u on u.id = pr.user_id
     order by pr.created_at;
end $$;

create or replace function public.admin_list_pending()
returns table (username text, display_name text)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Sem permissão'; end if;
  return query select ap.username, ap.display_name from public.account_presets ap where ap.claimed_at is null order by ap.username;
end $$;

create or replace function public.admin_reset_password(p_username text, p_password text) returns void
language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  if not public.is_admin() then raise exception 'Sem permissão'; end if;
  if length(coalesce(p_password, '')) < 8 then raise exception 'Senha curta demais'; end if;
  select user_id into v_id from public.profiles where username = lower(p_username);
  if v_id is null then raise exception 'Usuário não encontrado'; end if;
  update auth.users set encrypted_password = extensions.crypt(p_password, extensions.gen_salt('bf', 10)), updated_at = now() where id = v_id;
  update public.profiles set must_change = true where user_id = v_id;
  begin
    delete from auth.sessions where user_id = v_id;   -- desconecta a pessoa de todos os aparelhos
  exception when undefined_table then null;
  end;
end $$;

create or replace function public.admin_set_pet(p_username text, p_pet jsonb, p_display_name text default null) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Sem permissão'; end if;
  update public.profiles
     set pet = p_pet, display_name = coalesce(nullif(trim(p_display_name), ''), display_name)
   where username = lower(p_username);
end $$;

create or replace function public.admin_allow_user(p_username text, p_display_name text, p_pet jsonb default null) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Sem permissão'; end if;
  insert into public.account_presets (username, display_name, pet)
  values (lower(trim(p_username)), trim(p_display_name), p_pet)
  on conflict (username) do update set display_name = excluded.display_name, pet = coalesce(excluded.pet, public.account_presets.pet)
  where public.account_presets.claimed_at is null;
end $$;

-- ---------- excluir a própria conta (LGPD) ----------
create or replace function public.delete_my_account() returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Não autenticado'; end if;
  delete from auth.users where id = auth.uid();
end $$;

-- ---------- quem pode chamar o quê ----------
revoke execute on function public.handle_new_user()                         from public, anon, authenticated;
revoke execute on function public.is_admin()                                from public, anon;
revoke execute on function public.admin_list_users()                        from public, anon;
revoke execute on function public.admin_list_pending()                      from public, anon;
revoke execute on function public.admin_reset_password(text, text)          from public, anon;
revoke execute on function public.admin_set_pet(text, jsonb, text)          from public, anon;
revoke execute on function public.admin_allow_user(text, text, jsonb)       from public, anon;
revoke execute on function public.delete_my_account()                       from public, anon;
grant  execute on function public.is_admin()                                to authenticated;
grant  execute on function public.admin_list_users()                        to authenticated;
grant  execute on function public.admin_list_pending()                      to authenticated;
grant  execute on function public.admin_reset_password(text, text)          to authenticated;
grant  execute on function public.admin_set_pet(text, jsonb, text)          to authenticated;
grant  execute on function public.admin_allow_user(text, text, jsonb)       to authenticated;
grant  execute on function public.delete_my_account()                       to authenticated;

-- ---------- mudar o próprio @usuário ----------
create or replace function public.change_my_username(p_new text) returns text
language plpgsql security definer set search_path = '' as $$
declare
  v_new text := lower(trim(coalesce(p_new, '')));
  v_old text; v_email text; v_local text; v_dom text; v_newemail text;
begin
  if auth.uid() is null then raise exception 'Não autenticado'; end if;
  if v_new !~ '^[a-z0-9._-]{2,30}$' then raise exception 'BYUN_USERNAME_INVALIDO'; end if;
  select username into v_old from public.profiles where user_id = auth.uid();
  if v_old is null then raise exception 'Perfil não encontrado'; end if;
  if v_old = v_new then return v_new; end if;
  if exists (select 1 from public.profiles where username = v_new)
     or exists (select 1 from public.account_presets where username = v_new) then
    raise exception 'BYUN_USERNAME_EM_USO';
  end if;
  select email into v_email from auth.users where id = auth.uid();
  v_local := split_part(v_email, '@', 1); v_dom := split_part(v_email, '@', 2);
  v_newemail := case when position('+' in v_local) > 0 then split_part(v_local, '+', 1) || '+' || v_new else v_new end || '@' || v_dom;
  if exists (select 1 from auth.users where lower(email) = v_newemail) then raise exception 'BYUN_USERNAME_EM_USO'; end if;
  update auth.users set email = v_newemail, updated_at = now() where id = auth.uid();
  begin
    update auth.identities set identity_data = jsonb_set(identity_data, '{email}', to_jsonb(v_newemail))
     where user_id = auth.uid() and provider = 'email';
  exception when undefined_table or undefined_column then null;
  end;
  update public.profiles set username = v_new where user_id = auth.uid();
  update public.account_presets set username = v_new where username = v_old;
  return v_new;
end $$;
revoke execute on function public.change_my_username(text) from public, anon;
grant  execute on function public.change_my_username(text) to authenticated;

-- ---------- as três contas iniciais ----------
insert into public.account_presets (username, display_name, pet, is_admin) values
  ('layla',  'Layla',  '{"name":"Byun","species":"gato","body":"#0b0b0b","eyes":"#3ddc84","accent":"#1f5a3a","blush":false}', false),
  ('bianca', 'Bianca', '{"name":"Byun","species":"onca","body":"#7c4dcc","eyes":"#ffffff","accent":"#6d3fc0","blush":true}', false),
  ('admin',  'Admin',  '{"name":"Byun","species":"gato","body":"#0b0b0b","eyes":"#ffffff","accent":"#1f5a3a","blush":false}', true)
on conflict (username) do update set display_name = excluded.display_name, pet = excluded.pet, is_admin = excluded.is_admin
where public.account_presets.claimed_at is null;

select username as "usuarios_liberados", display_name from public.account_presets order by username;
