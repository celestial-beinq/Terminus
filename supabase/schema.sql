-- ============================================================================
-- Terminus Global Cargo Shipping & Maritime Logistics — Supabase Schema
-- Run this in Supabase SQL Editor (or via Supabase MCP) to provision tables,
-- Auth profile triggers, Row-Level Security (RLS), public tracking RPC, and Realtime.
-- ============================================================================

create extension if not exists pgcrypto;

-- 1. Profiles (extends auth.users for Customer, Dealer, Staff, Admin roles)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text not null,
  role text not null default 'customer' check (role in ('customer', 'dealer', 'staff', 'admin')),
  organization text not null default 'Independent Shipper',
  hub_locode text not null default 'NLRTM',
  active boolean not null default true,
  approval_status text not null default 'approved' check (approval_status in ('approved', 'pending', 'rejected')),
  business_reg_number text,
  created_at timestamptz not null default now()
);

create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

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

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 2. Port Hubs (UN/LOCODE Maritime Terminals)
create table if not exists public.port_hubs (
  code text primary key,
  name text not null,
  country text not null,
  corridor text not null,
  berth_status text not null check (berth_status in ('Optimal', 'Moderate Queue')),
  avg_dwell_hours integer not null default 16,
  weekly_sailings integer not null default 20,
  updated_at timestamptz not null default now()
);

-- 3. Shipments (Bill of Lading + ISO Container + Vessel Voyage + Demurrage Clock)
create table if not exists public.shipments (
  id uuid primary key default gen_random_uuid(),
  tracking_id text not null unique,
  container_number text not null,
  seal_number text not null default 'SL-904182',
  vessel_name text not null,
  vessel_imo text not null default 'IMO 9841205',
  voyage_number text not null default 'V.264W',
  origin_locode text not null references public.port_hubs(code),
  destination_locode text not null references public.port_hubs(code),
  origin_label text not null,
  destination_label text not null,
  incoterm text not null default 'CIF' check (incoterm in ('EXW', 'FOB', 'CIF', 'DDP')),
  vgm_kg integer not null default 24600,
  equipment_code text not null default '40HC',
  cargo_type text not null,
  teu text not null default '2 TEU',
  status text not null default 'In Transit' check (
    status in (
      'Booking Confirmed',
      'Empty Gate-Out',
      'Full Gate-In',
      'In Transit',
      'Customs Cleared',
      'At Berth',
      'Out for Drayage',
      'Delivered'
    )
  ),
  progress_percent integer not null default 25 check (progress_percent between 0 and 100),
  eta text not null,
  last_free_day text not null default 'Nov 19, 2026',
  set_temp_c numeric(4,1),
  actual_temp_c numeric(4,1),
  customer_id uuid references public.profiles(id) on delete set null,
  dealer_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_shipments_tracking_id on public.shipments (tracking_id);
create index if not exists idx_shipments_container_number on public.shipments (container_number);

-- 4. Shipment Milestones (EDI / AIS / Terminal Gate Events)
create table if not exists public.shipment_milestones (
  id uuid primary key default gen_random_uuid(),
  shipment_id uuid not null references public.shipments(id) on delete cascade,
  event_code text not null default 'EDI',
  timestamp_label text not null,
  location text not null,
  event_description text not null,
  completed boolean not null default false,
  sort_order integer not null default 1
);

-- 5. Quote Requests & Dealer Allocations
create table if not exists public.quote_requests (
  id uuid primary key default gen_random_uuid(),
  quote_ref text not null unique,
  client_name text not null,
  contact_email text not null,
  freight_mode text not null,
  trade_lane text not null,
  equipment text not null default '2 × 40ft High-Cube',
  rate_usd integer not null default 4658,
  margin_percent numeric(4,1) not null default 8.5,
  notes text not null default '',
  status text not null default 'Pending Review' check (status in ('Pending Review', 'Approved', 'Dispatched')),
  customer_id uuid references public.profiles(id) on delete set null,
  dealer_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

-- 6. Invoices (Freight & Demurrage Settlement)
create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  invoice_number text not null unique,
  shipment_tracking_id text not null,
  lane text not null,
  amount_usd integer not null,
  due_date text not null,
  status text not null default 'Due' check (status in ('Due', 'Paid')),
  customer_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

-- 7. Port Gate Tasks (Terminal Staff Queue)
create table if not exists public.gate_tasks (
  id uuid primary key default gen_random_uuid(),
  task_code text not null unique,
  container_number text not null,
  terminal_name text not null,
  vessel_name text not null,
  action_required text not null,
  completed boolean not null default false,
  updated_at timestamptz not null default now()
);

-- 8. Live Activity & AIS/EDI Audit Feed
create table if not exists public.activity_events (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null default auth.uid(),
  tag text not null,
  message text not null,
  created_at timestamptz not null default now()
);

-- Public B/L & Container Lookup Function (safe single-shipment lookup, min 4 chars)
create or replace function public.lookup_shipment_by_tracking(p_query text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'trackingId', s.tracking_id,
    'containerNumber', s.container_number,
    'sealNumber', s.seal_number,
    'vessel', s.vessel_name || ' (' || s.vessel_imo || ')',
    'voyage', s.voyage_number,
    'origin', s.origin_label,
    'destination', s.destination_label,
    'incoterm', s.incoterm,
    'vgmKg', s.vgm_kg,
    'eta', s.eta,
    'lastFreeDay', s.last_free_day,
    'status', s.status,
    'cargoType', s.cargo_type,
    'teu', s.teu,
    'progressPercent', s.progress_percent,
    'milestones', coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'timestamp', m.timestamp_label,
            'location', m.location,
            'event', m.event_description,
            'completed', m.completed
          )
          order by m.sort_order asc
        )
        from public.shipment_milestones m
        where m.shipment_id = s.id
      ),
      '[]'::jsonb
    )
  )
  from public.shipments s
  where length(trim(coalesce(p_query, ''))) >= 4
    and (
      upper(s.tracking_id) = upper(trim(p_query))
      or upper(s.container_number) like '%' || upper(trim(p_query)) || '%'
    )
  limit 1;
