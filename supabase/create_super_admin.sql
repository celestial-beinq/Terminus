-- ============================================================================
-- Terminus Super Admin Provisioning Functions (Backend / SQL Editor Only)
-- ============================================================================
-- Zero hardcoded credentials: you pass YOUR own email, password, and name.
-- Run this file once in Supabase SQL Editor to install the helper functions,
-- then call whichever option matches how you create your Super Admin:
--
--   OPTION A — Create Super Admin directly in Supabase Auth + Profiles (never a customer):
--     select public.provision_super_admin(
--       'your-email@company.com',
--       'YourStrongPassword!',
--       'Your Full Name'
--     );
--
--   OPTION B — If you already clicked "Authentication -> Users -> Add user" in Supabase UI:
--     select public.promote_user_to_admin(
--       'your-email@company.com',
--       'Your Full Name'
--     );
-- ============================================================================

create or replace function public.provision_super_admin(
  p_email text,
  p_password text,
  p_full_name text,
  p_organization text default 'Terminus Global Control',
  p_hub_locode text default 'NLRTM'
)
returns uuid
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  clean_email text := lower(trim(coalesce(p_email, '')));
  clean_name text := trim(coalesce(p_full_name, ''));
  target_uid uuid;
begin
  if clean_email = '' or position('@' in clean_email) = 0 then
    raise exception 'A valid admin email is required.';
  end if;
  if length(coalesce(p_password, '')) < 8 then
    raise exception 'Admin password must be at least 8 characters.';
  end if;
  if clean_name = '' then
    raise exception 'Admin full name is required.';
  end if;

  select id into target_uid from auth.users where lower(email) = clean_email;

  if target_uid is null then
    target_uid := gen_random_uuid();

    insert into auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      email_change,
      email_change_token_new,
      recovery_token
    )
    values (
      '00000000-0000-0000-0000-000000000000',
      target_uid,
      'authenticated',
      'authenticated',
      clean_email,
      extensions.crypt(p_password, extensions.gen_salt('bf')),
      now(),
      jsonb_build_object('provider', 'email', 'providers', array['email'], 'role', 'admin'),
      jsonb_build_object(
        'full_name', clean_name,
        'organization', p_organization,
        'hub_locode', p_hub_locode
      ),
      now(),
      now(),
      '',
      '',
      '',
      ''
    );

    insert into auth.identities (
      id,
      user_id,
      identity_data,
      provider,
      provider_id,
      last_sign_in_at,
      created_at,
      updated_at
    )
    values (
      gen_random_uuid(),
      target_uid,
      jsonb_build_object('sub', target_uid::text, 'email', clean_email),
      'email',
      target_uid::text,
      now(),
      now(),
      now()
    );
  end if;

  insert into public.profiles (
    id, email, full_name, role, organization, hub_locode, active, approval_status
  )
  values (
    target_uid, clean_email, clean_name, 'admin', p_organization, p_hub_locode, true, 'approved'
  )
  on conflict (id) do update
  set
    role = 'admin',
    approval_status = 'approved',
    active = true,
    full_name = excluded.full_name,
    organization = excluded.organization,
    hub_locode = excluded.hub_locode;

  return target_uid;
end;
$$;

create or replace function public.promote_user_to_admin(
  p_email text,
  p_full_name text default null,
  p_organization text default 'Terminus Global Control',
  p_hub_locode text default 'NLRTM'
)
returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  clean_email text := lower(trim(coalesce(p_email, '')));
  target_uid uuid;
begin
  select id into target_uid from auth.users where lower(email) = clean_email;
  if target_uid is null then
    raise exception 'No Supabase Auth user found with email %', clean_email;
  end if;

  update auth.users
  set
    raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('role', 'admin'),
    email_confirmed_at = coalesce(email_confirmed_at, now()),
    updated_at = now()
  where id = target_uid;

  insert into public.profiles (
    id, email, full_name, role, organization, hub_locode, active, approval_status
  )
  values (
    target_uid,
    clean_email,
    coalesce(nullif(trim(p_full_name), ''), split_part(clean_email, '@', 1)),
    'admin',
    p_organization,
    p_hub_locode,
    true,
    'approved'
  )
  on conflict (id) do update
  set
    role = 'admin',
    approval_status = 'approved',
    active = true,
    full_name = coalesce(nullif(trim(p_full_name), ''), public.profiles.full_name),
    organization = coalesce(p_organization, public.profiles.organization),
    hub_locode = coalesce(p_hub_locode, public.profiles.hub_locode);

  return target_uid;
end;
$$;

-- Lock down both functions so ONLY SQL Editor / postgres / service_role can call them
revoke all on function public.provision_super_admin(text, text, text, text, text) from public, anon, authenticated;
revoke all on function public.promote_user_to_admin(text, text, text, text) from public, anon, authenticated;
