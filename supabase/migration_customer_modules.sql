-- ============================================================================
-- Terminus Customer Dashboard Modules Migration (A-H)
-- Run in Supabase SQL Editor to add customer profile/notification preferences,
-- shipment request specs & document attachments, invoice receipts, customer
-- notifications, and support tickets/messages with strict RLS & Realtime.
-- ============================================================================

-- 1. Extend profiles with customer contact phone & notification preferences
alter table public.profiles
  add column if not exists phone text,
  add column if not exists notification_prefs jsonb not null default '{
    "shipmentConfirmation": true,
    "dispatchUpdates": true,
    "portArrival": true,
    "customsUpdates": true,
    "deliveryNotifications": true,
    "invoiceReminders": true
  }'::jsonb;

-- 2. Extend shipments with customer request metadata & uploaded documents
alter table public.shipments
  add column if not exists cargo_description text,
  add column if not exists shipping_method text not null default 'Ocean FCL',
  add column if not exists dimensions_cm text,
  add column if not exists shipping_docs jsonb not null default '[]'::jsonb;

-- 3. Extend invoices with payment tracking & receipt numbers
alter table public.invoices
  add column if not exists paid_at timestamptz,
  add column if not exists payment_method text,
  add column if not exists receipt_number text;

-- 4. Shipment Requests (Customer Booking & Service Requests History)
create table if not exists public.shipment_requests (
  id uuid primary key default gen_random_uuid(),
  request_ref text not null unique,
  customer_id uuid not null references public.profiles(id) on delete cascade default auth.uid(),
  cargo_type text not null,
  cargo_description text not null default '',
  origin_locode text not null,
  destination_locode text not null,
  origin_label text not null,
  destination_label text not null,
  weight_kg integer not null default 12000,
  dimensions_cm text not null default '1200 x 235 x 269 cm',
  shipping_method text not null default 'Ocean FCL',
  incoterm text not null default 'CIF' check (incoterm in ('EXW', 'FOB', 'CIF', 'DDP')),
  documents jsonb not null default '[]'::jsonb,
  status text not null default 'Confirmed' check (status in ('Submitted', 'Under Review', 'Confirmed', 'Cancelled')),
  linked_tracking_id text,
  created_at timestamptz not null default now()
);

create index if not exists idx_shipment_requests_customer_id on public.shipment_requests (customer_id, created_at desc);

