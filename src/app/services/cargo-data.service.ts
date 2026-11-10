import { Injectable, inject, signal } from '@angular/core';
import { AuthService } from './auth.service';
import { SupabaseService } from './supabase.service';

export interface ShipmentMilestone {
  timestamp: string;
  location: string;
  event: string;
  completed: boolean;
}

export interface ShipmentRecord {
  id?: string;
  customerId?: string | null;
  dealerId?: string | null;
  assignedStaffId?: string | null;
  trackingId: string;
  containerNumber: string;
  sealNumber?: string;
  vessel: string;
  voyage?: string;
  origin: string;
  destination: string;
  incoterm?: 'EXW' | 'FOB' | 'CIF' | 'DDP';
  vgmKg?: number;
  eta: string;
  lastFreeDay?: string;
  status: 'Booking Confirmed' | 'In Transit' | 'Customs Cleared' | 'At Berth' | 'Delivered';
  customsStatus?: 'Pending' | 'Docs Verified' | 'Hold / Inspection' | 'Cleared';
  isDelayed?: boolean;
  disputeNote?: string | null;
  freightChargeUsd?: number;
  cargoType: string;
  teu: string;
  progressPercent: number;
  milestones: ShipmentMilestone[];
}

export interface TelemetryLogItem {
  id: string;
  channel: 'AIS' | 'EDI' | 'API' | 'AUTH' | 'WEBHOOK';
  severity: 'info' | 'warn' | 'error';
  endpoint: string;
  latencyMs: number;
  message: string;
  createdAt: string;
}

export interface SystemConfig {
  autoCustomsPreclearance: boolean;
  demurrageAlertHours: number;
  aisPollingMinutes: number;
  webhookNotifications: boolean;
  requireDealerDocs: boolean;
  strictMfaForAdmins: boolean;
}

export interface CargoServiceItem {
  id: string;
  code: string;
  title: string;
  summary: string;
  transitWindow: string;
  capacity: string;
  highlights: string[];
}

export interface CaseStudyItem {
  slug: string;
  client: string;
  sector: string;
  headline: string;
  summary: string;
  impactMetric: string;
  impactLabel: string;
  imageUrl: string;
  highlights: string[];
}

export interface StatMetric {
  value: string;
  label: string;
  detail: string;
}

export interface PortHub {
  code: string;
  name: string;
  country: string;
  corridor: 'Asia → Europe' | 'Trans-Atlantic' | 'Trans-Pacific' | 'Intra-Asia';
  berthStatus: 'Optimal' | 'Moderate Queue';
  avgDwellHours: number;
  weeklySailings: number;
}

export interface ContainerSpec {
  id: string;
  label: string;
  teuCount: number;
  maxPayloadKg: string;
  volumeCbm: string;
  rateMultiplier: number;
}

export interface FreightQuoteResult {
  origin: PortHub;
  destination: PortHub;
  container: ContainerSpec;
  quantity: number;
  transitDays: number;
  oceanFreightUsd: number;
  terminalHandlingUsd: number;
  totalUsd: number;
  co2Tonnes: number;
}

export interface QuoteDraft {
  mode: string;
  lane: string;
  notes: string;
}

export interface WorkflowStep {
  number: string;
  tag: string;
  title: string;
  description: string;
  imageUrl: string;
  imageAlt: string;
}

export interface CountryCorridor {
  country: string;
  code: string;
  ports: string;
  region: string;
  annualTeus: string;
}

export interface TestimonialItem {
  quote: string;
  author: string;
  role: string;
  company: string;
  lane: string;
}

export interface FaqItem {
  question: string;
  answer: string;
}

export interface DealerQuoteItem {
  id: string;
  client: string;
  lane: string;
  equipment: string;
  rateUsd: number;
  marginPercent: number;
  status: 'Pending Review' | 'Approved' | 'Dispatched';
}

export interface InvoiceItem {
  id: string;
  shipmentId: string;
  lane: string;
  amountUsd: number;
  dueDate: string;
  status: 'Paid' | 'Due';
}

export interface PortGateTask {
  id: string;
  containerNumber: string;
  terminal: string;
  action: string;
  vessel: string;
  completed: boolean;
}

export interface ActivityEvent {
  id: string;
  timestamp: string;
  tag: string;
  message: string;
}

@Injectable({ providedIn: 'root' })
export class CargoDataService {
  private readonly supabase = inject(SupabaseService);
  private readonly auth = inject(AuthService);

  readonly isRealtimeLive = this.supabase.isLiveConnected;
  readonly lastSyncLabel = signal<string>('Connecting to Supabase...');

  // Static marketing & equipment reference catalogs (non-operational)
  readonly stats: StatMetric[] = [
    { value: '140+', label: 'Global Port Terminals', detail: 'Direct berth allocations across 6 continents' },
    { value: '2.4M', label: 'TEUs Moved Annually', detail: 'Dry, reefer, and out-of-gauge container volume' },
    { value: '99.4%', label: 'Schedule Integrity', detail: 'Automated rerouting & port congestion telemetry' },
    { value: '< 15m', label: 'Customs Pre-Clearance', detail: 'Unified manifest & EDI/API border filings' },
  ];

