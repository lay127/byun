-- Byun: atualização 02 (permite mudar o próprio @usuário)
-- Supabase > SQL Editor > New query > cole tudo > Run. Pode rodar mais de uma vez.

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
