-- ============================================================================
-- Terminus Backend Super Admin Provisioning Script
-- Run this in Supabase SQL Editor to create your first Admin account.
-- After running this, sign in at /login using that email & password.
-- ============================================================================

do $$
declare
  admin_email text := 'admin@terminus.io';       -- Change to your admin email
  admin_password text := 'TerminusAdmin2026!'; -- Change to a strong password
  admin_name text := 'Marcus Vance';
  existing_uid uuid;
  new_uid uuid := gen_random_uuid();
begin
  select id into existing_uid from auth.users where lower(email) = lower(admin_email);

  if existing_uid is null then
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
      new_uid,
      'authenticated',
      'authenticated',
      lower(admin_email),
      extensions.crypt(admin_password, extensions.gen_salt('bf')),
      now(),
      jsonb_build_object('provider', 'email', 'providers', array['email']),
      jsonb_build_object(
        'full_name', admin_name,
        'role', 'admin',
        'organization', 'Terminus Global Control',
        'hub_locode', 'NLRTM'
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
      new_uid,
      jsonb_build_object('sub', new_uid::text, 'email', lower(admin_email)),
      'email',
      new_uid::text,
      now(),
      now(),
      now()
    );

    existing_uid := new_uid;
  end if;

  -- Elevate profile created by trigger to approved Admin
  update public.profiles
  set
    role = 'admin',
    approval_status = 'approved',
    active = true,
    full_name = admin_name,
    organization = 'Terminus Global Control',
    hub_locode = 'NLRTM'
  where id = existing_uid;
end $$;