  readonly services: CargoServiceItem[] = [
    {
      id: 'ocean-fcl',
      code: '01 / OCEAN',
      title: 'Full Container Load (FCL)',
      summary: 'Dedicated 20ft, 40ft, and High-Cube container allocations with priority berth windows on major East-West maritime corridors.',
      transitWindow: '14–28 Days Port-to-Port',
      capacity: '20ft / 40ft / 40ft HC',
      highlights: ['Guaranteed carrier space protection', 'Automated bill of lading issuance', 'Real-time AIS vessel telemetry'],
    },
    {
      id: 'ocean-lcl',
      code: '02 / CONSOLIDATION',
      title: 'Less-than-Container (LCL)',
      summary: 'Weekly fixed-day sailing schedules for palletized freight with direct hub-to-hub deconsolidation and zero hidden terminal fees.',
      transitWindow: '18–32 Days Door-to-Port',
      capacity: '1–15 CBM Flexible',
      highlights: ['Weekly fixed departures', 'Barcode-verified hub cross-docking', 'Unified per-CBM transparent pricing'],
    },
    {
      id: 'reefer-cold',
      code: '03 / COLD CHAIN',
      title: 'Temperature-Controlled Reefer',
      summary: 'Active IoT-monitored reefer containers maintaining -30°C to +25°C stability for pharmaceuticals, perishables, and precision chemicals.',
      transitWindow: 'Priority Cold Corridor',
      capacity: '40ft High-Cube Reefer',
      highlights: ['Continuous satellite temp alerts', 'Pre-trip USDA/GDP certification', 'Shore-power berth priority'],
    },
    {
      id: 'multimodal',
      code: '04 / MULTIMODAL',
      title: 'Port-to-Door Intermodal',
      summary: 'Seamless drayage, rail ramp transfers, and inland trucking synchronized with vessel arrival so containers never sit idle in demurrage.',
      transitWindow: 'Same-Day Berth Dispatch',
      capacity: 'Rail + Chassis Fleet',
      highlights: ['Automated chassis & appointment booking', 'Zero-demurrage dwell alerts', 'Single chain-of-custody invoice'],
    },
  ];

  readonly caseStudies: CaseStudyItem[] = [
    {
      slug: 'lumen-logistics',
      client: 'Lumen Logistics™',
      sector: 'Regional Fulfillment & Port Drayage',
      headline: 'Supporting rapid warehouse expansion through unified tracking.',
      summary:
        'Lumen Logistics consolidated 14 regional ocean and inland drayage carriers onto Terminus telemetry, cutting container dwell times at Rotterdam and Savannah by nearly half.',
      impactMetric: '-42%',
      impactLabel: 'Average Container Dwell Time',
      imageUrl: '/images/case-study-operator.jpg',
      highlights: [
        'Unified EDI + AIS tracking across 18,400 annual TEUs',
        'Automated customs pre-clearance prior to vessel berth',
        'Eliminated $1.8M in annual detention & demurrage penalties',
      ],
    },
    {
      slug: 'nordic-coldfreight',
      client: 'Nordic ColdFreight',
      sector: 'Pharmaceutical & Marine Cold Chain',
      headline: 'Zero-excursion cold chain visibility across North Atlantic lanes.',
      summary:
        'By streaming live container thermal telemetry into warehouse dispatch queues, Nordic ColdFreight achieved full GDP compliance across 640 monthly reefer crossings.',
      impactMetric: '99.98%',
      impactLabel: 'Thermal Compliance Rate',
      imageUrl: '/images/hero-cargo-port.jpg',
      highlights: [
        '15-minute satellite temperature & humidity heartbeats',
        'Automated exception routing at Hamburg and Halifax ports',
        'Full audit trail exported directly to ERP systems',
      ],
    },
    {
      slug: 'vanguard-industrial',
      client: 'Vanguard Industrial',
      sector: 'Heavy Manufacturing & Trans-Pacific FCL',
      headline: 'Eliminating port detention across 12,000 annual Pacific containers.',
      summary:
        'Vanguard Industrial automated berth chassis appointments and customs pre-clearance between Singapore and Long Beach, cutting inland handoff delays by 56%.',
      impactMetric: '$1.2M',
      impactLabel: 'Annual Detention Savings',
      imageUrl: '/images/crane-container-lift.jpg',
      highlights: [
        'Direct rail-ramp integration at Long Beach Pier T',
        'Automated 40ft High-Cube space protection during Q4 peaks',
        'Real-time ERP milestone webhooks for plant scheduling',
      ],
    },
  ];

  readonly containerSpecs: ContainerSpec[] = [
    { id: '20-dry', label: '20ft Standard Dry', teuCount: 1, maxPayloadKg: '28,200 kg', volumeCbm: '33.2 CBM', rateMultiplier: 1.0 },
    { id: '40-dry', label: '40ft Standard Dry', teuCount: 2, maxPayloadKg: '26,600 kg', volumeCbm: '67.7 CBM', rateMultiplier: 1.72 },
    { id: '40-hc', label: '40ft High-Cube', teuCount: 2, maxPayloadKg: '26,460 kg', volumeCbm: '76.3 CBM', rateMultiplier: 1.85 },
    { id: '40-reefer', label: '40ft Active Reefer (-18°C)', teuCount: 2, maxPayloadKg: '29,350 kg', volumeCbm: '59.3 CBM', rateMultiplier: 2.45 },
  ];

  readonly workflowSteps: WorkflowStep[] = [
    {
      number: '01',
      tag: 'BOOK & ALLOCATE',
      title: 'Lock vessel space & container equipment',
      description:
        'Select your origin terminal, container class (20ft, 40ft HC, or Active Reefer), and sailing window with guaranteed carrier allocation.',
      imageUrl: '/images/multimodal-freight.jpg',
      imageAlt: 'Multimodal ocean, air, and road cargo equipment',
    },
    {
      number: '02',
      tag: 'GATE-IN & CLEAR',
      title: 'Automated manifests & port crane loading',
      description:
        'Digital Bill of Lading and customs pre-clearance filings transmit automatically before your sealed container reaches the gantry crane.',
      imageUrl: '/images/crane-container-lift.jpg',
      imageAlt: 'Port crane loading red cargo container onto truck chassis',
    },
    {
      number: '03',
      tag: 'OCEAN TRANSIT & AIS',
      title: 'Continuous maritime & thermal telemetry',
      description:
        'Monitor vessel coordinates, speed, weather deviations, and live reefer container temperatures from a single unified manifest.',
      imageUrl: '/images/container-deck-sea.jpg',
      imageAlt: 'Container ship deck loaded with shipping containers crossing ocean',
    },
    {
      number: '04',
      tag: 'DISCHARGE & DRAYAGE',
      title: 'Priority berth discharge to final warehouse',
      description:
        'Pre-booked chassis appointments and rail ramp transfers move freight off the terminal immediately—eliminating demurrage fees.',
      imageUrl: '/images/ocean-vessel-aerial.jpg',
      imageAlt: 'Overhead aerial view of container ship navigating open water',
    },
  ];

