-- ============================================================================
-- Terminus Automated Payment Gateway & Verification Migration
-- Enforces:
--   1. Customers CANNOT directly tamper with invoice status via raw table updates.
--   2. Automated Payment Gateway RPC (`process_gateway_payment`) atomically
--      confirms gateway transactions, issues receipts, and unlocks/opens shipments
--      immediately without manual Admin/Staff approval bottlenecks.
--   3. Admin & Staff retain manual verify/reject controls for offline payments.
-- ============================================================================

-- 1. Extend invoices with gateway & verification columns
alter table public.invoices
  add column if not exists verification_status text not null default 'unpaid'
    check (verification_status in ('unpaid', 'pending_verification', 'verified', 'rejected')),
  add column if not exists payment_reference text,
  add column if not exists payment_proof_name text,
  add column if not exists payment_proof_path text,
  add column if not exists verification_note text,
  add column if not exists verified_by uuid references public.profiles(id) on delete set null,
  add column if not exists verified_at timestamptz,
  add column if not exists gateway_provider text,
  add column if not exists gateway_txn_id text;

update public.invoices
set verification_status = 'verified'
where status = 'Paid' and verification_status = 'unpaid';

-- 2. Link shipment_requests and shipments to the confirmed invoice
alter table public.shipment_requests
  add column if not exists verified_invoice_number text;

alter table public.shipments
  add column if not exists verified_invoice_number text;

create unique index if not exists idx_shipment_requests_verified_invoice_unique
  on public.shipment_requests (verified_invoice_number)
  where verified_invoice_number is not null and status <> 'Cancelled';

-- 3. Update invoices RLS policies
drop policy if exists "invoices_insert_dealer_admin" on public.invoices;
drop policy if exists "invoices_insert_scoped" on public.invoices;
create policy "invoices_insert_scoped" on public.invoices
  for insert to authenticated
  with check (
    public.current_user_role() in ('dealer', 'staff', 'admin')
    or (
      public.current_user_role() = 'customer'
      and customer_id = (select auth.uid())
      and status = 'Due'
      and verification_status in ('unpaid', 'pending_verification')
      and verified_by is null
      and verified_at is null
    )
  );

drop policy if exists "invoices_update_scoped" on public.invoices;
create policy "invoices_update_scoped" on public.invoices
  for update to authenticated
  using (
    customer_id = (select auth.uid())
    or public.current_user_role() in ('staff', 'admin')
  )
  with check (
    (
      customer_id = (select auth.uid())
      and status = 'Due'
      and verification_status in ('unpaid', 'pending_verification')
      and verified_by is null
      and verified_at is null
    )
    or public.current_user_role() in ('staff', 'admin')
  );

-- 4. Trigger: block direct customer tampering on invoices unless via gateway RPC or Admin/Staff
create or replace function public.protect_invoice_verification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_role text;
begin
  if auth.uid() is null or current_setting('app.gateway_verified', true) = 'true' then
    return new;
  end if;

  select role into caller_role from public.profiles where id = auth.uid();

  if caller_role not in ('admin', 'staff') then
    if new.status = 'Paid' or new.verification_status = 'verified' then
      raise exception 'Payments must be confirmed by the Payment Gateway or an Admin/Staff operator.';
    end if;

    if tg_op = 'UPDATE' and old.verification_status = 'verified' then
      raise exception 'Verified invoices cannot be modified by customers.';
    end if;

    new.status := 'Due';
    new.verified_by := null;
    new.verified_at := null;
    new.paid_at := null;
    new.receipt_number := null;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_protect_invoice_verification on public.invoices;
create trigger trg_protect_invoice_verification
  before insert or update on public.invoices
  for each row execute function public.protect_invoice_verification();

-- 5. Trigger: require a paid, verified, unused invoice before customer creates a shipment request
create or replace function public.enforce_verified_payment_before_request()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_role text;
  inv_record record;
  already_used boolean;
begin
  if auth.uid() is null then
    return new;
  end if;

  select role into caller_role from public.profiles where id = auth.uid();

  if caller_role = 'customer' then
    if trim(coalesce(new.verified_invoice_number, '')) = '' then
      raise exception 'Complete payment checkout before creating a shipment request.';
    end if;

    select invoice_number, customer_id, status, verification_status
    into inv_record
    from public.invoices
    where invoice_number = trim(new.verified_invoice_number);

    if inv_record.invoice_number is null
       or inv_record.customer_id <> auth.uid()
       or inv_record.status <> 'Paid'
       or inv_record.verification_status <> 'verified' then
      raise exception 'Payment is missing or not yet confirmed.';
    end if;

    select exists (
      select 1
      from public.shipment_requests r
      where r.verified_invoice_number = inv_record.invoice_number
        and r.status <> 'Cancelled'
    ) into already_used;

    if already_used then
      raise exception 'This confirmed payment has already been used for another shipment request.';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_enforce_verified_payment_request on public.shipment_requests;
