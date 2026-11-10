-- ============================================================================
-- Terminus Strict Multi-Tenant Row-Level Security (RLS) Migration
-- Run this in Supabase SQL Editor to enforce strict per-role & per-owner RLS
-- across all cargo shipping tables.
-- ============================================================================

-- 1. Prevent non-admins from self-escalating role/approval_status/active on profiles
create or replace function public.protect_profile_role_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_role text;
begin
  -- Allow service/SQL editor (auth.uid() is null) or verified Admins
  if auth.uid() is null then
    return new;
  end if;

  select role into caller_role from public.profiles where id = auth.uid();
  if caller_role <> 'admin' then
    new.role := old.role;
    new.approval_status := old.approval_status;
    new.active := old.active;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_protect_profile_role_escalation on public.profiles;
create trigger trg_protect_profile_role_escalation
  before update on public.profiles
  for each row execute function public.protect_profile_role_escalation();

-- 2. Add actor_id to activity_events for user-scoped activity visibility
alter table public.activity_events
  add column if not exists actor_id uuid references public.profiles(id) on delete set null default auth.uid();

-- 3. Drop old permissive policies
drop policy if exists "port_hubs_public_read" on public.port_hubs;
drop policy if exists "port_hubs_ops_write" on public.port_hubs;
drop policy if exists "profiles_read" on public.profiles;
drop policy if exists "profiles_admin_update" on public.profiles;
drop policy if exists "shipments_select" on public.shipments;
drop policy if exists "shipments_insert" on public.shipments;
drop policy if exists "shipments_update" on public.shipments;
drop policy if exists "milestones_select" on public.shipment_milestones;
drop policy if exists "milestones_insert" on public.shipment_milestones;
drop policy if exists "milestones_update" on public.shipment_milestones;
drop policy if exists "quotes_insert_public" on public.quote_requests;
drop policy if exists "quotes_select_auth" on public.quote_requests;
drop policy if exists "quotes_update_dealer_admin" on public.quote_requests;
drop policy if exists "invoices_select_auth" on public.invoices;
drop policy if exists "invoices_insert_dealer_admin" on public.invoices;
drop policy if exists "invoices_update_auth" on public.invoices;
drop policy if exists "gate_tasks_select_auth" on public.gate_tasks;
drop policy if exists "gate_tasks_ops_update" on public.gate_tasks;
drop policy if exists "activity_select_auth" on public.activity_events;
drop policy if exists "activity_insert_auth" on public.activity_events;

-- 4. Revoke blanket anon read on private shipments & milestones (use lookup_shipment_by_tracking RPC instead)
revoke select on public.shipments, public.shipment_milestones from anon;
grant select on public.port_hubs to anon, authenticated;
grant insert on public.quote_requests to anon, authenticated;
grant select, insert, update on public.profiles, public.shipments, public.shipment_milestones, public.quote_requests, public.invoices, public.gate_tasks, public.activity_events to authenticated;

-- 5. Strict Role & Ownership RLS Policies

-- Port Hubs: public read, staff/admin write
create policy "port_hubs_public_read" on public.port_hubs
  for select to anon, authenticated
  using (true);

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

-- Shipments: customers see own, dealers see assigned/own, staff/admin see all
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

-- Shipment Milestones: inherit visibility/creation from parent shipment, staff/admin update
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

-- Quote Requests: public/customer submit, customer sees own, dealer sees assigned/unassigned, staff/admin see all
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

-- Gate Tasks: strictly Staff & Admin
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

-- Activity Events: actor sees own, dealer/staff/admin see operational stream
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

-- 6. Public Tracking RPC: safe single-shipment lookup (no private IDs exposed, min 4 chars)
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

-- 7. Allow Supabase backend (raw_app_meta_data.role = 'admin' | 'staff') to create Admins/Staff directly
--    without ever creating a customer profile first (public signup cannot write raw_app_meta_data).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  app_role text;
  requested_role text;
  final_role text;
  final_approval text;
  final_active boolean;
begin
  app_role := lower(coalesce(new.raw_app_meta_data ->> 'role', ''));
  requested_role := lower(coalesce(new.raw_user_meta_data ->> 'role', 'customer'));

  if app_role = 'admin' then
    final_role := 'admin';
    final_approval := 'approved';
    final_active := true;
  elsif app_role = 'staff' then
    final_role := 'staff';
    final_approval := 'approved';
    final_active := true;
  elsif requested_role = 'dealer' then
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