  readonly countries: CountryCorridor[] = [
    { country: 'China', code: 'CN', ports: 'Shanghai · Ningbo · Shenzhen', region: 'East Asia', annualTeus: '640K TEU' },
    { country: 'Netherlands', code: 'NL', ports: 'Rotterdam Maasvlakte II', region: 'Western Europe', annualTeus: '410K TEU' },
    { country: 'United States', code: 'US', ports: 'Savannah · Long Beach · Newark', region: 'North America', annualTeus: '520K TEU' },
    { country: 'Singapore', code: 'SG', ports: 'Tuas Mega Port · Pasir Panjang', region: 'Southeast Asia', annualTeus: '380K TEU' },
    { country: 'Germany', code: 'DE', ports: 'Hamburg Eurogate · Bremerhaven', region: 'Central Europe', annualTeus: '215K TEU' },
    { country: 'United Kingdom', code: 'GB', ports: 'Felixstowe · London Gateway', region: 'Northern Europe', annualTeus: '140K TEU' },
    { country: 'United Arab Emirates', code: 'AE', ports: 'Jebel Ali · Khalifa Port', region: 'Middle East', annualTeus: '185K TEU' },
    { country: 'South Korea', code: 'KR', ports: 'Busan New Port · Incheon', region: 'East Asia', annualTeus: '160K TEU' },
    { country: 'Brazil', code: 'BR', ports: 'Santos · Paranaguá', region: 'South America', annualTeus: '95K TEU' },
    { country: 'Japan', code: 'JP', ports: 'Yokohama · Tokyo · Kobe', region: 'East Asia', annualTeus: '130K TEU' },
    { country: 'Canada', code: 'CA', ports: 'Vancouver · Montreal · Halifax', region: 'North America', annualTeus: '110K TEU' },
    { country: 'South Africa', code: 'ZA', ports: 'Durban · Cape Town', region: 'Southern Africa', annualTeus: '78K TEU' },
  ];

  readonly testimonials: TestimonialItem[] = [
    {
      quote:
        'Consolidating our ocean and drayage tracking onto Terminus cut container dwell times at Rotterdam and Savannah by 42% in two quarters.',
      author: 'Elena Rostova',
      role: 'VP of Global Fulfillment',
      company: 'Lumen Logistics™',
      lane: 'Shanghai → Rotterdam',
    },
    {
      quote:
        'Live 15-minute satellite temperature heartbeats gave our QA team complete GDP audit visibility across 640 monthly North Atlantic reefer crossings.',
      author: 'Henrik Lindqvist',
      role: 'Director of Cold Chain',
      company: 'Nordic ColdFreight',
      lane: 'Hamburg → Savannah',
    },
    {
      quote:
        'Automated customs pre-clearance and single-click berth chassis booking eliminated over $1.2M in annual port detention penalties for our plants.',
      author: 'Marcus Vance',
      role: 'Head of Supply Chain',
      company: 'Vanguard Industrial',
      lane: 'Singapore → Long Beach',
    },
  ];

  readonly faqs: FaqItem[] = [
    {
      question: 'How fast can we book container capacity on major East–West lanes?',
      answer:
        'Contracted allocations on Shanghai, Singapore, Rotterdam, Hamburg, Savannah, and Long Beach corridors can be locked within 2 hours of submitting a lane request.',
    },
    {
      question: 'Do you support both FCL and LCL cargo shipments?',
      answer:
        'Yes. You can book dedicated 20ft, 40ft, 40ft High-Cube, and Active Reefer FCL equipment, or reserve weekly fixed-day LCL consolidation starting from 1 CBM.',
    },
    {
      question: 'How does live container monitoring work while vessels are at sea?',
      answer:
        'Terminus combines satellite AIS vessel telemetry, carrier EDI milestone feeds, and IoT reefer sensor heartbeats into a single real-time manifest and webhook API.',
    },
    {
      question: 'Can Terminus connect directly to our ERP or warehouse system?',
      answer:
        'Yes. Our engineering desk provides direct REST webhooks, EDI X12/EDIFACT bridges, and native connectors for SAP, NetSuite, and Manhattan WMS.',
    },
    {
      question: 'How do you prevent port demurrage and detention charges?',
      answer:
        'Customs declarations are pre-cleared while the vessel is still in transit, and inland drayage chassis appointments are triggered automatically upon berth arrival.',
    },
  ];

  // Live operational state (hydrated exclusively from Supabase)
  readonly quoteDraft = signal<QuoteDraft | null>(null);
  readonly livePorts = signal<PortHub[]>([]);
  readonly liveShipments = signal<ShipmentRecord[]>([]);
  readonly dealerQuotes = signal<DealerQuoteItem[]>([]);
  readonly invoices = signal<InvoiceItem[]>([]);
  readonly gateTasks = signal<PortGateTask[]>([]);
  readonly activityFeed = signal<ActivityEvent[]>([]);
  readonly telemetryLogs = signal<TelemetryLogItem[]>([]);
  readonly systemConfig = signal<SystemConfig>({
    autoCustomsPreclearance: true,
    demurrageAlertHours: 24,
    aisPollingMinutes: 15,
    webhookNotifications: true,
    requireDealerDocs: true,
    strictMfaForAdmins: false,
  });

  constructor() {
    void this.initSupabaseSync();
  }

  findShipment(query: string): ShipmentRecord | undefined {
    const normalized = query.trim().toUpperCase();
    if (!normalized) {
      return undefined;
    }
    return this.liveShipments().find(
      (item) =>
        item.trackingId.toUpperCase() === normalized ||
        item.containerNumber.toUpperCase().includes(normalized),
    );
  }