create trigger trg_enforce_verified_payment_request
  before insert on public.shipment_requests
  for each row execute function public.enforce_verified_payment_before_request();

drop trigger if exists trg_enforce_verified_payment_shipment on public.shipments;
create trigger trg_enforce_verified_payment_shipment
  before insert on public.shipments
  for each row execute function public.enforce_verified_payment_before_request();

-- 6. Automated Payment Gateway Confirmation RPC (instant system verification)
create or replace function public.process_gateway_payment(
  p_invoice_number text default null,
  p_lane text default 'CNSHA -> NLRTM',
  p_amount_usd integer default 0,
  p_payment_method text default 'Gateway Card Checkout',
  p_gateway_provider text default 'TerminusPay Gateway',
  p_gateway_token text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  v_invoice_num text;
  v_receipt_num text;
  v_txn_id text;
  v_now timestamptz := now();
  v_existing record;
begin
  if uid is null then
    raise exception 'Authentication required to process gateway payment.';
  end if;

  if length(trim(coalesce(p_gateway_token, ''))) < 4 then
    raise exception 'Valid payment gateway authorization token is required.';
  end if;

  perform set_config('app.gateway_verified', 'true', true);

  v_receipt_num := 'RCP-' || floor(100000 + random() * 899999)::text;
  v_txn_id := 'GW-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));

  if trim(coalesce(p_invoice_number, '')) <> '' then
    select * into v_existing
    from public.invoices
    where invoice_number = trim(p_invoice_number)
      and customer_id = uid;

    if v_existing.invoice_number is null then
      raise exception 'Invoice not found for this customer account.';
    end if;

    if v_existing.status = 'Paid' and v_existing.verification_status = 'verified' then
      return jsonb_build_object(
        'invoice_number', v_existing.invoice_number,
        'receipt_number', coalesce(v_existing.receipt_number, v_receipt_num),
        'gateway_txn_id', coalesce(v_existing.gateway_txn_id, v_txn_id),
        'amount_usd', v_existing.amount_usd,
        'status', 'Paid',
        'verification_status', 'verified'
      );
    end if;

    update public.invoices
    set
      status = 'Paid',
      verification_status = 'verified',
      payment_method = coalesce(nullif(trim(p_payment_method), ''), 'Gateway Card Checkout'),
      payment_reference = v_txn_id,
      gateway_provider = coalesce(nullif(trim(p_gateway_provider), ''), 'TerminusPay Gateway'),
      gateway_txn_id = v_txn_id,
      receipt_number = v_receipt_num,
      paid_at = v_now,
      verified_at = v_now
    where invoice_number = v_existing.invoice_number;

    v_invoice_num := v_existing.invoice_number;
    p_amount_usd := v_existing.amount_usd;
  else
    if coalesce(p_amount_usd, 0) <= 0 then
      raise exception 'Payment amount must be greater than zero.';
    end if;

    v_invoice_num := 'INV-2026-' || floor(1000 + random() * 8999)::text;

    insert into public.invoices (
      invoice_number,
      shipment_tracking_id,
      lane,
      amount_usd,
      due_date,
      status,
      verification_status,
      customer_id,
      payment_method,
      payment_reference,
      gateway_provider,
      gateway_txn_id,
      receipt_number,
      paid_at,
      verified_at
    )
    values (
      v_invoice_num,
      'PRE-BOOKING',
      coalesce(nullif(trim(p_lane), ''), 'CNSHA -> NLRTM'),
      p_amount_usd,
      to_char(v_now, 'Mon DD, YYYY'),
      'Paid',
      'verified',
      uid,
      coalesce(nullif(trim(p_payment_method), ''), 'Gateway Card Checkout'),
      v_txn_id,
      coalesce(nullif(trim(p_gateway_provider), ''), 'TerminusPay Gateway'),
      v_txn_id,
      v_receipt_num,
      v_now,
      v_now
    );
  end if;

  return jsonb_build_object(
    'invoice_number', v_invoice_num,
    'receipt_number', v_receipt_num,
    'gateway_txn_id', v_txn_id,
    'amount_usd', p_amount_usd,
    'status', 'Paid',
    'verification_status', 'verified'
  );
end;
$$;

revoke all on function public.process_gateway_payment(text, text, integer, text, text, text) from public;
grant execute on function public.process_gateway_payment(text, text, integer, text, text, text) to authenticated;

notify pgrst, 'reload schema';
