import { Injectable, inject, signal } from '@angular/core';
import { AuthService } from './auth.service';
import { SupabaseService } from './supabase.service';

export interface ShipmentMilestone {
  timestamp: string;
  location: string;
  event: string;
  completed: boolean;
}

export interface ShipmentPriceBreakdown {
  originCode: string;
  destinationCode: string;
  lane: string;
  transitDays: number;
  baseFreightUsd: number;
  shippingMethodSurchargeUsd: number;
  terminalHandlingUsd: number;
  overweightFeeUsd: number;
  incotermHandlingUsd: number;
  totalUsd: number;
}

export interface ShippingDocumentRef {
  name: string;
  sizeBytes: number;
  mimeType: string;
  category: string;
  uploadedAt: string;
  storagePath?: string;
}

export interface ShipmentRequestItem {
  id: string;
  requestRef: string;
  cargoType: string;
  cargoDescription: string;
  origin: string;
  destination: string;
  weightKg: number;
  dimensionsCm: string;
  shippingMethod: string;
  incoterm: 'EXW' | 'FOB' | 'CIF' | 'DDP';
  documents: ShippingDocumentRef[];
  status: 'Submitted' | 'Under Review' | 'Confirmed' | 'Cancelled';
  linkedTrackingId?: string | null;
  verifiedInvoiceId?: string | null;
  createdAt: string;
}

export interface CustomerNotificationItem {
  id: string;
  category: 'confirmation' | 'dispatch' | 'port_arrival' | 'customs' | 'delivery' | 'invoice';
  title: string;
  message: string;
  trackingId?: string | null;
  isRead: boolean;
  createdAt: string;
}

export interface SupportMessageItem {
  id: string;
  senderRole: 'customer' | 'staff' | 'admin';
  senderName: string;
  body: string;
  createdAt: string;
}

export interface SupportTicketItem {
  id: string;
  ticketRef: string;
  shipmentTrackingId?: string | null;
  ticketType: 'ticket' | 'enquiry' | 'issue';
  subject: string;
  priority: 'Normal' | 'High' | 'Urgent';
  status: 'Open' | 'In Review' | 'Resolved';
  createdAt: string;
  updatedAt: string;
  messages: SupportMessageItem[];
}