-- 5. Customer Notifications (Confirmation, Dispatch, Port Arrival, Customs, Delivery, Invoice)
create table if not exists public.customer_notifications (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles(id) on delete cascade default auth.uid(),
  category text not null check (
    category in ('confirmation', 'dispatch', 'port_arrival', 'customs', 'delivery', 'invoice')
  ),
  title text not null,
  message text not null,
  tracking_id text,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_customer_notifications_customer_id on public.customer_notifications (customer_id, created_at desc);

-- 6. Customer Support Tickets & Threaded Messages
create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  ticket_ref text not null unique,
  customer_id uuid not null references public.profiles(id) on delete cascade default auth.uid(),
  shipment_tracking_id text,
  ticket_type text not null default 'ticket' check (ticket_type in ('ticket', 'enquiry', 'issue')),
  subject text not null,
  priority text not null default 'Normal' check (priority in ('Normal', 'High', 'Urgent')),
  status text not null default 'Open' check (status in ('Open', 'In Review', 'Resolved')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_support_tickets_customer_id on public.support_tickets (customer_id, updated_at desc);

create table if not exists public.support_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.support_tickets(id) on delete cascade,
  sender_id uuid references public.profiles(id) on delete set null default auth.uid(),
  sender_role text not null default 'customer' check (sender_role in ('customer', 'staff', 'admin')),
  sender_name text not null,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_support_messages_ticket_id on public.support_messages (ticket_id, created_at asc);

-- Enable RLS
alter table public.shipment_requests enable row level security;
alter table public.customer_notifications enable row level security;
alter table public.support_tickets enable row level security;
alter table public.support_messages enable row level security;

-- Shipment Requests RLS
drop policy if exists "shipment_requests_select_scoped" on public.shipment_requests;
create policy "shipment_requests_select_scoped" on public.shipment_requests
  for select to authenticated
  using (
    customer_id = (select auth.uid())
    or public.current_user_role() in ('staff', 'admin')
  );

drop policy if exists "shipment_requests_insert_scoped" on public.shipment_requests;
create policy "shipment_requests_insert_scoped" on public.shipment_requests
  for insert to authenticated
  with check (
    customer_id = (select auth.uid())
    or public.current_user_role() in ('staff', 'admin')
  );

drop policy if exists "shipment_requests_update_scoped" on public.shipment_requests;
create policy "shipment_requests_update_scoped" on public.shipment_requests
  for update to authenticated
  using (
    customer_id = (select auth.uid())
    or public.current_user_role() in ('staff', 'admin')
  )
  with check (
    customer_id = (select auth.uid())
    or public.current_user_role() in ('staff', 'admin')
  );

-- Customer Notifications RLS
drop policy if exists "customer_notifications_select_scoped" on public.customer_notifications;
create policy "customer_notifications_select_scoped" on public.customer_notifications
  for select to authenticated
  using (
    customer_id = (select auth.uid())
    or public.current_user_role() in ('staff', 'admin')
  );

drop policy if exists "customer_notifications_insert_scoped" on public.customer_notifications;
create policy "customer_notifications_insert_scoped" on public.customer_notifications
  for insert to authenticated
  with check (
    customer_id = (select auth.uid())
    or public.current_user_role() in ('staff', 'admin')
  );

drop policy if exists "customer_notifications_update_scoped" on public.customer_notifications;
create policy "customer_notifications_update_scoped" on public.customer_notifications
  for update to authenticated
  using (
    customer_id = (select auth.uid())
    or public.current_user_role() in ('staff', 'admin')
  )
  with check (
    customer_id = (select auth.uid())
    or public.current_user_role() in ('staff', 'admin')
  );

-- Support Tickets RLS
drop policy if exists "support_tickets_select_scoped" on public.support_tickets;
create policy "support_tickets_select_scoped" on public.support_tickets
  for select to authenticated
  using (
    customer_id = (select auth.uid())
    or public.current_user_role() in ('staff', 'admin')
  );

drop policy if exists "support_tickets_insert_scoped" on public.support_tickets;
create policy "support_tickets_insert_scoped" on public.support_tickets
  for insert to authenticated
  with check (
    customer_id = (select auth.uid())
    or public.current_user_role() in ('staff', 'admin')
  );

drop policy if exists "support_tickets_update_scoped" on public.support_tickets;
create policy "support_tickets_update_scoped" on public.support_tickets
  for update to authenticated
  using (
    customer_id = (select auth.uid())
    or public.current_user_role() in ('staff', 'admin')
  )
  with check (
    customer_id = (select auth.uid())
    or public.current_user_role() in ('staff', 'admin')
  );

-- Support Messages RLS
drop policy if exists "support_messages_select_scoped" on public.support_messages;
create policy "support_messages_select_scoped" on public.support_messages
  for select to authenticated
  using (
    exists (
      select 1 from public.support_tickets t
      where t.id = ticket_id
        and (
          t.customer_id = (select auth.uid())
          or public.current_user_role() in ('staff', 'admin')
        )
    )
  );

drop policy if exists "support_messages_insert_scoped" on public.support_messages;
create policy "support_messages_insert_scoped" on public.support_messages
  for insert to authenticated
  with check (
    exists (
      select 1 from public.support_tickets t
      where t.id = ticket_id
        and (
          t.customer_id = (select auth.uid())
          or public.current_user_role() in ('staff', 'admin')
        )
    )
  );

grant select, insert, update on
  public.shipment_requests,
  public.customer_notifications,
  public.support_tickets,
  public.support_messages
to authenticated;

-- Optional private bucket for customer shipping document uploads
insert into storage.buckets (id, name, public)
values ('shipping-documents', 'shipping-documents', false)
on conflict (id) do nothing;

drop policy if exists "shipping_docs_select_own" on storage.objects;
create policy "shipping_docs_select_own" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'shipping-documents'
    and (
      (select auth.uid())::text = (storage.foldername(name))[1]
      or public.current_user_role() in ('staff', 'admin')
    )
  );

drop policy if exists "shipping_docs_insert_own" on storage.objects;
create policy "shipping_docs_insert_own" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'shipping-documents'
    and (select auth.uid())::text = (storage.foldername(name))[1]
  );

drop policy if exists "shipping_docs_update_own" on storage.objects;
create policy "shipping_docs_update_own" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'shipping-documents'
    and (select auth.uid())::text = (storage.foldername(name))[1]
  )
  with check (
    bucket_id = 'shipping-documents'
    and (select auth.uid())::text = (storage.foldername(name))[1]
  );

-- Enable Realtime on customer tables
do $$
begin
  alter publication supabase_realtime add table public.shipment_requests;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.customer_notifications;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.support_tickets;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.support_messages;
exception
  when duplicate_object then null;
end $$;

notify pgrst, 'reload schema';