  async lookupShipmentRemote(query: string): Promise<ShipmentRecord | undefined> {
    const clean = query.trim();
    if (!clean) {
      return undefined;
    }

    const client = await this.supabase.ensureClient();
    if (client) {
      const { data, error } = await client.rpc('lookup_shipment_by_tracking', {
        p_query: clean,
      });
      if (!error && data) {
        return data as ShipmentRecord;
      }
    }

    return this.findShipment(clean);
  }

  async addShipment(
    origin: string,
    destination: string,
    cargoType: string,
    incoterm: 'EXW' | 'FOB' | 'CIF' | 'DDP' = 'CIF',
    options?: {
      customerId?: string | null;
      dealerId?: string | null;
      assignedStaffId?: string | null;
      freightChargeUsd?: number;
      vesselName?: string;
      voyageNumber?: string;
    },
  ): Promise<{ ok: boolean; shipment?: ShipmentRecord; error?: string }> {
    const client = await this.supabase.ensureClient();
    const user = this.auth.currentUser();
    if (!client || !user) {
      return { ok: false, error: 'Authenticated Supabase session required to book containers.' };
    }

    const idNum = Math.floor(100000 + Math.random() * 899999);
    const trackingId = `TRM-${idNum}`;
    const containerNumber = `TRMU ${Math.floor(100000 + Math.random() * 899999)}-0`;
    const sealNumber = `SL-${Math.floor(100000 + Math.random() * 899999)}`;
    const originLocode = this.extractLocode(origin, 'CNSHA');
    const destLocode = this.extractLocode(destination, 'NLRTM');
    const vesselName = options?.vesselName?.trim() || 'MV Terminus Meridian';
    const voyageNumber = options?.voyageNumber?.trim() || 'V.264W';
    const resolvedCustomerId =
      options?.customerId !== undefined ? options.customerId : user.role === 'dealer' ? null : user.id;
    const resolvedDealerId =
      options?.dealerId !== undefined ? options.dealerId : user.role === 'dealer' ? user.id : null;
    const resolvedStaffId = options?.assignedStaffId ?? null;
    const freightChargeUsd = options?.freightChargeUsd ?? 4200;

    const { data: inserted, error } = await client
      .from('shipments')
      .insert({
        tracking_id: trackingId,
        container_number: containerNumber,
        seal_number: sealNumber,
        vessel_name: vesselName,
        vessel_imo: 'IMO 9912044',
        voyage_number: voyageNumber,
        origin_locode: originLocode,
        destination_locode: destLocode,
        origin_label: origin,
        destination_label: destination,
        incoterm,
        vgm_kg: 24800,
        equipment_code: '40HC',
        cargo_type: cargoType,
        teu: '2 TEU',
        status: 'Booking Confirmed',
        progress_percent: 18,
        eta: 'Nov 28, 2026 · 08:00 UTC',
        last_free_day: 'Dec 03, 2026',
        customer_id: resolvedCustomerId,
        dealer_id: resolvedDealerId,
        assigned_staff_id: resolvedStaffId,
        customs_status: 'Pending',
        is_delayed: false,
        freight_charge_usd: freightChargeUsd,
      })
      .select('id')
      .single();

    if (error || !inserted) {
      return { ok: false, error: error?.message ?? 'Booking rejected by RLS policy.' };
    }

    const milestones: ShipmentMilestone[] = [
      { timestamp: 'Now', location: origin, event: 'Booking confirmed & empty container released', completed: true },
      { timestamp: 'Pending', location: origin, event: 'Scheduled vessel loading', completed: false },
      { timestamp: 'Nov 28 · 08:00', location: destination, event: 'Estimated berth arrival', completed: false },
    ];

    await client.from('shipment_milestones').insert(
      milestones.map((m, idx) => ({
        shipment_id: inserted.id,
        event_code: idx === 0 ? 'BOOKED' : 'SCHEDULED',
        timestamp_label: m.timestamp,
        location: m.location,
        event_description: m.event,
        completed: m.completed,
        sort_order: idx + 1,
      })),
    );

    const created: ShipmentRecord = {
      id: inserted.id,
      customerId: resolvedCustomerId,
      dealerId: resolvedDealerId,
      assignedStaffId: resolvedStaffId,
      trackingId,
      containerNumber,
      sealNumber,
      vessel: `${vesselName} (IMO 9912044)`,
      voyage: voyageNumber,
      origin,
      destination,
      incoterm,
      vgmKg: 24800,
      eta: 'Nov 28, 2026 · 08:00 UTC',
      lastFreeDay: 'Dec 03, 2026',
      status: 'Booking Confirmed',
      customsStatus: 'Pending',
      isDelayed: false,
      freightChargeUsd,
      cargoType,
      teu: '2 TEU',
      progressPercent: 18,
      milestones,
    };

    this.liveShipments.update((list) => [created, ...list]);
    await this.recordActivity('BOOKING', `Booked ${trackingId} (${origin} → ${destination})`);
    return { ok: true, shipment: created };
  }