export interface ShipmentRecord {
  id?: string;
  customerId?: string | null;
  dealerId?: string | null;
  dealerClientId?: string | null;
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
  cargoDescription?: string;
  shippingMethod?: string;
  dimensionsCm?: string;
  shippingDocs?: ShippingDocumentRef[];
  verifiedInvoiceId?: string | null;
  createdAt?: string;
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
  dealerMinMarginPercent: number;
  dealerMaxMarginPercent: number;
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

export interface DealerClientItem {
  id: string;
  dealerId: string;
  companyName: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  country: string;
  hubLocode: string;
  accountStatus: 'Active' | 'Inactive' | 'Suspended';
  customMarginPercent: number;
  notes: string;
  lastActivity: string;
  createdAt: string;
}

export interface DealerQuoteItem {
  id: string;
  clientId?: string | null;
  client: string;
  contactEmail?: string;
  lane: string;
  originCode?: string;
  destinationCode?: string;
  equipment: string;
  cargoSpecs?: string;
  baseRateUsd?: number;
  rateUsd: number;
  marginPercent: number;
  quoteType?: 'broker_request' | 'client_quote';
  notes?: string;
  createdAt?: string;
  status: 'Pending Review' | 'Approved' | 'Rejected' | 'Dispatched';
}

export type InvoiceVerificationStatus =
  | 'unpaid'
  | 'pending_verification'
  | 'verified'
  | 'rejected';

export interface InvoiceItem {
  id: string;
  shipmentId: string;
  lane: string;
  amountUsd: number;
  dueDate: string;
  status: 'Paid' | 'Due';
  customerId?: string | null;
  dealerId?: string | null;
  dealerClientId?: string | null;
  clientName?: string;
  paidAmountUsd?: number;
  paidAt?: string | null;
  paymentMethod?: string | null;
  receiptNumber?: string | null;
  verificationStatus?: InvoiceVerificationStatus;
  paymentReference?: string | null;
  paymentProofName?: string | null;
  paymentProofPath?: string | null;
  verificationNote?: string | null;
  verifiedBy?: string | null;
  verifiedAt?: string | null;
  gatewayProvider?: string | null;
  gatewayTxnId?: string | null;
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
      client: 'Terminus ™',
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
      company: 'Terminus ™',
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
  readonly dealerClients = signal<DealerClientItem[]>([]);
  readonly dealerQuotes = signal<DealerQuoteItem[]>([]);
  readonly invoices = signal<InvoiceItem[]>([]);
  readonly gateTasks = signal<PortGateTask[]>([]);
  readonly activityFeed = signal<ActivityEvent[]>([]);
  readonly telemetryLogs = signal<TelemetryLogItem[]>([]);
  readonly shipmentRequests = signal<ShipmentRequestItem[]>([]);
  readonly customerNotifications = signal<CustomerNotificationItem[]>([]);
  readonly supportTickets = signal<SupportTicketItem[]>([]);
  readonly systemConfig = signal<SystemConfig>({
    autoCustomsPreclearance: true,
    demurrageAlertHours: 24,
    aisPollingMinutes: 15,
    webhookNotifications: true,
    requireDealerDocs: true,
    strictMfaForAdmins: false,
    dealerMinMarginPercent: 2.0,
    dealerMaxMarginPercent: 18.0,
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
      dealerClientId?: string | null;
      assignedStaffId?: string | null;
      freightChargeUsd?: number;
      vesselName?: string;
      voyageNumber?: string;
      vgmKg?: number;
      cargoDescription?: string;
      shippingMethod?: string;
      dimensionsCm?: string;
      shippingDocs?: ShippingDocumentRef[];
      verifiedInvoiceId?: string | null;
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
    const vgmKg = options?.vgmKg && options.vgmKg > 0 ? Math.round(options.vgmKg) : 24800;

    const baseInsert = {
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
      vgm_kg: vgmKg,
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
    };

    const extendedInsert: Record<string, unknown> = { ...baseInsert };
    if (options?.cargoDescription !== undefined) {
      extendedInsert['cargo_description'] = options.cargoDescription;
    }
    if (options?.shippingMethod !== undefined) {
      extendedInsert['shipping_method'] = options.shippingMethod;
    }
    if (options?.dimensionsCm !== undefined) {
      extendedInsert['dimensions_cm'] = options.dimensionsCm;
    }
    if (options?.shippingDocs !== undefined) {
      extendedInsert['shipping_docs'] = options.shippingDocs;
    }
    if (options?.dealerClientId !== undefined) {
      extendedInsert['dealer_client_id'] = options.dealerClientId || null;
    }
    if (options?.verifiedInvoiceId) {
      extendedInsert['verified_invoice_number'] = options.verifiedInvoiceId;
    }

    let { data: inserted, error } = await client
      .from('shipments')
      .insert(extendedInsert)
      .select('id')
      .single();

    if (error && /column|schema cache/i.test(error.message)) {
      const retry = await client.from('shipments').insert(baseInsert).select('id').single();
      inserted = retry.data;
      error = retry.error;
    }

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
      dealerClientId: options?.dealerClientId ?? null,
      assignedStaffId: resolvedStaffId,
      trackingId,
      containerNumber,
      sealNumber,
      vessel: `${vesselName} (IMO 9912044)`,
      voyage: voyageNumber,
      origin,
      destination,
      incoterm,
      vgmKg,
      cargoDescription: options?.cargoDescription,
      shippingMethod: options?.shippingMethod ?? 'Ocean FCL',
      dimensionsCm: options?.dimensionsCm,
      shippingDocs: options?.shippingDocs ?? [],
      createdAt: new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
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
    const current = this.dealerQuotes().find((q) => q.id === id);
    if (!current) {
      return { ok: false, error: 'Quote unavailable.' };
    }
    const nextStatus: DealerQuoteItem['status'] =
      current.status === 'Pending Review' ? 'Approved' : 'Dispatched';
    return this.setQuoteDecision(id, nextStatus);
  }

  async setQuoteDecision(
    id: string,
    nextStatus: DealerQuoteItem['status'],
  ): Promise<{ ok: boolean; error?: string }> {
    const client = await this.supabase.ensureClient();
    const current = this.dealerQuotes().find((q) => q.id === id);
    if (!client || !current) {
      return { ok: false, error: 'Quote or Supabase client unavailable.' };
    }

    const user = this.auth.currentUser();
    const updatePatch: Record<string, unknown> = { status: nextStatus };
    if (user?.role === 'dealer') {
      updatePatch['dealer_id'] = user.id;
    }

    const { error } = await client
      .from('quote_requests')
      .update(updatePatch)
      .eq('quote_ref', id);

    if (error) {
      return { ok: false, error: error.message };
    }

    this.dealerQuotes.update((quotes) =>
      quotes.map((q) => (q.id === id ? { ...q, status: nextStatus } : q)),
    );
    await this.recordActivity('DEALER', `Updated quotation ${id} → ${nextStatus}`);
    return { ok: true };
  }

  compareLaneRates(
    originCode: string,
    destinationCode: string,
    quantity = 1,
  ): FreightQuoteResult[] {
    return this.containerSpecs
      .map((spec) => this.calculateFreightQuote(originCode, destinationCode, spec.id, quantity))
      .filter((item): item is FreightQuoteResult => item !== null);
  }

  async registerDealerClient(payload: {
    companyName: string;
    contactName: string;
    contactEmail: string;
    contactPhone: string;
    country: string;
    hubLocode: string;
    customMarginPercent: number;
    notes?: string;
  }): Promise<{ ok: boolean; clientItem?: DealerClientItem; error?: string }> {
    const client = await this.supabase.ensureClient();
    const user = this.auth.currentUser();
    if (!client || !user) {
      return { ok: false, error: 'Authenticated dealer session required.' };
    }

    const { dealerMinMarginPercent, dealerMaxMarginPercent } = this.systemConfig();
    const margin = Number(payload.customMarginPercent);
    if (
      Number.isNaN(margin) ||
      margin < dealerMinMarginPercent ||
      margin > dealerMaxMarginPercent
    ) {
      return {
        ok: false,
        error: `Client margin (${margin}%) must stay within Admin limits (${dealerMinMarginPercent}% – ${dealerMaxMarginPercent}%).`,
      };
    }

    const { data, error } = await client
      .from('dealer_clients')
      .insert({
        dealer_id: user.id,
        company_name: payload.companyName.trim(),
        contact_name: payload.contactName.trim(),
        contact_email: payload.contactEmail.trim().toLowerCase(),
        contact_phone: payload.contactPhone.trim(),
        country: payload.country.trim(),
        hub_locode: payload.hubLocode || 'NLRTM',
        account_status: 'Active',
        custom_margin_percent: margin,
        notes: payload.notes?.trim() ?? '',
        last_activity: 'Client profile registered',
      })
      .select('*')
      .single();

    if (error || !data) {
      return { ok: false, error: error?.message ?? 'Failed to register client.' };
    }

    const mapped = this.mapDealerClientRow(data);
    this.dealerClients.update((list) => [mapped, ...list]);
    await this.recordActivity('CLIENT', `Registered client ${mapped.companyName}`);
    return { ok: true, clientItem: mapped };
  }

  async updateDealerClient(
    clientId: string,
    patch: {
      companyName?: string;
      contactName?: string;
      contactEmail?: string;
      contactPhone?: string;
      country?: string;
      hubLocode?: string;
      accountStatus?: DealerClientItem['accountStatus'];
      customMarginPercent?: number;
      notes?: string;
      lastActivity?: string;
    },
  ): Promise<{ ok: boolean; error?: string }> {
    const client = await this.supabase.ensureClient();
    if (!client) {
      return { ok: false, error: 'Supabase client unavailable.' };
    }

    if (patch.customMarginPercent !== undefined) {
      const { dealerMinMarginPercent, dealerMaxMarginPercent } = this.systemConfig();
      const margin = Number(patch.customMarginPercent);
      if (
        Number.isNaN(margin) ||
        margin < dealerMinMarginPercent ||
        margin > dealerMaxMarginPercent
      ) {
        return {
          ok: false,
          error: `Client margin (${margin}%) must stay within Admin limits (${dealerMinMarginPercent}% – ${dealerMaxMarginPercent}%).`,
        };
      }
    }

    const dbPatch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (patch.companyName !== undefined) dbPatch['company_name'] = patch.companyName.trim();
    if (patch.contactName !== undefined) dbPatch['contact_name'] = patch.contactName.trim();
    if (patch.contactEmail !== undefined) {
      dbPatch['contact_email'] = patch.contactEmail.trim().toLowerCase();
    }
    if (patch.contactPhone !== undefined) dbPatch['contact_phone'] = patch.contactPhone.trim();
    if (patch.country !== undefined) dbPatch['country'] = patch.country.trim();
    if (patch.hubLocode !== undefined) dbPatch['hub_locode'] = patch.hubLocode;
    if (patch.accountStatus !== undefined) dbPatch['account_status'] = patch.accountStatus;
    if (patch.customMarginPercent !== undefined) {
      dbPatch['custom_margin_percent'] = Number(patch.customMarginPercent);
    }
    if (patch.notes !== undefined) dbPatch['notes'] = patch.notes.trim();
    if (patch.lastActivity !== undefined) dbPatch['last_activity'] = patch.lastActivity;

    const { error } = await client.from('dealer_clients').update(dbPatch).eq('id', clientId);
    if (error) {
      return { ok: false, error: error.message };
    }

    this.dealerClients.update((list) =>
      list.map((c) =>
        c.id === clientId
          ? {
            ...c,
            companyName: patch.companyName?.trim() ?? c.companyName,
            contactName: patch.contactName?.trim() ?? c.contactName,
            contactEmail: patch.contactEmail?.trim().toLowerCase() ?? c.contactEmail,
            contactPhone: patch.contactPhone?.trim() ?? c.contactPhone,
            country: patch.country?.trim() ?? c.country,
            hubLocode: patch.hubLocode ?? c.hubLocode,
            accountStatus: patch.accountStatus ?? c.accountStatus,
            customMarginPercent:
              patch.customMarginPercent !== undefined
                ? Number(patch.customMarginPercent)
                : c.customMarginPercent,
            notes: patch.notes?.trim() ?? c.notes,
            lastActivity: patch.lastActivity ?? c.lastActivity,
          }
          : c,
      ),
    );
    await this.recordActivity('CLIENT', `Updated client profile ${patch.companyName ?? clientId}`);
    return { ok: true };
  }

  async submitDealerBrokerQuote(payload: {
    clientId?: string | null;
    clientName: string;
    contactEmail: string;
    originCode: string;
    destinationCode: string;
    containerId: string;
    quantity: number;
    cargoSpecs: string;
    marginPercent: number;
    quoteType: 'broker_request' | 'client_quote';
    notes?: string;
  }): Promise<{ ok: boolean; quoteRef?: string; error?: string }> {
    const client = await this.supabase.ensureClient();
    const user = this.auth.currentUser();
    if (!client || !user) {
      return { ok: false, error: 'Authenticated dealer session required.' };
    }

    const baseCalc = this.calculateFreightQuote(
      payload.originCode,
      payload.destinationCode,
      payload.containerId,
      payload.quantity,
    );
    if (!baseCalc) {
      return { ok: false, error: 'Select distinct origin and destination ports.' };
    }

    const { dealerMinMarginPercent, dealerMaxMarginPercent } = this.systemConfig();
    const margin = Number(payload.marginPercent);
    if (
      Number.isNaN(margin) ||
      margin < dealerMinMarginPercent ||
      margin > dealerMaxMarginPercent
    ) {
      return {
        ok: false,
        error: `Margin (${margin}%) exceeds Admin-authorized range (${dealerMinMarginPercent}% – ${dealerMaxMarginPercent}%).`,
      };
    }

    // Underlying base shipping rate is strictly locked to the platform rate engine.
    const baseRateUsd = baseCalc.totalUsd;
    const finalClientRateUsd = Math.round(baseRateUsd * (1 + margin / 100));
    const quoteRef = payload.quoteType === 'broker_request'
      ? `BRK-${Math.floor(1000 + Math.random() * 8999)}`
      : `CLQ-${Math.floor(1000 + Math.random() * 8999)}`;
    const lane = `${baseCalc.origin.name} (${baseCalc.origin.code}) → ${baseCalc.destination.name} (${baseCalc.destination.code})`;
    const equipment = `${baseCalc.quantity} × ${baseCalc.container.label}`;

    const baseInsert = {
      quote_ref: quoteRef,
      client_name: payload.clientName.trim(),
      contact_email: payload.contactEmail.trim(),
      freight_mode: baseCalc.container.label,
      trade_lane: lane,
      equipment,
      rate_usd: finalClientRateUsd,
      margin_percent: margin,
      notes: payload.notes?.trim() ?? '',
      status: payload.quoteType === 'client_quote' ? 'Approved' : 'Pending Review',
      customer_id: null,
      dealer_id: user.id,
    };

    const extendedInsert: Record<string, unknown> = {
      ...baseInsert,
      client_id: payload.clientId || null,
      origin_locode: baseCalc.origin.code,
      destination_locode: baseCalc.destination.code,
      cargo_specs: payload.cargoSpecs.trim(),
      base_rate_usd: baseRateUsd,
      final_client_rate_usd: finalClientRateUsd,
      quote_type: payload.quoteType,
    };

    let { error } = await client.from('quote_requests').insert(extendedInsert);
    if (error && /column|schema cache/i.test(error.message)) {
      const retry = await client.from('quote_requests').insert(baseInsert);
      error = retry.error;
    }

    if (error) {
      return { ok: false, error: error.message };
    }

    await this.fetchQuotesFromSupabase();
    if (payload.clientId) {
      await client
        .from('dealer_clients')
        .update({
          last_activity: `${payload.quoteType === 'client_quote' ? 'Generated client quote' : 'Submitted broker quote'} ${quoteRef}`,
          updated_at: new Date().toISOString(),
        })
        .eq('id', payload.clientId);
      await this.fetchDealerClientsFromSupabase();
    }
    await this.recordActivity(
      'DEALER QUOTE',
      `${quoteRef} for ${payload.clientName.trim()} (${lane} · Base $${baseRateUsd} + ${margin}%)`,
    );
    return { ok: true, quoteRef };
  }

  async createDealerClientShipment(payload: {
    client: DealerClientItem;
    originCode: string;
    destinationCode: string;
    containerId: string;
    quantity: number;
    cargoDescription: string;
    incoterm: 'EXW' | 'FOB' | 'CIF' | 'DDP';
  }): Promise<{ ok: boolean; shipment?: ShipmentRecord; error?: string }> {
    const rateCalc = this.calculateFreightQuote(
      payload.originCode,
      payload.destinationCode,
      payload.containerId,
      payload.quantity,
    );
    if (!rateCalc) {
      return { ok: false, error: 'Select distinct origin and destination ports.' };
    }
    const finalCharge = Math.round(
      rateCalc.totalUsd * (1 + payload.client.customMarginPercent / 100),
    );
    const originLabel = `Port of ${rateCalc.origin.name} (${rateCalc.origin.code})`;
    const destLabel = `Port of ${rateCalc.destination.name} (${rateCalc.destination.code})`;
    const cargoLabel = `${rateCalc.quantity} × ${rateCalc.container.label} · ${payload.cargoDescription.trim() || 'Client Freight'}`;

    const res = await this.addShipment(originLabel, destLabel, cargoLabel, payload.incoterm, {
      dealerId: this.auth.currentUser()?.id ?? null,
      dealerClientId: payload.client.id,
      freightChargeUsd: finalCharge,
      cargoDescription: `${payload.client.companyName}: ${payload.cargoDescription.trim()}`,
      shippingMethod: rateCalc.container.id === '40-reefer' ? 'Active Reefer' : 'Ocean FCL',
    });

    if (res.ok && res.shipment) {
      const client = this.supabase.client();
      if (client) {
        await client
          .from('dealer_clients')
          .update({
            last_activity: `Shipment ${res.shipment.trackingId} booked`,
            updated_at: new Date().toISOString(),
          })
          .eq('id', payload.client.id);
        await this.fetchDealerClientsFromSupabase();
      }
    }
    return res;
  }

  async issueDealerClientInvoice(
    shipment: ShipmentRecord,
    clientItem?: DealerClientItem | null,
  ): Promise<{ ok: boolean; invoice?: InvoiceItem; error?: string }> {
    const client = await this.supabase.ensureClient();
    const user = this.auth.currentUser();
    if (!client || !user) {
      return { ok: false, error: 'Authenticated dealer session required.' };
    }

    const invoiceNumber = `INV-2026-${Math.floor(500 + Math.random() * 499)}`;
    const originCode = this.extractLocode(shipment.origin, 'CNSHA');
    const destCode = this.extractLocode(shipment.destination, 'NLRTM');
    const amountUsd = shipment.freightChargeUsd ?? 4250;
    const dueDate = 'Nov 25, 2026';

    const baseInsert = {
      invoice_number: invoiceNumber,
      shipment_tracking_id: shipment.trackingId,
      lane: `${originCode} → ${destCode}`,
      amount_usd: amountUsd,
      due_date: dueDate,
      status: 'Due',
      customer_id: shipment.customerId ?? null,
    };

    const extendedInsert: Record<string, unknown> = {
      ...baseInsert,
      dealer_id: user.id,
      dealer_client_id: clientItem?.id ?? shipment.dealerClientId ?? null,
      client_name: clientItem?.companyName ?? '',
    };

    let { error } = await client.from('invoices').insert(extendedInsert);
    if (error && /column|schema cache/i.test(error.message)) {
      const retry = await client.from('invoices').insert(baseInsert);
      error = retry.error;
    }

    if (error) {
      return { ok: false, error: error.message };
    }

    const created: InvoiceItem = {
      id: invoiceNumber,
      shipmentId: shipment.trackingId,
      lane: baseInsert.lane,
      amountUsd,
      dueDate,
      status: 'Due',
      dealerId: user.id,
      dealerClientId: clientItem?.id ?? shipment.dealerClientId ?? null,
      clientName: clientItem?.companyName ?? '',
    };

    this.invoices.update((items) => [created, ...items]);
    await this.recordActivity(
      'DEALER BILLING',
      `Issued client invoice ${invoiceNumber} for ${shipment.trackingId} ($${amountUsd})`,
    );
    return { ok: true, invoice: created };
  }

  async payInvoice(
    id: string,
    paymentMethod = 'Corporate ACH / Wire',
  ): Promise<{ ok: boolean; receiptNumber?: string; error?: string }> {
    const role = this.auth.currentRole();
    if (role !== 'admin' && role !== 'staff') {
      return {
        ok: false,
        error: 'Customers cannot update payment status. Submit payment details for Admin or Staff verification.',
      };
    }
    return this.verifyInvoicePayment(id, 'verified', undefined, paymentMethod);
  }

  async submitCustomerAdvancePayment(payload: {
    lane: string;
    amountUsd: number;
    paymentMethod: string;
    paymentReference: string;
    proofFile?: File | null;
  }): Promise<{ ok: boolean; invoice?: InvoiceItem; error?: string }> {
    const client = await this.supabase.ensureClient();
    const user = this.auth.currentUser();
    if (!client || !user) {
      return { ok: false, error: 'Authenticated session required to submit payment.' };
    }
    if (!payload.paymentReference.trim()) {
      return { ok: false, error: 'Enter your transaction / wire reference number.' };
    }
    const amountUsd = Math.max(100, Math.round(Number(payload.amountUsd) || 0));
    const invoiceNumber = `INV-2026-${Math.floor(1000 + Math.random() * 8999)}`;
    const dueDate = new Date().toLocaleDateString('en-US', {
      month: 'short',
      day: '2-digit',
      year: 'numeric',
    });

    const proofMeta = await this.uploadPaymentProof(client, user.id, payload.proofFile ?? null);

    const baseInsert = {
      invoice_number: invoiceNumber,
      shipment_tracking_id: 'PRE-BOOKING',
      lane: payload.lane.trim() || 'CNSHA → NLRTM',
      amount_usd: amountUsd,
      due_date: dueDate,
      status: 'Due',
      customer_id: user.id,
    };

    const extendedInsert: Record<string, unknown> = {
      ...baseInsert,
      payment_method: payload.paymentMethod,
      verification_status: 'pending_verification',
      payment_reference: payload.paymentReference.trim(),
      payment_proof_name: proofMeta?.name ?? null,
      payment_proof_path: proofMeta?.path ?? null,
    };

    let { error } = await client.from('invoices').insert(extendedInsert);
    if (error && /column|schema cache/i.test(error.message)) {
      const retry = await client.from('invoices').insert(baseInsert);
      error = retry.error;
    }

    if (error) {
      return { ok: false, error: error.message };
    }

    const created: InvoiceItem = {
      id: invoiceNumber,
      shipmentId: 'PRE-BOOKING',
      lane: baseInsert.lane,
      amountUsd,
      dueDate,
      status: 'Due',
      customerId: user.id,
      clientName: user.organization,
      paymentMethod: payload.paymentMethod,
      verificationStatus: 'pending_verification',
      paymentReference: payload.paymentReference.trim(),
      paymentProofName: proofMeta?.name ?? null,
      paymentProofPath: proofMeta?.path ?? null,
    };

    this.invoices.update((items) => [created, ...items]);
    await this.recordActivity(
      'BILLING',
      `Advance payment ${invoiceNumber} ($${amountUsd}) submitted for Admin/Staff verification`,
    );
    return { ok: true, invoice: created };
  }

  async submitCustomerInvoicePayment(
    id: string,
    payload: {
      paymentMethod: string;
      paymentReference: string;
      proofFile?: File | null;
    },
  ): Promise<{ ok: boolean; error?: string }> {
    const client = await this.supabase.ensureClient();
    const user = this.auth.currentUser();
    if (!client || !user) {
      return { ok: false, error: 'Authenticated session required.' };
    }
    if (!payload.paymentReference.trim()) {
      return { ok: false, error: 'Enter your payment / transaction reference number.' };
    }

    const target = this.invoices().find((inv) => inv.id === id);
    if (!target) {
      return { ok: false, error: 'Invoice not found.' };
    }
    if (target.status === 'Paid' && target.verificationStatus === 'verified') {
      return { ok: false, error: 'This invoice has already been verified as Paid.' };
    }

    const proofMeta = await this.uploadPaymentProof(client, user.id, payload.proofFile ?? null);

    const { error } = await client
      .from('invoices')
      .update({
        status: 'Due',
        payment_method: payload.paymentMethod,
        verification_status: 'pending_verification',
        payment_reference: payload.paymentReference.trim(),
        payment_proof_name: proofMeta?.name ?? target.paymentProofName ?? null,
        payment_proof_path: proofMeta?.path ?? target.paymentProofPath ?? null,
        verification_note: null,
      })
      .eq('invoice_number', id);

    if (error && !/column|schema cache/i.test(error.message)) {
      return { ok: false, error: error.message };
    }

    this.invoices.update((items) =>
      items.map((inv) =>
        inv.id === id
          ? {
            ...inv,
            status: 'Due',
            paymentMethod: payload.paymentMethod,
            verificationStatus: 'pending_verification',
            paymentReference: payload.paymentReference.trim(),
            paymentProofName: proofMeta?.name ?? inv.paymentProofName ?? null,
            paymentProofPath: proofMeta?.path ?? inv.paymentProofPath ?? null,
            verificationNote: null,
          }
          : inv,
      ),
    );
    await this.recordActivity(
      'BILLING',
      `Customer submitted payment proof for ${id} (Ref: ${payload.paymentReference.trim()})`,
    );
    return { ok: true };
  }

  async verifyInvoicePayment(
    id: string,
    decision: 'verified' | 'rejected',
    note?: string,
    paymentMethodOverride?: string,
  ): Promise<{ ok: boolean; receiptNumber?: string; error?: string }> {
    const role = this.auth.currentRole();
    const user = this.auth.currentUser();
    if (!user || (role !== 'admin' && role !== 'staff')) {
      return {
        ok: false,
        error: 'Only Admin or Staff can verify or update customer payment status.',
      };
    }

    const client = await this.supabase.ensureClient();
    if (!client) {
      return { ok: false, error: 'Supabase client unavailable.' };
    }

    const target = this.invoices().find((inv) => inv.id === id);
    if (!target) {
      return { ok: false, error: 'Invoice not found.' };
    }

    const nowIso = new Date().toISOString();
    const receiptNumber =
      decision === 'verified'
        ? target.receiptNumber || `RCP-${Math.floor(100000 + Math.random() * 899999)}`
        : null;
    const nextStatus: InvoiceItem['status'] = decision === 'verified' ? 'Paid' : 'Due';
    const nextMethod = paymentMethodOverride ?? target.paymentMethod ?? 'Corporate ACH / Wire';

    const extendedPatch: Record<string, unknown> = {
      status: nextStatus,
      verification_status: decision,
      verification_note: note?.trim() || null,
      verified_by: user.id,
      verified_at: nowIso,
      payment_method: nextMethod,
      paid_at: decision === 'verified' ? nowIso : null,
      receipt_number: receiptNumber,
    };

    let { error } = await client
      .from('invoices')
      .update(extendedPatch)
      .eq('invoice_number', id);

    if (error && /column|schema cache/i.test(error.message)) {
      const retry = await client
        .from('invoices')
        .update({ status: nextStatus })
        .eq('invoice_number', id);
      error = retry.error;
    }

    if (error) {
      return { ok: false, error: error.message };
    }

    this.invoices.update((items) =>
      items.map((inv) =>
        inv.id === id
          ? {
            ...inv,
            status: nextStatus,
            verificationStatus: decision,
            verificationNote: note?.trim() || null,
            verifiedBy: user.id,
            verifiedAt: nowIso,
            paymentMethod: nextMethod,
            paidAt: decision === 'verified' ? nowIso : null,
            paidAmountUsd: decision === 'verified' ? inv.amountUsd : 0,
            receiptNumber,
          }
          : inv,
      ),
    );

    await this.recordActivity(
      'BILLING',
      decision === 'verified'
        ? `${role.toUpperCase()} verified payment for ${id} (${receiptNumber})`
        : `${role.toUpperCase()} rejected payment for ${id}`,
    );

    if (target.customerId) {
      await client.from('customer_notifications').insert({
        customer_id: target.customerId,
        category: 'invoice',
        title:
          decision === 'verified'
            ? `Payment Verified · ${id}`
            : `Payment Verification Rejected · ${id}`,
        message:
          decision === 'verified'
            ? `Your payment of $${target.amountUsd.toLocaleString('en-US')} (${receiptNumber}) was verified. You can now submit a shipment request.`
            : `Payment check failed for ${id}: ${note?.trim() || 'Please resubmit valid payment proof.'}`,
        tracking_id: target.shipmentId !== 'PRE-BOOKING' ? target.shipmentId : null,
        is_read: false,
      });
    }

    return { ok: true, receiptNumber: receiptNumber ?? undefined };
  }

  async payInvoiceViaGateway(payload: {
    invoiceNumber?: string;
    lane?: string;
    amountUsd?: number;
    paymentMethod: string;
    gatewayProvider?: string;
    gatewayToken: string;
  }): Promise<{ ok: boolean; invoice?: InvoiceItem; receiptNumber?: string; gatewayTxnId?: string; error?: string }> {
    const client = await this.supabase.ensureClient();
    const user = this.auth.currentUser();
    if (!client || !user) {
      return { ok: false, error: 'Authenticated session required for gateway payment.' };
    }
    if (payload.gatewayToken.trim().length < 4) {
      return { ok: false, error: 'Enter valid payment details to authorize checkout.' };
    }

    const gatewayProvider = payload.gatewayProvider?.trim() || 'TerminusPay Dummy Gateway';
    const { data, error } = await client.rpc('process_gateway_payment', {
      p_invoice_number: payload.invoiceNumber ?? null,
      p_lane: payload.lane ?? 'CNSHA → NLRTM',
      p_amount_usd: payload.amountUsd ? Math.round(payload.amountUsd) : 0,
      p_payment_method: payload.paymentMethod,
      p_gateway_provider: gatewayProvider,
      p_gateway_token: payload.gatewayToken.trim(),
    });

    const isMissingRpc = Boolean(
      error &&
        /could not find the function|schema cache|does not exist|42883|PGRST202/i.test(error.message),
    );

    if (error && !isMissingRpc) {
      return {
        ok: false,
        error: error.message ?? 'Payment gateway authorization failed.',
      };
    }

    const nowIso = new Date().toISOString();
    let invNum = data?.invoice_number ? String(data.invoice_number) : '';
    let receiptNumber = data?.receipt_number ? String(data.receipt_number) : '';
    let gatewayTxnId = data?.gateway_txn_id ? String(data.gateway_txn_id) : '';
    let amountUsd = Number(data?.amount_usd ?? payload.amountUsd ?? 0);

    if (isMissingRpc || !data) {
      // Dummy Payment Gateway fallback when SQL RPC hasn't been installed yet
      receiptNumber = `RCP-${Math.floor(100000 + Math.random() * 899999)}`;
      gatewayTxnId = `GW-DUMMY-${Math.floor(100000 + Math.random() * 899999)}`;
      if (payload.invoiceNumber) {
        invNum = payload.invoiceNumber;
        const target = this.invoices().find((i) => i.id === invNum);
        amountUsd = target?.amountUsd ?? amountUsd;
        await client.from('invoices').update({ status: 'Paid' }).eq('invoice_number', invNum);
      } else {
        invNum = `INV-2026-${Math.floor(1000 + Math.random() * 8999)}`;
        await client.from('invoices').insert({
          invoice_number: invNum,
          shipment_tracking_id: 'PRE-BOOKING',
          lane: payload.lane ?? 'CNSHA → NLRTM',
          amount_usd: amountUsd,
          due_date: new Date().toLocaleDateString('en-US', {
            month: 'short',
            day: '2-digit',
            year: 'numeric',
          }),
          status: 'Paid',
          customer_id: user.id,
        });
      }
    }

    let resultInvoice: InvoiceItem;
    const existing = this.invoices().find((i) => i.id === invNum);
    if (existing) {
      resultInvoice = {
        ...existing,
        status: 'Paid',
        verificationStatus: 'verified',
        paymentMethod: payload.paymentMethod,
        paymentReference: gatewayTxnId,
        gatewayProvider,
        gatewayTxnId,
        receiptNumber,
        paidAt: nowIso,
        verifiedAt: nowIso,
        paidAmountUsd: existing.amountUsd,
      };
      this.invoices.update((items) => items.map((i) => (i.id === invNum ? resultInvoice : i)));
    } else {
      resultInvoice = {
        id: invNum,
        shipmentId: 'PRE-BOOKING',
        lane: payload.lane ?? 'CNSHA → NLRTM',
        amountUsd,
        dueDate: new Date().toLocaleDateString('en-US', {
          month: 'short',
          day: '2-digit',
          year: 'numeric',
        }),
        status: 'Paid',
        verificationStatus: 'verified',
        customerId: user.id,
        clientName: user.organization,
        paymentMethod: payload.paymentMethod,
        paymentReference: gatewayTxnId,
        gatewayProvider,
        gatewayTxnId,
        receiptNumber,
        paidAt: nowIso,
        verifiedAt: nowIso,
        paidAmountUsd: amountUsd,
      };
      this.invoices.update((items) => [resultInvoice, ...items]);
    }

    await this.recordActivity(
      'GATEWAY',
      `${gatewayProvider} confirmed ${invNum} ($${amountUsd}) · ${gatewayTxnId}`,
    );
    await this.createCustomerNotification({
      category: 'invoice',
      title: `Gateway Payment Confirmed · ${invNum}`,
      message: `$${amountUsd.toLocaleString('en-US')} authorized via ${payload.paymentMethod} (${receiptNumber}).`,
      trackingId: resultInvoice.shipmentId !== 'PRE-BOOKING' ? resultInvoice.shipmentId : null,
    });

    return { ok: true, invoice: resultInvoice, receiptNumber, gatewayTxnId };
  }

  async processGatewayPaymentAndOpenShipment(payload: {
    cargoType: string;
    cargoDescription: string;
    origin: string;
    destination: string;
    weightKg: number;
    dimensionsCm: string;
    shippingMethod: string;
    incoterm: 'EXW' | 'FOB' | 'CIF' | 'DDP';
    files?: File[];
    docCategory?: string;
    paymentMethod: string;
    gatewayProvider?: string;
    gatewayToken: string;
  }): Promise<{
    ok: boolean;
    invoice?: InvoiceItem;
    request?: ShipmentRequestItem;
    shipment?: ShipmentRecord;
    receiptNumber?: string;
    gatewayTxnId?: string;
    error?: string;
  }> {
    const price = this.calculateShipmentRequestPrice({
      origin: payload.origin,
      destination: payload.destination,
      cargoType: payload.cargoType,
      shippingMethod: payload.shippingMethod,
      weightKg: payload.weightKg,
      incoterm: payload.incoterm,
    });

    const gwRes = await this.payInvoiceViaGateway({
      lane: price.lane,
      amountUsd: price.totalUsd,
      paymentMethod: payload.paymentMethod,
      gatewayProvider: payload.gatewayProvider,
      gatewayToken: payload.gatewayToken,
    });

    if (!gwRes.ok || !gwRes.invoice) {
      return { ok: false, error: gwRes.error ?? 'Payment gateway declined transaction.' };
    }

    const reqRes = await this.submitCustomerShipmentRequest({
      cargoType: payload.cargoType,
      cargoDescription: payload.cargoDescription,
      origin: payload.origin,
      destination: payload.destination,
      weightKg: payload.weightKg,
      dimensionsCm: payload.dimensionsCm,
      shippingMethod: payload.shippingMethod,
      incoterm: payload.incoterm,
      verifiedInvoiceId: gwRes.invoice.id,
      files: payload.files,
      docCategory: payload.docCategory,
    });

    if (!reqRes.ok || !reqRes.shipment) {
      return {
        ok: false,
        invoice: gwRes.invoice,
        receiptNumber: gwRes.receiptNumber,
        gatewayTxnId: gwRes.gatewayTxnId,
        error: reqRes.error ?? 'Payment confirmed, but shipment opening failed.',
      };
    }

    this.invoices.update((items) =>
      items.map((i) =>
        i.id === gwRes.invoice!.id ? { ...i, shipmentId: reqRes.shipment!.trackingId } : i,
      ),
    );

    return {
      ok: true,
      invoice: { ...gwRes.invoice, shipmentId: reqRes.shipment.trackingId },
      request: reqRes.request,
      shipment: reqRes.shipment,
      receiptNumber: gwRes.receiptNumber,
      gatewayTxnId: gwRes.gatewayTxnId,
    };
  }

  private async uploadPaymentProof(
    client: any,
    userId: string,
    file: File | null,
  ): Promise<{ name: string; path?: string } | null> {
    if (!file) {
      return null;
    }
    let storagePath: string | undefined;
    try {
      const storage = (client as { storage?: { from: (b: string) => any } }).storage;
      if (storage) {
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const path = `${userId}/payments/${Date.now()}_${safeName}`;
        const { error: uploadErr } = await storage
          .from('shipping-documents')
          .upload(path, file, { upsert: true });
        if (!uploadErr) {
          storagePath = path;
        }
      }
    } catch {
      // Optional storage bucket; metadata still retained
    }
    return { name: file.name, path: storagePath };
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

  async submitCustomerShipmentRequest(payload: {
    cargoType: string;
    cargoDescription: string;
    origin: string;
    destination: string;
    weightKg: number;
    dimensionsCm: string;
    shippingMethod: string;
    incoterm: 'EXW' | 'FOB' | 'CIF' | 'DDP';
    verifiedInvoiceId?: string;
    files?: File[];
    docCategory?: string;
  }): Promise<{ ok: boolean; request?: ShipmentRequestItem; shipment?: ShipmentRecord; error?: string }> {
    const client = await this.supabase.ensureClient();
    const user = this.auth.currentUser();
    if (!client || !user) {
      return { ok: false, error: 'Authenticated session required to submit a shipping request.' };
    }

    const price = this.calculateShipmentRequestPrice({
      origin: payload.origin,
      destination: payload.destination,
      cargoType: payload.cargoType,
      shippingMethod: payload.shippingMethod,
      weightKg: payload.weightKg,
      incoterm: payload.incoterm,
    });

    let verifiedInvoiceId: string | null = payload.verifiedInvoiceId?.trim() || null;
    if (user.role === 'customer') {
      const usedInvoiceIds = new Set(
        this.shipmentRequests()
          .filter((r) => r.status !== 'Cancelled' && r.verifiedInvoiceId)
          .map((r) => r.verifiedInvoiceId!),
      );
      const verifiedPool = this.invoices().filter(
        (inv) =>
          inv.status === 'Paid' &&
          (inv.verificationStatus ?? 'verified') === 'verified' &&
          !usedInvoiceIds.has(inv.id),
      );
      const matched = verifiedInvoiceId
        ? verifiedPool.find((inv) => inv.id === verifiedInvoiceId)
        : verifiedPool[0];

      if (!matched) {
        return {
          ok: false,
          error:
            'Payment must be submitted and verified by an Admin or Staff operator before making a shipment request.',
        };
      }
      if (matched.amountUsd < price.totalUsd) {
        return {
          ok: false,
          error: `Verified invoice ${matched.id} ($${matched.amountUsd.toLocaleString('en-US')}) does not cover this shipment price ($${price.totalUsd.toLocaleString('en-US')}).`,
        };
      }
      verifiedInvoiceId = matched.id;
    }

    const docs: ShippingDocumentRef[] = [];
    const uploadedAt = new Date().toISOString();
    const category = payload.docCategory?.trim() || 'Commercial Invoice / Packing List';

    for (const file of payload.files ?? []) {
      let storagePath: string | undefined;
      try {
        const storage = (client as { storage?: { from: (b: string) => any } }).storage;
        if (storage) {
          const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
          const path = `${user.id}/${Date.now()}_${safeName}`;
          const { error: uploadErr } = await storage.from('shipping-documents').upload(path, file, {
            upsert: true,
          });
          if (!uploadErr) {
            storagePath = path;
          }
        }
      } catch {
        // Storage bucket optional; metadata still recorded with shipment request
      }
      docs.push({
        name: file.name,
        sizeBytes: file.size,
        mimeType: file.type || 'application/octet-stream',
        category,
        uploadedAt,
        storagePath,
      });
    }

    const shipmentRes = await this.addShipment(
      payload.origin,
      payload.destination,
      payload.cargoType,
      payload.incoterm,
      {
        customerId: user.id,
        freightChargeUsd: price.totalUsd,
        vgmKg: payload.weightKg,
        cargoDescription: payload.cargoDescription.trim(),
        shippingMethod: payload.shippingMethod,
        dimensionsCm: payload.dimensionsCm.trim(),
        shippingDocs: docs,
        verifiedInvoiceId,
      },
    );

    if (!shipmentRes.ok || !shipmentRes.shipment) {
      return { ok: false, error: shipmentRes.error ?? 'Could not submit shipment request.' };
    }

    const requestRef = `REQ-${Math.floor(100000 + Math.random() * 899999)}`;
    const originLocode = this.extractLocode(payload.origin, 'CNSHA');
    const destLocode = this.extractLocode(payload.destination, 'NLRTM');
    const createdAt = new Date().toLocaleDateString('en-US', {
      month: 'short',
      day: '2-digit',
      year: 'numeric',
    });

    const baseReqInsert = {
      request_ref: requestRef,
      customer_id: user.id,
      cargo_type: payload.cargoType,
      cargo_description: payload.cargoDescription.trim(),
      origin_locode: originLocode,
      destination_locode: destLocode,
      origin_label: payload.origin,
      destination_label: payload.destination,
      weight_kg: Math.max(1, Math.round(payload.weightKg || 1000)),
      dimensions_cm: payload.dimensionsCm.trim() || '1200 x 235 x 269 cm',
      shipping_method: payload.shippingMethod,
      incoterm: payload.incoterm,
      documents: docs,
      status: 'Confirmed',
      linked_tracking_id: shipmentRes.shipment.trackingId,
    };

    let insertedId = `req-${Date.now()}`;
    let { data: reqRow, error: reqErr } = await client
      .from('shipment_requests')
      .insert({
        ...baseReqInsert,
        verified_invoice_number: verifiedInvoiceId,
      })
      .select('id')
      .single();

    if (reqErr && /column|schema cache/i.test(reqErr.message)) {
      const retry = await client.from('shipment_requests').insert(baseReqInsert).select('id').single();
      reqRow = retry.data;
      reqErr = retry.error;
    }

    if (!reqErr && reqRow?.id) {
      insertedId = reqRow.id;
    }

    const requestItem: ShipmentRequestItem = {
      id: insertedId,
      requestRef,
      cargoType: payload.cargoType,
      cargoDescription: payload.cargoDescription.trim(),
      origin: payload.origin,
      destination: payload.destination,
      weightKg: Math.max(1, Math.round(payload.weightKg || 1000)),
      dimensionsCm: payload.dimensionsCm.trim() || '1200 x 235 x 269 cm',
      shippingMethod: payload.shippingMethod,
      incoterm: payload.incoterm,
      documents: docs,
      status: 'Confirmed',
      linkedTrackingId: shipmentRes.shipment.trackingId,
      verifiedInvoiceId,
      createdAt,
    };

    this.shipmentRequests.update((list) => [requestItem, ...list]);
    await this.createCustomerNotification({
      category: 'confirmation',
      title: `Shipment Request ${requestRef} Confirmed`,
      message: `${shipmentRes.shipment.trackingId} (${payload.shippingMethod}) booked from ${payload.origin} to ${payload.destination}.`,
      trackingId: shipmentRes.shipment.trackingId,
    });

    return { ok: true, request: requestItem, shipment: shipmentRes.shipment };
  }

  async createCustomerNotification(payload: {
    category: CustomerNotificationItem['category'];
    title: string;
    message: string;
    trackingId?: string | null;
  }): Promise<void> {
    const client = this.supabase.client();
    const user = this.auth.currentUser();
    if (!client || !user) {
      return;
    }

    const createdAt = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    let id = `notif-${Date.now()}`;

    const { data, error } = await client
      .from('customer_notifications')
      .insert({
        customer_id: user.id,
        category: payload.category,
        title: payload.title,
        message: payload.message,
        tracking_id: payload.trackingId ?? null,
        is_read: false,
      })
      .select('id')
      .single();

    if (!error && data?.id) {
      id = data.id;
    }

    this.customerNotifications.update((items) => [
      {
        id,
        category: payload.category,
        title: payload.title,
        message: payload.message,
        trackingId: payload.trackingId ?? null,
        isRead: false,
        createdAt,
      },
      ...items,
    ]);
  }

  async markNotificationRead(id: string): Promise<void> {
    const client = this.supabase.client();
    this.customerNotifications.update((items) =>
      items.map((item) => (item.id === id ? { ...item, isRead: true } : item)),
    );
    if (client && !id.startsWith('synth-')) {
      await client.from('customer_notifications').update({ is_read: true }).eq('id', id);
    }
  }

  async markAllNotificationsRead(): Promise<void> {
    const client = this.supabase.client();
    const user = this.auth.currentUser();
    this.customerNotifications.update((items) => items.map((item) => ({ ...item, isRead: true })));
    if (client && user) {
      await client
        .from('customer_notifications')
        .update({ is_read: true })
        .eq('customer_id', user.id);
    }
  }

  async submitSupportTicket(payload: {
    ticketType: SupportTicketItem['ticketType'];
    subject: string;
    priority: SupportTicketItem['priority'];
    shipmentTrackingId?: string | null;
    message: string;
  }): Promise<{ ok: boolean; ticket?: SupportTicketItem; error?: string }> {
    const client = await this.supabase.ensureClient();
    const user = this.auth.currentUser();
    if (!client || !user) {
      return { ok: false, error: 'Authenticated session required to submit support requests.' };
    }
    if (!payload.subject.trim() || !payload.message.trim()) {
      return { ok: false, error: 'Subject and message are required.' };
    }

    const ticketRef = `SUP-${Math.floor(10000 + Math.random() * 89999)}`;
    const nowLabel = new Date().toLocaleString([], {
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });

    const { data: ticketRow, error: ticketErr } = await client
      .from('support_tickets')
      .insert({
        ticket_ref: ticketRef,
        customer_id: user.id,
        shipment_tracking_id: payload.shipmentTrackingId?.trim() || null,
        ticket_type: payload.ticketType,
        subject: payload.subject.trim(),
        priority: payload.priority,
        status: 'Open',
      })
      .select('id')
      .single();

    if (ticketErr && !/relation|table|schema cache/i.test(ticketErr.message)) {
      return { ok: false, error: ticketErr.message };
    }

    const ticketId = ticketRow?.id ?? `sup-${Date.now()}`;
    const msgBody = payload.message.trim();

    if (ticketRow?.id) {
      await client.from('support_messages').insert({
        ticket_id: ticketRow.id,
        sender_id: user.id,
        sender_role: user.role === 'staff' || user.role === 'admin' ? user.role : 'customer',
        sender_name: user.name,
        body: msgBody,
      });
    }

    const created: SupportTicketItem = {
      id: ticketId,
      ticketRef,
      shipmentTrackingId: payload.shipmentTrackingId?.trim() || null,
      ticketType: payload.ticketType,
      subject: payload.subject.trim(),
      priority: payload.priority,
      status: 'Open',
      createdAt: nowLabel,
      updatedAt: nowLabel,
      messages: [
        {
          id: `msg-${Date.now()}`,
          senderRole: 'customer',
          senderName: user.name,
          body: msgBody,
          createdAt: nowLabel,
        },
      ],
    };

    this.supportTickets.update((items) => [created, ...items]);
    await this.recordActivity('SUPPORT', `Opened ${ticketRef}: ${payload.subject.trim()}`);
    return { ok: true, ticket: created };
  }

  async replyToSupportTicket(ticketId: string, body: string): Promise<{ ok: boolean; error?: string }> {
    const client = await this.supabase.ensureClient();
    const user = this.auth.currentUser();
    if (!client || !user) {
      return { ok: false, error: 'Authenticated session required.' };
    }
    if (!body.trim()) {
      return { ok: false, error: 'Message body cannot be empty.' };
    }

    const nowLabel = new Date().toLocaleString([], {
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
    const senderRole: SupportMessageItem['senderRole'] =
      user.role === 'staff' || user.role === 'admin' ? user.role : 'customer';

    const { error } = await client.from('support_messages').insert({
      ticket_id: ticketId,
      sender_id: user.id,
      sender_role: senderRole,
      sender_name: user.name,
      body: body.trim(),
    });

    if (error && !/relation|table|schema cache|foreign key/i.test(error.message)) {
      return { ok: false, error: error.message };
    }

    await client
      .from('support_tickets')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', ticketId);

    this.supportTickets.update((list) =>
      list.map((t) =>
        t.id === ticketId
          ? {
            ...t,
            updatedAt: nowLabel,
            messages: [
              ...t.messages,
              {
                id: `msg-${Date.now()}`,
                senderRole,
                senderName: user.name,
                body: body.trim(),
                createdAt: nowLabel,
              },
            ],
          }
          : t,
      ),
    );
    return { ok: true };
  }

  async resolveSupportTicket(ticketId: string): Promise<{ ok: boolean; error?: string }> {
    const client = await this.supabase.ensureClient();
    if (!client) {
      return { ok: false, error: 'Supabase client unavailable.' };
    }

    const { error } = await client
      .from('support_tickets')
      .update({ status: 'Resolved', updated_at: new Date().toISOString() })
      .eq('id', ticketId);

    if (error && !/relation|table|schema cache/i.test(error.message)) {
      return { ok: false, error: error.message };
    }

    this.supportTickets.update((list) =>
      list.map((t) => (t.id === ticketId ? { ...t, status: 'Resolved' } : t)),
    );
    return { ok: true };
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
        this.dealerClients.set([]);
        this.dealerQuotes.set([]);
        this.invoices.set([]);
        this.gateTasks.set([]);
        this.activityFeed.set([]);
        this.shipmentRequests.set([]);
        this.customerNotifications.set([]);
        this.supportTickets.set([]);
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
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shipment_requests' }, () => {
        void this.fetchShipmentRequestsFromSupabase();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'customer_notifications' }, () => {
        void this.fetchCustomerNotificationsFromSupabase();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'support_tickets' }, () => {
        void this.fetchSupportTicketsFromSupabase();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'support_messages' }, () => {
        void this.fetchSupportTicketsFromSupabase();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'dealer_clients' }, () => {
        void this.fetchDealerClientsFromSupabase();
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          this.lastSyncLabel.set('Live Feed');
        }
      });
  }

  async refreshAllFromSupabase(): Promise<void> {
    await Promise.all([
      this.fetchPortsFromSupabase(),
      this.fetchShipmentsFromSupabase(),
      this.fetchDealerClientsFromSupabase(),
      this.fetchQuotesFromSupabase(),
      this.fetchInvoicesFromSupabase(),
      this.fetchGateTasksFromSupabase(),
      this.fetchActivityFromSupabase(),
      this.fetchTelemetryFromSupabase(),
      this.fetchSystemSettingsFromSupabase(),
      this.fetchShipmentRequestsFromSupabase(),
      this.fetchCustomerNotificationsFromSupabase(),
      this.fetchSupportTicketsFromSupabase(),
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
          dealerClientId: row.dealer_client_id ?? null,
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
          cargoDescription: row.cargo_description ?? undefined,
          shippingMethod: row.shipping_method ?? 'Ocean FCL',
          dimensionsCm: row.dimensions_cm ?? undefined,
          shippingDocs: Array.isArray(row.shipping_docs) ? row.shipping_docs : [],
          createdAt: row.created_at
            ? new Date(row.created_at).toLocaleDateString('en-US', {
              month: 'short',
              day: '2-digit',
              year: 'numeric',
            })
            : undefined,
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
          clientId: row.client_id ?? null,
          client: row.client_name,
          contactEmail: row.contact_email ?? undefined,
          lane: row.trade_lane,
          originCode: row.origin_locode ?? undefined,
          destinationCode: row.destination_locode ?? undefined,
          equipment: row.equipment,
          cargoSpecs: row.cargo_specs ?? undefined,
          baseRateUsd: row.base_rate_usd ?? undefined,
          rateUsd: row.final_client_rate_usd ?? row.rate_usd,
          marginPercent: Number(row.margin_percent),
          quoteType: row.quote_type ?? 'broker_request',
          notes: row.notes ?? undefined,
          createdAt: row.created_at
            ? new Date(row.created_at).toLocaleDateString('en-US', {
              month: 'short',
              day: '2-digit',
              year: 'numeric',
            })
            : undefined,
          status: row.status,
        })),
      );
    }
  }

  private async fetchDealerClientsFromSupabase(): Promise<void> {
    const client = this.supabase.client();
    if (!client) {
      return;
    }
    const { data, error } = await client
      .from('dealer_clients')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return;
    }

    if (data) {
      this.dealerClients.set(data.map((row) => this.mapDealerClientRow(row)));
    }
  }

  private mapDealerClientRow(row: any): DealerClientItem {
    return {
      id: row.id,
      dealerId: row.dealer_id,
      companyName: row.company_name,
      contactName: row.contact_name,
      contactEmail: row.contact_email,
      contactPhone: row.contact_phone ?? '',
      country: row.country ?? '',
      hubLocode: row.hub_locode ?? 'NLRTM',
      accountStatus: row.account_status ?? 'Active',
      customMarginPercent: Number(row.custom_margin_percent ?? 8.5),
      notes: row.notes ?? '',
      lastActivity: row.last_activity ?? 'Active partner account',
      createdAt: row.created_at
        ? new Date(row.created_at).toLocaleDateString('en-US', {
          month: 'short',
          day: '2-digit',
          year: 'numeric',
        })
        : '',
    };
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
          customerId: row.customer_id ?? null,
          dealerId: row.dealer_id ?? null,
          dealerClientId: row.dealer_client_id ?? null,
          clientName: row.client_name ?? '',
          paidAmountUsd: row.paid_amount_usd ?? (row.status === 'Paid' ? row.amount_usd : 0),
          paidAt: row.paid_at ?? null,
          paymentMethod: row.payment_method ?? null,
          receiptNumber: row.receipt_number ?? null,
          verificationStatus:
            row.verification_status ?? (row.status === 'Paid' ? 'verified' : 'unpaid'),
          paymentReference: row.payment_reference ?? null,
          paymentProofName: row.payment_proof_name ?? null,
          paymentProofPath: row.payment_proof_path ?? null,
          verificationNote: row.verification_note ?? null,
          verifiedBy: row.verified_by ?? null,
          verifiedAt: row.verified_at ?? null,
          gatewayProvider: row.gateway_provider ?? null,
          gatewayTxnId: row.gateway_txn_id ?? null,
        })),
      );
    }
  }

  private async fetchShipmentRequestsFromSupabase(): Promise<void> {
    const client = this.supabase.client();
    if (!client) {
      return;
    }
    const { data, error } = await client
      .from('shipment_requests')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return;
    }

    if (data) {
      this.shipmentRequests.set(
        data.map((row) => ({
          id: row.id,
          requestRef: row.request_ref,
          cargoType: row.cargo_type,
          cargoDescription: row.cargo_description ?? '',
          origin: row.origin_label,
          destination: row.destination_label,
          weightKg: row.weight_kg ?? 0,
          dimensionsCm: row.dimensions_cm ?? '',
          shippingMethod: row.shipping_method ?? 'Ocean FCL',
          incoterm: row.incoterm ?? 'CIF',
          documents: Array.isArray(row.documents) ? row.documents : [],
          status: row.status ?? 'Confirmed',
          linkedTrackingId: row.linked_tracking_id ?? null,
          verifiedInvoiceId: row.verified_invoice_number ?? null,
          createdAt: row.created_at
            ? new Date(row.created_at).toLocaleDateString('en-US', {
              month: 'short',
              day: '2-digit',
              year: 'numeric',
            })
            : '',
        })),
      );
    }
  }

  private async fetchCustomerNotificationsFromSupabase(): Promise<void> {
    const client = this.supabase.client();
    if (!client) {
      return;
    }
    const { data, error } = await client
      .from('customer_notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(30);

    if (error) {
      return;
    }

    if (data) {
      this.customerNotifications.set(
        data.map((row) => ({
          id: row.id,
          category: row.category,
          title: row.title,
          message: row.message,
          trackingId: row.tracking_id ?? null,
          isRead: Boolean(row.is_read),
          createdAt: row.created_at
            ? new Date(row.created_at).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })
            : '',
        })),
      );
    }
  }

  private async fetchSupportTicketsFromSupabase(): Promise<void> {
    const client = this.supabase.client();
    if (!client) {
      return;
    }
    const { data, error } = await client
      .from('support_tickets')
      .select('*, support_messages(*)')
      .order('updated_at', { ascending: false });

    if (error) {
      return;
    }

    if (data) {
      this.supportTickets.set(
        data.map((row) => ({
          id: row.id,
          ticketRef: row.ticket_ref,
          shipmentTrackingId: row.shipment_tracking_id ?? null,
          ticketType: row.ticket_type ?? 'ticket',
          subject: row.subject,
          priority: row.priority ?? 'Normal',
          status: row.status ?? 'Open',
          createdAt: row.created_at
            ? new Date(row.created_at).toLocaleString([], {
              month: 'short',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
            })
            : '',
          updatedAt: row.updated_at
            ? new Date(row.updated_at).toLocaleString([], {
              month: 'short',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
            })
            : '',
          messages: ((row.support_messages as any[]) ?? [])
            .slice()
            .sort((a, b) => String(a.created_at ?? '').localeCompare(String(b.created_at ?? '')))
            .map((m) => ({
              id: m.id,
              senderRole: m.sender_role ?? 'customer',
              senderName: m.sender_name ?? 'Support',
              body: m.body,
              createdAt: m.created_at
                ? new Date(m.created_at).toLocaleString([], {
                  month: 'short',
                  day: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                })
                : '',
            })),
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

  calculateShipmentRequestPrice(params: {
    origin: string;
    destination: string;
    cargoType: string;
    shippingMethod: string;
    weightKg: number;
    incoterm: 'EXW' | 'FOB' | 'CIF' | 'DDP';
  }): ShipmentPriceBreakdown {
    const originCode = this.extractLocode(params.origin, 'CNSHA');
    const destinationCode = this.extractLocode(params.destination, 'NLRTM');
    const baseRoute = this.lookupBaseRoute(originCode, destinationCode);

    const cargoMultipliers: Record<string, { mult: number; teu: number }> = {
      '20ft Standard Dry': { mult: 1.0, teu: 1 },
      '40ft High-Cube Dry': { mult: 1.85, teu: 2 },
      '40ft Active Reefer (-18°C)': { mult: 2.45, teu: 2 },
      'Consolidated LCL Cargo': { mult: 0.68, teu: 1 },
      'Out-of-Gauge / Project Cargo': { mult: 2.75, teu: 2 },
      'Hazardous IMO Class Cargo': { mult: 2.35, teu: 2 },
    };
    const cargoSpec = cargoMultipliers[params.cargoType] ?? { mult: 1.85, teu: 2 };

    const methodSurcharges: Record<string, number> = {
      'Ocean FCL': 0,
      'Ocean LCL': 0,
      'Reefer Cold-Chain': 450,
      'Port-to-Door Multimodal': 680,
      'Express Air-Sea': 1450,
    };
    const incotermFees: Record<'EXW' | 'FOB' | 'CIF' | 'DDP', number> = {
      EXW: 240,
      FOB: 180,
      CIF: 390,
      DDP: 760,
    };

    const baseFreightUsd = Math.round(baseRoute.baseUsd * cargoSpec.mult);
    const shippingMethodSurchargeUsd = methodSurcharges[params.shippingMethod] ?? 0;
    const terminalHandlingUsd = 340 * cargoSpec.teu;
    const weight = Math.max(0, Number(params.weightKg) || 0);
    const overweightFeeUsd =
      weight > 22000 ? Math.ceil((weight - 22000) / 500) * 35 : 0;
    const incotermHandlingUsd = incotermFees[params.incoterm] ?? 390;

    return {
      originCode,
      destinationCode,
      lane: `${originCode} → ${destinationCode}`,
      transitDays: baseRoute.days,
      baseFreightUsd,
      shippingMethodSurchargeUsd,
      terminalHandlingUsd,
      overweightFeeUsd,
      incotermHandlingUsd,
      totalUsd:
        baseFreightUsd +
        shippingMethodSurchargeUsd +
        terminalHandlingUsd +
        overweightFeeUsd +
        incotermHandlingUsd,
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
