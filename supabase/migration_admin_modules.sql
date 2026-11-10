-- ============================================================================
-- Terminus Admin Dashboard Modules Migration (A-I)
-- Run in Supabase SQL Editor to add staff/dealer permissions, shipment customs/
-- delay/staff-assignment fields, system_settings, and telemetry_logs with RLS.
-- ============================================================================

-- 1. Extend profiles with permissions, staff title, and last login timestamp
alter table public.profiles
  add column if not exists permissions jsonb not null default '[]'::jsonb,
  add column if not exists staff_title text not null default 'Operations Specialist',
  add column if not exists last_login_at timestamptz;

-- 2. Extend shipments with assigned staff, delay/dispute flags, customs status, and charge
alter table public.shipments
  add column if not exists assigned_staff_id uuid references public.profiles(id) on delete set null,
  add column if not exists is_delayed boolean not null default false,
  add column if not exists dispute_note text,
  add column if not exists customs_status text not null default 'Pending'
    check (customs_status in ('Pending', 'Docs Verified', 'Hold / Inspection', 'Cleared')),
  add column if not exists freight_charge_usd integer not null default 4250;

-- 3. System Settings (Admin configuration & security policies)
create table if not exists public.system_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id) on delete set null
);

insert into public.system_settings (key, value)
values (
  'platform_config',
  '{
    "autoCustomsPreclearance": true,
    "demurrageAlertHours": 24,
    "aisPollingMinutes": 15,
    "webhookNotifications": true,
    "requireDealerDocs": true,
    "strictMfaForAdmins": false
  }'::jsonb
)
on conflict (key) do nothing;

-- 4. Network Telemetry & Security Audit Logs
create table if not exists public.telemetry_logs (
  id uuid primary key default gen_random_uuid(),
  channel text not null check (channel in ('AIS', 'EDI', 'API', 'AUTH', 'WEBHOOK')),
  severity text not null default 'info' check (severity in ('info', 'warn', 'error')),
  endpoint text not null,
  latency_ms integer not null default 42,
  message text not null,
  actor_id uuid references public.profiles(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);

alter table public.system_settings enable row level security;
alter table public.telemetry_logs enable row level security;

drop policy if exists "system_settings_admin_all" on public.system_settings;
create policy "system_settings_admin_all" on public.system_settings
  for all to authenticated
  using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');

drop policy if exists "telemetry_logs_ops_select" on public.telemetry_logs;
create policy "telemetry_logs_ops_select" on public.telemetry_logs
  for select to authenticated
  using (public.current_user_role() in ('admin', 'staff'));

drop policy if exists "telemetry_logs_auth_insert" on public.telemetry_logs;
create policy "telemetry_logs_auth_insert" on public.telemetry_logs
  for insert to authenticated
  with check (actor_id is null or actor_id = (select auth.uid()) or public.current_user_role() in ('admin', 'staff'));

grant select, insert, update on public.system_settings, public.telemetry_logs to authenticated;

do $$
begin
  alter publication supabase_realtime add table public.system_settings;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.telemetry_logs;
exception
  when duplicate_object then null;
end $$;

-- Reload PostgREST schema cache immediately so new columns/tables are visible via API
notify pgrst, 'reload schema';