  async advanceShipmentStatus(trackingId: string): Promise<{ ok: boolean; error?: string }> {
    const client = await this.supabase.ensureClient();
    if (!client) {
      return { ok: false, error: 'Supabase client unavailable.' };
    }

    const current = this.liveShipments().find((s) => s.trackingId === trackingId);
    if (!current) {
      return { ok: false, error: 'Shipment not found.' };
    }

    const order: ShipmentRecord['status'][] = [
      'Booking Confirmed',
      'In Transit',
      'Customs Cleared',
      'At Berth',
      'Delivered',
    ];
    const progressMap: Record<ShipmentRecord['status'], number> = {
      'Booking Confirmed': 18,
      'In Transit': 55,
      'Customs Cleared': 78,
      'At Berth': 94,
      Delivered: 100,
    };

    const idx = order.indexOf(current.status);
    const nextStatus = order[(idx + 1) % order.length];
    const nextProgress = progressMap[nextStatus];

    const { error } = await client
      .from('shipments')
      .update({
        status: nextStatus,
        progress_percent: nextProgress,
        updated_at: new Date().toISOString(),
      })
      .eq('tracking_id', trackingId);

    if (error) {
      return { ok: false, error: error.message };
    }

    let completedOrderToMark: number | null = null;
    let marked = false;
    const nextMilestones = current.milestones.map((m, mIdx) => {
      if (!marked && !m.completed) {
        marked = true;
        completedOrderToMark = mIdx + 1;
        return { ...m, completed: true };
      }
      return m;
    });

    if (current.id && completedOrderToMark !== null) {
      await client
        .from('shipment_milestones')
        .update({ completed: true })
        .eq('shipment_id', current.id)
        .eq('sort_order', completedOrderToMark);
    }

    this.liveShipments.update((list) =>
      list.map((item) =>
        item.trackingId === trackingId
          ? { ...item, status: nextStatus, progressPercent: nextProgress, milestones: nextMilestones }
          : item,
      ),
    );
    await this.recordActivity('TELEMETRY', `${trackingId} updated to ${nextStatus}`);
    return { ok: true };
  }

  async togglePortBerthStatus(code: string): Promise<{ ok: boolean; error?: string }> {
    const client = await this.supabase.ensureClient();
    const target = this.livePorts().find((p) => p.code === code);
    if (!client || !target) {
      return { ok: false, error: 'Port hub or Supabase client unavailable.' };
    }

    const nextStatus: PortHub['berthStatus'] =
      target.berthStatus === 'Optimal' ? 'Moderate Queue' : 'Optimal';

    const { error } = await client
      .from('port_hubs')
      .update({ berth_status: nextStatus, updated_at: new Date().toISOString() })
      .eq('code', code);

    if (error) {
      return { ok: false, error: error.message };
    }

    this.livePorts.update((ports) =>
      ports.map((p) => (p.code === code ? { ...p, berthStatus: nextStatus } : p)),
    );
    await this.recordActivity('PORT OPS', `Terminal ${code} berth status set to ${nextStatus}`);
    return { ok: true };
  }

  async submitQuoteRequest(payload: {
    company: string;
    email: string;
    mode: string;
    lane: string;
    notes: string;
    rateUsd?: number;
    marginPercent?: number;
  }): Promise<{ ok: boolean; quoteRef?: string; error?: string }> {
    const client = await this.supabase.ensureClient();
    if (!client) {
      return { ok: false, error: 'Supabase backend is not configured.' };
    }

    const quoteRef = `TRM-Q${Math.floor(100 + Math.random() * 899)}`;
    const user = this.auth.currentUser();

    const { error } = await client.from('quote_requests').insert({
      quote_ref: quoteRef,
      client_name: payload.company || 'Direct Shipper',
      contact_email: payload.email,
      freight_mode: payload.mode,
      trade_lane: payload.lane,
      equipment: payload.mode,
      rate_usd: payload.rateUsd ?? 4658,
      margin_percent: payload.marginPercent ?? 8.5,
      notes: payload.notes,
      status: user?.role === 'dealer' ? 'Approved' : 'Pending Review',
      customer_id: user?.role === 'customer' ? user.id : null,
      dealer_id: user?.role === 'dealer' ? user.id : null,
    });

    if (error) {
      return { ok: false, error: error.message };
    }

    if (user) {
      await this.fetchQuotesFromSupabase();
      await this.recordActivity('QUOTE', `New lane inquiry ${quoteRef} from ${payload.company}`);
    }

    return { ok: true, quoteRef };
  }

  async approveDealerQuote(id: string): Promise<{ ok: boolean; error?: string }> {
    const client = await this.supabase.ensureClient();
    const current = this.dealerQuotes().find((q) => q.id === id);
    if (!client || !current) {
      return { ok: false, error: 'Quote or Supabase client unavailable.' };
    }

    const nextStatus: DealerQuoteItem['status'] =
      current.status === 'Pending Review' ? 'Approved' : 'Dispatched';
    const user = this.auth.currentUser();

    const { error } = await client
      .from('quote_requests')
      .update({ status: nextStatus, dealer_id: user?.id ?? null })
      .eq('quote_ref', id);

    if (error) {
      return { ok: false, error: error.message };
    }

    this.dealerQuotes.update((quotes) =>
      quotes.map((q) => (q.id === id ? { ...q, status: nextStatus } : q)),
    );
    await this.recordActivity('DEALER', `Updated broker quote ${id} → ${nextStatus}`);
    return { ok: true };
  }

  async payInvoice(id: string): Promise<{ ok: boolean; error?: string }> {
    const client = await this.supabase.ensureClient();
    if (!client) {
      return { ok: false, error: 'Supabase client unavailable.' };
    }

    const { error } = await client
      .from('invoices')
      .update({ status: 'Paid' })
      .eq('invoice_number', id);

    if (error) {
      return { ok: false, error: error.message };
    }

    this.invoices.update((items) =>
      items.map((inv) => (inv.id === id ? { ...inv, status: 'Paid' } : inv)),
    );
    await this.recordActivity('BILLING', `Settled freight invoice ${id}`);
    return { ok: true };
  }

  async issueInvoice(
    shipment: ShipmentRecord,
    amountUsd = 4250,
  ): Promise<{ ok: boolean; invoice?: InvoiceItem; error?: string }> {
    const client = await this.supabase.ensureClient();
    if (!client) {
      return { ok: false, error: 'Supabase client unavailable.' };
    }

    const invoiceNumber = `INV-2026-${Math.floor(500 + Math.random() * 499)}`;
    const originCode = this.extractLocode(shipment.origin, 'CNSHA');
    const destCode = this.extractLocode(shipment.destination, 'NLRTM');
    const created: InvoiceItem = {
      id: invoiceNumber,
      shipmentId: shipment.trackingId,
      lane: `${originCode} → ${destCode}`,
      amountUsd,
      dueDate: 'Nov 25, 2026',
      status: 'Due',
    };

    const { error } = await client.from('invoices').insert({
      invoice_number: invoiceNumber,
      shipment_tracking_id: created.shipmentId,
      lane: created.lane,
      amount_usd: created.amountUsd,
      due_date: created.dueDate,
      status: 'Due',
      customer_id: shipment.customerId ?? null,
    });

    if (error) {
      return { ok: false, error: error.message };
    }

    this.invoices.update((items) => [created, ...items]);
    await this.recordActivity('BILLING', `Issued ${invoiceNumber} for ${shipment.trackingId} ($${amountUsd})`);
    return { ok: true, invoice: created };
  }