$$;

grant execute on function public.lookup_shipment_by_tracking(text) to anon, authenticated;

-- Enable Row-Level Security
alter table public.profiles enable row level security;
alter table public.port_hubs enable row level security;
alter table public.shipments enable row level security;
alter table public.shipment_milestones enable row level security;
alter table public.quote_requests enable row level security;
alter table public.invoices enable row level security;
alter table public.gate_tasks enable row level security;
alter table public.activity_events enable row level security;

-- Port hubs: readable by everyone, editable by staff/admin
create policy "port_hubs_public_read" on public.port_hubs
  for select to anon, authenticated using (true);
create policy "port_hubs_ops_write" on public.port_hubs
  for all to authenticated
  using (public.current_user_role() in ('staff', 'admin'))
  with check (public.current_user_role() in ('staff', 'admin'));

-- Profiles: own profile or admin/staff read; own safe fields or admin update
create policy "profiles_select_scoped" on public.profiles
  for select to authenticated
  using ((select auth.uid()) = id or public.current_user_role() in ('admin', 'staff'));
create policy "profiles_update_scoped" on public.profiles
  for update to authenticated
  using ((select auth.uid()) = id or public.current_user_role() = 'admin')
  with check ((select auth.uid()) = id or public.current_user_role() = 'admin');

-- Shipments & milestones: customer sees own, dealer sees assigned/own, staff/admin see all
create policy "shipments_select_scoped" on public.shipments
  for select to authenticated
  using (
    customer_id = (select auth.uid())
    or dealer_id = (select auth.uid())
    or public.current_user_role() in ('staff', 'admin')
  );
create policy "shipments_insert_scoped" on public.shipments
  for insert to authenticated
  with check (
    customer_id = (select auth.uid())
    or dealer_id = (select auth.uid())
    or public.current_user_role() in ('staff', 'admin')
  );
create policy "shipments_update_ops" on public.shipments
  for update to authenticated
  using (public.current_user_role() in ('staff', 'admin'))
  with check (public.current_user_role() in ('staff', 'admin'));

create policy "milestones_select_scoped" on public.shipment_milestones
  for select to authenticated
  using (
    exists (
      select 1 from public.shipments s
      where s.id = shipment_id
        and (
          s.customer_id = (select auth.uid())
          or s.dealer_id = (select auth.uid())
          or public.current_user_role() in ('staff', 'admin')
        )
    )
  );
