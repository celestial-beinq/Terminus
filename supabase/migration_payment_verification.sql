-- ============================================================================
-- Terminus Payment Verification Gate Migration
-- Enforces:
--   1. Customers CANNOT mark their own invoices Paid or Verified.
--   2. Customers submit payment details/proof -> status stays 'Due' with
--      verification_status = 'pending_verification'.
--   3. Only Admin or Staff can verify or reject payments.
--   4. Customers MUST have an unused Admin/Staff-verified payment before
--      creating a shipment request or booking.
-- ============================================================================

-- 1. Extend invoices with verification workflow columns
alter table public.invoices
  add column if not exists verification_status text not null default 'unpaid'
    check (verification_status in ('unpaid', 'pending_verification', 'verified', 'rejected')),
  add column if not exists payment_reference text,
  add column if not exists payment_proof_name text,
  add column if not exists payment_proof_path text,
  add column if not exists verification_note text,
  add column if not exists verified_by uuid references public.profiles(id) on delete set null,
  add column if not exists verified_at timestamptz;

-- Backfill any historically Paid invoices as verified
update public.invoices
set verification_status = 'verified'
where status = 'Paid' and verification_status = 'unpaid';

-- 2. Link shipment_requests and shipments to the verified invoice
alter table public.shipment_requests
  add column if not exists verified_invoice_number text;

alter table public.shipments
  add column if not exists verified_invoice_number text;

create unique index if not exists idx_shipment_requests_verified_invoice_unique
  on public.shipment_requests (verified_invoice_number)
  where verified_invoice_number is not null and status <> 'Cancelled';

-- 3. Update invoices RLS policies so customers can submit payment details (not verify!)
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

-- 4. Trigger: strictly prevent non-admin/non-staff from self-verifying or marking Paid
create or replace function public.protect_invoice_verification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_role text;
begin
  if auth.uid() is null then
    return new;
  end if;

  select role into caller_role from public.profiles where id = auth.uid();

  if caller_role not in ('admin', 'staff') then
    -- Non-ops users can never mark an invoice Paid or Verified
    if new.status = 'Paid' or new.verification_status = 'verified' then
      raise exception 'Only an Admin or Staff operator can verify payment and mark an invoice Paid.';
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

-- 5. Trigger: require a verified, unused invoice before a customer creates a shipment request
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
      raise exception 'Payment must be submitted and verified by Admin or Staff before creating a shipment request.';
    end if;

    select invoice_number, customer_id, status, verification_status
    into inv_record
    from public.invoices
    where invoice_number = trim(new.verified_invoice_number);

    if inv_record.invoice_number is null
       or inv_record.customer_id <> auth.uid()
       or inv_record.status <> 'Paid'
       or inv_record.verification_status <> 'verified' then
      raise exception 'Referenced payment is missing or not yet verified by Admin or Staff.';
    end if;

    select exists (
      select 1
      from public.shipment_requests r
      where r.verified_invoice_number = inv_record.invoice_number
        and r.status <> 'Cancelled'
    ) into already_used;

    if already_used then
      raise exception 'This verified payment has already been used for another shipment request.';
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

notify pgrst, 'reload schema';

