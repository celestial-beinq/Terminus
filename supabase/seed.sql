-- ============================================================================
-- Terminus Cargo Shipping — Seed Data (Ports, Shipments, Milestones, Quotes, Invoices, Gate Tasks)
-- Run after supabase/schema.sql
-- ============================================================================

insert into public.port_hubs (code, name, country, corridor, berth_status, avg_dwell_hours, weekly_sailings)
values
  ('CNSHA', 'Shanghai Yangshan', 'China', 'Asia → Europe', 'Optimal', 14, 28),
  ('SGSIN', 'Singapore Tuas', 'Singapore', 'Intra-Asia', 'Optimal', 11, 34),
  ('NLRTM', 'Rotterdam Maasvlakte II', 'Netherlands', 'Asia → Europe', 'Optimal', 16, 24),
  ('DEHAM', 'Hamburg Eurogate', 'Germany', 'Trans-Atlantic', 'Moderate Queue', 22, 18),
  ('USSAV', 'Savannah Garden City', 'United States', 'Trans-Atlantic', 'Optimal', 15, 19),
  ('USLGB', 'Long Beach Pier T', 'United States', 'Trans-Pacific', 'Moderate Queue', 21, 22)
on conflict (code) do nothing;

insert into public.shipments (
  tracking_id, container_number, seal_number, vessel_name, vessel_imo, voyage_number,
  origin_locode, destination_locode, origin_label, destination_label,
  incoterm, vgm_kg, equipment_code, cargo_type, teu, status, progress_percent, eta, last_free_day,
  set_temp_c, actual_temp_c
)
values
  (
    'TRM-884210', 'TRMU 492018-4', 'SL-904182', 'MV Terminus Horizon', 'IMO 9841205', 'V.264W',
    'CNSHA', 'NLRTM', 'Port of Shanghai (CNSHA)', 'Port of Rotterdam (NLRTM)',
    'CIF', 24800, '40HC', '40ft High-Cube · Industrial Robotics', '2 TEU', 'In Transit', 74,
    'Nov 14, 2026 · 06:30 UTC', 'Nov 19, 2026', null, null
  ),
  (
    'TRM-409112', 'TRMU 771904-1', 'SL-551903', 'MV Atlantic Meridian', 'IMO 9732018', 'V.118E',
    'DEHAM', 'USSAV', 'Port of Hamburg (DEHAM)', 'Port of Savannah (USSAV)',
    'DDP', 21450, '40RF', '40ft Reefer (-18°C) · Biopharma', '2 TEU', 'Customs Cleared', 92,
    'Nov 11, 2026 · 13:00 UTC', 'Nov 15, 2026', -18.0, -18.1
  ),
  (
    'TRM-619305', 'TRMU 305812-9', 'SL-812044', 'MV Pacific Vanguard', 'IMO 9904312', 'V.402E',
    'SGSIN', 'USLGB', 'Port of Singapore (SGSIN)', 'Port of Long Beach (USLGB)',
    'FOB', 26120, '40GP', '40ft Dry · Consumer Electronics', '2 TEU', 'At Berth', 98,
    'Nov 10, 2026 · 19:45 UTC', 'Nov 14, 2026', null, null
  )
on conflict (tracking_id) do nothing;

