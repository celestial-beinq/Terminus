-- ============================================================================
-- Terminus Role & Registration Governance Migration
-- 1. Customers: Self-registration (auto-approved)
-- 2. Dealers: Business self-registration + Admin verification (starts pending)
-- 3. Staff: Created ONLY by authenticated Admin via admin_create_staff RPC
-- 4. Admins: Created ONLY from backend (Super Admin / SQL / Supabase Dashboard)
-- ============================================================================

alter table public.profiles
  add column if not exists approval_status text not null default 'approved'
    check (approval_status in ('approved', 'pending', 'rejected')),
  add column if not exists business_reg_number text;

-- Harden signup trigger so public signUp can NEVER create staff or admin accounts,
-- and dealer signups start as pending + inactive until Admin verifies them.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_role text;
  final_role text;
  final_approval text;
  final_active boolean;
begin
  requested_role := lower(coalesce(new.raw_user_meta_data ->> 'role', 'customer'));

  if requested_role = 'dealer' then
    final_role := 'dealer';
    final_approval := 'pending';
    final_active := false;
  else
    -- Public self-registration only permits customer or dealer.
    -- Staff and Admin roles cannot be self-assigned from the frontend.
    final_role := 'customer';
    final_approval := 'approved';
    final_active := true;
  end if;

  insert into public.profiles (
    id, email, full_name, role, organization, hub_locode, active, approval_status, business_reg_number
  )
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(coalesce(new.email, 'Operator'), '@', 1)),
    final_role,
    coalesce(new.raw_user_meta_data ->> 'organization', 'Enterprise Shipper'),
    coalesce(new.raw_user_meta_data ->> 'hub_locode', 'NLRTM'),
    final_active,
    final_approval,
    nullif(trim(coalesce(new.raw_user_meta_data ->> 'business_reg_number', '')), '')
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

-- Admin-only RPC to provision Staff accounts directly from the Admin Dashboard
create or replace function public.admin_create_staff(
  p_email text,
  p_password text,
  p_full_name text,
  p_organization text default 'Terminus Port Operations',
  p_hub_locode text default 'NLRTM'
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  caller_role text;
  new_uid uuid := gen_random_uuid();
  clean_email text := lower(trim(p_email));
begin
  select role into caller_role from public.profiles where id = auth.uid();
  if caller_role <> 'admin' then
    raise exception 'Only authenticated Admins can create Staff accounts.';
  end if;

  if clean_email = '' or position('@' in clean_email) = 0 then
    raise exception 'A valid staff email is required.';
  end if;

  if length(trim(p_password)) < 6 then
    raise exception 'Staff password must be at least 6 characters.';
  end if;

  if exists (select 1 from auth.users where lower(email) = clean_email) then
    raise exception 'An account with email % already exists.', clean_email;
  end if;

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
    clean_email,
    crypt(p_password, gen_salt('bf')),
    now(),
    jsonb_build_object('provider', 'email', 'providers', array['email']),
    jsonb_build_object(
      'full_name', trim(p_full_name),
      'role', 'staff',
      'organization', coalesce(nullif(trim(p_organization), ''), 'Terminus Port Operations'),
      'hub_locode', coalesce(nullif(trim(p_hub_locode), ''), 'NLRTM')
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
    jsonb_build_object('sub', new_uid::text, 'email', clean_email),
    'email',
    new_uid::text,
    now(),
    now(),
    now()
  );

  -- Trigger inserts as customer; elevate cleanly to approved Staff since caller is verified Admin
  update public.profiles
  set
    role = 'staff',
    approval_status = 'approved',
    active = true,
    full_name = trim(p_full_name),
    organization = coalesce(nullif(trim(p_organization), ''), 'Terminus Port Operations'),
    hub_locode = coalesce(nullif(trim(p_hub_locode), ''), 'NLRTM')
  where id = new_uid;

  insert into public.activity_events (tag, message)
  values ('ADMIN OPS', 'Provisioned Staff account for ' || trim(p_full_name) || ' (' || clean_email || ')');

  return jsonb_build_object(
    'id', new_uid,
    'email', clean_email,
    'full_name', trim(p_full_name),
    'role', 'staff',
    'organization', coalesce(nullif(trim(p_organization), ''), 'Terminus Port Operations'),
    'hub_locode', coalesce(nullif(trim(p_hub_locode), ''), 'NLRTM'),
    'approval_status', 'approved',
    'active', true
  );
end;
$$;

revoke all on function public.admin_create_staff(text, text, text, text, text) from public;
grant execute on function public.admin_create_staff(text, text, text, text, text) to authenticated;