create policy "milestones_insert_scoped" on public.shipment_milestones
  for insert to authenticated
  with check (
    exists (
      select 1 from public.shipments s
      where s.id = shipment_id
        and (
          s.customer_id = (select auth.uid())
          or s.dealer_id = (select auth.uid())
          or public.current_user_role() in ('staff', 'admin')
        )
    )
  );
create policy "milestones_update_ops" on public.shipment_milestones
  for update to authenticated
  using (public.current_user_role() in ('staff', 'admin'))
  with check (public.current_user_role() in ('staff', 'admin'));

-- Quote requests: public/customer submit, customer sees own, dealer sees assigned/unassigned, staff/admin see all
create policy "quotes_insert_scoped" on public.quote_requests
  for insert to anon, authenticated
  with check (
    customer_id is null
    or customer_id = (select auth.uid())
    or public.current_user_role() in ('dealer', 'staff', 'admin')
  );
create policy "quotes_select_scoped" on public.quote_requests
  for select to authenticated
  using (
    customer_id = (select auth.uid())
    or dealer_id = (select auth.uid())
    or (public.current_user_role() = 'dealer' and dealer_id is null)
    or public.current_user_role() in ('staff', 'admin')
  );
create policy "quotes_update_dealer_admin" on public.quote_requests
  for update to authenticated
  using (public.current_user_role() in ('dealer', 'staff', 'admin'))
  with check (public.current_user_role() in ('dealer', 'staff', 'admin'));

-- Invoices: customer sees/pays own, dealer/admin issue, staff/admin read all
create policy "invoices_select_scoped" on public.invoices
  for select to authenticated
  using (
    customer_id = (select auth.uid())
    or exists (
      select 1 from public.shipments s
      where s.tracking_id = shipment_tracking_id
        and (s.customer_id = (select auth.uid()) or s.dealer_id = (select auth.uid()))
    )
    or public.current_user_role() in ('staff', 'admin')
  );
create policy "invoices_insert_dealer_admin" on public.invoices
  for insert to authenticated
  with check (public.current_user_role() in ('dealer', 'admin'));
create policy "invoices_update_scoped" on public.invoices
  for update to authenticated
  using (
    customer_id = (select auth.uid())
    or exists (
      select 1 from public.shipments s
      where s.tracking_id = shipment_tracking_id
        and s.customer_id = (select auth.uid())
    )
    or public.current_user_role() in ('staff', 'admin')
  )
  with check (
    customer_id = (select auth.uid())
    or exists (
      select 1 from public.shipments s
      where s.tracking_id = shipment_tracking_id
        and s.customer_id = (select auth.uid())
    )
    or public.current_user_role() in ('staff', 'admin')
  );

-- Gate tasks: strictly staff & admin
create policy "gate_tasks_ops_select" on public.gate_tasks
  for select to authenticated
  using (public.current_user_role() in ('staff', 'admin'));
create policy "gate_tasks_ops_insert" on public.gate_tasks
  for insert to authenticated
  with check (public.current_user_role() in ('staff', 'admin'));
create policy "gate_tasks_ops_update" on public.gate_tasks
  for update to authenticated
  using (public.current_user_role() in ('staff', 'admin'))
  with check (public.current_user_role() in ('staff', 'admin'));

-- Activity events: actor sees own, dealer/staff/admin see operational stream
create policy "activity_select_scoped" on public.activity_events
  for select to authenticated
  using (
    actor_id = (select auth.uid())
    or public.current_user_role() in ('dealer', 'staff', 'admin')
  );
create policy "activity_insert_scoped" on public.activity_events
  for insert to authenticated
  with check (
    actor_id is null
    or actor_id = (select auth.uid())
    or public.current_user_role() in ('staff', 'admin')
  );

grant usage on schema public to anon, authenticated;
grant select on public.port_hubs to anon, authenticated;
grant insert on public.quote_requests to anon, authenticated;
grant select, insert, update on public.profiles, public.shipments, public.shipment_milestones, public.quote_requests, public.invoices, public.gate_tasks, public.activity_events to authenticated;

-- Realtime Publication
do $$
begin
  alter publication supabase_realtime add table
    public.port_hubs,
    public.shipments,
    public.shipment_milestones,
    public.quote_requests,
    public.invoices,
    public.gate_tasks,
    public.activity_events,
    public.profiles;
exception
  when duplicate_object then null;
end $$;