  async toggleGateTask(id: string): Promise<{ ok: boolean; error?: string }> {
    const client = await this.supabase.ensureClient();
    const target = this.gateTasks().find((t) => t.id === id);
    if (!client || !target) {
      return { ok: false, error: 'Gate task or Supabase client unavailable.' };
    }

    const nextCompleted = !target.completed;
    const { error } = await client
      .from('gate_tasks')
      .update({ completed: nextCompleted, updated_at: new Date().toISOString() })
      .eq('task_code', id);

    if (error) {
      return { ok: false, error: error.message };
    }

    this.gateTasks.update((tasks) =>
      tasks.map((t) => (t.id === id ? { ...t, completed: nextCompleted } : t)),
    );
    await this.recordActivity('GATE OPS', `Updated terminal clearance task ${id}`);
    return { ok: true };
  }

  async addGateTask(payload: {
    containerNumber: string;
    terminalName: string;
    vesselName: string;
    actionRequired: string;
  }): Promise<{ ok: boolean; error?: string }> {
    const client = await this.supabase.ensureClient();
    if (!client) {
      return { ok: false, error: 'Supabase client unavailable.' };
    }
    const taskCode = `OPS-${Math.floor(100 + Math.random() * 899)}`;
    const { error } = await client.from('gate_tasks').insert({
      task_code: taskCode,
      container_number: payload.containerNumber.trim(),
      terminal_name: payload.terminalName.trim(),
      vessel_name: payload.vesselName.trim(),
      action_required: payload.actionRequired.trim(),
      completed: false,
    });
    if (error) {
      return { ok: false, error: error.message };
    }
    this.gateTasks.update((tasks) => [
      {
        id: taskCode,
        containerNumber: payload.containerNumber.trim(),
        terminal: payload.terminalName.trim(),
        vessel: payload.vesselName.trim(),
        action: payload.actionRequired.trim(),
        completed: false,
      },
      ...tasks,
    ]);
    await this.recordActivity('GATE OPS', `Created terminal gate task ${taskCode}`);
    return { ok: true };
  }

  async updateShipmentAdmin(
    trackingId: string,
    patch: {
      assignedStaffId?: string | null;
      customsStatus?: ShipmentRecord['customsStatus'];
      isDelayed?: boolean;
      disputeNote?: string | null;
      freightChargeUsd?: number;
      status?: ShipmentRecord['status'];
      vessel?: string;
      voyage?: string;
      containerNumber?: string;
      sealNumber?: string;
      eta?: string;
      lastFreeDay?: string;
    },
  ): Promise<{ ok: boolean; error?: string }> {
    const client = await this.supabase.ensureClient();
    if (!client) {
      return { ok: false, error: 'Supabase client unavailable.' };
    }

    const progressMap: Record<ShipmentRecord['status'], number> = {
      'Booking Confirmed': 18,
      'In Transit': 55,
      'Customs Cleared': 78,
      'At Berth': 94,
      Delivered: 100,
    };

    const dbPatch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (patch.assignedStaffId !== undefined) dbPatch['assigned_staff_id'] = patch.assignedStaffId || null;
    if (patch.customsStatus !== undefined) dbPatch['customs_status'] = patch.customsStatus;
    if (patch.isDelayed !== undefined) dbPatch['is_delayed'] = patch.isDelayed;
    if (patch.disputeNote !== undefined) dbPatch['dispute_note'] = patch.disputeNote;
    if (patch.freightChargeUsd !== undefined) dbPatch['freight_charge_usd'] = patch.freightChargeUsd;
    if (patch.status !== undefined) {
      dbPatch['status'] = patch.status;
      dbPatch['progress_percent'] = progressMap[patch.status];
    }
    if (patch.vessel !== undefined) dbPatch['vessel_name'] = patch.vessel.trim();
    if (patch.voyage !== undefined) dbPatch['voyage_number'] = patch.voyage.trim();
    if (patch.containerNumber !== undefined) dbPatch['container_number'] = patch.containerNumber.trim();
    if (patch.sealNumber !== undefined) dbPatch['seal_number'] = patch.sealNumber.trim();
    if (patch.eta !== undefined) dbPatch['eta'] = patch.eta.trim();
    if (patch.lastFreeDay !== undefined) dbPatch['last_free_day'] = patch.lastFreeDay.trim();

    const { error } = await client
      .from('shipments')
      .update(dbPatch)
      .eq('tracking_id', trackingId);

    if (error) {
      return { ok: false, error: error.message };
    }

    this.liveShipments.update((list) =>
      list.map((item) =>
        item.trackingId === trackingId
          ? {
              ...item,
              ...patch,
              progressPercent: patch.status !== undefined ? progressMap[patch.status] : item.progressPercent,
            }
          : item,
      ),
    );
    await this.recordActivity('ADMIN OPS', `Updated controls for ${trackingId}`);
    return { ok: true };
  }

  async saveSystemConfig(config: SystemConfig): Promise<{ ok: boolean; error?: string }> {
    const client = await this.supabase.ensureClient();
    const user = this.auth.currentUser();
    if (!client || !user) {
      return { ok: false, error: 'Authenticated Admin session required.' };
    }

    const { error } = await client.from('system_settings').upsert({
      key: 'platform_config',
      value: config,
      updated_at: new Date().toISOString(),
      updated_by: user.id,
    });

    if (error) {
      return { ok: false, error: error.message };
    }

    this.systemConfig.set(config);
    await this.logTelemetry('API', 'info', '/rest/v1/system_settings', 24, `Admin ${user.email} updated system configuration`);
    return { ok: true };
  }