insert into public.shipment_milestones (shipment_id, event_code, timestamp_label, location, event_description, completed, sort_order)
select s.id, m.event_code, m.ts, m.loc, m.descr, m.done, m.ord
from public.shipments s
join (
  values
    ('TRM-884210', 'GATE_IN', 'Oct 22 · 14:10', 'Shanghai Yangshan Terminal', 'Gate-in & customs export release', true, 1),
    ('TRM-884210', 'LOADED', 'Oct 23 · 21:45', 'Shanghai Berth 4', 'Loaded aboard MV Terminus Horizon', true, 2),
    ('TRM-884210', 'AIS_TRANSIT', 'Nov 04 · 09:20', 'Suez Maritime Corridor', 'Northbound convoy transit cleared', true, 3),
    ('TRM-884210', 'DISCHARGE', 'Nov 14 · 06:30', 'Rotterdam Maasvlakte II', 'Scheduled berth arrival & drayage handoff', false, 4),

    ('TRM-409112', 'REEFER_SEAL', 'Oct 29 · 08:05', 'Hamburg Eurogate', 'Pre-cooled reefer sealed & loaded', true, 1),
    ('TRM-409112', 'THERMAL_OK', 'Nov 03 · 16:40', 'North Atlantic Lane', 'Thermal telemetry nominal (-18.1°C)', true, 2),
    ('TRM-409112', 'CBP_CLEAR', 'Nov 10 · 07:15', 'Savannah CBP Pre-Clearance', 'Electronic customs release approved', true, 3),
    ('TRM-409112', 'CHASSIS_OUT', 'Nov 11 · 13:00', 'Savannah Garden City Terminal', 'Discharge to chassis fleet', false, 4),

    ('TRM-619305', 'GATE_IN', 'Oct 24 · 11:20', 'Singapore Tuas Terminal', 'Export manifest verified & loaded', true, 1),
    ('TRM-619305', 'AIS_TRANSIT', 'Nov 02 · 04:15', 'Mid-Pacific Corridor', 'Schedule check passed · 21.4 knots', true, 2),
    ('TRM-619305', 'BERTH', 'Nov 10 · 09:30', 'Long Beach Pier T', 'Vessel berthed · gantry discharge active', true, 3),
    ('TRM-619305', 'RAIL_RAMP', 'Nov 10 · 19:45', 'Long Beach Rail Ramp', 'Intermodal rail departure window', false, 4)
) as m(tid, event_code, ts, loc, descr, done, ord)
on s.tracking_id = m.tid
where not exists (
  select 1 from public.shipment_milestones existing where existing.shipment_id = s.id
);

insert into public.quote_requests (quote_ref, client_name, contact_email, freight_mode, trade_lane, equipment, rate_usd, margin_percent, status)
values
  ('DLQ-904', 'Lumen Logistics™', 'elena@lumenlogistics.com', 'Ocean FCL (40ft HC)', 'Shanghai (CNSHA) → Rotterdam (NLRTM)', '4 × 40ft High-Cube', 17940, 8.5, 'Pending Review'),
  ('DLQ-908', 'Nordic ColdFreight', 'henrik@nordiccold.se', 'Active Reefer (-18°C)', 'Hamburg (DEHAM) → Savannah (USSAV)', '2 × 40ft Active Reefer', 8510, 9.2, 'Approved'),
  ('DLQ-912', 'Vanguard Industrial', 'ops@vanguardind.com', 'Ocean FCL (40ft Dry)', 'Singapore (SGSIN) → Long Beach (USLGB)', '6 × 40ft Standard Dry', 23580, 7.8, 'Pending Review')
on conflict (quote_ref) do nothing;

insert into public.invoices (invoice_number, shipment_tracking_id, lane, amount_usd, due_date, status)
values
  ('INV-2026-410', 'TRM-884210', 'CNSHA → NLRTM', 4658, 'Nov 18, 2026', 'Due'),
  ('INV-2026-392', 'TRM-409112', 'DEHAM → USSAV', 4255, 'Nov 02, 2026', 'Paid')
on conflict (invoice_number) do nothing;

insert into public.gate_tasks (task_code, container_number, terminal_name, vessel_name, action_required, completed)
values
  ('OPS-51', 'TRMU 492018-4', 'Rotterdam Maasvlakte II', 'MV Terminus Horizon', 'Pre-clear EU customs manifest & assign drayage slot', false),
  ('OPS-52', 'TRMU 771904-1', 'Savannah Garden City', 'MV Atlantic Meridian', 'Confirm reefer shore-power disconnect & chassis release', true),
  ('OPS-53', 'TRMU 305812-9', 'Long Beach Pier T', 'MV Pacific Vanguard', 'Verify gantry crane discharge & rail ramp seal', false)
on conflict (task_code) do nothing;

insert into public.activity_events (tag, message)
select 'AIS SYNC', 'MV Terminus Horizon cleared Suez corridor · ETA Rotterdam Nov 14'
where not exists (select 1 from public.activity_events);

