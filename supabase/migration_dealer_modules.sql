-- ============================================================================
-- Terminus Dealer Dashboard Modules Migration (A-H)
-- Run in Supabase SQL Editor to provision dealer_clients, client margin limits,
-- extended quote_requests (with Rejected status & base/final rates),
-- shipment client links, dealer-scoped invoices/payments, and dealer profile fields.
-- ============================================================================

-- 1. Extend profiles for H. Dealer Profile (contacts, compliance & doc metadata)
alter table public.profiles
  add column if not exists phone text not null default '',
  add column if not exists business_address text not null default '',
  add column if not exists tax_id text not null default '',
  add column if not exists verification_doc_name text,
  add column if not exists verification_doc_url text,
  add column if not exists verification_submitted_at timestamptz;

-- 2. Extend platform_config in system_settings with Admin-defined dealer margin limits
update public.system_settings
set value = jsonb_set(
  jsonb_set(
    value,
    '{dealerMinMarginPercent}',
    coalesce(value -> 'dealerMinMarginPercent', '2.0'::jsonb),
    true
  ),
  '{dealerMaxMarginPercent}',
  coalesce(value -> 'dealerMaxMarginPercent', '18.0'::jsonb),
  true
)
where key = 'platform_config';

-- Allow authenticated dealers & staff to read platform_config (margin limits, polling, alerts)
drop policy if exists "system_settings_dealer_read" on public.system_settings;
create policy "system_settings_dealer_read" on public.system_settings
  for select to authenticated
  using (
    key = 'platform_config'
    and public.current_user_role() in ('dealer', 'staff', 'admin')
  );