  async logTelemetry(
    channel: TelemetryLogItem['channel'],
    severity: TelemetryLogItem['severity'],
    endpoint: string,
    latencyMs: number,
    message: string,
  ): Promise<void> {
    const client = this.supabase.client();
    const user = this.auth.currentUser();
    if (!client || !user) {
      return;
    }

    await client.from('telemetry_logs').insert({
      channel,
      severity,
      endpoint,
      latency_ms: latencyMs,
      message,
      actor_id: user.id,
    });
    await this.fetchTelemetryFromSupabase();
  }

  private async recordActivity(tag: string, message: string): Promise<void> {
    const client = this.supabase.client();
    const user = this.auth.currentUser();
    if (!client || !user) {
      return;
    }

    await client.from('activity_events').insert({
      actor_id: user.id,
      tag,
      message,
    });
    await this.fetchActivityFromSupabase();
  }

  private extractLocode(text: string, fallback: string): string {
    const match = /\(([A-Z]{5})\)/.exec(text.toUpperCase());
    const code = match?.[1];
    if (code && this.livePorts().some((p) => p.code === code)) {
      return code;
    }
    return fallback;
  }

  private async initSupabaseSync(): Promise<void> {
    const client = await this.supabase.ensureClient();
    if (!client) {
      this.lastSyncLabel.set('Backend Offline');
      return;
    }

    await this.refreshAllFromSupabase();

    client.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        void this.refreshAllFromSupabase();
      } else if (event === 'SIGNED_OUT') {
        this.liveShipments.set([]);
        this.dealerQuotes.set([]);
        this.invoices.set([]);
        this.gateTasks.set([]);
        this.activityFeed.set([]);
      }
    });

    client
      .channel('terminus-live-ops')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'port_hubs' }, () => {
        void this.fetchPortsFromSupabase();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shipments' }, () => {
        void this.fetchShipmentsFromSupabase();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'quote_requests' }, () => {
        void this.fetchQuotesFromSupabase();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'invoices' }, () => {
        void this.fetchInvoicesFromSupabase();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'gate_tasks' }, () => {
        void this.fetchGateTasksFromSupabase();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'activity_events' }, () => {
        void this.fetchActivityFromSupabase();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'telemetry_logs' }, () => {
        void this.fetchTelemetryFromSupabase();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'system_settings' }, () => {
        void this.fetchSystemSettingsFromSupabase();
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          this.lastSyncLabel.set('Supabase Realtime Live');
        }
      });
  }

  async refreshAllFromSupabase(): Promise<void> {
    await Promise.all([
      this.fetchPortsFromSupabase(),
      this.fetchShipmentsFromSupabase(),
      this.fetchQuotesFromSupabase(),
      this.fetchInvoicesFromSupabase(),
      this.fetchGateTasksFromSupabase(),
      this.fetchActivityFromSupabase(),
      this.fetchTelemetryFromSupabase(),
      this.fetchSystemSettingsFromSupabase(),
    ]);
  }

  private async fetchPortsFromSupabase(): Promise<void> {
    const client = this.supabase.client();
    if (!client) {
      return;
    }
    const { data } = await client.from('port_hubs').select('*').order('code');
    if (data) {
      this.livePorts.set(
        data.map((row) => ({
          code: row.code,
          name: row.name,
          country: row.country,
          corridor: row.corridor,
          berthStatus: row.berth_status,
          avgDwellHours: row.avg_dwell_hours,
          weeklySailings: row.weekly_sailings,
        })),
      );
    }
  }

  private async fetchShipmentsFromSupabase(): Promise<void> {
    const client = this.supabase.client();
    if (!client) {
      return;
    }
    const { data, error } = await client
      .from('shipments')
      .select('*, shipment_milestones(*)')
      .order('created_at', { ascending: false });

    if (error) {
      this.liveShipments.set([]);
      return;
    }

    if (data) {
      this.liveShipments.set(
        data.map((row) => ({
          id: row.id,
          customerId: row.customer_id,
          dealerId: row.dealer_id,
          assignedStaffId: row.assigned_staff_id ?? null,
          trackingId: row.tracking_id,
          containerNumber: row.container_number,
          sealNumber: row.seal_number,
          vessel: `${row.vessel_name} (${row.vessel_imo})`,
          voyage: row.voyage_number,
          origin: row.origin_label,
          destination: row.destination_label,
          incoterm: row.incoterm,
          vgmKg: row.vgm_kg,
          eta: row.eta,
          lastFreeDay: row.last_free_day,
          status: row.status,
          customsStatus: row.customs_status ?? 'Pending',
          isDelayed: Boolean(row.is_delayed),
          disputeNote: row.dispute_note ?? null,
          freightChargeUsd: row.freight_charge_usd ?? 4250,
          cargoType: row.cargo_type,
          teu: row.teu,
          progressPercent: row.progress_percent,
          milestones: ((row.shipment_milestones as any[]) ?? [])
            .slice()
            .sort((a, b) => a.sort_order - b.sort_order)
            .map((m) => ({
              timestamp: m.timestamp_label,
              location: m.location,
              event: m.event_description,
              completed: m.completed,
            })),
        })),
      );
    }
  }

  private async fetchQuotesFromSupabase(): Promise<void> {
    const client = this.supabase.client();
    if (!client) {
      return;
    }
    const { data, error } = await client
      .from('quote_requests')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      this.dealerQuotes.set([]);
      return;
    }

    if (data) {
      this.dealerQuotes.set(
        data.map((row) => ({
          id: row.quote_ref,
          client: row.client_name,
          lane: row.trade_lane,
          equipment: row.equipment,
          rateUsd: row.rate_usd,
          marginPercent: Number(row.margin_percent),
          status: row.status,
        })),
      );
    }
  }

  private async fetchInvoicesFromSupabase(): Promise<void> {
    const client = this.supabase.client();
    if (!client) {
      return;
    }
    const { data, error } = await client
      .from('invoices')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      this.invoices.set([]);
      return;
    }

    if (data) {
      this.invoices.set(
        data.map((row) => ({
          id: row.invoice_number,
          shipmentId: row.shipment_tracking_id,
          lane: row.lane,
          amountUsd: row.amount_usd,
          dueDate: row.due_date,
          status: row.status,
        })),
      );
    }
  }

  private async fetchGateTasksFromSupabase(): Promise<void> {
    const client = this.supabase.client();
    if (!client) {
      return;
    }
    const { data, error } = await client.from('gate_tasks').select('*').order('task_code');

    if (error) {
      this.gateTasks.set([]);
      return;
    }

    if (data) {
      this.gateTasks.set(
        data.map((row) => ({
          id: row.task_code,
          containerNumber: row.container_number,
          terminal: row.terminal_name,
          vessel: row.vessel_name,
          action: row.action_required,
          completed: row.completed,
        })),
      );
    }
  }

  private async fetchActivityFromSupabase(): Promise<void> {
    const client = this.supabase.client();
    if (!client) {
      return;
    }
    const { data, error } = await client
      .from('activity_events')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(8);

    if (error) {
      this.activityFeed.set([]);
      return;
    }

    if (data) {
      this.activityFeed.set(
        data.map((row) => ({
          id: row.id,
          timestamp: new Date(row.created_at).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          }),
          tag: row.tag,
          message: row.message,
        })),
      );
    }
  }

  private async fetchTelemetryFromSupabase(): Promise<void> {
    const client = this.supabase.client();
    if (!client) {
      return;
    }
    const { data } = await client
      .from('telemetry_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);

    if (data) {
      this.telemetryLogs.set(
        data.map((row) => ({
          id: row.id,
          channel: row.channel,
          severity: row.severity,
          endpoint: row.endpoint,
          latencyMs: row.latency_ms,
          message: row.message,
          createdAt: new Date(row.created_at).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          }),
        })),
      );
    }
  }

  private async fetchSystemSettingsFromSupabase(): Promise<void> {
    const client = this.supabase.client();
    if (!client) {
      return;
    }
    const { data } = await client
      .from('system_settings')
      .select('value')
      .eq('key', 'platform_config')
      .maybeSingle();

    if (data?.value) {
      this.systemConfig.set({
        ...this.systemConfig(),
        ...(data.value as Partial<SystemConfig>),
      });
    }
  }

  calculateFreightQuote(
    originCode: string,
    destinationCode: string,
    containerId: string,
    quantity: number,
  ): FreightQuoteResult | null {
    const portsList = this.livePorts();
    const origin = portsList.find((p) => p.code === originCode);
    const destination = portsList.find((p) => p.code === destinationCode);
    const container = this.containerSpecs.find((c) => c.id === containerId);
    const qty = Math.max(1, Math.min(50, Math.round(quantity || 1)));

    if (!origin || !destination || !container || origin.code === destination.code) {
      return null;
    }

    const baseRoute = this.lookupBaseRoute(origin.code, destination.code);
    const oceanFreightUsd = Math.round(baseRoute.baseUsd * container.rateMultiplier * qty);
    const terminalHandlingUsd = Math.round(340 * container.teuCount * qty);

    return {
      origin,
      destination,
      container,
      quantity: qty,
      transitDays: baseRoute.days,
      oceanFreightUsd,
      terminalHandlingUsd,
      totalUsd: oceanFreightUsd + terminalHandlingUsd,
      co2Tonnes: Number((baseRoute.co2PerTeu * container.teuCount * qty).toFixed(2)),
    };
  }

  setQuoteDraft(draft: QuoteDraft): void {
    this.quoteDraft.set(draft);
  }

  private lookupBaseRoute(originCode: string, destCode: string): { baseUsd: number; days: number; co2PerTeu: number } {
    const pair = [originCode, destCode].sort().join('-');
    const routeTable: Record<string, { baseUsd: number; days: number; co2PerTeu: number }> = {
      'CNSHA-NLRTM': { baseUsd: 2150, days: 24, co2PerTeu: 1.42 },
      'CNSHA-DEHAM': { baseUsd: 2240, days: 26, co2PerTeu: 1.48 },
      'CNSHA-USLGB': { baseUsd: 1980, days: 15, co2PerTeu: 1.15 },
      'CNSHA-USSAV': { baseUsd: 2680, days: 29, co2PerTeu: 1.68 },
      'NLRTM-SGSIN': { baseUsd: 1940, days: 21, co2PerTeu: 1.24 },
      'DEHAM-SGSIN': { baseUsd: 2020, days: 23, co2PerTeu: 1.31 },
      'SGSIN-USLGB': { baseUsd: 1890, days: 18, co2PerTeu: 1.22 },
      'SGSIN-USSAV': { baseUsd: 2540, days: 27, co2PerTeu: 1.59 },
      'DEHAM-USSAV': { baseUsd: 1460, days: 12, co2PerTeu: 0.84 },
      'NLRTM-USSAV': { baseUsd: 1410, days: 11, co2PerTeu: 0.79 },
      'DEHAM-USLGB': { baseUsd: 2350, days: 24, co2PerTeu: 1.52 },
      'NLRTM-USLGB': { baseUsd: 2290, days: 23, co2PerTeu: 1.47 },
      'CNSHA-SGSIN': { baseUsd: 780, days: 6, co2PerTeu: 0.42 },
      'DEHAM-NLRTM': { baseUsd: 520, days: 2, co2PerTeu: 0.18 },
      'USLGB-USSAV': { baseUsd: 1620, days: 14, co2PerTeu: 0.94 },
    };

    return routeTable[pair] ?? { baseUsd: 1950, days: 20, co2PerTeu: 1.25 };
  }
}