-- 3. Dealer Clients table (B. Client Management & D. Client Margin Management)
create table if not exists public.dealer_clients (
  id uuid primary key default gen_random_uuid(),
  dealer_id uuid not null references public.profiles(id) on delete cascade default auth.uid(),
  company_name text not null,
  contact_name text not null,
  contact_email text not null,
  contact_phone text not null default '',
  country text not null default '',
  hub_locode text not null default 'NLRTM',
  account_status text not null default 'Active' check (account_status in ('Active', 'Inactive', 'Suspended')),
  custom_margin_percent numeric(4,1) not null default 8.5,
  notes text not null default '',
  last_activity text not null default 'Client profile registered',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_dealer_clients_dealer_id on public.dealer_clients (dealer_id);

alter table public.dealer_clients enable row level security;

drop policy if exists "dealer_clients_select_scoped" on public.dealer_clients;
create policy "dealer_clients_select_scoped" on public.dealer_clients
  for select to authenticated
  using (dealer_id = (select auth.uid()) or public.current_user_role() = 'admin');

drop policy if exists "dealer_clients_insert_scoped" on public.dealer_clients;
create policy "dealer_clients_insert_scoped" on public.dealer_clients
  for insert to authenticated
  with check (
    (dealer_id = (select auth.uid()) and public.current_user_role() = 'dealer')
    or public.current_user_role() = 'admin'
  );

drop policy if exists "dealer_clients_update_scoped" on public.dealer_clients;
create policy "dealer_clients_update_scoped" on public.dealer_clients
  for update to authenticated
  using (dealer_id = (select auth.uid()) or public.current_user_role() = 'admin')
  with check (dealer_id = (select auth.uid()) or public.current_user_role() = 'admin');

drop policy if exists "dealer_clients_delete_scoped" on public.dealer_clients;
create policy "dealer_clients_delete_scoped" on public.dealer_clients
  for delete to authenticated
  using (dealer_id = (select auth.uid()) or public.current_user_role() = 'admin');

grant select, insert, update, delete on public.dealer_clients to authenticated;

-- 4. Extend quote_requests for C. Broker Quotations & D. Client Margin Management
alter table public.quote_requests
  add column if not exists client_id uuid references public.dealer_clients(id) on delete set null,
  add column if not exists origin_locode text,
  add column if not exists destination_locode text,
  add column if not exists cargo_specs text not null default '',
  add column if not exists base_rate_usd integer not null default 4250,
  add column if not exists final_client_rate_usd integer not null default 4658,
  add column if not exists quote_type text not null default 'broker_request';

create index if not exists idx_quote_requests_client_id on public.quote_requests (client_id);
create index if not exists idx_quote_requests_dealer_id on public.quote_requests (dealer_id);

-- Update status & quote_type check constraints safely
alter table public.quote_requests drop constraint if exists quote_requests_status_check;
alter table public.quote_requests
  add constraint quote_requests_status_check
  check (status in ('Pending Review', 'Approved', 'Rejected', 'Dispatched'));

alter table public.quote_requests drop constraint if exists quote_requests_quote_type_check;
alter table public.quote_requests
  add constraint quote_requests_quote_type_check
  check (quote_type in ('broker_request', 'client_quote'));

-- Enforce Admin-defined margin limits at database level for Dealers
create or replace function public.enforce_dealer_margin_limits()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_role text;
  cfg jsonb;
  min_margin numeric;
  max_margin numeric;
begin
  if auth.uid() is null then
    return new;
  end if;

  select role into caller_role from public.profiles where id = auth.uid();
  if caller_role <> 'dealer' then
    return new;
  end if;

  select value into cfg from public.system_settings where key = 'platform_config';
  min_margin := coalesce((cfg ->> 'dealerMinMarginPercent')::numeric, 2.0);
  max_margin := coalesce((cfg ->> 'dealerMaxMarginPercent')::numeric, 18.0);

  if TG_TABLE_NAME = 'dealer_clients' then
    if new.custom_margin_percent < min_margin or new.custom_margin_percent > max_margin then
      raise exception 'Client margin (%.1f%%) must stay within Admin-authorized limits (%.1f%% - %.1f%%).',
        new.custom_margin_percent, min_margin, max_margin;
    end if;
  elsif TG_TABLE_NAME = 'quote_requests' then
    if new.margin_percent < min_margin or new.margin_percent > max_margin then
      raise exception 'Quotation margin (%.1f%%) must stay within Admin-authorized limits (%.1f%% - %.1f%%).',
        new.margin_percent, min_margin, max_margin;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_enforce_dealer_client_margin on public.dealer_clients;
create trigger trg_enforce_dealer_client_margin
  before insert or update on public.dealer_clients
  for each row execute function public.enforce_dealer_margin_limits();

drop trigger if exists trg_enforce_dealer_quote_margin on public.quote_requests;
create trigger trg_enforce_dealer_quote_margin
  before insert or update on public.quote_requests
  for each row execute function public.enforce_dealer_margin_limits();

-- 5. Extend shipments with dealer_client_id for individual client shipment history
alter table public.shipments
  add column if not exists dealer_client_id uuid references public.dealer_clients(id) on delete set null;

create index if not exists idx_shipments_dealer_client_id on public.shipments (dealer_client_id);

-- 6. Extend invoices for F. Dealer Client Billing & Payments
alter table public.invoices
  add column if not exists dealer_id uuid references public.profiles(id) on delete set null,
  add column if not exists dealer_client_id uuid references public.dealer_clients(id) on delete set null,
  add column if not exists client_name text not null default '',
  add column if not exists paid_amount_usd integer not null default 0,
  add column if not exists payment_method text,
  add column if not exists paid_at timestamptz;

create index if not exists idx_invoices_dealer_id on public.invoices (dealer_id);

-- Update invoices RLS so Dealers can view, issue, and record payments on their own client invoices
drop policy if exists "invoices_select_scoped" on public.invoices;
create policy "invoices_select_scoped" on public.invoices
  for select to authenticated
  using (
    customer_id = (select auth.uid())
    or dealer_id = (select auth.uid())
    or exists (
      select 1 from public.shipments s
      where s.tracking_id = shipment_tracking_id
        and (s.customer_id = (select auth.uid()) or s.dealer_id = (select auth.uid()))
    )
    or public.current_user_role() in ('staff', 'admin')
  );

drop policy if exists "invoices_insert_dealer_admin" on public.invoices;
create policy "invoices_insert_dealer_admin" on public.invoices
  for insert to authenticated
  with check (
    (public.current_user_role() = 'dealer' and (dealer_id is null or dealer_id = (select auth.uid())))
    or public.current_user_role() in ('admin')
  );

drop policy if exists "invoices_update_scoped" on public.invoices;
create policy "invoices_update_scoped" on public.invoices
  for update to authenticated
  using (
    customer_id = (select auth.uid())
    or dealer_id = (select auth.uid())
    or exists (
      select 1 from public.shipments s
      where s.tracking_id = shipment_tracking_id
        and (s.customer_id = (select auth.uid()) or s.dealer_id = (select auth.uid()))
    )
    or public.current_user_role() in ('staff', 'admin')
  )
  with check (
    customer_id = (select auth.uid())
    or dealer_id = (select auth.uid())
    or exists (
      select 1 from public.shipments s
      where s.tracking_id = shipment_tracking_id
        and (s.customer_id = (select auth.uid()) or s.dealer_id = (select auth.uid()))
    )
    or public.current_user_role() in ('staff', 'admin')
  );

-- 7. Enable Realtime on dealer_clients
do $$
begin
  alter publication supabase_realtime add table public.dealer_clients;
exception
  when duplicate_object then null;
end $$;

notify pgrst, 'reload schema';
